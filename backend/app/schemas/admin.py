from pydantic import BaseModel

from app.schemas.order import OrderResponse


class VendorPerformancePoint(BaseModel):
    vendorId: str | None = None
    vendor: str
    revenue: int
    viewers: int
    orders: int = 0


class AdminAnalyticsResponse(BaseModel):
    totalVisitors: int
    activeStalls: int
    liveSessions: int
    orders: int
    revenue: int
    conversionRate: str
    topStall: str | None = None
    topProduct: str | None = None
    vendorPerformance: list[VendorPerformancePoint]
    recentOrders: list[OrderResponse]


class AdminDashboardTotals(BaseModel):
    exhibitions: int
    activeExhibitions: int
    upcomingExhibitions: int
    vendors: int
    pendingVendors: int
    approvedVendors: int
    stalls: int
    assignedStalls: int
    unassignedStalls: int
    orders: int
    revenue: int
    liveSessions: int
    liveVisitors: int
    conversion: float


class AdminRecentActivity(BaseModel):
    id: str
    type: str
    title: str
    description: str
    status: str | None = None
    createdAt: str | None = None
    href: str | None = None


class AdminDashboardResponse(BaseModel):
    totals: AdminDashboardTotals
    activeExhibitions: list[dict]
    recentStalls: list[dict]
    vendorRequests: list[dict]
    recentOrders: list[OrderResponse]
    recentActivities: list[AdminRecentActivity]
    vendorPerformance: list[VendorPerformancePoint]
    analytics: AdminAnalyticsResponse
