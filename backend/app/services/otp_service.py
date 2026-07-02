from __future__ import annotations

import logging
import math
import random
from datetime import datetime, timedelta
from uuid import uuid4

import requests
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.models.auth_otp import AuthOtpChallenge
from app.models.user import User
from app.services.auth_context import make_token
from app.services.password_service import hash_password, verify_password

logger = logging.getLogger(__name__)


def _serialize_user(user: User) -> dict:
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "phone": user.phone or "",
        "role": user.role,
        "avatar": user.avatar,
    }


def normalize_phone(raw_phone: str) -> str:
    value = raw_phone.strip().replace(" ", "").replace("-", "").replace("(", "").replace(")", "")
    if value.startswith("+"):
        digits = "+" + "".join(char for char in value[1:] if char.isdigit())
    else:
        digits_only = "".join(char for char in value if char.isdigit())
        if len(digits_only) == 10:
            digits = f"+91{digits_only}"
        elif digits_only.startswith("91") and len(digits_only) == 12:
            digits = f"+{digits_only}"
        else:
            digits = f"+{digits_only}" if digits_only else ""
    if len(digits) < 11 or len(digits) > 16:
        raise HTTPException(status_code=400, detail={"code": "INVALID_PHONE", "message": "Enter a valid mobile number with country code."})
    return digits


def _phone_variants(normalized_phone: str) -> list[str]:
    without_plus = normalized_phone.lstrip("+")
    variants = {normalized_phone, without_plus}
    if without_plus.startswith("91") and len(without_plus) == 12:
        variants.add(without_plus[2:])
    return list(variants)


def _generate_code() -> str:
    return f"{random.SystemRandom().randint(0, 999999):06d}"


def _otp_email_for_phone(phone: str) -> str:
    digits = "".join(char for char in phone if char.isdigit())
    return f"phone-{digits}@otp.ankita.local"


def _pending_phone_user_id(phone: str) -> str:
    return f"pending-phone-{phone.lstrip('+')}"


def _customer_name_for_phone(phone: str) -> str:
    digits = "".join(char for char in phone if char.isdigit())
    return f"Customer {digits[-4:]}" if len(digits) >= 4 else "Customer"


def _ensure_phone_customer(db: Session, phone: str, verified_at: datetime) -> User:
    existing = db.scalar(select(User).where(User.role == "user", User.phone.in_(_phone_variants(phone))))
    if existing is not None:
        existing.phone = phone
        existing.phone_verified_at = verified_at
        return existing

    email = _otp_email_for_phone(phone)
    email_owner = db.scalar(select(User).where(User.email == email))
    if email_owner is not None:
        if email_owner.role != "user":
            raise HTTPException(status_code=409, detail={"code": "PHONE_EMAIL_CONFLICT", "message": "This mobile number is already linked to another account."})
        email_owner.phone = phone
        email_owner.phone_verified_at = verified_at
        return email_owner

    user = User(
        id=f"user-{uuid4()}",
        name=_customer_name_for_phone(phone),
        email=email,
        phone=phone,
        role="user",
        password_hash=None,
        avatar=None,
        phone_verified_at=verified_at,
    )
    db.add(user)
    return user


def _fast2sms_number(phone: str) -> str:
    digits = "".join(char for char in phone if char.isdigit())
    if digits.startswith("91") and len(digits) == 12:
        return digits[2:]
    if len(digits) == 10:
        return digits
    raise HTTPException(
        status_code=400,
        detail={
            "code": "FAST2SMS_REQUIRES_INDIAN_MOBILE",
            "message": "Fast2SMS OTP supports Indian 10-digit mobile numbers. Enter a valid India mobile number.",
        },
    )


def _send_fast2sms_otp(phone: str, code: str) -> None:
    settings = get_settings()
    if not (settings.fast2sms_api_key and settings.fast2sms_otp_id):
        raise HTTPException(
            status_code=503,
            detail={
                "code": "OTP_SMS_NOT_CONFIGURED",
                "message": "Fast2SMS OTP is not configured. Set FAST2SMS_API_KEY and FAST2SMS_OTP_ID on the backend.",
            },
        )

    response = requests.post(
        settings.fast2sms_api_url,
        headers={
            "authorization": settings.fast2sms_api_key,
            "Content-Type": "application/json",
        },
        json={
            "mobile": _fast2sms_number(phone),
            "otp_id": settings.fast2sms_otp_id,
            "otp_expiry": max(1, math.ceil(settings.otp_expiry_seconds / 60)),
            "otp_length": len(code),
            "otp": code,
            "variables_values": settings.fast2sms_variables_values,
        },
        timeout=12,
    )
    def raise_fast2sms_error(provider_code: str, provider_message: str) -> None:
        clean_message = provider_message[:220] or "Fast2SMS rejected the OTP SMS."
        raise HTTPException(
            status_code=502,
            detail={
                "code": "OTP_SEND_FAILED",
                "message": f"Fast2SMS rejected the OTP request: {clean_message}",
                "providerCode": provider_code or None,
                "providerMessage": clean_message,
            },
        )

    if response.status_code >= 400:
        try:
            error_body = response.json()
        except ValueError:
            error_body = {}
        provider_message = str(error_body.get("message") or error_body.get("error") or response.text[:180] or "Fast2SMS rejected the OTP SMS.")
        logger.error("Fast2SMS OTP send failed: %s %s", response.status_code, response.text[:300])
        raise_fast2sms_error(str(response.status_code), provider_message)

    try:
        body = response.json()
    except ValueError:
        body = {}
    if isinstance(body, dict) and body.get("return") is False:
        provider_message = str(body.get("message") or "Fast2SMS rejected the OTP SMS.")
        logger.error("Fast2SMS OTP send failed: %s", body)
        raise_fast2sms_error(str(body.get("status_code") or body.get("request_id") or ""), provider_message)


def _send_twilio_otp(phone: str, code: str, purpose: str = "login") -> None:
    settings = get_settings()
    if not (settings.twilio_account_sid and settings.twilio_auth_token and settings.twilio_from_phone):
        raise HTTPException(
            status_code=503,
            detail={
                "code": "OTP_SMS_NOT_CONFIGURED",
                "message": "OTP SMS is not configured. Set Twilio environment variables on the backend.",
            },
        )
    purpose_label = "registration" if purpose == "register" else "login"
    response = requests.post(
        f"https://api.twilio.com/2010-04-01/Accounts/{settings.twilio_account_sid}/Messages.json",
        auth=(settings.twilio_account_sid, settings.twilio_auth_token),
        data={
            "From": settings.twilio_from_phone,
            "To": phone,
            "Body": f"Your Ankita Designs {purpose_label} OTP is {code}. It expires in 5 minutes. Do not share it.",
        },
        timeout=12,
    )
    if response.status_code >= 400:
        try:
            error_body = response.json()
        except ValueError:
            error_body = {}
        twilio_code = str(error_body.get("code") or "")
        twilio_message = str(error_body.get("message") or response.text[:180] or "Twilio rejected the OTP SMS.")
        logger.error("Twilio OTP send failed: %s %s", response.status_code, response.text[:300])

        user_message = "Could not send OTP. Check Twilio SMS configuration."
        if twilio_code == "21608":
            user_message = "Twilio trial accounts can send OTP only to verified recipient numbers. Verify this phone number in Twilio or upgrade the account."
        elif twilio_code == "21408":
            user_message = "Twilio is not allowed to send SMS to this country yet. Enable SMS geo permissions for India in Twilio."
        elif twilio_code == "21614":
            user_message = "Twilio says this is not a valid mobile number for SMS."
        elif twilio_code == "20003":
            user_message = "Twilio authentication failed. Check TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN on the backend."
        elif twilio_code == "21212":
            user_message = "Twilio sender number is invalid. Check TWILIO_FROM_PHONE on the backend."

        raise HTTPException(
            status_code=502,
            detail={
                "code": "OTP_SEND_FAILED",
                "message": user_message,
                "providerCode": twilio_code or None,
                "providerMessage": twilio_message[:220],
            },
        )


def _send_sms(phone: str, code: str, purpose: str = "login") -> None:
    settings = get_settings()
    if settings.otp_debug_response:
        logger.warning("OTP debug mode enabled. OTP for %s is %s", phone, code)
        return

    provider = settings.otp_provider.strip().lower()
    if provider == "fast2sms":
        _send_fast2sms_otp(phone, code)
        return
    if provider in {"twilio", ""}:
        _send_twilio_otp(phone, code, purpose)
        return
    raise HTTPException(
        status_code=503,
        detail={
            "code": "OTP_PROVIDER_NOT_SUPPORTED",
            "message": "OTP_PROVIDER must be either twilio or fast2sms.",
        },
    )


def request_login_otp(db: Session, raw_phone: str) -> dict:
    settings = get_settings()
    phone = normalize_phone(raw_phone)
    user = db.scalar(select(User).where(User.role == "user", User.phone.in_(_phone_variants(phone))))
    now = datetime.utcnow()
    recent = db.scalar(
        select(AuthOtpChallenge)
        .where(AuthOtpChallenge.phone == phone, AuthOtpChallenge.purpose == "login", AuthOtpChallenge.consumed_at.is_(None))
        .order_by(AuthOtpChallenge.created_at.desc())
    )
    if recent and recent.created_at and now - recent.created_at < timedelta(seconds=settings.otp_resend_cooldown_seconds):
        remaining = settings.otp_resend_cooldown_seconds - int((now - recent.created_at).total_seconds())
        raise HTTPException(
            status_code=429,
            detail={"code": "OTP_RATE_LIMITED", "message": f"Please wait {remaining} seconds before requesting another OTP.", "retryAfter": remaining},
        )
    code = _generate_code()
    challenge = AuthOtpChallenge(
        id=str(uuid4()),
        user_id=user.id if user is not None else _pending_phone_user_id(phone),
        phone=phone,
        code_hash=hash_password(code),
        purpose="login",
        attempts=0,
        max_attempts=settings.otp_max_attempts,
        expires_at=now + timedelta(seconds=settings.otp_expiry_seconds),
        consumed_at=None,
        created_at=now,
        updated_at=now,
    )
    db.add(challenge)
    db.commit()
    _send_sms(phone, code, "login")
    response = {
        "ok": True,
        "challengeId": challenge.id,
        "expiresInSeconds": settings.otp_expiry_seconds,
        "message": "OTP sent to your mobile number.",
    }
    if settings.otp_debug_response:
        response["devOtp"] = code
    return response


def request_registration_otp(db: Session, raw_phone: str) -> dict:
    settings = get_settings()
    phone = normalize_phone(raw_phone)
    existing = db.scalar(select(User).where(User.role == "user", User.phone.in_(_phone_variants(phone))))
    if existing is not None:
        raise HTTPException(status_code=409, detail={"code": "PHONE_ALREADY_REGISTERED", "message": "This mobile number is already registered. Login with OTP instead."})
    now = datetime.utcnow()
    recent = db.scalar(
        select(AuthOtpChallenge)
        .where(AuthOtpChallenge.phone == phone, AuthOtpChallenge.purpose == "register", AuthOtpChallenge.consumed_at.is_(None))
        .order_by(AuthOtpChallenge.created_at.desc())
    )
    if recent and recent.created_at and now - recent.created_at < timedelta(seconds=settings.otp_resend_cooldown_seconds):
        remaining = settings.otp_resend_cooldown_seconds - int((now - recent.created_at).total_seconds())
        raise HTTPException(
            status_code=429,
            detail={"code": "OTP_RATE_LIMITED", "message": f"Please wait {remaining} seconds before requesting another OTP.", "retryAfter": remaining},
        )
    code = _generate_code()
    challenge = AuthOtpChallenge(
        id=str(uuid4()),
        user_id=f"pending-phone-{phone.lstrip('+')}",
        phone=phone,
        code_hash=hash_password(code),
        purpose="register",
        attempts=0,
        max_attempts=settings.otp_max_attempts,
        expires_at=now + timedelta(seconds=settings.otp_expiry_seconds),
        consumed_at=None,
        created_at=now,
        updated_at=now,
    )
    db.add(challenge)
    db.commit()
    _send_sms(phone, code, "register")
    response = {
        "ok": True,
        "challengeId": challenge.id,
        "expiresInSeconds": settings.otp_expiry_seconds,
        "message": "OTP sent to your mobile number.",
    }
    if settings.otp_debug_response:
        response["devOtp"] = code
    return response


def verify_registration_otp(db: Session, challenge_id: str, raw_phone: str, code: str, name: str) -> dict:
    phone = normalize_phone(raw_phone)
    display_name = name.strip()
    if len(display_name) < 2:
        raise HTTPException(status_code=400, detail={"code": "NAME_REQUIRED", "message": "Enter your full name."})
    challenge = db.get(AuthOtpChallenge, challenge_id)
    now = datetime.utcnow()
    if challenge is None or challenge.phone != phone or challenge.purpose != "register":
        raise HTTPException(status_code=400, detail={"code": "INVALID_OTP_CHALLENGE", "message": "OTP session is invalid. Request a new OTP."})
    if challenge.consumed_at is not None:
        raise HTTPException(status_code=400, detail={"code": "OTP_ALREADY_USED", "message": "This OTP has already been used."})
    if challenge.expires_at <= now:
        raise HTTPException(status_code=400, detail={"code": "OTP_EXPIRED", "message": "OTP expired. Request a new OTP."})
    if challenge.attempts >= challenge.max_attempts:
        raise HTTPException(status_code=429, detail={"code": "OTP_ATTEMPTS_EXCEEDED", "message": "Too many incorrect attempts. Request a new OTP."})
    if db.scalar(select(User).where(User.role == "user", User.phone.in_(_phone_variants(phone)))) is not None:
        raise HTTPException(status_code=409, detail={"code": "PHONE_ALREADY_REGISTERED", "message": "This mobile number is already registered. Login with OTP instead."})
    challenge.attempts += 1
    challenge.updated_at = now
    if not verify_password(code.strip(), challenge.code_hash):
        db.commit()
        raise HTTPException(status_code=401, detail={"code": "INVALID_OTP", "message": "Invalid OTP."})
    user = User(
        id=f"user-{uuid4()}",
        name=display_name,
        email=_otp_email_for_phone(phone),
        phone=phone,
        role="user",
        password_hash=None,
        avatar=None,
        phone_verified_at=now,
    )
    challenge.consumed_at = now
    db.add(user)
    db.commit()
    db.refresh(user)
    return {
        "token": make_token(user),
        "user": _serialize_user(user),
        "vendor": None,
        "message": "Mobile registration complete.",
    }


def verify_login_otp(db: Session, challenge_id: str, raw_phone: str, code: str) -> dict:
    phone = normalize_phone(raw_phone)
    challenge = db.get(AuthOtpChallenge, challenge_id)
    now = datetime.utcnow()
    if challenge is None or challenge.phone != phone or challenge.purpose != "login":
        raise HTTPException(status_code=400, detail={"code": "INVALID_OTP_CHALLENGE", "message": "OTP session is invalid. Request a new OTP."})
    if challenge.consumed_at is not None:
        raise HTTPException(status_code=400, detail={"code": "OTP_ALREADY_USED", "message": "This OTP has already been used."})
    if challenge.expires_at <= now:
        raise HTTPException(status_code=400, detail={"code": "OTP_EXPIRED", "message": "OTP expired. Request a new OTP."})
    if challenge.attempts >= challenge.max_attempts:
        raise HTTPException(status_code=429, detail={"code": "OTP_ATTEMPTS_EXCEEDED", "message": "Too many incorrect attempts. Request a new OTP."})
    challenge.attempts += 1
    challenge.updated_at = now
    if not verify_password(code.strip(), challenge.code_hash):
        db.commit()
        raise HTTPException(status_code=401, detail={"code": "INVALID_OTP", "message": "Invalid OTP."})
    user = db.get(User, challenge.user_id)
    if user is None and challenge.user_id.startswith("pending-phone-"):
        user = _ensure_phone_customer(db, phone, now)
    if user is None or user.role != "user":
        raise HTTPException(status_code=404, detail={"code": "USER_NOT_FOUND", "message": "Customer account not found."})
    user.phone = phone
    user.phone_verified_at = now
    challenge.consumed_at = now
    db.commit()
    db.refresh(user)
    return {
        "token": make_token(user),
        "user": _serialize_user(user),
        "vendor": None,
        "message": "OTP sign in successful.",
    }
