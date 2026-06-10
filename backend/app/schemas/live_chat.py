from pydantic import BaseModel


class LiveChatMessageCreateRequest(BaseModel):
    sender_id: str
    sender_name: str
    sender_role: str
    message: str
    message_type: str = "text"
    product_id: str | None = None
    offered_price: int | None = None
    offer_status: str | None = None


class LiveChatMessageResponse(BaseModel):
    id: str
    liveSessionId: str
    senderId: str
    senderName: str
    senderRole: str
    message: str
    messageType: str | None = None
    productId: str | None = None
    offeredPrice: int | None = None
    offerStatus: str | None = None
    createdAt: str
