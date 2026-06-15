import {
  AdminAnalytics,
  AdminDashboardResponse,
  AdminProductModerationItem,
  AdvertisementBanner,
  BargainState,
  CartItem,
  Exhibition,
  FeedResponse,
  FollowStateResponse,
  LiveChatMessage,
  LiveAccessStatus,
  LiveJoinResponse,
  LiveKitTokenPayload,
  LiveSlot,
  LiveStartResponse,
  OnboardingState,
  Order,
  Product,
  Stall,
  TutorialRole,
  TutorialSetting,
  User,
  UserRole,
  Vendor,
  VendorDashboard,
  VendorExhibitionRequest,
  VendorPost,
  VendorPostStatus,
  VendorPostType,
  VendorPublicProfile,
  SocialProfile,
  SubscriptionPlan,
  VendorSubscription,
  VendorSubscriptionState
} from "@/lib/types";
import { API_URL } from "@/lib/constants";

export class ApiRequestError extends Error {
  status: number;
  path: string;
  code?: string;

  constructor(message: string, options: { status: number; path: string; code?: string }) {
    super(message);
    this.name = "ApiRequestError";
    this.status = options.status;
    this.path = options.path;
    this.code = options.code;
  }
}

export function isApiNotFoundError(error: unknown): error is ApiRequestError {
  return error instanceof ApiRequestError && error.status === 404;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = readAuthToken();
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init?.headers ?? {})
      },
      cache: "no-store"
    });
  } catch (error) {
    throw new Error(
      `Could not reach API server for ${path}. Check NEXT_PUBLIC_API_URL or BACKEND_API_URL. ${
        error instanceof Error ? error.message : "Unknown network error."
      }`
    );
  }

  if (!response.ok) {
    let message = `API request failed for ${path} (${response.status} ${response.statusText || "HTTP error"})`;
    let code: string | undefined;
    try {
      const responseText = await response.text();
      if (responseText) {
        try {
          const errorBody = JSON.parse(responseText);
          const detail = errorBody?.detail;
          code = typeof detail === "object" && detail ? detail.code : errorBody?.code;
          message =
            (typeof detail === "string" ? detail : detail?.message ?? detail?.error) ??
            errorBody?.message ??
            message;
        } catch {
          message = responseText.slice(0, 220) || message;
        }
      }
      if (API_URL.startsWith("/") && response.status === 404) {
        message =
          `Backend route ${path} was not found through the Vercel proxy. ` +
          "Set Vercel BACKEND_API_URL to the public URL of the Render Python backend service, then redeploy.";
      }
    } catch {
      // Keep the default message if the backend did not return JSON.
    }
    throw new ApiRequestError(message, { status: response.status, path, code });
  }

  return response.json() as Promise<T>;
}

async function uploadRequest<T>(path: string, body: FormData): Promise<T> {
  const token = readAuthToken();
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method: "POST",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body,
      cache: "no-store"
    });
  } catch (error) {
    throw new Error(
      `Could not reach API server for ${path}. Check NEXT_PUBLIC_API_URL or BACKEND_API_URL. ${
        error instanceof Error ? error.message : "Unknown network error."
      }`
    );
  }

  if (!response.ok) {
    let message = `API request failed for ${path} (${response.status} ${response.statusText || "HTTP error"})`;
    let code: string | undefined;
    try {
      const responseText = await response.text();
      if (responseText) {
        const errorBody = JSON.parse(responseText);
        const detail = errorBody?.detail;
        code = typeof detail === "object" && detail ? detail.code : errorBody?.code;
        message =
          (typeof detail === "string" ? detail : detail?.message ?? detail?.error) ??
          errorBody?.message ??
          message;
      }
    } catch {
      // Keep default message if response is not JSON.
    }
    throw new ApiRequestError(message, { status: response.status, path, code });
  }

  return response.json() as Promise<T>;
}

function readAuthToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = window.localStorage.getItem("ankita-expoverse-store");
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    return parsed?.state?.authToken ?? null;
  } catch {
    return null;
  }
}

export function getExhibitions(): Promise<Exhibition[]> {
  return request<Exhibition[]>("/exhibitions");
}

export function getVendorExhibitions(): Promise<Exhibition[]> {
  return request<Exhibition[]>("/vendor/exhibitions");
}

export function getExhibition(id: string): Promise<Exhibition> {
  return request<Exhibition>(`/exhibitions/${id}`);
}

export function getStalls(exhibitionId: string): Promise<Stall[]> {
  return request<Stall[]>(`/exhibitions/${exhibitionId}/stalls`);
}

export function getPublicStalls(params?: {
  search?: string;
  category?: string;
  status?: string;
  featured?: boolean;
}): Promise<Stall[]> {
  const query = new URLSearchParams();
  if (params?.search) query.set("search", params.search);
  if (params?.category && params.category !== "all") query.set("category", params.category);
  if (params?.status && params.status !== "all") query.set("status", params.status);
  if (params?.featured) query.set("featured", "true");
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return request<Stall[]>(`/stalls${suffix}`);
}

export function getStall(stallId: string): Promise<Stall> {
  return request<Stall>(`/stalls/${stallId}`);
}

export function getStallProducts(stallId: string): Promise<Product[]> {
  return request<Product[]>(`/stalls/${stallId}/products`);
}

export function getProducts(): Promise<Product[]> {
  return request<Product[]>("/products");
}

export function getVendorProducts(): Promise<Product[]> {
  return request<Product[]>("/vendor/products");
}

export function createVendorProduct(payload: {
  title: string;
  description: string;
  price: number;
  compareAtPrice?: number;
  images?: string[];
  stock: number;
  status?: "active" | "inactive";
  stallId: string;
  offerCode?: string;
}): Promise<Product> {
  return request<Product>("/vendor/products", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function patchVendorProduct(productId: string, payload: Partial<{
  title: string;
  description: string;
  price: number;
  compareAtPrice: number;
  images: string[];
  stock: number;
  status: "active" | "inactive";
  offerCode: string;
}>): Promise<Product> {
  return request<Product>(`/vendor/products/${productId}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export function deleteVendorProduct(productId: string): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>(`/vendor/products/${productId}`, {
    method: "DELETE"
  });
}

export function getProduct(productId: string): Promise<Product> {
  return request<Product>(`/products/${productId}`);
}

export function getFeed(params?: {
  cursor?: string | null;
  limit?: number;
  category?: string;
  vendorId?: string;
  postType?: string;
}): Promise<FeedResponse> {
  const query = new URLSearchParams();
  if (params?.cursor) query.set("cursor", params.cursor);
  if (params?.limit) query.set("limit", String(params.limit));
  if (params?.category && params.category !== "all") query.set("category", params.category);
  if (params?.vendorId) query.set("vendor_id", params.vendorId);
  if (params?.postType && params.postType !== "all") query.set("post_type", params.postType);
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return request<FeedResponse>(`/feed${suffix}`);
}

export function getPostById(postId: string): Promise<VendorPost> {
  return request<VendorPost>(`/posts/${postId}`);
}

export function getVendorBySlug(slug: string): Promise<VendorPublicProfile> {
  return request<VendorPublicProfile>(`/vendors/${slug}`);
}

export function getVendorPostsBySlug(slug: string): Promise<VendorPost[]> {
  return request<VendorPost[]>(`/vendors/${slug}/posts`);
}

export function getVendorProductsBySlug(slug: string): Promise<Product[]> {
  return request<Product[]>(`/vendors/${slug}/products`);
}

export function getVendorStallsBySlug(slug: string): Promise<Stall[]> {
  return request<Stall[]>(`/vendors/${slug}/stalls`);
}

export function getVendorOwnProfile(): Promise<VendorPublicProfile> {
  return request<VendorPublicProfile>("/vendor/profile");
}

export function updateVendorOwnProfile(payload: Partial<{
  displayName: string;
  slug: string;
  bio: string;
  category: string;
  profileImageUrl: string;
  bannerImageUrl: string;
  websiteUrl: string;
  instagramUrl: string;
  whatsapp: string;
  isPublic: boolean;
}>): Promise<VendorPublicProfile> {
  return request<VendorPublicProfile>("/vendor/profile", {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export function getVendorOwnPosts(): Promise<VendorPost[]> {
  return request<VendorPost[]>("/vendor/posts");
}

export function createVendorPost(payload: {
  postType: VendorPostType;
  caption: string;
  mediaUrls?: string[];
  thumbnailUrl?: string | null;
  productId?: string | null;
  stallId?: string | null;
  exhibitionId?: string | null;
  status?: VendorPostStatus;
}): Promise<VendorPost> {
  return request<VendorPost>("/vendor/posts", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function updateVendorPost(postId: string, payload: Partial<{
  postType: VendorPostType;
  caption: string;
  mediaUrls: string[];
  thumbnailUrl: string | null;
  productId: string | null;
  stallId: string | null;
  exhibitionId: string | null;
  status: VendorPostStatus;
}>): Promise<VendorPost> {
  return request<VendorPost>(`/vendor/posts/${postId}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export function archiveVendorPost(postId: string): Promise<VendorPost> {
  return request<VendorPost>(`/vendor/posts/${postId}`, { method: "DELETE" });
}

export function publishVendorPost(postId: string): Promise<VendorPost> {
  return request<VendorPost>(`/vendor/posts/${postId}/publish`, {
    method: "POST",
    body: JSON.stringify({})
  });
}

export function followVendor(vendorId: string): Promise<FollowStateResponse> {
  return request<FollowStateResponse>(`/vendors/${vendorId}/follow`, {
    method: "POST",
    body: JSON.stringify({})
  });
}

export function unfollowVendor(vendorId: string): Promise<FollowStateResponse> {
  return request<FollowStateResponse>(`/vendors/${vendorId}/follow`, { method: "DELETE" });
}

export function likePost(postId: string): Promise<VendorPost> {
  return request<VendorPost>(`/posts/${postId}/like`, {
    method: "POST",
    body: JSON.stringify({})
  });
}

export function unlikePost(postId: string): Promise<VendorPost> {
  return request<VendorPost>(`/posts/${postId}/like`, { method: "DELETE" });
}

export function savePost(postId: string): Promise<VendorPost> {
  return request<VendorPost>(`/posts/${postId}/save`, {
    method: "POST",
    body: JSON.stringify({})
  });
}

export function unsavePost(postId: string): Promise<VendorPost> {
  return request<VendorPost>(`/posts/${postId}/save`, { method: "DELETE" });
}

export function saveProduct(productId: string): Promise<Product> {
  return request<Product>(`/products/${productId}/save`, {
    method: "POST",
    body: JSON.stringify({})
  });
}

export function unsaveProduct(productId: string): Promise<Product> {
  return request<Product>(`/products/${productId}/save`, { method: "DELETE" });
}

export function getUserSocial(): Promise<SocialProfile> {
  return request<SocialProfile>("/user/social");
}

export function getAdminFeedPosts(params?: {
  status?: string;
  moderationStatus?: string;
  postType?: string;
  vendorId?: string;
  featured?: boolean;
  promoted?: boolean;
  search?: string;
}): Promise<VendorPost[]> {
  const query = new URLSearchParams();
  if (params?.status && params.status !== "all") query.set("status", params.status);
  if (params?.moderationStatus && params.moderationStatus !== "all") query.set("moderation_status", params.moderationStatus);
  if (params?.postType && params.postType !== "all") query.set("post_type", params.postType);
  if (params?.vendorId) query.set("vendor_id", params.vendorId);
  if (params?.featured !== undefined) query.set("featured", String(params.featured));
  if (params?.promoted !== undefined) query.set("promoted", String(params.promoted));
  if (params?.search) query.set("search", params.search);
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return request<VendorPost[]>(`/admin/feed${suffix}`);
}

export function approveAdminPost(postId: string): Promise<VendorPost> {
  return request<VendorPost>(`/admin/feed/${postId}/approve`, { method: "PATCH", body: JSON.stringify({}) });
}

export function rejectAdminPost(postId: string, rejectionReason?: string): Promise<VendorPost> {
  return request<VendorPost>(`/admin/feed/${postId}/reject`, {
    method: "PATCH",
    body: JSON.stringify({ rejectionReason })
  });
}

export function featureAdminPost(postId: string, value?: boolean): Promise<VendorPost> {
  return request<VendorPost>(`/admin/feed/${postId}/feature`, {
    method: "PATCH",
    body: JSON.stringify({ value })
  });
}

export function promoteAdminPost(postId: string, value?: boolean): Promise<VendorPost> {
  return request<VendorPost>(`/admin/feed/${postId}/promote`, {
    method: "PATCH",
    body: JSON.stringify({ value })
  });
}

export function getAdminProducts(): Promise<AdminProductModerationItem[]> {
  return request<AdminProductModerationItem[]>("/admin/products");
}

export function updateAdminProductModeration(productId: string, payload: {
  status?: "active" | "inactive";
}): Promise<AdminProductModerationItem> {
  return request<AdminProductModerationItem>(`/admin/products/${productId}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export function getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  return request<SubscriptionPlan[]>("/subscription/plans");
}

export function getLiveSchedule(): Promise<LiveSlot[]> {
  return request<LiveSlot[]>("/live/schedule");
}

export function getVendorSubscription(): Promise<VendorSubscriptionState> {
  return request<VendorSubscriptionState>("/vendor/subscription");
}

export function requestVendorSubscription(planId: string): Promise<VendorSubscription> {
  return request<VendorSubscription>("/vendor/subscription/request", {
    method: "POST",
    body: JSON.stringify({ planId })
  });
}

export function submitVendorSubscriptionPaymentProof(payload: {
  subscriptionId: string;
  paymentProofUrl: string;
  paymentReference?: string;
}): Promise<VendorSubscription> {
  return request<VendorSubscription>("/vendor/subscription/payment-proof", {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export function getVendorLiveSlots(): Promise<LiveSlot[]> {
  return request<LiveSlot[]>("/vendor/live-slots");
}

export function requestVendorLiveSlot(payload: {
  title?: string;
  startTime: string;
  endTime: string;
  slotType: "subscription" | "exhibition" | "paid_extra" | "admin_assigned";
  exhibitionId?: string;
  stallId?: string;
  price?: number;
}): Promise<LiveSlot> {
  return request<LiveSlot>("/vendor/live-slots/request", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function submitVendorLiveSlotPaymentProof(slotId: string, payload: {
  paymentProofUrl: string;
  paymentReference?: string;
}): Promise<LiveSlot> {
  return request<LiveSlot>(`/vendor/live-slots/${slotId}/payment-proof`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export function cancelVendorLiveSlot(slotId: string): Promise<LiveSlot> {
  return request<LiveSlot>(`/vendor/live-slots/${slotId}/cancel`, { method: "PATCH", body: JSON.stringify({}) });
}

export function getVendorLiveAccess(stallId?: string): Promise<LiveAccessStatus> {
  const query = stallId ? `?stall_id=${encodeURIComponent(stallId)}` : "";
  return request<LiveAccessStatus>(`/vendor/live-access${query}`);
}

export function getAdminSubscriptions(params?: {
  status?: string;
  paymentStatus?: string;
  vendorId?: string;
  planId?: string;
}): Promise<VendorSubscription[]> {
  const query = new URLSearchParams();
  if (params?.status && params.status !== "all") query.set("status", params.status);
  if (params?.paymentStatus && params.paymentStatus !== "all") query.set("payment_status", params.paymentStatus);
  if (params?.vendorId) query.set("vendor_id", params.vendorId);
  if (params?.planId) query.set("plan_id", params.planId);
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return request<VendorSubscription[]>(`/admin/subscriptions${suffix}`);
}

export function approveAdminSubscription(subscriptionId: string): Promise<VendorSubscription> {
  return request<VendorSubscription>(`/admin/subscriptions/${subscriptionId}/approve`, { method: "PATCH", body: JSON.stringify({}) });
}

export function rejectAdminSubscription(subscriptionId: string, rejectionReason: string): Promise<VendorSubscription> {
  return request<VendorSubscription>(`/admin/subscriptions/${subscriptionId}/reject`, {
    method: "PATCH",
    body: JSON.stringify({ rejectionReason })
  });
}

export function cancelAdminSubscription(subscriptionId: string): Promise<VendorSubscription> {
  return request<VendorSubscription>(`/admin/subscriptions/${subscriptionId}/cancel`, { method: "PATCH", body: JSON.stringify({}) });
}

export function getAdminLiveSlots(params?: {
  status?: string;
  paymentStatus?: string;
  vendorId?: string;
  exhibitionId?: string;
}): Promise<LiveSlot[]> {
  const query = new URLSearchParams();
  if (params?.status && params.status !== "all") query.set("status", params.status);
  if (params?.paymentStatus && params.paymentStatus !== "all") query.set("payment_status", params.paymentStatus);
  if (params?.vendorId) query.set("vendor_id", params.vendorId);
  if (params?.exhibitionId) query.set("exhibition_id", params.exhibitionId);
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return request<LiveSlot[]>(`/admin/live-slots${suffix}`);
}

export function createAdminLiveSlot(payload: {
  vendorId: string;
  title?: string;
  startTime: string;
  endTime: string;
  slotType: "subscription" | "exhibition" | "paid_extra" | "admin_assigned";
  exhibitionId?: string;
  stallId?: string;
  price?: number;
}): Promise<LiveSlot> {
  return request<LiveSlot>("/admin/live-slots", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function approveAdminLiveSlot(slotId: string): Promise<LiveSlot> {
  return request<LiveSlot>(`/admin/live-slots/${slotId}/approve`, { method: "PATCH", body: JSON.stringify({}) });
}

export function rejectAdminLiveSlot(slotId: string, rejectionReason: string): Promise<LiveSlot> {
  return request<LiveSlot>(`/admin/live-slots/${slotId}/reject`, {
    method: "PATCH",
    body: JSON.stringify({ rejectionReason })
  });
}

export function cancelAdminLiveSlot(slotId: string): Promise<LiveSlot> {
  return request<LiveSlot>(`/admin/live-slots/${slotId}/cancel`, { method: "PATCH", body: JSON.stringify({}) });
}

type CreateOrderPayload = {
  items: CartItem[];
  payment_method: string;
  total_amount: number;
  shipping_address?: string;
};

export function createOrder(cart: CreateOrderPayload): Promise<Order> {
  const backendPayload = {
    ...cart,
    items: cart.items.map((item) => ({
      product_id: item.id,
      quantity: item.quantity
    }))
  };

  return request<Order>("/checkout/create-order", {
    method: "POST",
    body: JSON.stringify(backendPayload)
  });
}

type BackendCartItem = {
  product_id: string;
  title: string;
  price: number;
  original_price?: number | null;
  discount_amount?: number;
  bargain_deal_id?: string | null;
  quantity: number;
  vendor_name: string;
  image: string;
};

type BackendCartResponse = {
  items: BackendCartItem[];
};

function mapCartResponse(response: BackendCartResponse): CartItem[] {
  return response.items.map((item) => ({
    id: item.product_id,
    title: item.title,
    price: item.price,
    originalPrice: item.original_price,
    discountAmount: item.discount_amount ?? 0,
    bargainDealId: item.bargain_deal_id,
    quantity: item.quantity,
    vendorName: item.vendor_name,
    image: item.image
  }));
}

export async function getCart(): Promise<CartItem[]> {
  return mapCartResponse(await request<BackendCartResponse>("/cart"));
}

export async function addCartItem(productId: string, quantity: number, liveSessionId?: string): Promise<CartItem[]> {
  return mapCartResponse(
    await request<BackendCartResponse>("/cart/add", {
      method: "POST",
      body: JSON.stringify({ product_id: productId, quantity, live_session_id: liveSessionId })
    })
  );
}

export async function updateCartItem(productId: string, quantity: number): Promise<CartItem[]> {
  return mapCartResponse(
    await request<BackendCartResponse>(`/cart/items/${productId}`, {
      method: "PATCH",
      body: JSON.stringify({ quantity })
    })
  );
}

export async function deleteCartItem(productId: string): Promise<CartItem[]> {
  return mapCartResponse(
    await request<BackendCartResponse>(`/cart/items/${productId}`, {
      method: "DELETE"
    })
  );
}

export function getBargainState(liveSessionId: string): Promise<BargainState> {
  return request<BargainState>(`/bargains/live/${liveSessionId}`);
}

export function startBargain(payload: {
  liveSessionId: string;
  productId: string;
  basePrice: number;
  sellingPrice: number;
  minVisibleOffer?: number;
  offerStep: number;
  quantityLimit: number;
  durationMinutes: number;
}): Promise<BargainState> {
  return request<BargainState>("/vendor/bargains/start", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function placeBargainOffer(sessionId: string, offerPrice: number): Promise<BargainState> {
  return request<BargainState>(`/bargains/${sessionId}/offer`, {
    method: "POST",
    body: JSON.stringify({ offerPrice })
  });
}

export function acceptBargainCounter(sessionId: string): Promise<BargainState> {
  return request<BargainState>(`/bargains/${sessionId}/accept-counter`, {
    method: "POST"
  });
}

export function counterBargain(sessionId: string, counterPrice: number): Promise<BargainState> {
  return request<BargainState>(`/vendor/bargains/${sessionId}/counter`, {
    method: "POST",
    body: JSON.stringify({ counterPrice })
  });
}

export function acceptBargainGroup(sessionId: string, offerPrice: number): Promise<BargainState> {
  return request<BargainState>(`/vendor/bargains/${sessionId}/accept-group`, {
    method: "POST",
    body: JSON.stringify({ offerPrice })
  });
}

export function closeBargain(sessionId: string): Promise<BargainState> {
  return request<BargainState>(`/vendor/bargains/${sessionId}/close`, {
    method: "POST"
  });
}

export function getOrder(orderId: string): Promise<Order> {
  return request<Order>(`/orders/${orderId}`);
}

export function getVendorDashboard(): Promise<VendorDashboard> {
  return request<VendorDashboard>("/vendor/dashboard");
}

export function getVendorStall(): Promise<Stall> {
  return request<Stall>("/vendor/stall");
}

export function getAdminAnalytics(): Promise<AdminAnalytics> {
  return request<AdminAnalytics>("/admin/analytics");
}

export function getAdminDashboard(): Promise<AdminDashboardResponse> {
  return request<AdminDashboardResponse>("/admin/dashboard");
}

export function getLiveKitToken(payload: LiveKitTokenPayload): Promise<{
  mode: string;
  url?: string;
  token: string;
  room_name: string;
  identity: string;
}> {
  return request("/livekit/token", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function startVendorLive(payload: {
  exhibition_id: string;
  stall_id: string;
  vendor_id: string;
  stream_mode: "camera" | "rtmp";
}): Promise<LiveStartResponse> {
  return request<LiveStartResponse>("/vendor/live/start", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function joinLiveSession(stallId: string): Promise<LiveJoinResponse> {
  return request<LiveJoinResponse>(`/live-sessions/${stallId}/join`, {
    method: "POST",
    body: JSON.stringify({})
  });
}

export function getLiveSessionState(stallId: string): Promise<Pick<LiveJoinResponse, "live_session" | "pinned_product" | "messages">> {
  return request<Pick<LiveJoinResponse, "live_session" | "pinned_product" | "messages">>(`/live-sessions/${stallId}/state`);
}

export function getLiveStallChat(stallId: string): Promise<LiveChatMessage[]> {
  return request<LiveChatMessage[]>(`/live-sessions/${stallId}/chat`);
}

export function getLiveMessages(liveSessionId: string): Promise<LiveChatMessage[]> {
  return request<LiveChatMessage[]>(`/live/${liveSessionId}/messages`);
}

export function postLiveStallChat(stallId: string, payload: {
  sender_id: string;
  sender_name: string;
  sender_role: string;
  message: string;
}): Promise<LiveChatMessage> {
  return request<LiveChatMessage>(`/live-sessions/${stallId}/chat`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function postLiveMessage(liveSessionId: string, payload: {
  sender_id: string;
  sender_name: string;
  sender_role: string;
  message: string;
}): Promise<LiveChatMessage> {
  return request<LiveChatMessage>(`/live/${liveSessionId}/messages`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function endVendorLive(): Promise<LiveStartResponse["live_session"]> {
  return request<LiveStartResponse["live_session"]>("/vendor/live/end", {
    method: "POST",
    body: JSON.stringify({})
  });
}

export function pinLiveProduct(liveSessionId: string, productId: string): Promise<LiveStartResponse["live_session"]> {
  return request<LiveStartResponse["live_session"]>(`/vendor/live/${liveSessionId}/pin-product`, {
    method: "PATCH",
    body: JSON.stringify({ pinned_product_id: productId })
  });
}

export function getFeaturedExhibitionStalls() {
  return getExhibitions().then((exhibitions) => {
    const exhibition = exhibitions.find((item) => item.status === "live") ?? exhibitions[0];
    return exhibition ? getStalls(exhibition.id) : Promise.resolve([]);
  });
}

export type AuthResponse = {
  token: string;
  user: User;
  vendor?: Vendor;
  message?: string;
};

export function loginWithBackend(payload: { email: string; password: string }): Promise<AuthResponse> {
  return request<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function loginWithGoogle(payload: { idToken: string }): Promise<AuthResponse> {
  return request<AuthResponse>("/auth/google", {
    method: "POST",
    body: JSON.stringify({ id_token: payload.idToken })
  });
}

export function getAuthMe(): Promise<AuthResponse> {
  return request<AuthResponse>("/auth/me");
}

export function registerWithBackend(payload: {
  role: UserRole;
  name?: string;
    owner_name?: string;
    business_name?: string;
  email: string;
  phone?: string;
  password: string;
  business_category?: string;
  instagram?: string;
  website?: string;
  whatsapp?: string;
    business_description?: string;
    gst_number?: string;
    fssai_number?: string;
    pan_number?: string;
    upi_id?: string;
    bank_account_number?: string;
    ifsc?: string;
    city?: string;
    state?: string;
    pincode?: string;
    product_categories?: string[];
    address?: string;
}): Promise<AuthResponse> {
  return request<AuthResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function getAdminVendors(): Promise<Vendor[]> {
  return request<Vendor[]>("/admin/vendors");
}

export function approveAdminVendor(vendorId: string): Promise<Vendor> {
  return request<Vendor>(`/admin/vendors/${vendorId}/approve`, { method: "PATCH" });
}

export function rejectAdminVendor(vendorId: string): Promise<Vendor> {
  return request<Vendor>(`/admin/vendors/${vendorId}/reject`, { method: "PATCH" });
}

export function getAdminOrders(): Promise<Order[]> {
  return request<Order[]>("/admin/orders");
}

export function getAdminStalls(): Promise<Stall[]> {
  return request<Stall[]>("/admin/stalls");
}

export function updateVendorStall(payload: Partial<{
  name: string;
  category: string;
  description: string;
  bannerImage: string;
  vendorLogo: string;
  liveStatus: "live" | "break" | "offline" | "busy";
  breakMessage: string;
  deliveryArea: string;
}>): Promise<Stall> {
  return request<Stall>("/vendor/stall", {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export function bookVendorStall(payload: {
  stall_type: "basic" | "premium" | "featured";
  exhibition_id?: string;
  active_from?: string;
  active_to?: string;
}): Promise<Stall> {
  return request<Stall>("/vendor/stall/book", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function createAdminStall(payload: {
  exhibition_id: string;
  vendor_id?: string | null;
  name: string;
  category: string;
  map_x: number;
  map_y: number;
  is_featured: boolean;
  status?: Stall["status"];
}): Promise<Stall> {
  return request<Stall>("/admin/stalls", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function getVendorOrders(): Promise<Order[]> {
  return request<Order[]>("/vendor/orders");
}

export function updateVendorOrderStatus(orderId: string, payload: {
  orderStatus: Order["orderStatus"];
  trackingNumber?: string;
  packagePhotoUrl?: string;
}): Promise<Order> {
  return request<Order>(`/vendor/orders/${orderId}/status`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export function getUserOrders(): Promise<Order[]> {
  return request<Order[]>("/user/orders");
}

export function updateUserAvatar(avatar: string): Promise<User> {
  return request<User>("/user/avatar", {
    method: "PATCH",
    body: JSON.stringify({ avatar })
  });
}

export function uploadImage(uploadType: "product_image" | "profile_picture" | "stall_banner" | "vendor_logo" | "package_photo" | "advertisement_banner" | "exhibition_banner" | "subscription_payment_proof" | "live_slot_payment_proof", file: Blob): Promise<{
  url: string;
  publicId: string;
  width?: number;
  height?: number;
  format?: string;
  bytes?: number;
}> {
  const formData = new FormData();
  formData.append("file", file, `${uploadType}.jpg`);
  return uploadRequest(`/uploads/image?upload_type=${encodeURIComponent(uploadType)}`, formData);
}

export function getMyOnboarding(): Promise<OnboardingState> {
  return request<OnboardingState>("/user/onboarding");
}

export function patchMyOnboarding(payload: {
  role: TutorialRole;
  status: "completed" | "skipped";
  version?: string;
}): Promise<OnboardingState> {
  return request<OnboardingState>("/user/onboarding", {
    method: "PATCH",
    body: JSON.stringify({ version: "v1", ...payload })
  });
}

export function getTutorialSetting(): Promise<TutorialSetting> {
  return request<TutorialSetting>("/settings/tutorial");
}

export function patchTutorialSetting(enabled: boolean): Promise<TutorialSetting> {
  return request<TutorialSetting>("/admin/settings/tutorial", {
    method: "PATCH",
    body: JSON.stringify({ enabled })
  });
}

export function getAdminExhibitions(): Promise<Exhibition[]> {
  return request<Exhibition[]>("/admin/exhibitions");
}

export function createAdminExhibition(payload: {
  title: string;
  description: string;
  category?: string;
  banner_image_url?: string;
  stall_count?: number;
  mapTemplateId?: string;
  map_template_id?: string;
  start_at?: string;
  end_at?: string;
  status?: Exhibition["status"];
}): Promise<{ exhibition: Exhibition; stalls_created: number }> {
  return request<{ exhibition: Exhibition; stalls_created: number }>("/admin/exhibitions", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function patchAdminExhibition(
  exhibitionId: string,
  payload: Partial<Pick<Exhibition, "title" | "description" | "status" | "mapTemplateId" | "map_template_id">>
): Promise<Exhibition> {
  return request<Exhibition>(`/admin/exhibitions/${exhibitionId}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export function getAdminExhibitionStalls(exhibitionId: string): Promise<Stall[]> {
  return request<Stall[]>(`/admin/exhibitions/${exhibitionId}/stalls`);
}

export function assignVendorToStall(stallId: string, vendorId: string): Promise<Stall> {
  return request<Stall>(`/admin/stalls/${stallId}/assign-vendor`, {
    method: "POST",
    body: JSON.stringify({ vendor_id: vendorId })
  });
}

export function removeVendorFromStall(stallId: string): Promise<Stall> {
  return request<Stall>(`/admin/stalls/${stallId}/remove-vendor`, {
    method: "POST",
    body: JSON.stringify({})
  });
}

export function startExhibition(exhibitionId: string): Promise<Exhibition> {
  return request<Exhibition>(`/admin/exhibitions/${exhibitionId}/start`, { method: "POST", body: JSON.stringify({}) });
}

export function pauseExhibition(exhibitionId: string): Promise<Exhibition> {
  return request<Exhibition>(`/admin/exhibitions/${exhibitionId}/pause`, { method: "POST", body: JSON.stringify({}) });
}

export function resumeExhibition(exhibitionId: string): Promise<Exhibition> {
  return request<Exhibition>(`/admin/exhibitions/${exhibitionId}/resume`, { method: "POST", body: JSON.stringify({}) });
}

export function endExhibition(exhibitionId: string): Promise<Exhibition> {
  return request<Exhibition>(`/admin/exhibitions/${exhibitionId}/end`, { method: "POST", body: JSON.stringify({}) });
}

export function cancelExhibition(exhibitionId: string): Promise<Exhibition> {
  return request<Exhibition>(`/admin/exhibitions/${exhibitionId}/cancel`, { method: "POST", body: JSON.stringify({}) });
}

export function getExhibitionVendorRequests(exhibitionId: string): Promise<VendorExhibitionRequest[]> {
  return request<VendorExhibitionRequest[]>(`/admin/exhibitions/${exhibitionId}/vendor-requests`);
}

export function acceptVendorRequest(exhibitionId: string, requestId: string): Promise<VendorExhibitionRequest> {
  return request<VendorExhibitionRequest>(`/admin/exhibitions/${exhibitionId}/vendor-requests/${requestId}/accept`, {
    method: "POST",
    body: JSON.stringify({})
  });
}

export function denyVendorRequest(exhibitionId: string, requestId: string, reason?: string): Promise<VendorExhibitionRequest> {
  return request<VendorExhibitionRequest>(`/admin/exhibitions/${exhibitionId}/vendor-requests/${requestId}/deny`, {
    method: "POST",
    body: JSON.stringify({ reason })
  });
}

export function requestJoinExhibition(exhibitionId: string, message: string): Promise<VendorExhibitionRequest> {
  return request<VendorExhibitionRequest>(`/vendor/exhibitions/${exhibitionId}/request-join`, {
    method: "POST",
    body: JSON.stringify({ message })
  });
}

export function leaveVendorExhibition(exhibitionId: string): Promise<{
  status: "left";
  request: VendorExhibitionRequest;
  stallReleased: boolean;
  endedLiveSessions: number;
}> {
  return request(`/vendor/exhibitions/${exhibitionId}/leave`, {
    method: "POST",
    body: JSON.stringify({})
  });
}

export function getVendorExhibitionRequests(): Promise<VendorExhibitionRequest[]> {
  return request<VendorExhibitionRequest[]>("/vendor/exhibition-requests");
}

function normalizeAdvertisementDate(value?: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? null : date.toISOString();
}

export function getAdvertisements(): Promise<AdvertisementBanner[]> {
  return request<AdvertisementBanner[]>("/advertisements");
}

export function getAdminAdvertisements(): Promise<AdvertisementBanner[]> {
  return request<AdvertisementBanner[]>("/admin/advertisements");
}

export function createAdminAdvertisement(payload: {
  title: string;
  imageUrl: string;
  altText: string;
  destinationType: AdvertisementBanner["destinationType"];
  destinationId: string;
  displayOrder: number;
  isActive: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
}): Promise<AdvertisementBanner> {
  return request<AdvertisementBanner>("/admin/advertisements", {
    method: "POST",
    body: JSON.stringify({
      title: payload.title,
      image_url: payload.imageUrl,
      alt_text: payload.altText,
      destination_type: payload.destinationType,
      destination_id: payload.destinationId,
      display_order: payload.displayOrder,
      is_active: payload.isActive,
      starts_at: normalizeAdvertisementDate(payload.startsAt),
      ends_at: normalizeAdvertisementDate(payload.endsAt)
    })
  });
}

export function patchAdminAdvertisement(
  bannerId: string,
  payload: Partial<Pick<AdvertisementBanner, "title" | "imageUrl" | "altText" | "destinationType" | "destinationId" | "displayOrder" | "isActive" | "startsAt" | "endsAt">>
): Promise<AdvertisementBanner> {
  const body: Record<string, unknown> = {};
  if (payload.title !== undefined) body.title = payload.title;
  if (payload.imageUrl !== undefined) body.image_url = payload.imageUrl;
  if (payload.altText !== undefined) body.alt_text = payload.altText;
  if (payload.destinationType !== undefined) body.destination_type = payload.destinationType;
  if (payload.destinationId !== undefined) body.destination_id = payload.destinationId;
  if (payload.displayOrder !== undefined) body.display_order = payload.displayOrder;
  if (payload.isActive !== undefined) body.is_active = payload.isActive;
  if (payload.startsAt !== undefined) body.starts_at = normalizeAdvertisementDate(payload.startsAt);
  if (payload.endsAt !== undefined) body.ends_at = normalizeAdvertisementDate(payload.endsAt);
  return request<AdvertisementBanner>(`/admin/advertisements/${bannerId}`, {
    method: "PATCH",
    body: JSON.stringify(body)
  });
}

export function deleteAdminAdvertisement(bannerId: string): Promise<{ status: "deleted"; id: string }> {
  return request<{ status: "deleted"; id: string }>(`/admin/advertisements/${bannerId}`, { method: "DELETE" });
}
