from pydantic import BaseModel


class ExhibitionResponse(BaseModel):
    id: str
    title: str
    description: str
    bannerImage: str
    banner_image: str
    category: str | None = None
    mapTemplateId: str | None = None
    map_template_id: str | None = None
    stallCount: int | None = None
    stall_count: int | None = None
    assignedStallsCount: int | None = None
    pendingVendorRequests: int | None = None
    liveSessionsCount: int | None = None
    startDate: str
    endDate: str
    start_at: str
    end_at: str
    status: str
    createdByAdminId: str
    created_by_admin_id: str
    actual_started_at: str | None = None
    paused_at: str | None = None
    ended_at: str | None = None
    created_at: str | None = None
    updated_at: str | None = None
    seconds_until_start: int | None = None
    seconds_until_end: int | None = None
    can_user_enter: bool
    can_vendor_go_live: bool
    message: str


class ExhibitionStatusResponse(BaseModel):
    exhibition_id: str
    title: str
    status: str
    server_time: str
    start_at: str | None
    end_at: str | None
    actual_started_at: str | None = None
    seconds_until_start: int | None = None
    seconds_until_end: int | None = None
    can_user_enter: bool
    can_vendor_go_live: bool
    message: str


class ExhibitionEntryResponse(BaseModel):
    can_enter: bool
    reason: str
    exhibition_status: str
    countdown: ExhibitionStatusResponse
    exhibition: ExhibitionResponse
    stalls: list[dict]
