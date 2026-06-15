from typing import Literal

from pydantic import BaseModel, Field


SubscriptionStatus = Literal["pending_payment", "active", "expired", "cancelled", "rejected"]
SubscriptionPaymentStatus = Literal["unpaid", "submitted", "verified", "rejected"]
LiveSlotType = Literal["subscription", "exhibition", "paid_extra", "admin_assigned"]
LiveSlotStatus = Literal["requested", "approved", "rejected", "cancelled", "completed", "expired"]
LiveSlotPaymentStatus = Literal["not_required", "unpaid", "submitted", "verified", "rejected"]


class SubscriptionPlanRead(BaseModel):
    id: str
    name: str
    description: str | None = None
    price: float
    durationDays: int
    productLimit: int | None = None
    postLimit: int | None = None
    liveSlotLimit: int | None = None
    exhibitionJoinLimit: int | None = None
    adCreditLimit: int | None = None
    priorityLevel: int
    analyticsEnabled: bool
    isActive: bool
    createdAt: str | None = None
    updatedAt: str | None = None


class SubscriptionPlanCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    description: str | None = None
    price: float = 0
    durationDays: int = 30
    productLimit: int | None = None
    postLimit: int | None = None
    liveSlotLimit: int | None = None
    exhibitionJoinLimit: int | None = None
    adCreditLimit: int | None = None
    priorityLevel: int = 0
    analyticsEnabled: bool = False
    isActive: bool = True


class SubscriptionPlanUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    description: str | None = None
    price: float | None = None
    durationDays: int | None = None
    productLimit: int | None = None
    postLimit: int | None = None
    liveSlotLimit: int | None = None
    exhibitionJoinLimit: int | None = None
    adCreditLimit: int | None = None
    priorityLevel: int | None = None
    analyticsEnabled: bool | None = None
    isActive: bool | None = None


class VendorSubscriptionRead(BaseModel):
    id: str
    vendorId: str
    planId: str
    plan: SubscriptionPlanRead | None = None
    vendorName: str | None = None
    status: str
    paymentStatus: str
    paymentReference: str | None = None
    paymentProofUrl: str | None = None
    startsAt: str | None = None
    endsAt: str | None = None
    approvedByAdminId: str | None = None
    rejectionReason: str | None = None
    createdAt: str | None = None
    updatedAt: str | None = None


class VendorSubscriptionRequest(BaseModel):
    planId: str


class VendorSubscriptionPaymentProof(BaseModel):
    subscriptionId: str
    paymentProofUrl: str = Field(min_length=1, max_length=500)
    paymentReference: str | None = Field(default=None, max_length=255)


class VendorSubscriptionStatusResponse(BaseModel):
    currentSubscription: VendorSubscriptionRead | None = None
    latestSubscription: VendorSubscriptionRead | None = None
    history: list[VendorSubscriptionRead]
    plans: list[SubscriptionPlanRead]


class LiveSlotRead(BaseModel):
    id: str
    vendorId: str
    vendorName: str | None = None
    exhibitionId: str | None = None
    exhibitionTitle: str | None = None
    stallId: str | None = None
    stallName: str | None = None
    slotType: str
    title: str | None = None
    startTime: str
    endTime: str
    status: str
    paymentStatus: str
    paymentProofUrl: str | None = None
    price: float
    approvedByAdminId: str | None = None
    rejectionReason: str | None = None
    createdAt: str | None = None
    updatedAt: str | None = None


class LiveSlotRequest(BaseModel):
    title: str | None = Field(default=None, max_length=255)
    startTime: str
    endTime: str
    slotType: LiveSlotType = "subscription"
    exhibitionId: str | None = None
    stallId: str | None = None
    price: float = 0


class LiveSlotPaymentProof(BaseModel):
    paymentProofUrl: str = Field(min_length=1, max_length=500)
    paymentReference: str | None = Field(default=None, max_length=255)


class AdminSubscriptionReview(BaseModel):
    rejectionReason: str | None = Field(default=None, max_length=1000)


class AdminLiveSlotReview(BaseModel):
    rejectionReason: str | None = Field(default=None, max_length=1000)


class AdminLiveSlotCreate(LiveSlotRequest):
    vendorId: str


class LiveAccessStatus(BaseModel):
    canGoLive: bool
    enforcementEnabled: bool
    blockingCode: str | None = None
    message: str
    activeSubscription: VendorSubscriptionRead | None = None
    activeSlot: LiveSlotRead | None = None
    warnings: list[str]
