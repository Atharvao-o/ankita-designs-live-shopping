from __future__ import annotations

import logging
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


def _send_sms(phone: str, code: str, purpose: str = "login") -> None:
    settings = get_settings()
    if settings.otp_debug_response:
        logger.warning("OTP debug mode enabled. OTP for %s is %s", phone, code)
        return
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
        logger.error("Twilio OTP send failed: %s %s", response.status_code, response.text[:300])
        raise HTTPException(status_code=502, detail={"code": "OTP_SEND_FAILED", "message": "Could not send OTP. Try again shortly."})


def request_login_otp(db: Session, raw_phone: str) -> dict:
    settings = get_settings()
    phone = normalize_phone(raw_phone)
    user = db.scalar(select(User).where(User.role == "user", User.phone.in_(_phone_variants(phone))))
    if user is None:
        raise HTTPException(status_code=404, detail={"code": "PHONE_NOT_REGISTERED", "message": "No customer account is registered with this mobile number."})
    now = datetime.utcnow()
    recent = db.scalar(
        select(AuthOtpChallenge)
        .where(AuthOtpChallenge.user_id == user.id, AuthOtpChallenge.consumed_at.is_(None))
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
        user_id=user.id,
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
    if user is None or user.role != "user":
        raise HTTPException(status_code=404, detail={"code": "USER_NOT_FOUND", "message": "Customer account not found."})
    challenge.consumed_at = now
    db.commit()
    return {
        "token": make_token(user),
        "user": _serialize_user(user),
        "vendor": None,
        "message": "OTP login successful.",
    }
