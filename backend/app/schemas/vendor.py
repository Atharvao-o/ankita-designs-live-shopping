from pydantic import BaseModel

from app.schemas.live_session import LiveSessionResponse
from app.schemas.order import OrderResponse
from app.schemas.product import ProductResponse


class VendorResponse(BaseModel):
    id: str
    userId: str
    businessName: str
    displayName: str
    phone: str | None = None
    status: str
    commissionRate: float
    image: str | None = None
    ownerName: str | None = None
    email: str | None = None
    emailVerified: bool = False
    emailVerifiedAt: str | None = None
    businessCategory: str | None = None
    productCategories: list[str] | None = None
    instagram: str | None = None
    website: str | None = None
    whatsapp: str | None = None
    businessDescription: str | None = None
    gstNumber: str | None = None
    fssaiNumber: str | None = None
    panNumber: str | None = None
    upiId: str | None = None
    bankAccountNumber: str | None = None
    ifsc: str | None = None
    city: str | None = None
    state: str | None = None
    pincode: str | None = None
    address: str | None = None
    rejectionReason: str | None = None
    correctionReason: str | None = None
    correctionRequestedAt: str | None = None
    resubmittedAt: str | None = None
    applicationRevision: int = 1
    approvedAt: str | None = None
    approvedByAdminId: str | None = None
    createdAt: str | None = None


class VendorApplicationUpdateRequest(BaseModel):
    ownerName: str
    businessName: str
    businessCategory: str
    businessDescription: str
    phone: str
    instagram: str | None = None
    website: str | None = None
    whatsapp: str | None = None
    gstNumber: str | None = None
    fssaiNumber: str | None = None
    panNumber: str | None = None
    upiId: str | None = None
    bankAccountNumber: str | None = None
    ifsc: str | None = None
    address: str | None = None
    city: str | None = None
    state: str | None = None
    pincode: str | None = None
    productCategories: list[str] = []


class VendorDashboardStats(BaseModel):
    productCount: int
    orderCount: int
    revenue: int
    visitors: int
    productsSold: int


class VendorDashboardResponse(BaseModel):
    vendor: VendorResponse
    assignedStall: dict | None = None
    participation: dict | None = None
    currentLiveSession: LiveSessionResponse | None = None
    liveSession: LiveSessionResponse
    pinnedProduct: ProductResponse | None = None
    orders: list[OrderResponse]
    recentOrders: list[OrderResponse]
    products: list[ProductResponse]
    productsSold: int
    activeViewers: int
    stats: VendorDashboardStats
