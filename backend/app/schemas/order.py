from pydantic import BaseModel


class OrderItemResponse(BaseModel):
    id: str
    vendorId: str
    productId: str
    quantity: int
    unitPrice: int
    totalPrice: int
    title: str
    vendorName: str
    image: str


class OrderResponse(BaseModel):
    id: str
    userId: str
    exhibitionId: str
    stallId: str
    vendorId: str
    totalAmount: int
    discountAmount: int
    courierCharge: int | None = None
    gst: int | None = None
    commissionAmount: int | None = None
    vendorPayoutAmount: int | None = None
    paymentStatus: str
    orderStatus: str
    createdAt: str
    shippingAddress: str | None = None
    shippingMapUrl: str | None = None
    trackingNumber: str | None = None
    packagePhotoUrl: str | None = None
    fulfilledAt: str | None = None
    customerName: str | None = None
    customerEmail: str | None = None
    customerPhone: str | None = None
    items: list[OrderItemResponse]
    vendorName: str
    estimatedDelivery: str


class VendorOrderStatusUpdateRequest(BaseModel):
    orderStatus: str
    trackingNumber: str | None = None
    packagePhotoUrl: str | None = None
