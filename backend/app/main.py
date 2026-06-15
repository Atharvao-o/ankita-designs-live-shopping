from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.database import init_database
from app.routes import (
    admin,
    advertisements,
    auth,
    bargains,
    cart,
    checkout,
    exhibitions,
    health,
    live_sessions,
    live_chat,
    livekit,
    orders,
    products,
    settings as public_settings,
    social,
    stalls,
    uploads,
    user,
    vendor,
)


settings = get_settings()


def normalize_origin(origin: str | None) -> str:
    return (origin or "").strip().rstrip("/")


def build_allowed_origins() -> list[str]:
    env_origins = [
        normalize_origin(origin)
        for origin in settings.allowed_origins.split(",")
        if normalize_origin(origin)
    ]
    default_origins = [
        normalize_origin(settings.frontend_url),
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3002",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "http://127.0.0.1:3002",
    ]
    return list(dict.fromkeys([origin for origin in [*default_origins, *env_origins] if origin]))


def build_allowed_origin_regex() -> str | None:
    configured_regex = settings.allowed_origin_regex.strip()
    if configured_regex:
        return configured_regex
    return r"https://.*\.vercel\.app"


allowed_origins = build_allowed_origins()
allowed_origin_regex = build_allowed_origin_regex()

app = FastAPI(
    title="Ankita Designs Online Live Exhibition API",
    version="0.1.0",
    description="Production foundation for Ankita Designs Online Live Exhibition, a direct live-commerce marketplace."
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=allowed_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)


@app.on_event("startup")
def startup() -> None:
    init_database()


@app.get("/")
def root() -> dict:
    return {
        "app": "Ankita Designs Online Live Exhibition API",
        "status": "running",
        "docs": "/docs",
        "health": "/health",
    }


@app.get("/cors/debug")
def cors_debug() -> dict:
    return {
        "frontend_url": normalize_origin(settings.frontend_url),
        "allowed_origins": allowed_origins,
    }


app.include_router(health.router)
app.include_router(advertisements.router)
app.include_router(auth.router)
app.include_router(bargains.router)
app.include_router(exhibitions.router)
app.include_router(stalls.router)
app.include_router(products.router)
app.include_router(cart.router)
app.include_router(checkout.router)
app.include_router(orders.router)
app.include_router(livekit.router)
app.include_router(live_sessions.router)
app.include_router(live_chat.router)
app.include_router(uploads.router)
app.include_router(user.router)
app.include_router(vendor.router)
app.include_router(public_settings.router)
app.include_router(admin.router)
app.include_router(social.router)


