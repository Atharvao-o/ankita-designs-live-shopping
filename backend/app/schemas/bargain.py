from pydantic import BaseModel


class BargainSessionCreateRequest(BaseModel):
    liveSessionId: str
    productId: str
    basePrice: int
    sellingPrice: int
    minVisibleOffer: int | None = None
    offerStep: int = 10
    quantityLimit: int = 1
    durationMinutes: int = 10


class BargainOfferRequest(BaseModel):
    offerPrice: int


class BargainCounterRequest(BaseModel):
    counterPrice: int


class BargainAcceptGroupRequest(BaseModel):
    offerPrice: int


class BargainStateResponse(BaseModel):
    session: dict | None
    product: dict | None = None
    offerGroups: list[dict] = []
    currentHighestOffer: int | None = None
    myOffer: dict | None = None
    myDeal: dict | None = None
