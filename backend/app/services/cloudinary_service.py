from io import BytesIO
import logging

from fastapi import HTTPException, UploadFile

from app.config import get_settings

try:
    import cloudinary
    import cloudinary.uploader
except Exception:  # pragma: no cover - optional runtime dependency
    cloudinary = None


MAX_IMAGE_BYTES = 5 * 1024 * 1024
ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}
logger = logging.getLogger(__name__)

UPLOAD_FOLDERS = {
    "product_image": "ankita-designs/products",
    "profile_picture": "ankita-designs/profiles",
    "stall_banner": "ankita-designs/stalls/banners",
    "vendor_logo": "ankita-designs/vendors/logos",
    "package_photo": "ankita-designs/orders/packages",
    "advertisement_banner": "ankita-designs/advertisements",
    "exhibition_banner": "ankita-designs/exhibitions/banners",
}


class CloudinaryService:
    def __init__(self) -> None:
        self.settings = get_settings()

    def is_configured(self) -> bool:
        return bool(
            cloudinary
            and self.settings.cloudinary_cloud_name
            and self.settings.cloudinary_api_key
            and self.settings.cloudinary_api_secret
        )

    def status(self) -> dict:
        return {
            "cloudinary_package_installed": bool(cloudinary),
            "cloud_name_configured": bool(self.settings.cloudinary_cloud_name),
            "api_key_configured": bool(self.settings.cloudinary_api_key),
            "api_secret_configured": bool(self.settings.cloudinary_api_secret),
            "configured": self.is_configured(),
        }

    def configure(self) -> None:
        if not self.is_configured():
            raise HTTPException(
                status_code=503,
                detail={
                    "code": "CLOUDINARY_NOT_CONFIGURED",
                    "message": "Cloudinary is not configured. Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET to backend .env.",
                },
            )
        cloudinary.config(
            cloud_name=self.settings.cloudinary_cloud_name,
            api_key=self.settings.cloudinary_api_key,
            api_secret=self.settings.cloudinary_api_secret,
            secure=True,
        )

    async def upload_image(self, file: UploadFile, *, upload_type: str, public_id_prefix: str) -> dict:
        if upload_type not in UPLOAD_FOLDERS:
            raise HTTPException(status_code=400, detail={"code": "INVALID_UPLOAD_TYPE", "message": "Invalid upload type."})
        if file.content_type not in ALLOWED_CONTENT_TYPES:
            raise HTTPException(
                status_code=400,
                detail={"code": "INVALID_IMAGE_TYPE", "message": "Upload JPG, PNG, or WebP images only."},
            )

        self.configure()
        content = await file.read()
        if not content:
            raise HTTPException(status_code=400, detail={"code": "EMPTY_FILE", "message": "Image file is empty."})
        if len(content) > MAX_IMAGE_BYTES:
            raise HTTPException(status_code=413, detail={"code": "IMAGE_TOO_LARGE", "message": "Image must be 5MB or smaller."})

        try:
            image_stream = BytesIO(content)
            image_stream.name = f"{upload_type}.jpg"
            result = cloudinary.uploader.upload(
                image_stream,
                folder=UPLOAD_FOLDERS[upload_type],
                public_id=public_id_prefix,
                resource_type="image",
                overwrite=False,
                unique_filename=True,
                use_filename=False,
            )
        except Exception as exc:
            logger.exception(
                "Cloudinary upload failed. upload_type=%s status=%s error_type=%s",
                upload_type,
                self.status(),
                type(exc).__name__,
            )
            raise HTTPException(
                status_code=502,
                detail={"code": "CLOUDINARY_UPLOAD_FAILED", "message": "Could not upload image to Cloudinary."},
            ) from exc

        return {
            "url": result.get("secure_url"),
            "publicId": result.get("public_id"),
            "width": result.get("width"),
            "height": result.get("height"),
            "format": result.get("format"),
            "bytes": result.get("bytes"),
        }


cloudinary_service = CloudinaryService()
