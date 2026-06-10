from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.platform_setting import PlatformSetting


router = APIRouter(prefix="/settings", tags=["settings"])


def _tutorial_enabled(setting: PlatformSetting | None) -> bool:
    if setting is None:
        return True
    return setting.value.strip().lower() == "true"


@router.get("/tutorial")
def get_tutorial_setting(db: Session = Depends(get_db)) -> dict[str, bool]:
    setting = db.get(PlatformSetting, "tutorial_enabled")
    return {"enabled": _tutorial_enabled(setting)}
