from pydantic import BaseModel


class StallResponse(BaseModel):
    id: str
    exhibitionId: str
    exhibitionTitle: str | None = None
    vendorId: str
    assignedVendorId: str | None = None
    assignedVendorName: str | None = None
    name: str
    stallCode: str | None = None
    category: str
    mapX: int | None = None
    mapY: int | None = None
    width: int | None = None
    height: int | None = None
    stallType: str | None = None
    rentAmount: int | None = None
    bookingStatus: str | None = None
    paymentStatus: str | None = None
    productLimit: int | None = None
    isFeatured: bool
    status: str
    viewerCount: int
    image: str
    bannerImage: str | None = None
    vendorLogo: str | None = None
    featuredImage: str | None = None
    number: str | None = None
    vendorName: str | None = None
    description: str | None = None
    liveStatus: str | None = None
    liveStartedAt: str | None = None
    breakMessage: str | None = None
    deliveryArea: str | None = None
    activeFrom: str | None = None
    activeTo: str | None = None
    productCount: int | None = None
    followerCount: int | None = None
    postCount: int | None = None
    proximityRadius: int | None = None
    route: str | None = None
    socialLinks: dict | None = None
    createdAt: str | None = None
    updatedAt: str | None = None
