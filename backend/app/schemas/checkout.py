from pydantic import BaseModel

class CheckoutItemRequest(BaseModel):
    product_id: str
    quantity: int = 1


class CheckoutCreateOrderRequest(BaseModel):
    items: list[CheckoutItemRequest]
    payment_method: str = "UPI"
    total_amount: int | None = None
    shipping_address: str | None = None
    shipping_map_url: str | None = None
