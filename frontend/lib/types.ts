export type UserRole = "user" | "vendor" | "admin";
export type TutorialRole = "preAuth" | UserRole;

export interface AvatarOption {
  id: string;
  name: string;
  persona: string;
  image: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  avatar?: string;
}

export interface Vendor {
  id: string;
  userId: string;
  businessName: string;
  displayName: string;
  phone?: string;
  status: "pending" | "approved" | "rejected";
  commissionRate: number;
  image?: string;
  ownerName?: string;
  email?: string;
  businessCategory?: string;
  instagram?: string;
  website?: string;
  whatsapp?: string;
  businessDescription?: string;
  gstNumber?: string;
  fssaiNumber?: string;
  panNumber?: string;
  upiId?: string;
  bankAccountNumber?: string;
  ifsc?: string;
  city?: string;
  state?: string;
  pincode?: string;
  productCategories?: string[];
  address?: string;
  rejectionReason?: string;
  approvedAt?: string;
  approvedByAdminId?: string;
  createdAt?: string;
}

export interface Exhibition {
  id: string;
  title: string;
  description: string;
  bannerImage: string;
  category?: string;
  mapTemplateId?: string;
  map_template_id?: string;
  stallCount?: number;
  stall_count?: number;
  assignedStallsCount?: number;
  pendingVendorRequests?: number;
  liveSessionsCount?: number;
  message?: string;
  can_user_enter?: boolean;
  can_vendor_go_live?: boolean;
  seconds_until_start?: number | null;
  seconds_until_end?: number | null;
  startDate: string;
  endDate: string;
  status: "draft" | "scheduled" | "live" | "paused" | "ended" | "cancelled";
  createdByAdminId: string;
}

export interface Stall {
  id: string;
  exhibitionId: string;
  exhibitionTitle?: string | null;
  vendorId: string;
  assignedVendorId?: string | null;
  assignedVendorName?: string | null;
  name: string;
  stallCode?: string;
  category: string;
  mapX?: number;
  mapY?: number;
  width?: number;
  height?: number;
  stallType?: "basic" | "premium" | "featured" | string;
  rentAmount?: number;
  bookingStatus?: "draft" | "pending_payment" | "confirmed" | "cancelled" | string;
  paymentStatus?: "unpaid" | "paid" | "failed" | "refunded" | string;
  productLimit?: number;
  breakMessage?: string | null;
  liveStartedAt?: string | null;
  deliveryArea?: string | null;
  activeFrom?: string | null;
  activeTo?: string | null;
  isFeatured: boolean;
  status: "pending" | "active" | "inactive" | "available" | "assigned" | "live" | "offline" | "blocked";
  viewerCount: number;
  image: string;
  bannerImage?: string;
  vendorLogo?: string;
  featuredImage?: string;
  number?: string;
  vendorName?: string;
  description?: string;
  liveStatus?: "live" | "offline" | "starting-soon" | "break" | "busy";
  productCount?: number;
  proximityRadius?: number;
  route?: string;
  socialLinks?: {
    instagram?: string;
    website?: string;
    whatsapp?: string;
  };
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface Product {
  id: string;
  vendorId: string;
  stallId: string;
  title: string;
  description: string;
  price: number;
  compareAtPrice: number;
  images: string[];
  stock: number;
  status: "active" | "inactive";
  offerCode?: string;
}

export interface BargainSession {
  id: string;
  liveSessionId: string;
  stallId: string;
  vendorId: string;
  productId: string;
  sellingPrice: number;
  minVisibleOffer: number;
  offerStep: number;
  quantityLimit: number;
  counterPrice?: number | null;
  acceptedPrice?: number | null;
  status: "open" | "countered" | "accepted" | "closed" | string;
  endsAt?: string | null;
}

export interface BargainOfferGroup {
  offerPrice: number;
  customers: number;
}

export interface BargainOffer {
  id: string;
  sessionId: string;
  customerId: string;
  customerName: string;
  offerPrice: number;
  status: string;
  createdAt?: string | null;
}

export interface BargainDeal {
  id: string;
  sessionId: string;
  customerId: string;
  productId: string;
  sellingPrice: number;
  agreedPrice: number;
  discountAmount: number;
  status: string;
  expiresAt?: string | null;
}

export interface BargainState {
  session: BargainSession | null;
  product: Product | null;
  offerGroups: BargainOfferGroup[];
  currentHighestOffer: number | null;
  myOffer: BargainOffer | null;
  myDeal: BargainDeal | null;
}

export interface CartItem {
  id: string;
  title: string;
  price: number;
  originalPrice?: number | null;
  discountAmount?: number;
  bargainDealId?: string | null;
  quantity: number;
  vendorName: string;
  image: string;
  vendorId?: string;
  stallId?: string;
}

export interface OrderItem {
  id: string;
  vendorId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  title: string;
  vendorName: string;
  image: string;
}

export interface Order {
  id: string;
  userId: string;
  exhibitionId: string;
  stallId: string;
  vendorId: string;
  totalAmount: number;
  discountAmount: number;
  courierCharge?: number;
  gst?: number;
  commissionAmount?: number;
  vendorPayoutAmount?: number;
  paymentStatus: "pending" | "paid" | "failed";
  orderStatus: "placed" | "accepted" | "packing" | "shipped" | "delivered" | "fulfilled" | "cancelled";
  createdAt: string;
  shippingAddress?: string | null;
  shippingMapUrl?: string | null;
  trackingNumber?: string | null;
  packagePhotoUrl?: string | null;
  fulfilledAt?: string | null;
  customerName?: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
  items: OrderItem[];
  vendorName: string;
  estimatedDelivery: string;
}

export interface LiveSession {
  id: string;
  exhibitionId: string;
  stallId: string;
  vendorId: string;
  livekitRoomName: string;
  status: "scheduled" | "live" | "ended";
  pinnedProductId: string | null;
  pinned_product_id?: string | null;
  pinned_product?: Product | null;
  viewerCount: number;
  viewer_count?: number;
  likesCount: number;
  followCount: number;
  started_at?: string | null;
  ended_at?: string | null;
}

export interface VendorDashboardStats {
  productCount: number;
  orderCount: number;
  revenue: number;
  visitors: number;
  productsSold: number;
}

export interface LiveChatMessage {
  id: string;
  liveSessionId: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  message: string;
  messageType?: "text" | "product_enquiry" | "image" | "final_offer" | "system" | string;
  productId?: string | null;
  offeredPrice?: number | null;
  offerStatus?: "pending" | "accepted" | "rejected" | "expired" | string | null;
  createdAt: string;
}

export interface LiveKitConnection {
  mode: "real" | "fallback" | string;
  url?: string;
  token: string;
  room_name: string;
  identity: string;
  role?: UserRole | string;
  stall_id?: string;
}

export interface LiveStartResponse {
  live_session: Record<string, any>;
  livekit: LiveKitConnection;
  role: "vendor";
}

export interface LiveJoinResponse {
  live_session: Record<string, any>;
  pinned_product: Product | null;
  messages: LiveChatMessage[];
  livekit: LiveKitConnection;
  role: "user";
}

export interface VendorDashboard {
  vendor: Vendor;
  assignedStall?: Stall | null;
  participation?: VendorExhibitionRequest | null;
  currentLiveSession?: LiveSession | null;
  liveSession: LiveSession;
  pinnedProduct: Product | null;
  orders: Order[];
  recentOrders?: Order[];
  products?: Product[];
  productsSold: number;
  activeViewers: number;
  stats?: VendorDashboardStats;
}

export interface VendorExhibitionRequest {
  id: string;
  exhibition_id: string;
  vendor_id: string;
  status: "pending" | "accepted" | "denied" | "withdrawn" | "completed";
  message?: string;
  admin_note?: string | null;
  requested_at?: string;
  reviewed_at?: string | null;
  reviewed_by_admin_id?: string | null;
  vendor?: Record<string, any> | null;
  vendorName?: string;
  businessCategory?: string | null;
}

export interface AdminAnalytics {
  totalVisitors: number;
  activeStalls: number;
  liveSessions: number;
  orders: number;
  revenue: number;
  conversionRate: string;
  topStall: string | null;
  topProduct: string | null;
  vendorPerformance: Array<{
    vendorId?: string | null;
    vendor: string;
    revenue: number;
    viewers: number;
    orders?: number;
  }>;
  recentOrders: Order[];
}

export interface AdminDashboardTotals {
  exhibitions: number;
  activeExhibitions: number;
  upcomingExhibitions: number;
  vendors: number;
  pendingVendors: number;
  approvedVendors: number;
  stalls: number;
  assignedStalls: number;
  unassignedStalls: number;
  orders: number;
  revenue: number;
  liveSessions: number;
  liveVisitors: number;
  conversion: number;
}

export interface AdminRecentActivity {
  id: string;
  type: "vendor_request" | "order" | "live_session" | string;
  title: string;
  description: string;
  status?: string | null;
  createdAt?: string | null;
  href?: string | null;
}

export interface AdminDashboardResponse {
  totals: AdminDashboardTotals;
  activeExhibitions: Array<Exhibition & { ordersCount?: number }>;
  recentStalls: Stall[];
  vendorRequests: VendorExhibitionRequest[];
  recentOrders: Order[];
  recentActivities: AdminRecentActivity[];
  vendorPerformance: AdminAnalytics["vendorPerformance"];
  analytics: AdminAnalytics;
}

export interface LiveKitTokenPayload {
  room_name: string;
  identity: string;
  role: UserRole;
  stall_id: string;
}

export interface OnboardingState {
  completedRoles: TutorialRole[];
  skippedRoles: TutorialRole[];
  version: string;
  completedAt?: string | null;
  skippedAt?: string | null;
}

export interface TutorialSetting {
  enabled: boolean;
}

export interface AdvertisementBanner {
  id: string;
  title: string;
  imageUrl: string;
  altText: string;
  destinationType: "exhibition" | "stall";
  destinationId: string;
  destinationUrl: string;
  displayOrder: number;
  isActive: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export type VendorPostType = "product" | "offer" | "announcement" | "live" | "event";
export type VendorPostStatus = "draft" | "published" | "archived";
export type VendorPostModerationStatus = "pending" | "approved" | "rejected";

export interface VendorPublicProfile {
  id: string;
  vendorId: string;
  slug: string;
  displayName: string;
  bio?: string | null;
  category?: string | null;
  profileImageUrl?: string | null;
  bannerImageUrl?: string | null;
  websiteUrl?: string | null;
  instagramUrl?: string | null;
  whatsapp?: string | null;
  isPublic: boolean;
  followerCount: number;
  postCount: number;
  productCount: number;
  followingByMe: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface VendorPost {
  id: string;
  vendorId: string;
  productId?: string | null;
  stallId?: string | null;
  exhibitionId?: string | null;
  postType: VendorPostType | string;
  caption: string;
  mediaUrls: string[];
  thumbnailUrl?: string | null;
  status: VendorPostStatus | string;
  moderationStatus: VendorPostModerationStatus | string;
  rejectionReason?: string | null;
  isFeatured: boolean;
  isPromoted: boolean;
  publishedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  vendor?: VendorPublicProfile | null;
  product?: Product | null;
  likeCount: number;
  saveCount: number;
  likedByMe: boolean;
  savedByMe: boolean;
  followingVendor: boolean;
}

export interface FeedResponse {
  posts: VendorPost[];
  nextCursor?: string | null;
}

export interface SocialProfile {
  followedVendors: VendorPublicProfile[];
  savedPosts: VendorPost[];
  savedProducts: Product[];
  counts: {
    followedVendors: number;
    savedPosts: number;
    savedProducts: number;
  };
}

export interface FollowStateResponse {
  following: boolean;
  followerCount: number;
}

export interface AdminProductModerationItem extends Product {
  vendorName?: string;
}
