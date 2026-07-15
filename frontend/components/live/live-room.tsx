"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  Eye,
  Gavel,
  MessageCircleMore,
  Minus,
  Package,
  Plus,
  Radio,
  Send,
  Share2,
  ShoppingBag,
  ShoppingCart,
  Store,
  X
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Screen } from "@/components/layout/screen";
import { AppImage } from "@/components/ui/app-image";
import { buttonStyles } from "@/components/ui/button";
import { cn, formatPrice } from "@/lib/utils";
import { useExpoStore } from "@/lib/cart-store";
import { CartDrawer } from "@/components/cart/cart-drawer";
import {
  addCartItem,
  getBargainState,
  getLiveMessages,
  getLiveSessionState,
  getStall,
  getStallProducts,
  joinLiveSession,
  placeBargainOffer,
  postLiveMessage
} from "@/lib/api";
import { BargainState, LiveChatMessage, LiveKitConnection, Product, Stall } from "@/lib/types";
import { UserLiveKitViewer } from "@/components/live/user-livekit-viewer";
import { LiveElapsedCounter } from "@/components/marketplace/live-timers";
import { ResponsiveDeviceView } from "@/components/mobile/responsive-device-view";

type LiveViewStatus = "connecting" | "live" | "offline";
type CommerceSheet = "chat" | "products" | "bargain" | null;
type RailTab = "chat" | "products" | "offers";
type QuantitySetter = (updater: (current: number) => number) => void;

function productDiscount(product: Product) {
  if (!product.compareAtPrice || product.compareAtPrice <= product.price) {
    return 0;
  }
  return Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100);
}

function productImage(product?: Product | null) {
  return product?.images?.[0] || "/products/product-placeholder.png";
}

function productInStock(product?: Product | null) {
  return Boolean(product && product.status === "active" && product.stock > 0);
}

function customerSafeLiveError(message: string, fallback: string) {
  if (!message) return fallback;
  if (/api server|backend_api_url|next_public_api_url|configured|failed to fetch|network/i.test(message.toLowerCase())) {
    return fallback;
  }
  return message;
}

function compactCount(value: number) {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return String(value);
}

function initialsFor(name: string) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
  return initials || "AD";
}

export function LiveRoom({ stallId }: { stallId: string }) {
  const router = useRouter();
  const [quantity, setQuantity] = useState(1);
  const [cartPulse, setCartPulse] = useState(false);
  const [message, setMessage] = useState("");
  const [mobileSheet, setMobileSheet] = useState<CommerceSheet>(null);
  const [desktopTab, setDesktopTab] = useState<RailTab>("chat");
  const [livekitConnection, setLivekitConnection] = useState<LiveKitConnection | null>(null);
  const [streamError, setStreamError] = useState("");
  const [chatError, setChatError] = useState("");
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [liveSessionId, setLiveSessionId] = useState("");
  const [liveStartedAt, setLiveStartedAt] = useState<string | null>(null);
  const [stall, setStall] = useState<Stall | null>(null);
  const [productCatalog, setProductCatalog] = useState<Product[]>([]);
  const [pinnedProduct, setPinnedProduct] = useState<Product | null>(null);
  const [bargainState, setBargainState] = useState<BargainState | null>(null);
  const [offerDraft, setOfferDraft] = useState(0);
  const offerDraftSessionRef = useRef("");
  const offerDraftVendorPriceKeyRef = useRef("");
  const [bargainError, setBargainError] = useState("");
  const [dataError, setDataError] = useState("");
  const [shareStatus, setShareStatus] = useState("");
  const [isJoining, setIsJoining] = useState(true);

  const openCart = useExpoStore((state) => state.openCart);
  const setCartItems = useExpoStore((state) => state.setCartItems);
  const liveSession = useExpoStore((state) => state.liveSession);
  const chatMessages = useExpoStore((state) => state.chatMessages);
  const currentUser = useExpoStore((state) => state.currentUser);
  const syncLiveSession = useExpoStore((state) => state.syncLiveSession);
  const setChatMessages = useExpoStore((state) => state.setChatMessages);
  const mergeChatMessages = useExpoStore((state) => state.mergeChatMessages);
  const pinProduct = useExpoStore((state) => state.pinProduct);

  const vendorName = stall?.vendorName ?? stall?.assignedVendorName ?? "Vendor";
  const stallName = stall?.name ?? stallId;
  const featured = useMemo(
    () => pinnedProduct ?? productCatalog.find((item) => item.id === liveSession.pinnedProductId) ?? null,
    [liveSession.pinnedProductId, pinnedProduct, productCatalog]
  );
  const relatedProducts = useMemo(
    () => productCatalog.filter((item) => item.id !== featured?.id).slice(0, 8),
    [featured?.id, productCatalog]
  );
  const productQueue = useMemo(
    () => [featured, ...relatedProducts].filter((item): item is Product => Boolean(item)).slice(0, 8),
    [featured, relatedProducts]
  );
  const recentMessages = chatMessages.slice(-5);
  const viewerCount = liveSession.viewerCount ?? stall?.viewerCount ?? 0;
  const canChat = currentUser?.role === "user";
  const liveStatus: LiveViewStatus = isJoining ? "connecting" : liveSession.status === "live" ? "live" : "offline";
  const hasBargain = Boolean(bargainState?.session);

  const syncOfferDraftFromBargainState = useCallback((state: BargainState | null) => {
    const session = state?.session;
    if (!session) {
      offerDraftSessionRef.current = "";
      offerDraftVendorPriceKeyRef.current = "";
      setOfferDraft(0);
      return;
    }

    const vendorPriceKey = `${session.id}:${session.sellingPrice}:${session.counterPrice ?? ""}`;
    if (offerDraftSessionRef.current !== session.id) {
      offerDraftSessionRef.current = session.id;
      offerDraftVendorPriceKeyRef.current = vendorPriceKey;
      setOfferDraft(session.counterPrice ?? session.sellingPrice ?? state.myOffer?.offerPrice ?? session.minVisibleOffer ?? 0);
      return;
    }

    if (offerDraftVendorPriceKeyRef.current !== vendorPriceKey) {
      offerDraftVendorPriceKeyRef.current = vendorPriceKey;
      setOfferDraft(session.counterPrice ?? session.sellingPrice ?? state.myOffer?.offerPrice ?? session.minVisibleOffer ?? 0);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const loadStallProducts = async () => {
      try {
        const [stallResponse, productsResponse] = await Promise.all([
          getStall(stallId),
          getStallProducts(stallId)
        ]);
        if (!active) return;
        setStall(stallResponse);
        setProductCatalog(productsResponse.filter((product) => product.status === "active"));
        setDataError("");
      } catch (error) {
        if (active) {
          setDataError(error instanceof Error ? error.message : "Could not load stall products.");
        }
      }
    };
    loadStallProducts();
    return () => {
      active = false;
    };
  }, [stallId]);

  useEffect(() => {
    let active = true;
    setChatMessages([]);

    const applyRoomState = (response: Awaited<ReturnType<typeof joinLiveSession>> | Awaited<ReturnType<typeof getLiveSessionState>>) => {
      const session = response.live_session;
      const sessionId = session.id ?? session.liveSessionId;
      if (sessionId) setLiveSessionId(sessionId);
      setLiveStartedAt(session.started_at ?? session.startedAt ?? null);
      const pinnedProductId = session.pinnedProductId ?? session.pinned_product_id ?? response.pinned_product?.id;
      syncLiveSession({
        status: session.status,
        pinnedProductId,
        viewerCount: session.viewerCount ?? session.viewer_count
      });
      if (pinnedProductId) pinProduct(pinnedProductId);
      setPinnedProduct(response.pinned_product ?? null);
      if (response.messages) setChatMessages(response.messages);
      if (sessionId) {
        getBargainState(sessionId)
          .then((state) => {
            if (!active) return;
            setBargainState(state);
            syncOfferDraftFromBargainState(state);
            setBargainError("");
          })
          .catch(() => {
            if (active) setBargainError("Could not load bargain state.");
          });
      }
    };

    const joinRoom = async () => {
      try {
        setIsJoining(true);
        const response = await joinLiveSession(stallId);
        if (!active) return;
        applyRoomState(response);
        setLivekitConnection(response.livekit);
        setStreamError(response.livekit?.mode === "real" ? "" : "Camera streaming is not available for this session.");
      } catch (error) {
        if (active) {
          setStreamError(error instanceof Error ? error.message : "Could not join stream. Please try again.");
          setLivekitConnection(null);
        }
      } finally {
        if (active) setIsJoining(false);
      }
    };

    const syncRoom = async () => {
      try {
        const [response, productsResponse] = await Promise.all([
          getLiveSessionState(stallId),
          getStallProducts(stallId)
        ]);
        if (!active) return;
        applyRoomState(response);
        setProductCatalog(productsResponse.filter((product) => product.status === "active"));
        const sessionId = response.live_session.id ?? response.live_session.liveSessionId;
        if (sessionId) {
          const messages = await getLiveMessages(sessionId);
          const state = await getBargainState(sessionId).catch(() => null);
          if (!active) return;
          setChatMessages(messages);
          if (state) {
            setBargainState(state);
            syncOfferDraftFromBargainState(state);
          }
          setChatError("");
        }
      } catch {
        if (active) setChatError("Could not refresh chat. Retrying...");
      }
    };

    joinRoom();
    const intervalId = window.setInterval(syncRoom, 2000);
    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [pinProduct, setChatMessages, stallId, syncLiveSession, syncOfferDraftFromBargainState]);

  const addProductToCart = useCallback(
    async (product: Product | null = featured, itemQuantity = quantity, shouldOpenCart = true) => {
      if (!product) {
        setDataError("Product is not available right now.");
        return false;
      }
      if (!productInStock(product)) {
        setDataError("This product is currently out of stock.");
        return false;
      }
      try {
        const items = await addCartItem(product.id, itemQuantity, liveSessionId || liveSession.id);
        setCartItems(items);
        if (shouldOpenCart) openCart();
        setDataError("");
        setCartPulse(true);
        window.setTimeout(() => setCartPulse(false), 450);
        return true;
      } catch (error) {
        setDataError(error instanceof Error ? error.message : "Could not add product to cart.");
        return false;
      }
    },
    [featured, liveSession.id, liveSessionId, openCart, quantity, setCartItems]
  );

  const buyNow = useCallback(
    async (product: Product | null = featured) => {
      const didAdd = await addProductToCart(product, quantity, false);
      if (didAdd) router.push("/checkout");
    },
    [addProductToCart, featured, quantity, router]
  );

  const submitBargainOffer = async () => {
    if (!bargainState?.session) {
      setBargainError("Vendor has not opened bargaining yet.");
      return;
    }
    if (!currentUser || currentUser.role !== "user") {
      setBargainError("Login as a customer to bargain.");
      return;
    }
    try {
      const state = await placeBargainOffer(bargainState.session.id, offerDraft);
      setBargainState(state);
      syncOfferDraftFromBargainState(state);
      setBargainError("");
    } catch (error) {
      setBargainError(error instanceof Error ? error.message : "Could not place offer.");
    }
  };

  const submitMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = message.trim();
    if (!text) return;
    if (!canChat || !currentUser) {
      setChatError("Please login as a customer to chat.");
      return;
    }
    const sessionId = liveSessionId || liveSession.id;
    if (!sessionId) {
      setChatError("Live chat is connecting. Try again in a moment.");
      return;
    }
    setIsSendingMessage(true);
    try {
      const savedMessage = await postLiveMessage(sessionId, {
        sender_id: currentUser.id,
        sender_name: currentUser.name,
        sender_role: "user",
        message: text
      });
      mergeChatMessages([savedMessage]);
      const messages = await getLiveMessages(sessionId);
      setChatMessages(messages);
      setChatError("");
      setMessage("");
    } catch {
      setChatError("Message failed to send. Try again.");
    } finally {
      setIsSendingMessage(false);
    }
  };

  const leaveLive = () => router.push(stall?.exhibitionId ? `/exhibition/${stall.exhibitionId}` : "/exhibitions");

  const shareLive = useCallback(async () => {
    const shareUrl = typeof window !== "undefined" ? window.location.href : "";
    const shareTitle = `${vendorName} live at ${stallName}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: shareTitle, text: "Join this Ankita Designs live shopping room.", url: shareUrl });
        setShareStatus("Shared live room.");
      } else if (navigator.clipboard && shareUrl) {
        await navigator.clipboard.writeText(shareUrl);
        setShareStatus("Live link copied.");
      } else {
        setShareStatus("Copy this page link to share.");
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setShareStatus("Could not share. Try copying the link.");
    }
    window.setTimeout(() => setShareStatus(""), 2400);
  }, [stallName, vendorName]);

  const sharedRoomProps = {
    stall,
    vendorName,
    stallName,
    liveStatus,
    viewerCount,
    liveStartedAt,
    featured,
    relatedProducts,
    productQueue,
    productCatalog,
    quantity,
    setQuantity,
    cartPulse,
    livekitConnection,
    isJoining,
    streamError,
    messages: recentMessages,
    message,
    setMessage,
    onSubmit: submitMessage,
    canChat,
    chatError,
    isSendingMessage,
    bargainState,
    offerDraft,
    setOfferDraft,
    onPlaceOffer: submitBargainOffer,
    bargainError,
    onAddToCart: addProductToCart,
    onBuyNow: buyNow,
    onShowOrders: () => router.push("/orders"),
    onLeave: leaveLive,
    onShare: shareLive,
    onOpenCart: openCart,
    shareStatus,
    dataError,
    hasBargain
  };

  return (
    <Screen>
      <ResponsiveDeviceView
        mobile={
          <MobileLiveCommerceRoom
            {...sharedRoomProps}
            activeSheet={mobileSheet}
            setActiveSheet={setMobileSheet}
          />
        }
        desktop={
          <DesktopLiveCommerceRoom
            {...sharedRoomProps}
            activeTab={desktopTab}
            setActiveTab={setDesktopTab}
          />
        }
      />
      <CartDrawer />
    </Screen>
  );
}

function MobileLiveCommerceRoom({
  stall,
  vendorName,
  stallName,
  liveStatus,
  viewerCount,
  liveStartedAt,
  featured,
  relatedProducts,
  productQueue,
  productCatalog,
  quantity,
  setQuantity,
  cartPulse,
  livekitConnection,
  isJoining,
  streamError,
  messages,
  message,
  setMessage,
  onSubmit,
  canChat,
  chatError,
  isSendingMessage,
  activeSheet,
  setActiveSheet,
  bargainState,
  offerDraft,
  setOfferDraft,
  onPlaceOffer,
  bargainError,
  onAddToCart,
  onBuyNow,
  onShowOrders,
  onLeave,
  onShare,
  onOpenCart,
  shareStatus,
  dataError,
  hasBargain
}: LiveRoomSharedProps & {
  activeSheet: CommerceSheet;
  setActiveSheet: (sheet: CommerceSheet) => void;
}) {
  return (
    <section className="h-[100dvh] w-full overflow-hidden bg-[#05040A] text-white" aria-label="Customer live shopping room">
      <div className="relative h-full w-full overflow-hidden bg-[#05040A]">
        <LiveVideoSurface
          livekitConnection={livekitConnection}
          isJoining={isJoining}
          streamError={streamError}
        />
        <VideoScrims />

        <TopLiveOverlay
          stall={stall}
          vendorName={vendorName}
          stallName={stallName}
          liveStatus={liveStatus}
          viewerCount={viewerCount}
          liveStartedAt={liveStartedAt}
          onLeave={onLeave}
        />

        <RecentChatOverlay messages={messages} className="bottom-[calc(13.8rem+env(safe-area-inset-bottom))]" />

        <MobilePinnedProductCard
          product={featured}
          quantity={quantity}
          setQuantity={setQuantity}
          cartPulse={cartPulse}
          onAddToCart={() => void onAddToCart(featured)}
          onBuyNow={() => void onBuyNow(featured)}
          dataError={dataError}
        />

        <MobileActionDock
          message={message}
          setMessage={setMessage}
          onSubmit={onSubmit}
          canChat={canChat}
          chatError={chatError}
          isSendingMessage={isSendingMessage}
          productCount={productCatalog.length}
          hasBargain={hasBargain}
          onOpenProducts={() => setActiveSheet("products")}
          onOpenBargain={() => setActiveSheet("bargain")}
          onOpenChat={() => setActiveSheet("chat")}
          onShare={onShare}
          onOpenCart={onOpenCart}
          shareStatus={shareStatus}
        />
      </div>

      <LiveBottomSheet
        open={activeSheet === "chat"}
        title="Live chat"
        description="Read the full customer conversation and send a message."
        onClose={() => setActiveSheet(null)}
      >
        <ChatSheetContent
          messages={messages}
          message={message}
          setMessage={setMessage}
          onSubmit={onSubmit}
          canChat={canChat}
          chatError={chatError}
          isSendingMessage={isSendingMessage}
        />
      </LiveBottomSheet>

      <LiveBottomSheet
        open={activeSheet === "products"}
        title="Live products"
        description="Browse products available in this live room."
        onClose={() => setActiveSheet(null)}
      >
        <ProductSheetContent
          featured={featured}
          products={productQueue}
          onAddToCart={onAddToCart}
          onBuyNow={onBuyNow}
        />
      </LiveBottomSheet>

      <LiveBottomSheet
        open={activeSheet === "bargain"}
        title="Live offer"
        description="Make a real offer only when the vendor has opened bargaining."
        onClose={() => setActiveSheet(null)}
      >
        <CustomerBargainPanel
          bargainState={bargainState}
          offerDraft={offerDraft}
          setOfferDraft={setOfferDraft}
          onPlaceOffer={onPlaceOffer}
          onAddToCart={() => void onAddToCart(featured)}
          error={bargainError}
          tone="dark"
        />
      </LiveBottomSheet>
    </section>
  );
}

function DesktopLiveCommerceRoom({
  stall,
  vendorName,
  stallName,
  liveStatus,
  viewerCount,
  liveStartedAt,
  featured,
  relatedProducts,
  productQueue,
  productCatalog,
  quantity,
  setQuantity,
  cartPulse,
  livekitConnection,
  isJoining,
  streamError,
  messages,
  message,
  setMessage,
  onSubmit,
  canChat,
  chatError,
  isSendingMessage,
  activeTab,
  setActiveTab,
  bargainState,
  offerDraft,
  setOfferDraft,
  onPlaceOffer,
  bargainError,
  onAddToCart,
  onBuyNow,
  onShowOrders,
  onLeave,
  onShare,
  onOpenCart,
  shareStatus,
  dataError
}: LiveRoomSharedProps & {
  activeTab: RailTab;
  setActiveTab: (tab: RailTab) => void;
}) {
  return (
    <section className="h-[100dvh] w-full overflow-hidden bg-[#05040A] p-3 text-white lg:p-5" aria-label="Desktop customer live shopping room">
      <div className="mx-auto grid h-full max-w-[1800px] grid-cols-[minmax(0,1fr)_minmax(340px,32vw)] gap-4">
        <div className="relative min-w-0 overflow-hidden rounded-[28px] border border-white/10 bg-[#080911] shadow-[0_34px_120px_rgba(0,0,0,0.48)]">
          <LiveVideoSurface
            livekitConnection={livekitConnection}
            isJoining={isJoining}
            streamError={streamError}
          />
          <VideoScrims />
          <TopLiveOverlay
            stall={stall}
            vendorName={vendorName}
            stallName={stallName}
            liveStatus={liveStatus}
            viewerCount={viewerCount}
            liveStartedAt={liveStartedAt}
            onLeave={onLeave}
            desktop
          />
          <RecentChatOverlay messages={messages} className="bottom-8 max-w-[48rem]" />
          <DesktopPinnedProductOverlay
            product={featured}
            onAddToCart={() => void onAddToCart(featured)}
            onBuyNow={() => void onBuyNow(featured)}
            cartPulse={cartPulse}
            dataError={dataError}
          />
        </div>

        <aside className="flex min-h-0 flex-col overflow-hidden rounded-[28px] border border-white/10 bg-[#11131D] shadow-[0_28px_90px_rgba(0,0,0,0.34)]" aria-label="Live commerce panel">
          <div className="shrink-0 border-b border-white/10 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-[#F4C879]">Live storefront</p>
                <h1 className="mt-1 truncate text-xl font-black tracking-[-0.03em] text-white">{vendorName}</h1>
                <p className="mt-1 truncate text-sm font-semibold text-slate-400">{stallName}</p>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={onShare} className="grid h-11 w-11 place-items-center rounded-full border border-white/10 bg-white/8 text-white hover:bg-white/14" aria-label="Share live room">
                  <Share2 className="h-4 w-4" />
                </button>
                <button type="button" onClick={onOpenCart} className="grid h-11 w-11 place-items-center rounded-full border border-white/10 bg-white/8 text-white hover:bg-white/14" aria-label="Open cart">
                  <ShoppingCart className="h-4 w-4" />
                </button>
              </div>
            </div>
            {shareStatus ? <p className="mt-2 rounded-2xl bg-white/10 px-3 py-2 text-xs font-bold text-slate-200">{shareStatus}</p> : null}
            <div className="mt-4 grid grid-cols-3 gap-1 rounded-full border border-white/10 bg-[#080911] p-1" role="tablist" aria-label="Live room panel">
              {[
                ["chat", "Chat", MessageCircleMore],
                ["products", `Products ${productCatalog.length}`, ShoppingBag],
                ["offers", "Offers", Gavel]
              ].map(([key, label, Icon]) => (
                <button
                  key={key as string}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === key}
                  onClick={() => setActiveTab(key as RailTab)}
                  className={cn(
                    "inline-flex min-h-10 items-center justify-center gap-2 rounded-full px-3 text-xs font-black transition",
                    activeTab === key ? "bg-white text-[#11131D]" : "text-slate-300 hover:bg-white/10 hover:text-white"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="truncate">{label as string}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {activeTab === "chat" ? (
              <ChatSheetContent
                messages={messages}
                message={message}
                setMessage={setMessage}
                onSubmit={onSubmit}
                canChat={canChat}
                chatError={chatError}
                isSendingMessage={isSendingMessage}
                desktop
              />
            ) : activeTab === "products" ? (
              <ProductSheetContent
                featured={featured}
                products={productQueue}
                onAddToCart={onAddToCart}
                onBuyNow={onBuyNow}
                desktop
              />
            ) : (
              <CustomerBargainPanel
                bargainState={bargainState}
                offerDraft={offerDraft}
                setOfferDraft={setOfferDraft}
                onPlaceOffer={onPlaceOffer}
                onAddToCart={() => void onAddToCart(featured)}
                error={bargainError}
                tone="dark"
              />
            )}
          </div>

          <RailCheckoutBar
            product={featured}
            quantity={quantity}
            setQuantity={setQuantity}
            onAddToCart={() => void onAddToCart(featured)}
            onBuyNow={() => void onBuyNow(featured)}
            onShowOrders={onShowOrders}
            cartPulse={cartPulse}
          />
        </aside>
      </div>
    </section>
  );
}

type LiveRoomSharedProps = {
  stall: Stall | null;
  vendorName: string;
  stallName: string;
  liveStatus: LiveViewStatus;
  viewerCount: number;
  liveStartedAt: string | null;
  featured: Product | null;
  relatedProducts: Product[];
  productQueue: Product[];
  productCatalog: Product[];
  quantity: number;
  setQuantity: QuantitySetter;
  cartPulse: boolean;
  livekitConnection: LiveKitConnection | null;
  isJoining: boolean;
  streamError: string;
  messages: LiveChatMessage[];
  message: string;
  setMessage: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  canChat: boolean;
  chatError: string;
  isSendingMessage: boolean;
  bargainState: BargainState | null;
  offerDraft: number;
  setOfferDraft: (value: number) => void;
  onPlaceOffer: () => void;
  bargainError: string;
  onAddToCart: (product?: Product | null, itemQuantity?: number, shouldOpenCart?: boolean) => Promise<boolean>;
  onBuyNow: (product?: Product | null) => Promise<void>;
  onShowOrders: () => void;
  onLeave: () => void;
  onShare: () => void;
  onOpenCart: () => void;
  shareStatus: string;
  dataError: string;
  hasBargain: boolean;
};

function LiveVideoSurface({
  livekitConnection,
  isJoining,
  streamError
}: {
  livekitConnection: LiveKitConnection | null;
  isJoining: boolean;
  streamError: string;
}) {
  return (
    <div className="absolute inset-0 bg-[#05040A]">
      {livekitConnection?.mode === "real" ? (
        <UserLiveKitViewer connection={livekitConnection} className="h-full w-full bg-slate-950" />
      ) : (
        <StreamStatusCard
          title={isJoining ? "Joining live stream" : "Vendor stream unavailable"}
          message={isJoining ? "Connecting to the live room..." : customerSafeLiveError(streamError, "Vendor is not live right now.")}
        />
      )}
    </div>
  );
}

function VideoScrims() {
  return (
    <>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-44 bg-gradient-to-b from-black/82 via-black/34 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[55%] bg-gradient-to-t from-black/90 via-black/48 to-transparent" />
    </>
  );
}

function TopLiveOverlay({
  stall,
  vendorName,
  stallName,
  liveStatus,
  viewerCount,
  liveStartedAt,
  onLeave,
  desktop = false
}: {
  stall: Stall | null;
  vendorName: string;
  stallName: string;
  liveStatus: LiveViewStatus;
  viewerCount: number;
  liveStartedAt: string | null;
  onLeave: () => void;
  desktop?: boolean;
}) {
  return (
    <header className={cn("absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-3 p-3 pt-[calc(0.85rem+env(safe-area-inset-top))]", desktop && "p-5")}>
      <div className="flex min-w-0 items-center gap-3">
        {stall?.vendorLogo ? (
          <AppImage src={stall.vendorLogo} alt={`${vendorName} logo`} fallbackSrc="/avatars/default-avatar.png" className="h-11 w-11 shrink-0 rounded-full border border-white/30 bg-white/10" />
        ) : (
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/30 bg-white/12 text-sm font-black text-white shadow-sm">
            {initialsFor(vendorName)}
          </div>
        )}
        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h1 className="max-w-[13rem] truncate text-sm font-black text-white sm:max-w-sm sm:text-base">{vendorName}</h1>
            <LiveStatusPill status={liveStatus} />
          </div>
          <div className="mt-1 flex min-w-0 flex-wrap items-center gap-2 text-xs font-semibold text-white/76">
            <span className="max-w-[11rem] truncate sm:max-w-sm">{stallName || stall?.category || "Live stall"}</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-black/28 px-2 py-1">
              <Eye className="h-3.5 w-3.5" />
              {compactCount(viewerCount)} watching
            </span>
            {liveStatus === "live" ? (
              <LiveElapsedCounter startedAt={liveStartedAt} className="border-white/15 bg-black/24 px-2 py-1 text-[11px] text-white dark:border-white/15 dark:bg-black/24 dark:text-white" />
            ) : null}
          </div>
        </div>
      </div>
      <button
        type="button"
        onClick={onLeave}
        className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/18 bg-black/36 text-white shadow-sm backdrop-blur-md transition hover:bg-black/56 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        aria-label="Leave live room"
      >
        {desktop ? <X className="h-5 w-5" /> : <ArrowLeft className="h-5 w-5" />}
      </button>
    </header>
  );
}

function LiveStatusPill({ status }: { status: LiveViewStatus }) {
  const label = status === "connecting" ? "Connecting" : status === "live" ? "LIVE" : "Offline";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em]",
        status === "live" && "border-rose-300/40 bg-rose-500/88 text-white",
        status === "connecting" && "border-amber-300/40 bg-amber-400/18 text-amber-100",
        status === "offline" && "border-white/15 bg-white/10 text-white/78"
      )}
    >
      <Radio className={cn("h-3.5 w-3.5", status === "live" && "animate-pulse")} />
      {label}
    </span>
  );
}

function RecentChatOverlay({ messages, className }: { messages: LiveChatMessage[]; className?: string }) {
  if (!messages.length) {
    return null;
  }

  return (
    <div className={cn("pointer-events-none absolute left-3 z-20 grid max-w-[88vw] gap-1.5 sm:left-5 sm:max-w-md", className)} aria-label="Recent live chat messages">
      {messages.slice(-5).map((entry, index) => (
        <motion.div
          key={entry.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18, delay: index * 0.03 }}
          className="w-fit max-w-full rounded-full bg-black/42 px-3 py-1.5 text-xs font-semibold text-white shadow-[0_10px_28px_rgba(0,0,0,0.22)] backdrop-blur-md"
        >
          <span className="mr-1.5 font-black text-[#F4C879]">{entry.senderName}</span>
          <span className="break-words text-white/92">{entry.message}</span>
        </motion.div>
      ))}
    </div>
  );
}

function MobilePinnedProductCard({
  product,
  quantity,
  setQuantity,
  cartPulse,
  onAddToCart,
  onBuyNow,
  dataError
}: {
  product: Product | null;
  quantity: number;
  setQuantity: QuantitySetter;
  cartPulse: boolean;
  onAddToCart: () => void;
  onBuyNow: () => void;
  dataError: string;
}) {
  const discount = product ? productDiscount(product) : 0;
  const inStock = productInStock(product);

  return (
    <aside className="absolute inset-x-3 bottom-[calc(6.7rem+env(safe-area-inset-bottom))] z-30 rounded-[24px] border border-white/14 bg-[#11131D]/88 p-3 text-white shadow-[0_22px_70px_rgba(0,0,0,0.46)] backdrop-blur-xl" aria-label="Pinned live product">
      <div className="flex min-w-0 items-center gap-3">
        <AppImage src={productImage(product)} alt={product?.title ?? "Pinned product"} fallbackSrc="/products/product-placeholder.png" className="h-16 w-16 shrink-0 rounded-[18px] bg-white/8" />
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#F4C879]">{product ? "Pinned product" : "No product pinned"}</p>
          <h2 className="mt-1 line-clamp-1 text-sm font-black text-white">{product?.title ?? "Vendor has not pinned a product yet"}</h2>
          <div className="mt-1 flex min-w-0 flex-wrap items-center gap-2">
            <p className="text-base font-black text-[#FFB49F]">{product ? formatPrice(product.price) : "Unavailable"}</p>
            {product && discount ? <p className="text-xs font-bold text-white/54 line-through">{formatPrice(product.compareAtPrice)}</p> : null}
            {product && discount ? <span className="rounded-full bg-emerald-400/14 px-2 py-0.5 text-[10px] font-black text-emerald-200">{discount}% off</span> : null}
            {product ? <span className="text-[11px] font-bold text-white/70">{inStock ? `${product.stock} in stock` : "Out of stock"}</span> : null}
          </div>
        </div>
        <div className="hidden items-center rounded-full border border-white/10 bg-black/24 min-[430px]:flex">
          <button type="button" onClick={() => setQuantity((current) => Math.max(1, current - 1))} className="grid h-11 w-11 place-items-center rounded-l-full text-white" aria-label="Decrease quantity">
            <Minus className="h-4 w-4" />
          </button>
          <span className="min-w-5 text-center text-sm font-black">{quantity}</span>
          <button type="button" onClick={() => setQuantity((current) => current + 1)} className="grid h-11 w-11 place-items-center rounded-r-full text-white" aria-label="Increase quantity">
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <motion.button
          animate={cartPulse ? { scale: [1, 1.05, 1] } : { scale: 1 }}
          type="button"
          onClick={onAddToCart}
          disabled={!inStock}
          className="min-h-11 shrink-0 rounded-full bg-[#EF6B4D] px-4 text-sm font-black text-white shadow-[0_14px_36px_rgba(239,107,77,0.34)] transition hover:bg-[#DB553B] disabled:cursor-not-allowed disabled:opacity-55"
        >
          Add
        </motion.button>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 min-[430px]:hidden">
        <QuantityStepper quantity={quantity} setQuantity={setQuantity} tone="dark" />
        <button type="button" onClick={onBuyNow} disabled={!inStock} className="min-h-11 rounded-full border border-white/12 bg-white/10 px-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-55">
          Buy now
        </button>
      </div>
      {dataError ? <p className="mt-2 rounded-2xl bg-red-500/16 px-3 py-2 text-xs font-bold text-red-100">{customerSafeLiveError(dataError, "We could not load live products. Please try again.")}</p> : null}
    </aside>
  );
}

function MobileActionDock({
  message,
  setMessage,
  onSubmit,
  canChat,
  chatError,
  isSendingMessage,
  productCount,
  hasBargain,
  onOpenProducts,
  onOpenBargain,
  onOpenChat,
  onShare,
  onOpenCart,
  shareStatus
}: {
  message: string;
  setMessage: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  canChat: boolean;
  chatError: string;
  isSendingMessage: boolean;
  productCount: number;
  hasBargain: boolean;
  onOpenProducts: () => void;
  onOpenBargain: () => void;
  onOpenChat: () => void;
  onShare: () => void;
  onOpenCart: () => void;
  shareStatus: string;
}) {
  return (
    <footer className="absolute inset-x-0 bottom-0 z-40 border-t border-white/10 bg-black/42 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] text-white backdrop-blur-xl" aria-label="Live shopping actions">
      <form onSubmit={onSubmit} className="flex items-center gap-2">
        <label className="sr-only" htmlFor="mobile-live-comment">Send a live comment</label>
        <input
          id="mobile-live-comment"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          disabled={!canChat || isSendingMessage}
          placeholder={canChat ? "Comment..." : "Login to chat"}
          className="min-h-11 min-w-0 flex-1 rounded-full border border-white/14 bg-white/12 px-4 text-sm font-semibold text-white outline-none placeholder:text-white/58 focus:border-[#F4C879] disabled:cursor-not-allowed disabled:opacity-65"
        />
        <button type="submit" disabled={!canChat || isSendingMessage} className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white text-[#11131D] disabled:cursor-not-allowed disabled:opacity-55" aria-label="Send comment">
          <Send className="h-4 w-4" />
        </button>
      </form>
      <div className="mt-2 grid grid-cols-4 gap-2">
        <DockButton icon={MessageCircleMore} label="Chat" onClick={onOpenChat} />
        <DockButton icon={ShoppingBag} label={`Products ${productCount}`} onClick={onOpenProducts} />
        {hasBargain ? <DockButton icon={Gavel} label="Offer" onClick={onOpenBargain} /> : <DockButton icon={Share2} label="Share" onClick={onShare} />}
        <DockButton icon={ShoppingCart} label="Cart" onClick={onOpenCart} />
      </div>
      {hasBargain ? (
        <button type="button" onClick={onShare} className="mt-2 inline-flex min-h-8 items-center gap-2 rounded-full px-2 text-xs font-bold text-white/76" aria-label="Share live room">
          <Share2 className="h-3.5 w-3.5" />
          Share live
        </button>
      ) : null}
      {shareStatus ? <p className="mt-1 text-xs font-bold text-[#F4C879]">{shareStatus}</p> : null}
      {chatError ? <p className="mt-1 text-xs font-bold text-red-100">{chatError}</p> : null}
    </footer>
  );
}

function DockButton({ icon: Icon, label, onClick }: { icon: typeof ShoppingBag; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-12 flex-col items-center justify-center gap-1 rounded-2xl border border-white/10 bg-white/10 px-2 text-[10px] font-black text-white transition hover:bg-white/16 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
    >
      <Icon className="h-4 w-4" />
      <span className="max-w-full truncate">{label}</span>
    </button>
  );
}

function LiveBottomSheet({
  open,
  title,
  description,
  onClose,
  children
}: {
  open: boolean;
  title: string;
  description: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const previousFocusRef = useRef<Element | null>(null);

  useEffect(() => {
    if (!open) return;
    previousFocusRef.current = document.activeElement;
    const panel = panelRef.current;
    window.setTimeout(() => panel?.focus(), 0);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab" || !panel) return;
      const focusable = Array.from(
        panel.querySelectorAll<HTMLElement>("button, [href], input, textarea, select, [tabindex]:not([tabindex='-1'])")
      ).filter((element) => !element.hasAttribute("disabled"));
      if (!focusable.length) {
        event.preventDefault();
        panel.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      if (previousFocusRef.current instanceof HTMLElement) {
        previousFocusRef.current.focus();
      }
    };
  }, [onClose, open]);

  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-[80] md:hidden">
          <motion.button
            type="button"
            aria-label="Close sheet"
            className="absolute inset-0 bg-black/24"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.div
            ref={panelRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby="live-sheet-title"
            aria-describedby="live-sheet-description"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 260, damping: 30 }}
            className="absolute inset-x-0 bottom-0 max-h-[72dvh] overflow-hidden rounded-t-[28px] border border-white/10 bg-[#11131D] text-white shadow-[0_-24px_80px_rgba(0,0,0,0.42)] outline-none"
          >
            <div className="flex items-start justify-between gap-3 border-b border-white/10 p-4">
              <div>
                <p id="live-sheet-title" className="text-lg font-black tracking-[-0.03em] text-white">{title}</p>
                <p id="live-sheet-description" className="mt-1 text-xs font-semibold text-slate-400">{description}</p>
              </div>
              <button type="button" onClick={onClose} className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/10 bg-white/8 text-white" aria-label={`Close ${title}`}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="max-h-[calc(72dvh-86px)] overflow-y-auto p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
              {children}
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}

function ProductSheetContent({
  featured,
  products,
  onAddToCart,
  onBuyNow,
  desktop = false
}: {
  featured: Product | null;
  products: Product[];
  onAddToCart: (product?: Product | null, itemQuantity?: number, shouldOpenCart?: boolean) => Promise<boolean>;
  onBuyNow: (product?: Product | null) => Promise<void>;
  desktop?: boolean;
}) {
  if (!products.length) {
    return (
      <div className="rounded-[24px] border border-dashed border-white/14 bg-white/6 p-6 text-center text-sm font-semibold text-slate-300">
        Products will appear here when this stall has active catalogue items.
      </div>
    );
  }

  return (
    <div className={cn("grid gap-3", desktop ? "grid-cols-1" : "grid-cols-1")}>
      {products.map((product) => (
        <LiveProductListCard
          key={product.id}
          product={product}
          active={product.id === featured?.id}
          onAddToCart={() => void onAddToCart(product)}
          onBuyNow={() => void onBuyNow(product)}
        />
      ))}
    </div>
  );
}

function LiveProductListCard({
  product,
  active,
  onAddToCart,
  onBuyNow
}: {
  product: Product;
  active: boolean;
  onAddToCart: () => void;
  onBuyNow: () => void;
}) {
  const discount = productDiscount(product);
  const inStock = productInStock(product);

  return (
    <article className={cn("overflow-hidden rounded-[22px] border bg-white/[0.06] text-white", active ? "border-[#F4C879]/70" : "border-white/10")}>
      <div className="flex gap-3 p-3">
        <AppImage src={productImage(product)} alt={product.title} fallbackSrc="/products/product-placeholder.png" className="h-24 w-24 shrink-0 rounded-[18px] bg-white/8" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {active ? <span className="rounded-full bg-[#F4C879] px-2 py-0.5 text-[10px] font-black uppercase text-[#201807]">Pinned</span> : null}
            <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-black uppercase", inStock ? "bg-emerald-400/14 text-emerald-200" : "bg-red-400/14 text-red-100")}>
              {inStock ? `${product.stock} stock` : "Out of stock"}
            </span>
          </div>
          <h3 className="mt-2 line-clamp-2 text-sm font-black text-white">{product.title}</h3>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <p className="text-base font-black text-[#FFB49F]">{formatPrice(product.price)}</p>
            {discount ? <p className="text-xs font-semibold text-white/48 line-through">{formatPrice(product.compareAtPrice)}</p> : null}
            {discount ? <span className="text-xs font-black text-emerald-200">{discount}% off</span> : null}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 border-t border-white/10 p-3">
        <button type="button" onClick={onAddToCart} disabled={!inStock} className="min-h-11 rounded-full border border-white/12 bg-white/8 px-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-55">
          Add cart
        </button>
        <button type="button" onClick={onBuyNow} disabled={!inStock} className="min-h-11 rounded-full bg-[#EF6B4D] px-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-55">
          Buy now
        </button>
      </div>
    </article>
  );
}

function ChatSheetContent({
  messages,
  message,
  setMessage,
  onSubmit,
  canChat,
  chatError,
  isSendingMessage,
  desktop = false
}: {
  messages: LiveChatMessage[];
  message: string;
  setMessage: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  canChat: boolean;
  chatError: string;
  isSendingMessage: boolean;
  desktop?: boolean;
}) {
  return (
    <div className={cn("flex min-h-0 flex-col", desktop ? "h-full" : "min-h-[48dvh]")}>
      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        {messages.length ? (
          <div className="grid gap-2">
            {messages.map((entry) => (
              <ChatMessageBubble key={entry.id} entry={entry} />
            ))}
          </div>
        ) : (
          <div className="grid min-h-40 place-items-center rounded-[24px] border border-dashed border-white/14 bg-white/6 p-5 text-center text-sm font-semibold text-slate-300">
            Live messages will appear here.
          </div>
        )}
      </div>
      <form onSubmit={onSubmit} className="mt-4 flex gap-2 border-t border-white/10 pt-3">
        <label className="sr-only" htmlFor={desktop ? "desktop-live-chat" : "sheet-live-chat"}>Send a live chat message</label>
        <input
          id={desktop ? "desktop-live-chat" : "sheet-live-chat"}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          disabled={!canChat || isSendingMessage}
          placeholder={canChat ? "Send a message" : "Login as customer to chat"}
          className="min-h-12 min-w-0 flex-1 rounded-full border border-white/10 bg-white/8 px-4 text-sm font-semibold text-white outline-none placeholder:text-slate-500 focus:border-[#F4C879] disabled:cursor-not-allowed disabled:opacity-60"
        />
        <button type="submit" disabled={!canChat || isSendingMessage} className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white text-[#11131D] disabled:cursor-not-allowed disabled:opacity-55" aria-label="Send chat message">
          <Send className="h-4 w-4" />
        </button>
      </form>
      {chatError ? <p className="mt-2 rounded-2xl bg-red-500/12 px-3 py-2 text-xs font-bold text-red-100">{chatError}</p> : null}
    </div>
  );
}

function ChatMessageBubble({ entry }: { entry: LiveChatMessage }) {
  const isVendor = entry.senderRole === "vendor";
  const timeLabel = new Date(entry.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <div className={cn("rounded-[20px] border px-3 py-2 text-sm leading-5", isVendor ? "border-[#F4C879]/30 bg-[#F4C879]/12" : "border-white/10 bg-white/7")}>
      <div className="mb-1 flex min-w-0 items-center justify-between gap-3">
        <p className={cn("truncate font-black", isVendor ? "text-[#F4C879]" : "text-white")}>{entry.senderName}</p>
        <span className="shrink-0 text-[10px] font-bold text-slate-500">{timeLabel}</span>
      </div>
      <p className="break-words text-slate-100">{entry.message}</p>
    </div>
  );
}

function DesktopPinnedProductOverlay({
  product,
  onAddToCart,
  onBuyNow,
  cartPulse,
  dataError
}: {
  product: Product | null;
  onAddToCart: () => void;
  onBuyNow: () => void;
  cartPulse: boolean;
  dataError: string;
}) {
  const inStock = productInStock(product);
  const discount = product ? productDiscount(product) : 0;

  return (
    <aside className="absolute bottom-6 right-6 z-20 w-[min(25rem,38vw)] rounded-[24px] border border-white/14 bg-[#11131D]/88 p-4 text-white shadow-[0_24px_80px_rgba(0,0,0,0.42)] backdrop-blur-xl" aria-label="Pinned product">
      <div className="flex min-w-0 gap-3">
        <AppImage src={productImage(product)} alt={product?.title ?? "Pinned product"} fallbackSrc="/products/product-placeholder.png" className="h-20 w-20 shrink-0 rounded-[18px] bg-white/8" />
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#F4C879]">{product ? "Now pinned" : "No product pinned"}</p>
          <h2 className="mt-1 line-clamp-2 text-base font-black">{product?.title ?? "Vendor has not pinned a product yet"}</h2>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <p className="text-lg font-black text-[#FFB49F]">{product ? formatPrice(product.price) : "Unavailable"}</p>
            {product && discount ? <p className="text-xs font-semibold text-white/48 line-through">{formatPrice(product.compareAtPrice)}</p> : null}
            {discount ? <span className="text-xs font-black text-emerald-200">{discount}% off</span> : null}
          </div>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <motion.button
          animate={cartPulse ? { scale: [1, 1.04, 1] } : { scale: 1 }}
          type="button"
          onClick={onAddToCart}
          disabled={!inStock}
          className="min-h-11 rounded-full border border-white/12 bg-white/8 px-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-55"
        >
          Add cart
        </motion.button>
        <button type="button" onClick={onBuyNow} disabled={!inStock} className="min-h-11 rounded-full bg-[#EF6B4D] px-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-55">
          Buy now
        </button>
      </div>
      {dataError ? <p className="mt-2 rounded-2xl bg-red-500/14 px-3 py-2 text-xs font-bold text-red-100">{customerSafeLiveError(dataError, "We could not load live products. Please try again.")}</p> : null}
    </aside>
  );
}

function RailCheckoutBar({
  product,
  quantity,
  setQuantity,
  onAddToCart,
  onBuyNow,
  onShowOrders,
  cartPulse
}: {
  product: Product | null;
  quantity: number;
  setQuantity: QuantitySetter;
  onAddToCart: () => void;
  onBuyNow: () => void;
  onShowOrders: () => void;
  cartPulse: boolean;
}) {
  const inStock = productInStock(product);

  return (
    <div className="shrink-0 border-t border-white/10 bg-[#0B0D14] p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#F4C879]">Active product</p>
          <p className="mt-1 line-clamp-1 text-sm font-black text-white">{product?.title ?? "No pinned product"}</p>
        </div>
        <QuantityStepper quantity={quantity} setQuantity={setQuantity} tone="dark" />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <motion.button
          animate={cartPulse ? { scale: [1, 1.04, 1] } : { scale: 1 }}
          type="button"
          onClick={onAddToCart}
          disabled={!inStock}
          className="min-h-11 rounded-full border border-white/12 bg-white/8 px-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-55"
        >
          Add cart
        </motion.button>
        <button type="button" onClick={onBuyNow} disabled={!inStock} className="min-h-11 rounded-full bg-[#EF6B4D] px-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-55">
          Buy now
        </button>
      </div>
      <button type="button" onClick={onShowOrders} className="mt-2 min-h-10 w-full rounded-full text-xs font-black text-slate-300 hover:bg-white/8">
        View orders
      </button>
    </div>
  );
}

function QuantityStepper({
  quantity,
  setQuantity,
  tone = "light"
}: {
  quantity: number;
  setQuantity: QuantitySetter;
  tone?: "light" | "dark";
}) {
  const dark = tone === "dark";
  return (
    <div className={cn("flex shrink-0 items-center rounded-full border", dark ? "border-white/10 bg-black/24 text-white" : "border-[color:var(--border)] bg-[var(--surface)] text-[var(--text)]")}>
      <button type="button" onClick={() => setQuantity((current) => Math.max(1, current - 1))} className="grid h-11 w-11 place-items-center rounded-l-full" aria-label="Decrease quantity">
        <Minus className="h-4 w-4" />
      </button>
      <span className="min-w-6 text-center text-sm font-black">{quantity}</span>
      <button type="button" onClick={() => setQuantity((current) => current + 1)} className="grid h-11 w-11 place-items-center rounded-r-full" aria-label="Increase quantity">
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}

function CustomerBargainPanel({
  bargainState,
  offerDraft,
  setOfferDraft,
  onPlaceOffer,
  onAddToCart,
  error,
  tone = "light"
}: {
  bargainState: BargainState | null;
  offerDraft: number;
  setOfferDraft: (value: number) => void;
  onPlaceOffer: () => void;
  onAddToCart: () => void;
  error: string;
  tone?: "light" | "dark";
}) {
  const session = bargainState?.session;
  const deal = bargainState?.myDeal;
  const step = session?.offerStep ?? 10;
  const minOffer = session?.minVisibleOffer ?? 0;
  const maxOffer = session?.sellingPrice ?? 0;
  const livePrice = session?.acceptedPrice ?? session?.sellingPrice ?? 0;
  const currentOfferPrice = session?.acceptedPrice ?? bargainState?.currentHighestOffer ?? null;
  const displayOffer = offerDraft || maxOffer || minOffer;
  const agreedSavings = deal ? Math.max(0, deal.sellingPrice - deal.agreedPrice) : 0;
  const agreedSavingsPercent = deal && deal.sellingPrice > 0 ? Math.round((agreedSavings / deal.sellingPrice) * 100) : 0;
  const isDark = tone === "dark";

  if (!session) {
    return (
      <div className={cn("rounded-[24px] border p-4", isDark ? "border-white/10 bg-white/[0.06] text-white" : "border-[color:var(--border)] bg-[var(--card)] text-[var(--text)]")}>
        <div className="flex items-center gap-2">
          <Gavel className="h-4 w-4 text-[#F4C879]" />
          <p className="text-sm font-black">Live offer</p>
        </div>
        <p className={cn("mt-2 text-sm", isDark ? "text-slate-400" : "text-[var(--muted)]")}>Vendor has not opened bargaining for this live room yet.</p>
      </div>
    );
  }

  return (
    <div className={cn("rounded-[24px] border p-4", isDark ? "border-white/10 bg-white/[0.06] text-white" : "border-[color:var(--border)] bg-[var(--card)] text-[var(--text)]")}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#F4C879]">Live offer</p>
          <h3 className="mt-1 text-lg font-black">Current offer: {currentOfferPrice ? formatPrice(currentOfferPrice) : "No offers yet"}</h3>
        </div>
        <span className="rounded-full bg-emerald-500/12 px-3 py-1 text-xs font-black text-emerald-200">Open</span>
      </div>

      <div className={cn("mt-3 grid gap-2 rounded-[18px] p-3 text-sm", isDark ? "bg-black/24 text-slate-300" : "bg-[var(--surface-strong)] text-[var(--muted)]")}>
        <div className="flex justify-between gap-3">
          <span>Live price</span>
          <strong className={isDark ? "text-white" : "text-[var(--text)]"}>{formatPrice(livePrice)}</strong>
        </div>
        {session.counterPrice ? (
          <div className="flex justify-between gap-3 text-[#FFB49F]">
            <span>Vendor counter</span>
            <strong>{formatPrice(session.counterPrice)}</strong>
          </div>
        ) : null}
        {deal ? (
          <>
            <div className="flex justify-between gap-3 text-emerald-300">
              <span>Your agreed price</span>
              <strong>{formatPrice(deal.agreedPrice)}</strong>
            </div>
            <div className="flex justify-between gap-3 text-[#F4C879]">
              <span>You save</span>
              <strong>{formatPrice(agreedSavings)}{agreedSavingsPercent ? ` (${agreedSavingsPercent}% off)` : ""}</strong>
            </div>
          </>
        ) : null}
      </div>

      {deal ? (
        <button type="button" onClick={onAddToCart} className={buttonStyles("primary", "mt-3 w-full justify-center px-5 py-3")}>
          Add agreed deal to cart
        </button>
      ) : (
        <>
          <label className="mt-4 block text-xs font-black uppercase tracking-[0.14em] text-[#F4C879]" htmlFor="live-offer-price">
            Your offer price
          </label>
          <div className="mt-2 grid grid-cols-[auto_1fr_auto] gap-2">
            <button type="button" onClick={() => setOfferDraft(Math.max(minOffer, displayOffer - step))} className="min-h-11 rounded-2xl border border-white/10 px-4 font-black">-{formatPrice(step)}</button>
            <input
              id="live-offer-price"
              value={displayOffer || ""}
              onChange={(event) => setOfferDraft(Number(event.target.value || 0))}
              inputMode="numeric"
              className={cn("min-h-11 min-w-0 rounded-2xl border px-3 text-center text-lg font-black outline-none focus:border-[#F4C879]", isDark ? "border-white/10 bg-black/24 text-white" : "border-[color:var(--border)] bg-white text-[var(--text)]")}
              aria-describedby="live-offer-range"
            />
            <button type="button" onClick={() => setOfferDraft(Math.min(maxOffer, displayOffer + step))} className="min-h-11 rounded-2xl border border-white/10 px-4 font-black">+{formatPrice(step)}</button>
          </div>
          <p id="live-offer-range" className={cn("mt-2 text-xs font-bold", isDark ? "text-slate-400" : "text-[var(--muted)]")}>
            Allowed range: {formatPrice(minOffer)} to {formatPrice(maxOffer)}
          </p>
          <button type="button" onClick={onPlaceOffer} className="mt-3 min-h-12 w-full rounded-full bg-[#EF6B4D] px-5 text-sm font-black text-white shadow-[0_14px_36px_rgba(239,107,77,0.28)]">
            Make offer
          </button>
        </>
      )}

      {bargainState.offerGroups.length ? (
        <div className="mt-3 grid gap-2">
          {bargainState.offerGroups.slice(0, 4).map((group) => (
            <div key={group.offerPrice} className={cn("flex justify-between rounded-2xl px-3 py-2 text-xs font-bold", isDark ? "bg-black/24 text-slate-300" : "bg-[var(--surface-strong)] text-[var(--muted)]")}>
              <span>{formatPrice(group.offerPrice)}</span>
              <span>{group.customers} customer{group.customers === 1 ? "" : "s"}</span>
            </div>
          ))}
        </div>
      ) : null}
      {error ? <p className="mt-3 rounded-2xl bg-red-500/12 px-3 py-2 text-xs font-bold text-red-100">{error}</p> : null}
    </div>
  );
}

function StreamStatusCard({ title, message }: { title: string; message: string }) {
  return (
    <div className="flex h-full min-h-[100dvh] w-full items-center justify-center bg-[#080911] p-8 text-center text-white">
      <div className="max-w-md">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full border border-white/10 bg-white/8">
          <Store className="h-7 w-7 text-[#F4C879]" />
        </div>
        <h3 className="mt-5 text-2xl font-black tracking-[-0.04em] text-white">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-slate-300">{message}</p>
        <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/8 px-4 py-2 text-xs font-black text-slate-200">
          <Package className="h-4 w-4" />
          Live shopping room
        </div>
      </div>
    </div>
  );
}
