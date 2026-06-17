from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.exhibition import Exhibition
from app.models.live_session import LiveSession
from app.models.order import Order, OrderItem
from app.models.product import Product
from app.models.stall import Stall
from app.models.vendor import Vendor
from app.models.vendor_exhibition_request import VendorExhibitionRequest
from app.services.db_data_service import (
    end_stale_live_session,
    is_live_session_current,
    serialize_exhibition,
    serialize_live_session,
    serialize_order,
    serialize_product,
    serialize_stall,
    serialize_vendor,
    serialize_vendor_request,
)


class AnalyticsService:
    def get_vendor_dashboard(self, db: Session, vendor_id: str) -> dict:
        vendor = db.get(Vendor, vendor_id)
        if vendor is None:
            raise ValueError("Vendor not found")
        latest_live_session = db.scalar(
            select(LiveSession)
            .where(LiveSession.vendor_id == vendor_id)
            .order_by(LiveSession.started_at.desc().nulls_last(), LiveSession.id.desc())
        )
        current_live_session = db.scalar(
            select(LiveSession)
            .where(LiveSession.vendor_id == vendor_id, LiveSession.status == "live")
            .order_by(LiveSession.started_at.desc().nulls_last(), LiveSession.id.desc())
        )
        stall = db.scalar(select(Stall).where(Stall.vendor_id == vendor_id))
        if current_live_session is not None and not is_live_session_current(current_live_session):
            end_stale_live_session(db, current_live_session, stall)
            db.commit()
            current_live_session = None
        latest_request = db.scalar(
            select(VendorExhibitionRequest)
            .where(VendorExhibitionRequest.vendor_id == vendor_id)
            .order_by(VendorExhibitionRequest.requested_at.desc().nulls_last(), VendorExhibitionRequest.id.desc())
        )
        session_for_pin = current_live_session
        pinned_product = db.get(Product, session_for_pin.pinned_product_id) if session_for_pin and session_for_pin.pinned_product_id else None
        vendor_order_ids = select(OrderItem.order_id).where(OrderItem.vendor_id == vendor_id)
        vendor_orders = db.scalars(
            select(Order)
            .where(Order.id.in_(vendor_order_ids))
            .order_by(Order.created_at.desc())
        ).all()
        orders = [serialize_order(db, order) for order in vendor_orders]
        products_sold = db.scalar(select(func.coalesce(func.sum(OrderItem.quantity), 0)).where(OrderItem.vendor_id == vendor_id)) or 0
        product_count = db.scalar(select(func.count(Product.id)).where(Product.vendor_id == vendor_id)) or 0
        order_count = db.scalar(select(func.count(func.distinct(OrderItem.order_id))).where(OrderItem.vendor_id == vendor_id)) or 0
        paid_revenue = db.scalar(
            select(func.coalesce(func.sum(OrderItem.total_price), 0))
            .join(Order, Order.id == OrderItem.order_id)
            .where(OrderItem.vendor_id == vendor_id, Order.payment_status == "paid")
        ) or 0
        active_products = [
            serialize_product(product)
            for product in db.scalars(
                select(Product)
                .where(Product.vendor_id == vendor_id, Product.status == "active")
                .order_by(Product.id.asc())
                .limit(8)
            ).all()
        ]
        serialized_current_live_session = serialize_live_session(db, current_live_session) if current_live_session else None
        serialized_latest_live_session = serialize_live_session(db, latest_live_session) if latest_live_session else {
            "id": "",
            "stallId": stall.id if stall else "",
            "stall_id": stall.id if stall else "",
            "vendorId": vendor_id,
            "vendor_id": vendor_id,
            "livekitRoomName": "",
            "livekit_room_name": "",
            "status": "ended",
            "stream_mode": "camera",
            "camera_enabled": False,
            "rtmp_url": None,
            "stream_key": None,
            "token_mode": "real",
            "pinnedProductId": None,
            "pinned_product_id": None,
            "pinned_product": None,
            "viewerCount": 0,
            "viewer_count": 0,
            "likesCount": 0,
            "likes_count": 0,
            "followCount": 0,
            "follow_count": 0,
            "started_at": None,
            "ended_at": None,
        }
        return {
            "vendor": serialize_vendor(vendor),
            "assignedStall": serialize_stall(db, stall) if stall else None,
            "participation": serialize_vendor_request(db, latest_request) if latest_request else None,
            "currentLiveSession": serialized_current_live_session,
            "liveSession": serialized_latest_live_session,
            "pinnedProduct": serialize_product(pinned_product) if pinned_product else None,
            "orders": orders,
            "recentOrders": orders[:5],
            "products": [product for product in active_products if product is not None],
            "productsSold": int(products_sold),
            "activeViewers": current_live_session.viewer_count if current_live_session else 0,
            "stats": {
                "productCount": int(product_count),
                "orderCount": int(order_count),
                "revenue": int(paid_revenue),
                "visitors": current_live_session.viewer_count if current_live_session else 0,
                "productsSold": int(products_sold),
            },
        }

    def get_admin_analytics(self, db: Session) -> dict:
        total_revenue = db.scalar(
            select(func.coalesce(func.sum(Order.total_amount), 0)).where(Order.payment_status == "paid")
        ) or 0
        orders = db.scalar(select(func.count(Order.id))) or 0
        active_sessions = db.scalar(select(func.count(LiveSession.id)).where(LiveSession.status == "live")) or 0
        total_visitors = db.scalar(
            select(func.coalesce(func.sum(LiveSession.viewer_count), 0)).where(LiveSession.status == "live")
        ) or 0
        active_stalls = db.scalar(
            select(func.count(Stall.id)).where(Stall.status.in_(["active", "assigned", "live"]))
        ) or 0
        recent_orders = [
            serialize_order(db, order)
            for order in db.scalars(select(Order).order_by(Order.created_at.desc()).limit(5)).all()
        ]
        top_session = db.scalar(select(LiveSession).order_by(LiveSession.viewer_count.desc()).limit(1))
        top_stall = db.get(Stall, top_session.stall_id) if top_session else None
        top_order_item = db.scalar(
            select(OrderItem.product_id)
            .group_by(OrderItem.product_id)
            .order_by(func.sum(OrderItem.quantity).desc())
            .limit(1)
        )
        top_product = db.get(Product, top_order_item) if top_order_item else None
        vendor_performance = []
        for vendor in db.scalars(select(Vendor).order_by(Vendor.created_at.desc())).all():
            vendor_revenue = db.scalar(
                select(func.coalesce(func.sum(OrderItem.total_price), 0))
                .join(Order, Order.id == OrderItem.order_id)
                .where(OrderItem.vendor_id == vendor.id, Order.payment_status == "paid")
            ) or 0
            vendor_viewers = db.scalar(
                select(func.coalesce(func.sum(LiveSession.viewer_count), 0)).where(LiveSession.vendor_id == vendor.id)
            ) or 0
            if vendor_revenue or vendor_viewers:
                vendor_performance.append({
                    "vendorId": vendor.id,
                    "vendor": vendor.display_name,
                    "revenue": int(vendor_revenue),
                    "viewers": int(vendor_viewers),
                    "orders": int(db.scalar(
                        select(func.count(func.distinct(OrderItem.order_id)))
                        .join(Order, Order.id == OrderItem.order_id)
                        .where(OrderItem.vendor_id == vendor.id, Order.payment_status == "paid")
                    ) or 0),
                })
        vendor_performance.sort(key=lambda item: (item["revenue"], item["viewers"]), reverse=True)
        conversion_rate = f"{((orders / total_visitors) * 100):.1f}%" if total_visitors else "0%"
        return {
            "totalVisitors": int(total_visitors),
            "activeStalls": int(active_stalls),
            "liveSessions": int(active_sessions),
            "orders": int(orders),
            "revenue": int(total_revenue),
            "conversionRate": conversion_rate,
            "topStall": top_stall.name if top_stall else None,
            "topProduct": top_product.title if top_product else None,
            "vendorPerformance": vendor_performance[:5],
            "recentOrders": recent_orders,
        }

    def get_admin_dashboard(self, db: Session) -> dict:
        operational_exhibition_statuses = ["live", "scheduled", "paused"]
        total_exhibitions = db.scalar(select(func.count(Exhibition.id))) or 0
        active_exhibitions = db.scalar(
            select(func.count(Exhibition.id)).where(Exhibition.status.in_(operational_exhibition_statuses))
        ) or 0
        upcoming_exhibitions = db.scalar(
            select(func.count(Exhibition.id)).where(Exhibition.status == "scheduled")
        ) or 0
        total_vendors = db.scalar(select(func.count(Vendor.id))) or 0
        pending_vendors = db.scalar(select(func.count(Vendor.id)).where(Vendor.status == "pending")) or 0
        approved_vendors = db.scalar(select(func.count(Vendor.id)).where(Vendor.status == "approved")) or 0
        total_stalls = db.scalar(select(func.count(Stall.id))) or 0
        assigned_stalls = db.scalar(select(func.count(Stall.id)).where(Stall.vendor_id.is_not(None))) or 0
        unassigned_stalls = db.scalar(select(func.count(Stall.id)).where(Stall.vendor_id.is_(None))) or 0
        total_orders = db.scalar(select(func.count(Order.id))) or 0
        total_revenue = db.scalar(
            select(func.coalesce(func.sum(Order.total_amount), 0)).where(Order.payment_status == "paid")
        ) or 0
        live_sessions = db.scalar(select(func.count(LiveSession.id)).where(LiveSession.status == "live")) or 0
        live_visitors = db.scalar(
            select(func.coalesce(func.sum(LiveSession.viewer_count), 0)).where(LiveSession.status == "live")
        ) or 0
        conversion = round((float(total_orders) / float(live_visitors)) * 100, 1) if live_visitors else 0

        exhibition_records = db.scalars(
            select(Exhibition)
            .where(Exhibition.status.in_(operational_exhibition_statuses))
            .order_by(Exhibition.start_at.asc(), Exhibition.created_at.desc())
            .limit(6)
        ).all()
        active_exhibition_payload = []
        for exhibition in exhibition_records:
            serialized = serialize_exhibition(db, exhibition)
            stall_ids = select(Stall.id).where(Stall.exhibition_id == exhibition.id)
            serialized["ordersCount"] = int(db.scalar(
                select(func.count(func.distinct(OrderItem.order_id)))
                .join(Product, Product.id == OrderItem.product_id)
                .where(Product.stall_id.in_(stall_ids))
            ) or 0)
            active_exhibition_payload.append(serialized)

        recent_stall_payload = []
        recent_stalls = db.scalars(
            select(Stall)
            .order_by(Stall.updated_at.desc().nulls_last(), Stall.created_at.desc().nulls_last(), Stall.id.asc())
            .limit(8)
        ).all()
        for stall in recent_stalls:
            serialized = serialize_stall(db, stall)
            exhibition = db.get(Exhibition, stall.exhibition_id)
            serialized["exhibitionTitle"] = exhibition.title if exhibition else None
            recent_stall_payload.append(serialized)

        vendor_requests = [
            serialize_vendor_request(db, request)
            for request in db.scalars(
                select(VendorExhibitionRequest)
                .order_by(VendorExhibitionRequest.requested_at.desc().nulls_last(), VendorExhibitionRequest.id.desc())
                .limit(6)
            ).all()
        ]

        recent_orders = [
            serialize_order(db, order)
            for order in db.scalars(select(Order).order_by(Order.created_at.desc()).limit(6)).all()
        ]

        recent_activities = []
        for request in db.scalars(
            select(VendorExhibitionRequest)
            .where(VendorExhibitionRequest.status == "pending")
            .order_by(VendorExhibitionRequest.requested_at.desc().nulls_last())
            .limit(3)
        ).all():
            vendor = db.get(Vendor, request.vendor_id)
            exhibition = db.get(Exhibition, request.exhibition_id)
            recent_activities.append({
                "id": f"request-{request.id}",
                "type": "vendor_request",
                "title": "Vendor participation request",
                "description": f"{vendor.display_name if vendor else 'Vendor'} requested {exhibition.title if exhibition else 'an exhibition'}",
                "status": request.status,
                "createdAt": request.requested_at.isoformat() if request.requested_at else None,
                "href": "/admin/vendors",
            })
        for order in db.scalars(select(Order).order_by(Order.created_at.desc()).limit(3)).all():
            recent_activities.append({
                "id": f"order-{order.id}",
                "type": "order",
                "title": "Order received",
                "description": f"Order {order.id} is {order.order_status}",
                "status": order.payment_status,
                "createdAt": order.created_at.isoformat() if order.created_at else None,
                "href": "/admin/orders",
            })
        for session in db.scalars(
            select(LiveSession)
            .where(LiveSession.status == "live")
            .order_by(LiveSession.started_at.desc().nulls_last())
            .limit(2)
        ).all():
            vendor = db.get(Vendor, session.vendor_id)
            recent_activities.append({
                "id": f"live-{session.id}",
                "type": "live_session",
                "title": "Live session active",
                "description": f"{vendor.display_name if vendor else 'Vendor'} is live",
                "status": session.status,
                "createdAt": session.started_at.isoformat() if session.started_at else None,
                "href": "/admin/exhibitions",
            })
        recent_activities.sort(key=lambda item: item.get("createdAt") or "", reverse=True)

        analytics = self.get_admin_analytics(db)
        analytics["vendorPerformance"] = analytics["vendorPerformance"][:5]
        return {
            "totals": {
                "exhibitions": int(total_exhibitions),
                "activeExhibitions": int(active_exhibitions),
                "upcomingExhibitions": int(upcoming_exhibitions),
                "vendors": int(total_vendors),
                "pendingVendors": int(pending_vendors),
                "approvedVendors": int(approved_vendors),
                "stalls": int(total_stalls),
                "assignedStalls": int(assigned_stalls),
                "unassignedStalls": int(unassigned_stalls),
                "orders": int(total_orders),
                "revenue": int(total_revenue),
                "liveSessions": int(live_sessions),
                "liveVisitors": int(live_visitors),
                "conversion": conversion,
            },
            "activeExhibitions": active_exhibition_payload,
            "recentStalls": recent_stall_payload,
            "vendorRequests": vendor_requests,
            "recentOrders": recent_orders,
            "recentActivities": recent_activities[:8],
            "vendorPerformance": analytics["vendorPerformance"],
            "analytics": analytics,
        }


analytics_service = AnalyticsService()
