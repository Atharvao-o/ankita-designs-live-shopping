from datetime import timedelta
from uuid import uuid4

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.bargain import BargainDeal, BargainOffer, BargainSession
from app.models.live_session import LiveSession
from app.models.product import Product
from app.models.stall import Stall
from app.models.user import User
from app.services.db_data_service import as_int, now_utc, serialize_product


def serialize_bargain_session(session: BargainSession) -> dict:
    return {
        "id": session.id,
        "liveSessionId": session.live_session_id,
        "stallId": session.stall_id,
        "vendorId": session.vendor_id,
        "productId": session.product_id,
        "sellingPrice": as_int(session.selling_price),
        "minVisibleOffer": as_int(session.min_visible_offer),
        "offerStep": session.offer_step,
        "quantityLimit": session.quantity_limit,
        "counterPrice": as_int(session.counter_price),
        "acceptedPrice": as_int(session.accepted_price),
        "status": session.status,
        "endsAt": session.ends_at.isoformat() if session.ends_at else None,
    }


def serialize_bargain_offer(offer: BargainOffer) -> dict:
    return {
        "id": offer.id,
        "sessionId": offer.session_id,
        "customerId": offer.customer_id,
        "customerName": offer.customer_name,
        "offerPrice": as_int(offer.offer_price),
        "status": offer.status,
        "createdAt": offer.created_at.isoformat() if offer.created_at else None,
    }


def serialize_bargain_deal(deal: BargainDeal) -> dict:
    return {
        "id": deal.id,
        "sessionId": deal.session_id,
        "customerId": deal.customer_id,
        "productId": deal.product_id,
        "sellingPrice": as_int(deal.selling_price),
        "agreedPrice": as_int(deal.agreed_price),
        "discountAmount": as_int(deal.discount_amount),
        "status": deal.status,
        "expiresAt": deal.expires_at.isoformat() if deal.expires_at else None,
    }


def active_session_for_live(db: Session, live_session_id: str) -> BargainSession | None:
    session = db.scalar(
        select(BargainSession)
        .where(BargainSession.live_session_id == live_session_id, BargainSession.status.in_(["open", "countered", "accepted"]))
        .order_by(BargainSession.created_at.desc())
    )
    if session and session.ends_at and session.ends_at <= now_utc() and session.status in {"open", "countered", "accepted"}:
        session.status = "closed"
        db.commit()
        return None
    return session


def _active_deal_for_customer(db: Session, session_id: str, customer_id: str) -> BargainDeal | None:
    deal = db.scalar(
        select(BargainDeal).where(
            BargainDeal.session_id == session_id,
            BargainDeal.customer_id == customer_id,
            BargainDeal.status == "accepted",
            BargainDeal.expires_at > now_utc(),
        )
    )
    return deal


def _session_deal_payload(session: BargainSession, customer_id: str | None = None) -> dict | None:
    if session.accepted_price is None:
        return None
    agreed_price = as_int(session.accepted_price)
    return {
        "id": f"session-{session.id}",
        "sessionId": session.id,
        "customerId": customer_id or "live-stream",
        "productId": session.product_id,
        "sellingPrice": as_int(session.selling_price),
        "agreedPrice": agreed_price,
        "discountAmount": max(0, as_int(session.selling_price) - agreed_price),
        "status": "accepted",
        "expiresAt": session.ends_at.isoformat() if session.ends_at else None,
    }


def _create_deal(db: Session, session: BargainSession, customer_id: str, agreed_price: int) -> BargainDeal:
    existing = _active_deal_for_customer(db, session.id, customer_id)
    if existing:
        return existing
    deal = BargainDeal(
        id=str(uuid4()),
        session_id=session.id,
        customer_id=customer_id,
        vendor_id=session.vendor_id,
        stall_id=session.stall_id,
        product_id=session.product_id,
        selling_price=session.selling_price,
        agreed_price=agreed_price,
        discount_amount=max(0, as_int(session.selling_price) - agreed_price),
        status="accepted",
        expires_at=now_utc() + timedelta(minutes=15),
    )
    db.add(deal)
    return deal


def state_payload(db: Session, live_session_id: str, user: User | None = None) -> dict:
    session = active_session_for_live(db, live_session_id)
    if session is None:
        return {"session": None, "product": None, "offerGroups": [], "currentHighestOffer": None, "myOffer": None, "myDeal": None}
    product = db.get(Product, session.product_id)
    grouped_rows = db.execute(
        select(BargainOffer.offer_price, func.count(BargainOffer.id))
        .where(BargainOffer.session_id == session.id, BargainOffer.status == "active")
        .group_by(BargainOffer.offer_price)
        .order_by(BargainOffer.offer_price.desc())
    ).all()
    groups = [{"offerPrice": as_int(price), "customers": count} for price, count in grouped_rows]
    my_offer = None
    my_deal = _session_deal_payload(session, user.id if user else None)
    if user:
        offer = db.scalar(select(BargainOffer).where(BargainOffer.session_id == session.id, BargainOffer.customer_id == user.id))
        deal = _active_deal_for_customer(db, session.id, user.id)
        my_offer = serialize_bargain_offer(offer) if offer else None
        my_deal = serialize_bargain_deal(deal) if deal else my_deal
    return {
        "session": serialize_bargain_session(session),
        "product": serialize_product(product) if product else None,
        "offerGroups": groups,
        "currentHighestOffer": groups[0]["offerPrice"] if groups else None,
        "myOffer": my_offer,
        "myDeal": my_deal,
    }


def start_session(
    db: Session,
    *,
    vendor_id: str,
    live_session_id: str,
    product_id: str,
    base_price: int,
    selling_price: int,
    min_visible_offer: int | None,
    offer_step: int,
    quantity_limit: int,
    duration_minutes: int,
) -> BargainSession:
    live_session = db.get(LiveSession, live_session_id)
    if live_session is None or live_session.status != "live":
        raise HTTPException(status_code=404, detail={"code": "LIVE_SESSION_NOT_FOUND", "message": "Live session is not active."})
    if live_session.vendor_id != vendor_id:
        raise HTTPException(status_code=403, detail={"code": "UNAUTHORIZED", "message": "This live session does not belong to the vendor."})
    product = db.get(Product, product_id)
    if product is None or product.vendor_id != vendor_id or product.stall_id != live_session.stall_id:
        raise HTTPException(status_code=404, detail={"code": "PRODUCT_NOT_FOUND", "message": "Product not found for this live session."})
    if base_price < 1 or selling_price < base_price:
        raise HTTPException(status_code=400, detail={"code": "INVALID_PRICE", "message": "Selling price must be greater than or equal to base price."})
    current = active_session_for_live(db, live_session_id)
    if current:
        current.status = "closed"

    session = BargainSession(
        id=str(uuid4()),
        live_session_id=live_session_id,
        stall_id=live_session.stall_id,
        vendor_id=vendor_id,
        product_id=product_id,
        base_price=base_price,
        selling_price=selling_price,
        min_visible_offer=max(base_price, min_visible_offer or base_price),
        offer_step=max(1, offer_step),
        quantity_limit=max(1, quantity_limit),
        status="open",
        ends_at=now_utc() + timedelta(minutes=max(1, duration_minutes)),
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


def place_offer(db: Session, *, session_id: str, customer: User, offer_price: int) -> None:
    session = db.get(BargainSession, session_id)
    if session is None or session.status not in {"open", "countered"}:
        raise HTTPException(status_code=404, detail={"code": "BARGAIN_CLOSED", "message": "Bargain is not active."})
    if session.ends_at and session.ends_at <= now_utc():
        session.status = "closed"
        db.commit()
        raise HTTPException(status_code=400, detail={"code": "BARGAIN_EXPIRED", "message": "This bargain has expired."})
    if offer_price < as_int(session.base_price):
        raise HTTPException(status_code=400, detail={"code": "OFFER_TOO_LOW", "message": "Offer is too low for this live deal."})
    if offer_price < as_int(session.min_visible_offer):
        raise HTTPException(status_code=400, detail={"code": "OFFER_TOO_LOW", "message": "Offer is too low for this live deal."})
    if offer_price > as_int(session.selling_price):
        raise HTTPException(status_code=400, detail={"code": "OFFER_TOO_HIGH", "message": "Offer cannot be above current live price."})

    offer = db.scalar(select(BargainOffer).where(BargainOffer.session_id == session.id, BargainOffer.customer_id == customer.id))
    if offer is None:
        offer = BargainOffer(id=str(uuid4()), session_id=session.id, customer_id=customer.id, customer_name=customer.name, offer_price=offer_price, status="active")
        db.add(offer)
    else:
        offer.offer_price = offer_price
        offer.status = "active"
        offer.updated_at = now_utc()

    db.commit()


def accept_group(db: Session, *, session_id: str, vendor_id: str, offer_price: int) -> int:
    session = db.get(BargainSession, session_id)
    if session is None or session.vendor_id != vendor_id:
        raise HTTPException(status_code=404, detail={"code": "BARGAIN_NOT_FOUND", "message": "Bargain session not found."})
    if offer_price < as_int(session.base_price) or offer_price > as_int(session.selling_price):
        raise HTTPException(status_code=400, detail={"code": "INVALID_ACCEPTED_PRICE", "message": "Accepted price must be between base price and selling price."})
    offers = db.scalars(
        select(BargainOffer)
        .where(BargainOffer.session_id == session.id, BargainOffer.status == "active")
        .order_by(BargainOffer.offer_price.desc(), BargainOffer.created_at.asc())
    ).all()
    for offer in offers:
        offer.status = "accepted" if as_int(offer.offer_price) >= offer_price else "closed"
    session.status = "accepted"
    session.accepted_price = offer_price
    session.counter_price = None
    db.commit()
    return len([offer for offer in offers if as_int(offer.offer_price) >= offer_price])


def counter_group(db: Session, *, session_id: str, vendor_id: str, counter_price: int) -> BargainSession:
    session = db.get(BargainSession, session_id)
    if session is None or session.vendor_id != vendor_id:
        raise HTTPException(status_code=404, detail={"code": "BARGAIN_NOT_FOUND", "message": "Bargain session not found."})
    if counter_price < as_int(session.base_price) or counter_price > as_int(session.selling_price):
        raise HTTPException(status_code=400, detail={"code": "INVALID_COUNTER", "message": "Counter must be between base price and selling price."})
    session.counter_price = counter_price
    session.status = "countered"
    db.commit()
    db.refresh(session)
    return session


def accept_counter(db: Session, *, session_id: str, customer: User) -> BargainDeal:
    raise HTTPException(
        status_code=400,
        detail={
            "code": "VENDOR_ACCEPT_REQUIRED",
            "message": "The vendor must accept one shared live deal price before customers can buy at the bargain price.",
        },
    )


def active_deal_for_product(db: Session, *, user_id: str, product_id: str, live_session_id: str | None = None) -> BargainDeal | None:
    existing = db.scalar(
        select(BargainDeal)
        .where(
            BargainDeal.customer_id == user_id,
            BargainDeal.product_id == product_id,
            BargainDeal.status == "accepted",
            BargainDeal.expires_at > now_utc(),
        )
        .order_by(BargainDeal.created_at.desc())
    )
    if existing:
        return existing

    if not live_session_id:
        return None

    session = db.scalar(
        select(BargainSession)
        .join(LiveSession, LiveSession.id == BargainSession.live_session_id)
        .where(
            BargainSession.live_session_id == live_session_id,
            BargainSession.product_id == product_id,
            BargainSession.status == "accepted",
            BargainSession.accepted_price.is_not(None),
            LiveSession.status == "live",
        )
        .order_by(BargainSession.updated_at.desc())
    )
    if session is None:
        return None
    if session.ends_at and session.ends_at <= now_utc():
        return None

    deal = _create_deal(db, session, user_id, as_int(session.accepted_price))
    db.commit()
    db.refresh(deal)
    return deal
