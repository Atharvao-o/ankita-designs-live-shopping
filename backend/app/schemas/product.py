from pydantic import BaseModel


class ProductResponse(BaseModel):
    id: str
    vendorId: str
    stallId: str
    title: str
    description: str
    category: str | None = None
    price: int
    compareAtPrice: int
    discountPrice: int | None = None
    images: list[str]
    videoUrl: str | None = None
    cataloguePdfUrl: str | None = None
    stock: int
    status: str
    deliveryArea: str | None = None
    codAvailable: bool | None = None
    courierCharge: int | None = None
    offerCode: str | None = None


class ProductCreateRequest(BaseModel):
    title: str
    description: str
    category: str | None = None
    price: int
    compareAtPrice: int | None = None
    discountPrice: int | None = None
    images: list[str] = []
    videoUrl: str | None = None
    cataloguePdfUrl: str | None = None
    stock: int = 0
    status: str = "active"
    stallId: str
    offerCode: str | None = None
    deliveryArea: str | None = None
    codAvailable: bool | None = None
    courierCharge: int | None = None


class ProductUpdateRequest(BaseModel):
    title: str | None = None
    description: str | None = None
    category: str | None = None
    price: int | None = None
    compareAtPrice: int | None = None
    discountPrice: int | None = None
    images: list[str] | None = None
    videoUrl: str | None = None
    cataloguePdfUrl: str | None = None
    stock: int | None = None
    status: str | None = None
    offerCode: str | None = None
    deliveryArea: str | None = None
    codAvailable: bool | None = None
    courierCharge: int | None = None
