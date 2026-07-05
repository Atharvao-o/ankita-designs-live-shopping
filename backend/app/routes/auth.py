from datetime import datetime
import base64
import json
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.config import get_settings
from app.models.user import User
from app.models.vendor import Vendor
from app.schemas.user import (
    AuthResponse,
    GoogleLoginRequest,
    LoginRequest,
    OtpRegisterRequest,
    OtpRegisterVerifyRequest,
    OtpRequest,
    OtpRequestResponse,
    OtpVerifyRequest,
    RegisterRequest,
    UserResponse,
    VendorEmailOtpRequest,
    VendorEmailOtpRequestResponse,
    VendorEmailOtpVerifyRequest,
    VendorEmailOtpVerifyResponse,
)
from app.services.auth_context import current_user_from_request, make_token
from app.services.email_verification_service import (
    consume_vendor_email_verification,
    request_vendor_email_otp,
    verify_vendor_email_otp,
)
from app.services.otp_service import request_login_otp, request_registration_otp, verify_login_otp, verify_registration_otp
from app.services.password_service import hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


def _slugify(value: str) -> str:
    cleaned = "".join(char.lower() if char.isalnum() else "-" for char in value.replace("&", "and"))
    while "--" in cleaned:
        cleaned = cleaned.replace("--", "-")
    return cleaned.strip("-") or str(uuid4())


def _iso(value: datetime | None) -> str | None:
    return value.isoformat() if value else None


def serialize_user(user: User) -> dict:
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "phone": user.phone or "",
        "role": user.role,
        "avatar": user.avatar,
    }


def serialize_vendor(vendor: Vendor | None) -> dict | None:
    if vendor is None:
        return None
    return {
        "id": vendor.id,
        "userId": vendor.user_id,
        "businessName": vendor.business_name,
        "displayName": vendor.display_name,
        "phone": vendor.phone,
        "status": vendor.status,
        "commissionRate": vendor.commission_rate or 0,
        "image": None,
        "ownerName": vendor.owner_name,
        "email": vendor.email,
        "emailVerified": vendor.email_verified_at is not None,
        "emailVerifiedAt": _iso(vendor.email_verified_at),
        "businessCategory": vendor.business_category,
        "productCategories": vendor.product_categories or [],
        "instagram": vendor.instagram,
        "website": vendor.website,
        "whatsapp": vendor.whatsapp,
        "businessDescription": vendor.business_description,
        "gstNumber": vendor.gst_number,
        "fssaiNumber": vendor.fssai_number,
        "panNumber": vendor.pan_number,
        "upiId": vendor.upi_id,
        "bankAccountNumber": vendor.bank_account_number,
        "ifsc": vendor.ifsc,
        "address": vendor.address,
        "city": vendor.city,
        "state": vendor.state,
        "pincode": vendor.pincode,
        "rejectionReason": vendor.rejection_reason,
        "correctionReason": vendor.correction_reason,
        "correctionRequestedAt": _iso(vendor.correction_requested_at),
        "resubmittedAt": _iso(vendor.resubmitted_at),
        "applicationRevision": vendor.application_revision or 1,
        "approvedAt": _iso(vendor.approved_at),
        "approvedByAdminId": vendor.approved_by_admin_id,
        "createdAt": _iso(vendor.created_at),
    }


def _decode_google_payload_unverified(raw_token: str) -> dict:
    parts = raw_token.split(".")
    if len(parts) < 2:
        return {}
    padded_payload = parts[1] + "=" * (-len(parts[1]) % 4)
    try:
        decoded = base64.urlsafe_b64decode(padded_payload.encode("utf-8"))
        payload = json.loads(decoded.decode("utf-8"))
        return payload if isinstance(payload, dict) else {}
    except (ValueError, json.JSONDecodeError):
        return {}


def _google_token_error_message(raw_token: str, expected_audience: str, error: ValueError) -> str:
    payload = _decode_google_payload_unverified(raw_token)
    audience = str(payload.get("aud") or "")
    issuer = str(payload.get("iss") or "")
    expires_at = payload.get("exp")
    now = int(datetime.utcnow().timestamp())

    if audience and audience != expected_audience:
        return "Google token audience does not match this app's configured client ID."
    if issuer and issuer not in {"accounts.google.com", "https://accounts.google.com"}:
        return "Google token issuer is not trusted."
    if isinstance(expires_at, int) and expires_at < now:
        return "Google sign-in token expired. Please try again."

    reason = str(error).strip()
    if reason:
        return f"Google sign-in could not be verified: {reason[:180]}"
    return "Google sign-in could not be verified."


def vendor_for_user(db: Session, user: User) -> Vendor | None:
    if user.role != "vendor":
        return None
    vendor = db.scalar(select(Vendor).where(Vendor.user_id == user.id))
    if vendor is not None:
        return vendor

    display_name = (user.name or user.email.split("@", 1)[0]).strip()
    vendor = Vendor(
        id=f"vendor-{uuid4()}",
        user_id=user.id,
        owner_name=display_name,
            business_name=display_name,
            display_name=display_name,
            business_category=None,
            product_categories=[],
        phone=user.phone,
        email=user.email,
        instagram=None,
        website=None,
        whatsapp=None,
            business_description=None,
            gst_number=None,
            fssai_number=None,
            pan_number=None,
            upi_id=None,
            bank_account_number=None,
            ifsc=None,
            address=None,
            city=None,
            state=None,
            pincode=None,
        status="pending",
        commission_rate=12,
    )
    db.add(vendor)
    db.commit()
    db.refresh(vendor)
    return vendor


def ensure_bootstrap_admin(db: Session) -> None:
    settings = get_settings()
    email = settings.bootstrap_admin_email.strip().lower()
    password = settings.bootstrap_admin_password
    if not email or not password:
        return
    existing_user = db.scalar(select(User).where(User.email == email))
    if existing_user is not None:
        changed = False
        admin_name = settings.bootstrap_admin_name.strip() or "Admin"
        if existing_user.role != "admin":
            existing_user.role = "admin"
            changed = True
        if existing_user.name != admin_name:
            existing_user.name = admin_name
            changed = True
        if not verify_password(password, existing_user.password_hash):
            existing_user.password_hash = hash_password(password)
            changed = True
        if changed:
            db.commit()
        return
    db.add(User(
        id=f"admin-{uuid4()}",
        name=settings.bootstrap_admin_name.strip() or "Admin",
        email=email,
        phone="",
        role="admin",
        password_hash=hash_password(password),
        avatar=None,
    ))
    db.commit()


def _validate_registration(payload: RegisterRequest) -> None:
    if payload.role not in {"user", "vendor"}:
        raise HTTPException(status_code=400, detail={"code": "INVALID_ROLE", "message": "Public registration supports user and vendor roles."})
    if "@" not in payload.email:
        raise HTTPException(status_code=400, detail={"code": "INVALID_EMAIL", "message": "Enter a valid email address."})
    if len(payload.password) < 8:
        raise HTTPException(status_code=400, detail={"code": "PASSWORD_TOO_SHORT", "message": "Password must be at least 8 characters."})
    if payload.role == "user" and not (payload.name or "").strip():
        raise HTTPException(status_code=400, detail={"code": "VALIDATION_ERROR", "message": "Full name is required."})
    if payload.role == "vendor":
        required = {
            "owner name": payload.owner_name,
            "business name": payload.business_name,
            "business category": payload.business_category,
            "business description": payload.business_description,
            "phone number": payload.phone,
        }
        missing = [label for label, value in required.items() if not (value or "").strip()]
        if missing:
            raise HTTPException(status_code=400, detail={"code": "VALIDATION_ERROR", "message": f"Missing vendor fields: {', '.join(missing)}."})


@router.post("/login", response_model=AuthResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> dict:
    ensure_bootstrap_admin(db)
    email = payload.email.strip().lower()
    user = db.scalar(select(User).where(User.email == email))
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail={"code": "INVALID_CREDENTIALS", "message": "Invalid email or password."})
    vendor = vendor_for_user(db, user)
    return {
        "token": make_token(user),
        "user": serialize_user(user),
        "vendor": serialize_vendor(vendor),
    }


@router.post("/otp/request", response_model=OtpRequestResponse)
def request_otp_login(payload: OtpRequest, db: Session = Depends(get_db)) -> dict:
    ensure_bootstrap_admin(db)
    return request_login_otp(db, payload.phone)


@router.post("/otp/verify", response_model=AuthResponse)
def verify_otp_login(payload: OtpVerifyRequest, db: Session = Depends(get_db)) -> dict:
    ensure_bootstrap_admin(db)
    return verify_login_otp(db, payload.challenge_id, payload.phone, payload.code)


@router.post("/otp/register/request", response_model=OtpRequestResponse)
def request_otp_register(payload: OtpRegisterRequest, db: Session = Depends(get_db)) -> dict:
    ensure_bootstrap_admin(db)
    return request_registration_otp(db, payload.phone)


@router.post("/otp/register/verify", response_model=AuthResponse)
def verify_otp_register(payload: OtpRegisterVerifyRequest, db: Session = Depends(get_db)) -> dict:
    ensure_bootstrap_admin(db)
    return verify_registration_otp(db, payload.challenge_id, payload.phone, payload.code, payload.name)


@router.post("/vendor/email-otp/request", response_model=VendorEmailOtpRequestResponse)
def request_vendor_email_verification(payload: VendorEmailOtpRequest, db: Session = Depends(get_db)) -> dict:
    ensure_bootstrap_admin(db)
    return request_vendor_email_otp(db, payload.email)


@router.post("/vendor/email-otp/verify", response_model=VendorEmailOtpVerifyResponse)
def verify_vendor_email_verification(payload: VendorEmailOtpVerifyRequest, db: Session = Depends(get_db)) -> dict:
    ensure_bootstrap_admin(db)
    return verify_vendor_email_otp(db, payload.challenge_id, payload.email, payload.code)


@router.post("/google", response_model=AuthResponse)
def google_login(payload: GoogleLoginRequest, db: Session = Depends(get_db)) -> dict:
    ensure_bootstrap_admin(db)
    settings = get_settings()
    google_client_id = settings.google_client_id.strip()
    if not google_client_id:
        raise HTTPException(
            status_code=503,
            detail={
                "code": "GOOGLE_AUTH_NOT_CONFIGURED",
                "message": "Google login is not configured. Set GOOGLE_CLIENT_ID on the backend and NEXT_PUBLIC_GOOGLE_CLIENT_ID on the frontend.",
            },
        )

    try:
        from google.auth.transport import requests as google_requests
        from google.oauth2 import id_token
    except ImportError as exc:
        raise HTTPException(
            status_code=503,
            detail={
                "code": "GOOGLE_AUTH_DEPENDENCY_MISSING",
                "message": "Google login dependency is missing. Install backend requirements again.",
            },
        ) from exc

    try:
        token_info = id_token.verify_oauth2_token(
            payload.id_token,
            google_requests.Request(),
            google_client_id,
            clock_skew_in_seconds=30,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=401,
            detail={
                "code": "INVALID_GOOGLE_TOKEN",
                "message": _google_token_error_message(payload.id_token, google_client_id, exc),
            },
        ) from exc

    email = str(token_info.get("email") or "").strip().lower()
    if not email or not token_info.get("email_verified"):
        raise HTTPException(
            status_code=401,
            detail={"code": "UNVERIFIED_GOOGLE_EMAIL", "message": "Google account email must be verified."},
        )

    user = db.scalar(select(User).where(User.email == email))
    if user is None:
        display_name = str(token_info.get("name") or email.split("@", 1)[0]).strip()
        user = User(
            id=f"user-{uuid4()}",
            name=display_name,
            email=email,
            phone="",
            role="user",
            password_hash=None,
            avatar=token_info.get("picture"),
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        changed = False
        picture = token_info.get("picture")
        if picture and not user.avatar:
            user.avatar = picture
            changed = True
        if changed:
            db.commit()
            db.refresh(user)

    vendor = vendor_for_user(db, user)
    return {
        "token": make_token(user),
        "user": serialize_user(user),
        "vendor": serialize_vendor(vendor),
    }


@router.post("/register", response_model=AuthResponse)
def register(payload: RegisterRequest, db: Session = Depends(get_db)) -> dict:
    ensure_bootstrap_admin(db)
    email = payload.email.strip().lower()
    _validate_registration(payload)
    if db.scalar(select(User).where(User.email == email)) is not None:
        raise HTTPException(status_code=409, detail={"code": "EMAIL_ALREADY_EXISTS", "message": "Email already exists."})

    email_verified_at = None
    if payload.role == "vendor":
        email_verified_at = consume_vendor_email_verification(db, payload.email_verification_token, email)

    name = (payload.owner_name if payload.role == "vendor" else payload.name) or payload.email.split("@")[0]
    user = User(
        id=f"{payload.role}-{uuid4()}",
        name=name.strip(),
        email=email,
        phone=payload.phone or "",
        role=payload.role,
        password_hash=hash_password(payload.password),
        avatar=None,
    )
    db.add(user)
    vendor = None
    message = "User registered successfully."
    if payload.role == "vendor":
        business_name = (payload.business_name or "").strip()
        vendor_id = _slugify(business_name)
        if db.get(Vendor, vendor_id) is not None:
            vendor_id = f"{vendor_id}-{str(uuid4())[:8]}"
        vendor = Vendor(
            id=vendor_id,
            user_id=user.id,
            owner_name=user.name,
            business_name=business_name,
            display_name=business_name,
            business_category=payload.business_category,
            product_categories=payload.product_categories or ([payload.business_category] if payload.business_category else []),
            phone=payload.phone,
            email=email,
            email_verified_at=email_verified_at,
            instagram=payload.instagram,
            website=payload.website,
            whatsapp=payload.whatsapp,
            business_description=payload.business_description,
            gst_number=payload.gst_number,
            fssai_number=payload.fssai_number,
            pan_number=payload.pan_number,
            upi_id=payload.upi_id,
            bank_account_number=payload.bank_account_number,
            ifsc=payload.ifsc,
            address=payload.address,
            city=payload.city,
            state=payload.state,
            pincode=payload.pincode,
            status="pending",
            application_revision=1,
            commission_rate=12,
        )
        db.add(vendor)
        message = "Vendor registration submitted. Awaiting admin approval."
    db.commit()
    db.refresh(user)
    if vendor:
        db.refresh(vendor)
    return {
        "token": make_token(user),
        "user": serialize_user(user),
        "vendor": serialize_vendor(vendor),
        "message": message,
    }


@router.get("/me", response_model=AuthResponse)
def me(request: Request, db: Session = Depends(get_db)) -> dict:
    ensure_bootstrap_admin(db)
    user = current_user_from_request(request, db)
    if user is None:
        raise HTTPException(status_code=401, detail={"code": "UNAUTHORIZED", "message": "Login required."})
    vendor = vendor_for_user(db, user)
    return {
        "token": make_token(user),
        "user": serialize_user(user),
        "vendor": serialize_vendor(vendor),
    }


@router.post("/logout")
def logout() -> dict:
    return {"ok": True}
