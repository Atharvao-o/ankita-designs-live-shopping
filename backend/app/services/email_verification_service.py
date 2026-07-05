from __future__ import annotations

import html
import logging
import re
import secrets
import smtplib
import ssl
from datetime import datetime, timedelta
from email.message import EmailMessage
from email.utils import formataddr
from uuid import uuid4

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.models.email_verification import EmailVerificationChallenge
from app.models.user import User
from app.services.password_service import hash_password, verify_password

logger = logging.getLogger(__name__)

VENDOR_REGISTRATION_PURPOSE = "vendor_registration"
EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def normalize_email(raw_email: str) -> str:
    email = raw_email.strip().lower()
    if len(email) > 255 or not EMAIL_PATTERN.fullmatch(email):
        raise HTTPException(
            status_code=400,
            detail={"code": "INVALID_EMAIL", "message": "Enter a valid email address."},
        )
    return email


def _generate_code() -> str:
    return f"{secrets.randbelow(1_000_000):06d}"


def _build_message(recipient: str, code: str, expires_minutes: int) -> EmailMessage:
    settings = get_settings()
    sender_email = (settings.smtp_from_email or settings.smtp_username).strip()
    sender_name = settings.smtp_from_name.strip() or "Ankita Designs"
    message = EmailMessage()
    message["Subject"] = f"{code} is your Ankita Designs verification code"
    message["From"] = formataddr((sender_name, sender_email))
    message["To"] = recipient
    message.set_content(
        "\n".join(
            [
                "Verify your vendor email",
                "",
                f"Your Ankita Designs verification code is {code}.",
                f"It expires in {expires_minutes} minutes.",
                "",
                "Do not share this code. If you did not request it, you can ignore this email.",
            ]
        )
    )
    safe_code = html.escape(code)
    message.add_alternative(
        f"""
        <!doctype html>
        <html lang="en">
          <body style="margin:0;background:#f7f3ec;color:#19171f;font-family:Arial,sans-serif">
            <div style="max-width:560px;margin:0 auto;padding:32px 18px">
              <div style="border:1px solid #e5ddd0;background:#ffffff;padding:32px">
                <p style="margin:0;color:#b07823;font-size:12px;font-weight:700;text-transform:uppercase">Ankita Designs</p>
                <h1 style="margin:12px 0 8px;font-size:26px">Verify your vendor email</h1>
                <p style="margin:0 0 24px;color:#655f57;line-height:1.6">Use this one-time code to continue your vendor application.</p>
                <div style="background:#19171f;color:#ffffff;padding:18px;text-align:center;font-size:34px;font-weight:800;letter-spacing:8px">{safe_code}</div>
                <p style="margin:24px 0 0;color:#655f57;font-size:14px;line-height:1.6">This code expires in {expires_minutes} minutes. Do not share it with anyone.</p>
              </div>
            </div>
          </body>
        </html>
        """,
        subtype="html",
    )
    return message


def _deliver_message(message: EmailMessage, recipient: str) -> None:
    settings = get_settings()
    sender_email = (settings.smtp_from_email or settings.smtp_username).strip()
    if not settings.smtp_host.strip() or not sender_email:
        raise HTTPException(
            status_code=503,
            detail={
                "code": "EMAIL_NOT_CONFIGURED",
                "message": "Email delivery is not configured. Add your SMTP server and sender details to the backend environment.",
            },
        )
    context = ssl.create_default_context()
    try:
        if settings.smtp_use_ssl:
            client: smtplib.SMTP = smtplib.SMTP_SSL(
                settings.smtp_host,
                settings.smtp_port,
                timeout=15,
                context=context,
            )
        else:
            client = smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=15)

        with client:
            client.ehlo()
            if settings.smtp_use_tls and not settings.smtp_use_ssl:
                client.starttls(context=context)
                client.ehlo()
            if settings.smtp_username:
                client.login(settings.smtp_username, settings.smtp_password)
            client.send_message(message)
    except (OSError, smtplib.SMTPException) as exc:
        logger.exception("Vendor email OTP delivery failed for %s", recipient)
        raise HTTPException(
            status_code=502,
            detail={
                "code": "EMAIL_SEND_FAILED",
                "message": "We could not send the email. Check the website email server configuration and try again.",
            },
        ) from exc


def _send_email(recipient: str, code: str) -> None:
    settings = get_settings()
    if settings.email_otp_debug_response:
        logger.warning("Email OTP debug mode enabled. OTP for %s is %s", recipient, code)
        return
    message = _build_message(
        recipient,
        code,
        max(1, round(settings.email_otp_expiry_seconds / 60)),
    )
    _deliver_message(message, recipient)


def send_vendor_correction_email(recipient: str, business_name: str, reason: str) -> None:
    settings = get_settings()
    sender_email = (settings.smtp_from_email or settings.smtp_username).strip()
    sender_name = settings.smtp_from_name.strip() or "Ankita Designs"
    application_url = f"{settings.frontend_url.rstrip('/')}/vendor/application"
    message = EmailMessage()
    message["Subject"] = f"Correction requested for {business_name} vendor application"
    message["From"] = formataddr((sender_name, sender_email))
    message["To"] = recipient
    message.set_content(
        "\n".join(
            [
                f"Hello {business_name},",
                "",
                "The Ankita Designs admin team reviewed your vendor application and requested corrections.",
                "",
                "Correction requested:",
                reason,
                "",
                f"Open your application, make the corrections, and resubmit it: {application_url}",
                "",
                "Your application will return to pending review after resubmission.",
            ]
        )
    )
    safe_business_name = html.escape(business_name)
    safe_reason = html.escape(reason)
    safe_application_url = html.escape(application_url, quote=True)
    message.add_alternative(
        f"""
        <!doctype html>
        <html lang="en">
          <body style="margin:0;background:#f7f3ec;color:#19171f;font-family:Arial,sans-serif">
            <div style="max-width:600px;margin:0 auto;padding:32px 18px">
              <div style="border:1px solid #e5ddd0;background:#ffffff;padding:32px">
                <p style="margin:0;color:#b07823;font-size:12px;font-weight:700;text-transform:uppercase">Ankita Designs</p>
                <h1 style="margin:12px 0 8px;font-size:26px">Application correction requested</h1>
                <p style="margin:0 0 20px;color:#655f57;line-height:1.6">Hello {safe_business_name}, the admin team needs you to correct information in your vendor application.</p>
                <div style="border-left:4px solid #f36b4f;background:#fff3ef;padding:16px;white-space:pre-wrap;line-height:1.6">{safe_reason}</div>
                <a href="{safe_application_url}" style="display:inline-block;margin-top:24px;background:#19171f;color:#ffffff;padding:13px 20px;text-decoration:none;font-weight:700">Review and correct application</a>
                <p style="margin:24px 0 0;color:#655f57;font-size:14px;line-height:1.6">After resubmission, your application will return to the admin review queue.</p>
              </div>
            </div>
          </body>
        </html>
        """,
        subtype="html",
    )
    _deliver_message(message, recipient)


def request_vendor_email_otp(db: Session, raw_email: str) -> dict:
    settings = get_settings()
    email = normalize_email(raw_email)
    if db.scalar(select(User).where(User.email == email)) is not None:
        raise HTTPException(
            status_code=409,
            detail={"code": "EMAIL_ALREADY_EXISTS", "message": "This email is already registered."},
        )

    now = datetime.utcnow()
    recent = db.scalar(
        select(EmailVerificationChallenge)
        .where(
            EmailVerificationChallenge.email == email,
            EmailVerificationChallenge.purpose == VENDOR_REGISTRATION_PURPOSE,
            EmailVerificationChallenge.consumed_at.is_(None),
        )
        .order_by(EmailVerificationChallenge.created_at.desc())
    )
    if recent and now - recent.created_at < timedelta(seconds=settings.email_otp_resend_cooldown_seconds):
        remaining = settings.email_otp_resend_cooldown_seconds - int((now - recent.created_at).total_seconds())
        raise HTTPException(
            status_code=429,
            detail={
                "code": "EMAIL_OTP_RATE_LIMITED",
                "message": f"Please wait {remaining} seconds before requesting another email code.",
                "retryAfter": remaining,
            },
        )

    code = _generate_code()
    challenge = EmailVerificationChallenge(
        id=str(uuid4()),
        email=email,
        code_hash=hash_password(code),
        purpose=VENDOR_REGISTRATION_PURPOSE,
        attempts=0,
        max_attempts=settings.email_otp_max_attempts,
        expires_at=now + timedelta(seconds=settings.email_otp_expiry_seconds),
        verified_at=None,
        consumed_at=None,
        created_at=now,
        updated_at=now,
    )
    db.add(challenge)
    db.commit()

    try:
        _send_email(email, code)
    except HTTPException:
        db.delete(challenge)
        db.commit()
        raise

    response = {
        "ok": True,
        "challengeId": challenge.id,
        "expiresInSeconds": settings.email_otp_expiry_seconds,
        "resendAfterSeconds": settings.email_otp_resend_cooldown_seconds,
        "message": f"Verification code sent to {email}.",
    }
    if settings.email_otp_debug_response:
        response["devOtp"] = code
    return response


def verify_vendor_email_otp(db: Session, challenge_id: str, raw_email: str, code: str) -> dict:
    settings = get_settings()
    email = normalize_email(raw_email)
    challenge = db.get(EmailVerificationChallenge, challenge_id)
    now = datetime.utcnow()

    if challenge is None or challenge.email != email or challenge.purpose != VENDOR_REGISTRATION_PURPOSE:
        raise HTTPException(
            status_code=400,
            detail={"code": "INVALID_EMAIL_CHALLENGE", "message": "Email verification session is invalid. Request a new code."},
        )
    if challenge.consumed_at is not None:
        raise HTTPException(
            status_code=400,
            detail={"code": "EMAIL_PROOF_ALREADY_USED", "message": "This email verification has already been used."},
        )
    if challenge.verified_at is not None:
        return {
            "ok": True,
            "verificationToken": challenge.id,
            "verifiedEmail": challenge.email,
            "validForSeconds": settings.email_verification_valid_seconds,
            "message": "Email address verified.",
        }
    if challenge.expires_at <= now:
        raise HTTPException(
            status_code=400,
            detail={"code": "EMAIL_OTP_EXPIRED", "message": "The verification code expired. Request a new code."},
        )
    if challenge.attempts >= challenge.max_attempts:
        raise HTTPException(
            status_code=429,
            detail={"code": "EMAIL_OTP_ATTEMPTS_EXCEEDED", "message": "Too many incorrect attempts. Request a new code."},
        )

    challenge.attempts += 1
    challenge.updated_at = now
    if not verify_password(code.strip(), challenge.code_hash):
        db.commit()
        raise HTTPException(
            status_code=401,
            detail={"code": "INVALID_EMAIL_OTP", "message": "The verification code is incorrect."},
        )

    challenge.verified_at = now
    db.commit()
    return {
        "ok": True,
        "verificationToken": challenge.id,
        "verifiedEmail": challenge.email,
        "validForSeconds": settings.email_verification_valid_seconds,
        "message": "Email address verified.",
    }


def consume_vendor_email_verification(
    db: Session,
    verification_token: str | None,
    raw_email: str,
) -> datetime:
    settings = get_settings()
    email = normalize_email(raw_email)
    if not verification_token:
        raise HTTPException(
            status_code=400,
            detail={"code": "EMAIL_VERIFICATION_REQUIRED", "message": "Verify the vendor email before submitting the application."},
        )

    challenge = db.get(EmailVerificationChallenge, verification_token)
    now = datetime.utcnow()
    if (
        challenge is None
        or challenge.email != email
        or challenge.purpose != VENDOR_REGISTRATION_PURPOSE
        or challenge.verified_at is None
    ):
        raise HTTPException(
            status_code=400,
            detail={"code": "EMAIL_VERIFICATION_INVALID", "message": "Email verification is invalid. Verify this email again."},
        )
    if challenge.consumed_at is not None:
        raise HTTPException(
            status_code=400,
            detail={"code": "EMAIL_PROOF_ALREADY_USED", "message": "This email verification has already been used."},
        )
    if now - challenge.verified_at > timedelta(seconds=settings.email_verification_valid_seconds):
        raise HTTPException(
            status_code=400,
            detail={"code": "EMAIL_VERIFICATION_EXPIRED", "message": "Email verification expired. Verify this email again."},
        )

    challenge.consumed_at = now
    challenge.updated_at = now
    return challenge.verified_at
