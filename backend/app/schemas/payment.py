from pydantic import BaseModel


class PaymentResponse(BaseModel):
    id: str
    orderId: str
    provider: str
    providerPaymentId: str | None = None
    amount: int
    status: str
    createdAt: str
