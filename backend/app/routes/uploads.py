from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.auth_context import current_user_from_request
from app.services.cloudinary_service import cloudinary_service

router = APIRouter(prefix="/uploads", tags=["uploads"])


@router.get("/cloudinary/status")
def cloudinary_status(request: Request, db: Session = Depends(get_db)) -> dict:
    user = current_user_from_request(request, db)
    if user is None:
        raise HTTPException(status_code=401, detail={"code": "UNAUTHORIZED", "message": "Login required."})
    if user.role != "admin":
        raise HTTPException(status_code=403, detail={"code": "ADMIN_REQUIRED", "message": "Admin account required."})
    return cloudinary_service.status()


@router.post("/image")
async def upload_image(
    request: Request,
    upload_type: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
) -> dict:
    user = current_user_from_request(request, db)
    if user is None:
        raise HTTPException(status_code=401, detail={"code": "UNAUTHORIZED", "message": "Login required."})

    if upload_type in {"product_image", "stall_banner", "vendor_logo", "package_photo", "subscription_payment_proof", "live_slot_payment_proof"} and user.role != "vendor":
        raise HTTPException(status_code=403, detail={"code": "VENDOR_REQUIRED", "message": "Vendor account required for this upload."})
    if upload_type in {"advertisement_banner", "exhibition_banner"} and user.role != "admin":
        raise HTTPException(status_code=403, detail={"code": "ADMIN_REQUIRED", "message": "Admin account required for this upload."})
    if upload_type == "profile_picture" and user.role not in {"user", "vendor", "admin"}:
        raise HTTPException(status_code=403, detail={"code": "INVALID_ROLE", "message": "Invalid user role."})

    public_id_prefix = f"{user.role}-{user.id}-{uuid4().hex[:10]}"
    return await cloudinary_service.upload_image(file, upload_type=upload_type, public_id_prefix=public_id_prefix)

