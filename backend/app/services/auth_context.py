from fastapi import Request
from sqlalchemy.orm import Session

from app.models.user import User


def make_token(user: User) -> str:
    return f"mvp-token:{user.role}:{user.id}"


def user_id_from_request(request: Request) -> str | None:
    authorization = request.headers.get("authorization", "")
    if not authorization.lower().startswith("bearer "):
        return None
    token = authorization.split(" ", 1)[1].strip()
    parts = token.split(":", 2)
    if len(parts) == 3 and parts[0] == "mvp-token":
        return parts[2]
    if token.startswith("mvp-token-"):
        return token.rsplit("-", 1)[-1]
    return None


def current_user_from_request(request: Request, db: Session) -> User | None:
    user_id = user_id_from_request(request)
    if not user_id:
        return None
    return db.get(User, user_id)
