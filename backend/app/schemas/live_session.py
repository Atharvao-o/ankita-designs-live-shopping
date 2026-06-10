from pydantic import BaseModel


class LiveSessionResponse(BaseModel):
    id: str
    stallId: str
    stall_id: str | None = None
    vendorId: str
    vendor_id: str | None = None
    livekitRoomName: str
    livekit_room_name: str | None = None
    status: str
    stream_mode: str = "camera"
    camera_enabled: bool = True
    rtmp_url: str | None = None
    stream_key: str | None = None
    token_mode: str = "real"
    pinnedProductId: str | None = None
    pinned_product_id: str | None = None
    pinned_product: dict | None = None
    viewerCount: int
    viewer_count: int | None = None
    likesCount: int
    likes_count: int | None = None
    followCount: int
    follow_count: int | None = None
    started_at: str | None = None
    ended_at: str | None = None


class LiveSessionStartRequest(BaseModel):
    exhibition_id: str
    stall_id: str
    vendor_id: str
    stream_mode: str = "camera"


class LiveSessionPinProductRequest(BaseModel):
    pinned_product_id: str


class LiveKitTokenRequest(BaseModel):
    room_name: str
    identity: str
    role: str
    stall_id: str


class LiveKitTokenResponse(BaseModel):
    mode: str
    url: str | None = None
    token: str
    room_name: str
    identity: str
    role: str | None = None
    stall_id: str | None = None
