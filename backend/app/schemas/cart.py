from pydantic import BaseModel


class CartItemResponse(BaseModel):
    product_id: str
    title: str
    price: int
    original_price: int | None = None
    discount_amount: int = 0
    bargain_deal_id: str | None = None
    quantity: int
    vendor_name: str
    image: str


class CartResponse(BaseModel):
    items: list[CartItemResponse]


class CartAddRequest(BaseModel):
    product_id: str
    quantity: int
    live_session_id: str | None = None


class CartUpdateRequest(BaseModel):
    quantity: int
