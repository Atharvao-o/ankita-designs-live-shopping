"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Gavel, Heart, MessageCircleMore, Minus, Plus, Send, Share2, ShoppingBag, Star } from "lucide-react";
import { useRouter } from "next/navigation";
import { Screen } from "@/components/layout/screen";
import { AppImage } from "@/components/ui/app-image";
import { Button, buttonStyles } from "@/components/ui/button";
import { formatPrice } from "@/lib/utils";
import { useExpoStore } from "@/lib/cart-store";
import { CartDrawer } from "@/components/cart/cart-drawer";
import { addCartItem, getBargainState, getLiveMessages, getLiveSessionState, getStall, getStallProducts, joinLiveSession, placeBargainOffer, postLiveMessage } from "@/lib/api";
import { BargainState, LiveKitConnection, Product, Stall } from "@/lib/types";
import { UserLiveKitViewer } from "@/components/live/user-livekit-viewer";
import { ViewerPresenceStrip } from "@/components/live/viewer-presence-strip";
import { MobileLiveActionsMenu } from "@/components/live/mobile-live-actions-menu";
import { LiveChatPanel } from "@/components/live/live-chat-panel";
import { LiveElapsedCounter } from "@/components/marketplace/live-timers";
import { ResponsiveDeviceView } from "@/components/mobile/responsive-device-view";

function productDiscount(product: Product) {
  if (!product.compareAtPrice || product.compareAtPrice <= product.price) {
    return 0;
  }
  return Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100);
}

export function LiveRoom({ stallId }: { stallId: string }) {
  const router = useRouter();
  const [quantity, setQuantity] = useState(1);
  const [cartPulse, setCartPulse] = useState(false);
  const [message, setMessage] = useState("");
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<"chat" | "products" | "bargain">("chat");
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

  const vendorName = stall?.vendorName ?? "Vendor";
  const featured = pinnedProduct;
  const relatedProducts = useMemo(
    () => productCatalog.filter((item) => item.id !== featured?.id).slice(0, 2),
    [featured?.id, productCatalog]
  );
  const recentMessages = chatMessages.slice(-6);
  const viewerCount = liveSession.viewerCount ?? 0;
  const canChat = currentUser?.role === "user";

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
        if (!active) {
          return;
        }
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
      if (sessionId) {
        setLiveSessionId(sessionId);
      }
      setLiveStartedAt(session.started_at ?? session.startedAt ?? null);
      const pinnedProductId = session.pinnedProductId ?? session.pinned_product_id ?? response.pinned_product?.id;
      syncLiveSession({
        status: session.status,
        pinnedProductId,
        viewerCount: session.viewerCount ?? session.viewer_count
      });
      if (pinnedProductId) {
        pinProduct(pinnedProductId);
      }
      setPinnedProduct(response.pinned_product ?? null);
      if (response.messages) {
        setChatMessages(response.messages);
      }
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
        if (!active) {
          return;
        }
        applyRoomState(response);
        setLivekitConnection(response.livekit);
        setStreamError(response.livekit?.mode === "real" ? "" : "Camera streaming is not available for this session.");
      } catch (error) {
        if (active) {
          setStreamError(error instanceof Error ? error.message : "Could not join stream. Please try again.");
          setLivekitConnection(null);
        }
      } finally {
        if (active) {
          setIsJoining(false);
        }
      }
    };

    const syncRoom = async () => {
      try {
        const [response, productsResponse] = await Promise.all([
          getLiveSessionState(stallId),
          getStallProducts(stallId)
        ]);
        if (active) {
          applyRoomState(response);
          setProductCatalog(productsResponse.filter((product) => product.status === "active"));
          const sessionId = response.live_session.id ?? response.live_session.liveSessionId;
          if (sessionId) {
            const messages = await getLiveMessages(sessionId);
            const state = await getBargainState(sessionId).catch(() => null);
            if (active) {
              setChatMessages(messages);
              if (state) {
                setBargainState(state);
                syncOfferDraftFromBargainState(state);
              }
              setChatError("");
            }
          }
        }
      } catch {
        if (active) {
          setChatError("Could not load chat. Retrying...");
        }
        // Keep the current room state visible; joining errors are handled separately.
      }
    };

    joinRoom();
    const intervalId = window.setInterval(syncRoom, 2000);
    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [pinProduct, setChatMessages, stallId, syncLiveSession, syncOfferDraftFromBargainState]);

  const pushCart = async () => {
    if (!featured) {
      setDataError("Product is not available right now.");
      return;
    }
    try {
      const items = await addCartItem(featured.id, quantity, liveSessionId || liveSession.id);
      setCartItems(items);
      openCart();
      setDataError("");
      setCartPulse(true);
      window.setTimeout(() => setCartPulse(false), 450);
    } catch (error) {
      setDataError(error instanceof Error ? error.message : "Could not add product to cart.");
    }
  };

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
      setBargainError("");
    } catch (error) {
      setBargainError(error instanceof Error ? error.message : "Could not place offer.");
    }
  };


  const submitMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = message.trim();
    if (!text) {
      return;
    }
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

  return (
    <Screen>
      <ResponsiveDeviceView
        mobile={
          <MobileLiveCommerceRoom
            vendorName={vendorName}
            stallName={stall?.name ?? stallId}
            viewerCount={viewerCount}
            liveStartedAt={liveStartedAt}
            featured={featured}
            relatedProducts={relatedProducts}
            quantity={quantity}
            setQuantity={setQuantity}
            cartPulse={cartPulse}
            onAddToCart={pushCart}
            onBuyNow={() => {
              pushCart();
              router.push("/checkout");
            }}
            livekitConnection={livekitConnection}
            isJoining={isJoining}
            streamError={streamError}
            messages={recentMessages}
            message={message}
            setMessage={setMessage}
            onSubmit={submitMessage}
            canChat={canChat}
            chatError={chatError}
            isSendingMessage={isSendingMessage}
            activeTab={mobileTab}
            setActiveTab={setMobileTab}
            bargainState={bargainState}
            offerDraft={offerDraft}
            setOfferDraft={setOfferDraft}
            onPlaceOffer={submitBargainOffer}
            bargainError={bargainError}
            onShowOrders={() => router.push("/orders")}
            onLeave={leaveLive}
          />
        }
        desktop={
      <section className="min-h-[100dvh] w-full overflow-x-hidden bg-[#06080E] xl:h-[100dvh] xl:overflow-hidden">
        <header className="sticky top-0 z-40 border-b border-white/10 bg-[#06080E] px-3 py-3 text-white sm:px-5 xl:static">
          <div className="flex min-w-0 items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-2">
                <span className="inline-flex h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-[#E95F45]" aria-hidden />
                <span className="rounded-full bg-[#E95F45]/18 px-2.5 py-1 text-xs font-bold text-[#FFB9A4]">LIVE</span>
                <LiveElapsedCounter startedAt={liveStartedAt} className="border-white/10 bg-white/10 text-white dark:border-white/10 dark:bg-white/10 dark:text-white" />
                <p className="truncate text-sm font-semibold text-white sm:text-base">{vendorName}</p>
              </div>
              <p className="mt-1 truncate text-xs text-slate-400 sm:text-sm">{stall?.name ?? stallId}</p>
            </div>
            <div className="hidden items-center gap-3 md:flex">
              <ViewerPresenceStrip viewerCount={viewerCount} />
            </div>
            <div className="flex items-center gap-2">
              <button type="button" className={buttonStyles("secondary", "hidden px-4 py-2 xl:inline-flex")}>
                <Star className="mr-2 h-4 w-4" />
                Follow
              </button>
              <button type="button" className={buttonStyles("secondary", "hidden px-4 py-2 xl:inline-flex")}>
                <Share2 className="mr-2 h-4 w-4" />
                Share
              </button>
              <MobileLiveActionsMenu
                vendorName={vendorName}
                stallName={stall?.name ?? stallId}
                onShowChat={() => setMobileChatOpen(true)}
                onLeave={leaveLive}
              />
            </div>
          </div>
        </header>

        <div className="grid min-h-[calc(100dvh-69px)] w-full gap-0 xl:h-[calc(100dvh-69px)] xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.58fr)_minmax(360px,0.72fr)] xl:overflow-hidden">
          <div className="flex min-w-0 flex-col gap-3 p-3 sm:gap-4 sm:p-5 xl:h-full xl:overflow-hidden">
            <div data-tour-id="live-video" className="relative aspect-video w-full overflow-hidden rounded-[28px] border border-white/10 bg-white/5 p-2 shadow-darkGlow sm:rounded-[34px] sm:p-3">
              {livekitConnection?.mode === "real" ? (
                <UserLiveKitViewer connection={livekitConnection} className="h-full w-full overflow-hidden rounded-[24px] bg-slate-950" />
              ) : (
                <StreamStatusCard
                  title={isJoining ? "Joining live stream" : "Vendor stream unavailable"}
                  message={isJoining ? "Connecting to the LiveKit room..." : streamError || "Vendor is not live right now."}
                />
              )}
            </div>

            <div className="rounded-[24px] border border-white/10 bg-white/6 p-4 shadow-darkGlow">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <ViewerPresenceStrip viewerCount={viewerCount} />
                <LiveElapsedCounter startedAt={liveStartedAt} size="md" className="border-white/10 bg-white/10 text-white dark:border-white/10 dark:bg-white/10 dark:text-white" />
              </div>
            </div>

            <div className="grid gap-3">
              <div className="rounded-[24px] border border-white/10 bg-white/6 p-4 text-white shadow-darkGlow">
                <p className="text-xs uppercase tracking-[0.18em] text-[#C59A4A]">Now presenting</p>
                <h1 className="mt-2 truncate text-xl font-semibold tracking-[-0.04em] text-white sm:text-2xl">
                  {featured?.title ?? "No product showcased yet"}
                </h1>
                <p className="mt-1 text-sm text-slate-400">{featured?.description ?? "Vendor has not showcased a product yet."}</p>
                {dataError ? <p className="mt-2 text-xs font-semibold text-[#DC2626]">{dataError}</p> : null}
              </div>
              <div className="flex items-center justify-between gap-3 rounded-[24px] border border-white/10 bg-white/6 p-4 shadow-darkGlow xl:hidden">
                <button type="button" onClick={() => setMobileChatOpen(true)} className={buttonStyles("secondary", "px-4 py-2")}>
                  <MessageCircleMore className="mr-2 h-4 w-4" />
                  Chat
                </button>
              </div>
              <div className="hidden items-center gap-2 rounded-[24px] border border-white/10 bg-white/6 p-4 shadow-darkGlow lg:flex">
                <button type="button" className={buttonStyles("secondary", "px-4 py-3")}>
                  <MessageCircleMore className="mr-2 h-4 w-4" />
                  Ask Question
                </button>
                <button type="button" onClick={leaveLive} className={buttonStyles("secondary", "border-[#FCA5A5] px-4 py-3 text-[#DC2626] hover:bg-[#FEF2F2]")}>
                  Leave
                </button>
              </div>
            </div>
          </div>

          <LiveChatPanel
            open={mobileChatOpen}
            messages={recentMessages}
            message={message}
            setMessage={setMessage}
            onSubmit={submitMessage}
            onClose={() => setMobileChatOpen(false)}
            className="m-3 min-h-[420px] sm:m-5 xl:m-5 xl:h-[calc(100%-40px)] xl:min-h-0"
            disabled={!canChat}
            helperText={!canChat ? "Please login as a customer to chat." : undefined}
            errorText={chatError}
            isSending={isSendingMessage}
            tone="dark"
          />

          <ProductPanel
            featured={featured}
            relatedProducts={relatedProducts}
            quantity={quantity}
            setQuantity={setQuantity}
            cartPulse={cartPulse}
            onAddToCart={pushCart}
            onBuyNow={() => {
              pushCart();
              router.push("/checkout");
            }}
            bargainState={bargainState}
            offerDraft={offerDraft}
            setOfferDraft={setOfferDraft}
            onPlaceOffer={submitBargainOffer}
            bargainError={bargainError}
          />
        </div>
      </section>
        }
      />
      <CartDrawer />
    </Screen>
  );
}

function ProductPanel({
  featured,
  relatedProducts,
  quantity,
  setQuantity,
  cartPulse,
  onAddToCart,
  onBuyNow,
  bargainState,
  offerDraft,
  setOfferDraft,
  onPlaceOffer,
  bargainError
}: {
  featured: Product | null;
  relatedProducts: Product[];
  quantity: number;
  setQuantity: (updater: (current: number) => number) => void;
  cartPulse: boolean;
  onAddToCart: () => void;
  onBuyNow: () => void;
  bargainState: BargainState | null;
  offerDraft: number;
  setOfferDraft: (value: number) => void;
  onPlaceOffer: () => void;
  bargainError: string;
}) {
  if (!featured) {
    return (
      <aside data-tour-id="highlighted-product" className="flex min-h-0 min-w-0 flex-col bg-[#06080E] p-4 text-white shadow-[0_30px_80px_rgba(15,23,42,0.24)] sm:p-6 xl:h-full xl:min-h-0 xl:overflow-y-auto">
        <div className="flex flex-1 items-center justify-center rounded-[28px] border border-white/10 bg-white/5 p-6 text-center">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Now Showing</p>
            <h3 className="mt-3 text-2xl font-semibold tracking-[-0.05em] text-white">No product showcased yet</h3>
            <p className="mt-2 text-sm leading-6 text-slate-400">The vendor has not pinned a product for this live session.</p>
          </div>
        </div>
      </aside>
    );
  }

  const productDetails = [
    featured.description?.trim() || null,
    `${featured.stock} left in stock`,
    featured.offerCode ? `Offer code: ${featured.offerCode}` : null
  ].filter((item): item is string => Boolean(item));
  const discount = productDiscount(featured);

  return (
    <aside data-tour-id="highlighted-product" className="flex min-h-0 min-w-0 flex-col bg-[#06080E] p-4 text-white shadow-[0_30px_80px_rgba(15,23,42,0.24)] sm:p-6 xl:h-full xl:min-h-0 xl:overflow-y-auto">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between xl:flex-col xl:items-start">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Now Showing</p>
          <h3 className="mt-2 line-clamp-2 text-2xl font-semibold tracking-[-0.05em] text-white sm:text-3xl">{featured.title}</h3>
        </div>
        <span className="w-fit rounded-full bg-[#FF7A59]/18 px-3 py-1 text-xs font-semibold text-[#FFB9A4]">
          {featured.offerCode ?? "LIVE"}
        </span>
      </div>

      <AppImage src={featured.images[0] ?? "/products/product-placeholder.png"} alt={featured.title} className="mt-5 h-56 w-full rounded-[22px] sm:h-[300px] xl:h-[280px]" />

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-end gap-2">
          <p className="text-2xl font-semibold text-[#FFB9A4]">{formatPrice(featured.price)}</p>
          {discount ? <p className="pb-1 text-sm font-semibold text-slate-500 line-through">{formatPrice(featured.compareAtPrice)}</p> : null}
          {discount ? <span className="rounded-full bg-emerald-500/12 px-3 py-1 text-xs font-black text-emerald-300">{discount}% OFF</span> : null}
        </div>
        <div className="inline-flex items-center gap-2 rounded-full bg-white/8 px-3 py-2 text-xs text-slate-300">
          {featured.stock > 0 ? "Available from vendor inventory" : "Out of stock"}
        </div>
      </div>

      <div className="mt-5 grid gap-3">
        {productDetails.map((item) => (
          <div key={item} className="rounded-[22px] border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
            {item}
          </div>
        ))}
      </div>

      <CustomerBargainPanel
        bargainState={bargainState}
        offerDraft={offerDraft}
        setOfferDraft={setOfferDraft}
        onPlaceOffer={onPlaceOffer}
        onAddToCart={onAddToCart}
        error={bargainError}
        tone="dark"
      />

      <div className="mt-5 flex items-center gap-3">
        <button
          type="button"
          onClick={() => setQuantity((current) => Math.max(1, current - 1))}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/6"
          aria-label="Decrease quantity"
        >
          <Minus className="h-4 w-4" />
        </button>
        <div className="rounded-full border border-white/10 bg-white/6 px-6 py-3 text-white" aria-label={`Quantity ${quantity}`}>
          {quantity}
        </div>
        <button
          type="button"
          onClick={() => setQuantity((current) => current + 1)}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/6"
          aria-label="Increase quantity"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      <div className="sticky bottom-0 z-10 -mx-4 mt-5 grid gap-3 border-t border-white/10 bg-[#06080E] p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:-mx-6 sm:grid-cols-2 sm:p-6 xl:static xl:mx-0 xl:border-0 xl:bg-transparent xl:p-0">
        <motion.div animate={cartPulse ? { scale: [1, 1.05, 1] } : { scale: 1 }} className="min-w-0">
          <Button data-tour-id="add-to-cart" onClick={onAddToCart} className="min-h-12 w-full justify-center px-6 py-4 text-base">
            <ShoppingBag className="mr-2 h-4 w-4" />
            Add to Cart
          </Button>
        </motion.div>
        <button
          type="button"
          onClick={onBuyNow}
          className={buttonStyles("secondary", "min-h-12 justify-center border-white/10 bg-white/5 px-5 py-4 text-white hover:bg-white/10")}
        >
          Buy Now
        </button>
      </div>

      <div className="mt-6">
        <p className="text-sm text-slate-500">Related products</p>
        <div className="mt-3 grid gap-3">
          {relatedProducts.map((item) => (
            <div key={item.id} className="flex min-w-0 items-center gap-3 rounded-[22px] border border-white/10 bg-white/5 p-3">
              <AppImage src={item.images[0] ?? "/products/product-placeholder.png"} alt={item.title} className="h-16 w-16 rounded-[16px] sm:h-20 sm:w-20" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-white">{item.title}</p>
                <p className="mt-1 text-sm text-slate-400">{formatPrice(item.price)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}

function MobileLiveCommerceRoom({
  vendorName,
  stallName,
  viewerCount,
  liveStartedAt,
  featured,
  relatedProducts,
  quantity,
  setQuantity,
  cartPulse,
  onAddToCart,
  onBuyNow,
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
  onShowOrders,
  onLeave
}: {
  vendorName: string;
  stallName: string;
  viewerCount: number;
  liveStartedAt: string | null;
  featured: Product | null;
  relatedProducts: Product[];
  quantity: number;
  setQuantity: (updater: (current: number) => number) => void;
  cartPulse: boolean;
  onAddToCart: () => void;
  onBuyNow: () => void;
  livekitConnection: LiveKitConnection | null;
  isJoining: boolean;
  streamError: string;
  messages: Array<{ id: string; senderName: string; senderRole: string; message: string; createdAt: string }>;
  message: string;
  setMessage: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  canChat: boolean;
  chatError: string;
  isSendingMessage: boolean;
  activeTab: "chat" | "products" | "bargain";
  setActiveTab: (tab: "chat" | "products" | "bargain") => void;
  bargainState: BargainState | null;
  offerDraft: number;
  setOfferDraft: (value: number) => void;
  onPlaceOffer: () => void;
  bargainError: string;
  onShowOrders: () => void;
  onLeave: () => void;
}) {
  return (
    <section className="min-h-[100dvh] bg-[var(--bg)] px-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-[calc(0.8rem+env(safe-area-inset-top))] text-[var(--text)]">
      <header className="mb-4 flex items-center justify-between gap-3">
        <button type="button" onClick={onLeave} className="grid h-11 w-11 place-items-center rounded-2xl border border-[color:var(--border)] bg-[var(--surface-strong)] text-[var(--gold)]" aria-label="Leave live room">
          AE
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h1 className="truncate text-base font-black text-[var(--text)]">{vendorName}</h1>
            <CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--gold)]" />
            <span className="rounded-full bg-[var(--coral)] px-2 py-0.5 text-[10px] font-black text-white">LIVE</span>
          </div>
          <p className="truncate text-xs text-[var(--muted)]">{stallName}</p>
        </div>
        <button type="button" className="grid h-11 w-11 place-items-center rounded-2xl border border-[color:var(--border)] bg-[var(--surface-strong)] text-[var(--gold)]" aria-label="Share live room">
          <Share2 className="h-5 w-5" />
        </button>
      </header>

      <div className="relative aspect-[9/12] overflow-hidden rounded-[34px] border border-[color:var(--border)] bg-[#05040A] p-2 shadow-[0_22px_70px_rgba(0,0,0,0.28)]">
        <div className="absolute left-4 top-4 z-20 rounded-full bg-[#05060B] px-3 py-1 text-xs font-black text-white">
          {viewerCount} watching
        </div>
        <div className="absolute right-4 top-4 z-20">
          <LiveElapsedCounter startedAt={liveStartedAt} className="border-white/10 bg-black/45 text-white dark:border-white/10 dark:bg-black/45 dark:text-white" />
        </div>
        {livekitConnection?.mode === "real" ? (
          <UserLiveKitViewer connection={livekitConnection} className="h-full w-full overflow-hidden rounded-[28px] bg-slate-950" />
        ) : (
          <StreamStatusCard
            title={isJoining ? "Joining live stream" : "Vendor stream unavailable"}
            message={isJoining ? "Connecting to the LiveKit room..." : streamError || "Vendor is not live right now."}
          />
        )}
      </div>

      <article className="-mt-8 relative z-20 rounded-[30px] border border-[color:var(--border)] bg-[var(--surface-strong)] p-4 shadow-[var(--shadow-soft)]">
        <div className="flex gap-3">
          <AppImage src={featured?.images[0] ?? "/products/product-placeholder.png"} alt={featured?.title ?? "Pinned product"} className="h-24 w-24 rounded-[22px]" fallbackSrc="/products/product-placeholder.png" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--gold)]">Pinned</p>
              <button type="button" className="grid h-8 w-8 place-items-center rounded-full bg-[var(--surface)] text-[var(--coral)]" aria-label="Wishlist product">
                <Heart className="h-4 w-4" />
              </button>
            </div>
            <h2 className="mt-1 line-clamp-2 text-base font-black text-[var(--text)]">{featured?.title ?? "No product pinned"}</h2>
            <p className="mt-1 text-xs text-[var(--muted)]">{featured ? `${featured.stock} in stock` : "Vendor has not pinned a product yet."}</p>
            {featured ? (
              <MobilePinnedPrice product={featured} />
            ) : (
              <p className="mt-2 text-lg font-black text-[var(--coral)]">Unavailable</p>
            )}
          </div>
        </div>
        <div className="mt-4 grid grid-cols-[auto_1fr_1fr] gap-2">
          <div className="flex items-center rounded-full border border-[color:var(--border)] bg-[var(--surface)]">
            <button type="button" onClick={() => setQuantity((current) => Math.max(1, current - 1))} className="grid h-11 w-10 place-items-center" aria-label="Decrease quantity"><Minus className="h-4 w-4" /></button>
            <span className="min-w-6 text-center text-sm font-black">{quantity}</span>
            <button type="button" onClick={() => setQuantity((current) => current + 1)} className="grid h-11 w-10 place-items-center" aria-label="Increase quantity"><Plus className="h-4 w-4" /></button>
          </div>
          <motion.button animate={cartPulse ? { scale: [1, 1.04, 1] } : { scale: 1 }} type="button" onClick={onAddToCart} disabled={!featured} className="min-h-11 rounded-full border border-[color:var(--border)] bg-[var(--surface)] px-3 text-sm font-black text-[var(--text)] disabled:opacity-50">
            Add Cart
          </motion.button>
          <button type="button" onClick={onBuyNow} disabled={!featured} className="min-h-11 rounded-full bg-[var(--coral)] px-3 text-sm font-black text-white shadow-[0_14px_34px_rgba(255,120,92,0.28)] disabled:opacity-50">
            Buy Now
          </button>
        </div>
      </article>

      <div className="mt-5 flex items-center justify-between rounded-[24px] border border-[color:var(--border)] bg-[var(--surface-strong)] p-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--gold)]">Live viewers</p>
          <p className="mt-1 text-sm text-[var(--muted)]">{viewerCount} viewers from the current session</p>
        </div>
        <span className="rounded-full bg-[var(--surface)] px-4 py-2 text-sm font-black text-[var(--text)]">{viewerCount}</span>
      </div>

      <div className="mt-5 rounded-[30px] border border-[color:var(--border)] bg-[var(--surface-strong)] p-3 shadow-[var(--shadow-soft)]">
        <div className="grid grid-cols-2 rounded-[22px] bg-[var(--surface)] p-1">
          {(["chat", "products", "bargain"] as const).map((tab) => (
            <button key={tab} type="button" onClick={() => setActiveTab(tab)} className={`min-h-11 rounded-[18px] text-sm font-black capitalize ${activeTab === tab ? "bg-[var(--coral)] text-white" : "text-[var(--muted)]"}`}>
              {tab === "products" ? `Products (${relatedProducts.length + (featured ? 1 : 0)})` : tab}
            </button>
          ))}
        </div>

        {activeTab === "chat" ? (
          <div className="mt-4">
            <div className="max-h-64 space-y-3 overflow-y-auto">
              {messages.length ? messages.map((chat) => (
                <div key={chat.id} className="flex gap-3 rounded-[22px] bg-[var(--surface)] p-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--surface-strong)] text-xs font-black text-[var(--gold)]">{chat.senderName[0] ?? "U"}</span>
                  <div>
                    <p className="text-xs font-black text-[var(--text)]">{chat.senderName}</p>
                    <p className="mt-1 text-sm leading-5 text-[var(--muted)]">{chat.message}</p>
                  </div>
                </div>
              )) : <p className="rounded-[22px] bg-[var(--surface)] p-4 text-sm text-[var(--muted)]">No chat messages yet.</p>}
            </div>
            <form onSubmit={onSubmit} className="mt-3 flex gap-2">
              <input value={message} onChange={(event) => setMessage(event.target.value)} placeholder={canChat ? "Type a message..." : "Login as customer to chat"} disabled={!canChat} className="min-h-12 min-w-0 flex-1 rounded-full border border-[color:var(--border)] bg-[var(--surface)] px-4 text-sm text-[var(--text)] outline-none" />
              <button type="submit" disabled={!canChat || isSendingMessage} className="grid h-12 w-12 place-items-center rounded-full bg-[var(--coral)] text-white disabled:opacity-50" aria-label="Send message">
                <Send className="h-5 w-5" />
              </button>
            </form>
            {chatError ? <p className="mt-2 text-xs font-bold text-red-500">{chatError}</p> : null}
          </div>
        ) : activeTab === "products" ? (
          <div className="mt-4 grid grid-cols-2 gap-3">
            {[featured, ...relatedProducts].filter(Boolean).map((product) => (
              <MobileLiveProductCard key={product!.id} product={product!} />
            ))}
          </div>
        ) : (
          <CustomerBargainPanel
            bargainState={bargainState}
            offerDraft={offerDraft}
            setOfferDraft={setOfferDraft}
            onPlaceOffer={onPlaceOffer}
            onAddToCart={onAddToCart}
            error={bargainError}
          />
        )}
      </div>
      <LiveStreamBottomNav
        role="user"
        active={activeTab}
        onSelect={(tab) => {
          if (tab === "orders") {
            onShowOrders();
            return;
          }
          setActiveTab(tab);
        }}
      />
    </section>
  );
}

function MobilePinnedPrice({ product }: { product: Product }) {
  const discount = productDiscount(product);
  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5">
      <p className="text-lg font-black text-[var(--coral)]">{formatPrice(product.price)}</p>
      {discount ? <p className="text-xs font-bold text-[var(--muted)] line-through">{formatPrice(product.compareAtPrice)}</p> : null}
      {discount ? <span className="rounded-full bg-emerald-500/12 px-2 py-0.5 text-[10px] font-black text-emerald-600 dark:text-emerald-300">{discount}% OFF</span> : null}
    </div>
  );
}

function MobileLiveProductCard({ product }: { product: Product }) {
  const discount = productDiscount(product);
  return (
    <div className="overflow-hidden rounded-[20px] border border-[color:var(--border)] bg-[var(--surface)]">
      <div className="relative">
        <AppImage src={product.images[0] ?? "/products/product-placeholder.png"} alt={product.title} className="h-28 w-full rounded-none" fallbackSrc="/products/product-placeholder.png" />
        {discount ? <span className="absolute left-2 top-2 rounded-full bg-[#EF3B37] px-2 py-1 text-[10px] font-black text-white">{discount}%</span> : null}
      </div>
      <div className="p-2.5">
        <p className="line-clamp-2 min-h-9 text-xs font-black text-[var(--text)]">{product.title}</p>
        <div className="mt-2 flex flex-wrap items-end gap-1.5">
          <p className="text-sm font-black text-[var(--coral)]">{formatPrice(product.price)}</p>
          {discount ? <p className="text-[10px] font-bold text-[var(--muted)] line-through">{formatPrice(product.compareAtPrice)}</p> : null}
        </div>
      </div>
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
  const [offerWindowOpen, setOfferWindowOpen] = useState(false);
  const [offerWindowDraft, setOfferWindowDraft] = useState("");
  const offerWindowValue = Number(offerWindowDraft || 0);
  const canUseOfferWindow = offerWindowValue >= minOffer && offerWindowValue <= maxOffer;
  const isDark = tone === "dark";

  if (!session) {
    return (
      <div className={`mt-5 rounded-[24px] border p-4 ${isDark ? "border-white/10 bg-white/5 text-white" : "border-[color:var(--border)] bg-[var(--surface)] text-[var(--text)]"}`}>
        <div className="flex items-center gap-2">
          <Gavel className="h-4 w-4 text-[var(--gold)]" />
          <p className="text-sm font-black">Live bargain</p>
        </div>
        <p className={`mt-2 text-sm ${isDark ? "text-slate-400" : "text-[var(--muted)]"}`}>Vendor has not opened bargaining for the pinned product yet.</p>
      </div>
    );
  }

  return (
    <div className={`mt-5 rounded-[24px] border p-4 ${isDark ? "border-white/10 bg-white/5 text-white" : "border-[color:var(--border)] bg-[var(--surface)] text-[var(--text)]"}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--gold)]">Group bargain</p>
          <h3 className="mt-1 text-lg font-black">Current offer price: {currentOfferPrice ? formatPrice(currentOfferPrice) : "No offers"}</h3>
        </div>
        <span className="rounded-full bg-emerald-500/12 px-3 py-1 text-xs font-black text-emerald-500">Live</span>
      </div>
      <div className={`mt-3 rounded-[18px] p-3 text-sm ${isDark ? "bg-black/20 text-slate-300" : "bg-[var(--surface-strong)] text-[var(--muted)]"}`}>
        <div className="flex justify-between gap-3">
          <span>Live price</span>
          <strong className={isDark ? "text-white" : "text-[var(--text)]"}>{formatPrice(livePrice)}</strong>
        </div>
        {session.counterPrice ? (
          <div className="mt-2 flex justify-between gap-3 text-[var(--coral)]">
            <span>Vendor counter</span>
            <strong>{formatPrice(session.counterPrice)}</strong>
          </div>
        ) : null}
        {deal ? (
          <>
            <div className="mt-2 flex justify-between gap-3 text-emerald-500">
              <span>Current offer price</span>
              <strong>{formatPrice(deal.agreedPrice)}</strong>
            </div>
            <div className="mt-2 flex justify-between gap-3 text-[var(--gold)]">
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
          <div className="mt-3 grid grid-cols-[auto_1fr_auto] gap-2">
            <button type="button" onClick={() => setOfferDraft(Math.max(minOffer, displayOffer - step))} className="min-h-11 rounded-2xl border border-[color:var(--border)] px-4 font-black">-{formatPrice(step)}</button>
            <div className={`grid min-h-11 place-items-center rounded-2xl border text-lg font-black ${isDark ? "border-white/10 bg-black/20" : "border-[color:var(--border)] bg-[var(--surface-strong)]"}`}>{formatPrice(displayOffer)}</div>
            <button type="button" onClick={() => setOfferDraft(Math.min(maxOffer, displayOffer + step))} className="min-h-11 rounded-2xl border border-[color:var(--border)] px-4 font-black">+{formatPrice(step)}</button>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => {
                setOfferWindowDraft(String(displayOffer));
                setOfferWindowOpen(true);
              }}
              className={buttonStyles("secondary", "w-full justify-center px-5 py-3")}
            >
              Set counter price
            </button>
            <button type="button" onClick={onPlaceOffer} className={buttonStyles("primary", "w-full justify-center px-5 py-3")}>
              Place group offer
            </button>
          </div>
          {session.counterPrice ? (
            <div className="mt-2 rounded-2xl border border-[color:var(--border)] px-3 py-2 text-xs font-bold text-[var(--muted)]">
              Vendor counter is visible to everyone. Place your offer and wait for the vendor to accept one shared live price.
            </div>
          ) : null}
        </>
      )}
      {offerWindowOpen ? (
        <div className="fixed inset-0 z-[90] grid place-items-center bg-[#05060B] px-4">
          <div className={`w-full max-w-md rounded-[28px] border p-5 shadow-[0_28px_80px_rgba(0,0,0,0.36)] ${isDark ? "border-white/10 bg-[#11131B] text-white" : "border-[color:var(--border)] bg-[#FFFDF8] text-[var(--text)]"}`}>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--gold)]">Customer counter</p>
            <h3 className="mt-2 text-2xl font-black">Set your offer price</h3>
            <p className={`mt-2 text-sm ${isDark ? "text-slate-400" : "text-[var(--muted)]"}`}>
              Enter the price you want to offer for this live bargain.
            </p>
            <label className={`mt-4 block text-xs font-bold ${isDark ? "text-slate-300" : "text-[var(--muted)]"}`}>
              Offer price
              <input
                value={offerWindowDraft}
                onChange={(event) => setOfferWindowDraft(event.target.value)}
                inputMode="numeric"
                autoFocus
                className={`mt-2 h-12 w-full rounded-2xl border px-4 text-lg font-black outline-none focus:border-[var(--coral)] ${isDark ? "border-white/10 bg-[#1B1D28] text-white" : "border-[color:var(--border)] bg-white text-[var(--text)]"}`}
              />
            </label>
            <div className={`mt-3 rounded-2xl px-3 py-2 text-xs font-bold ${isDark ? "bg-[#222430] text-slate-300" : "bg-[var(--surface-strong)] text-[var(--muted)]"}`}>
              Allowed range: {formatPrice(minOffer)} to {formatPrice(maxOffer)}
            </div>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setOfferWindowOpen(false)} className={buttonStyles("secondary", "justify-center px-4 py-3")}>Cancel</button>
              <button
                type="button"
                onClick={() => {
                  if (!canUseOfferWindow) return;
                  setOfferDraft(offerWindowValue);
                  setOfferWindowOpen(false);
                }}
                disabled={!canUseOfferWindow}
                className={buttonStyles("primary", "justify-center px-4 py-3 disabled:opacity-50")}
              >
                Use price
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {bargainState.offerGroups.length ? (
        <div className="mt-3 grid gap-2">
          {bargainState.offerGroups.slice(0, 3).map((group) => (
            <div key={group.offerPrice} className={`flex justify-between rounded-2xl px-3 py-2 text-xs font-bold ${isDark ? "bg-black/20 text-slate-300" : "bg-[var(--surface-strong)] text-[var(--muted)]"}`}>
              <span>{formatPrice(group.offerPrice)}</span>
              <span>{group.customers} customer{group.customers === 1 ? "" : "s"}</span>
            </div>
          ))}
        </div>
      ) : null}
      {error ? <p className="mt-3 rounded-2xl bg-red-500/10 px-3 py-2 text-xs font-bold text-red-500">{error}</p> : null}
    </div>
  );
}

function LiveStreamBottomNav({
  role,
  active,
  onSelect
}: {
  role: "user" | "vendor";
  active: "orders" | "products" | "bargain" | "chat";
  onSelect: (tab: "orders" | "products" | "bargain" | "chat") => void;
}) {
  const items = role === "vendor"
    ? [
        ["orders", "Orders", ShoppingBag],
        ["products", "Products", ShoppingBag],
        ["bargain", "Bargain", Gavel],
        ["chat", "Chat", MessageCircleMore]
      ] as const
    : [
        ["orders", "Orders", ShoppingBag],
        ["products", "Products", ShoppingBag],
        ["bargain", "Bargain", Gavel],
        ["chat", "Chat", MessageCircleMore]
      ] as const;

  return (
    <nav className="fixed inset-x-3 bottom-4 z-[70] grid grid-cols-4 gap-1 rounded-[24px] border border-[color:var(--border)] bg-[var(--surface)] p-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] shadow-[0_16px_42px_rgba(0,0,0,0.22)] dark:bg-[#080B14]" aria-label={`${role} live stream navigation`}>
      {items.map(([key, label, Icon]) => (
        <button
          key={key}
          type="button"
          onClick={() => onSelect(key)}
          className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-2xl text-[11px] font-black transition ${active === key ? "bg-[var(--coral)] text-white" : "text-[var(--muted)] hover:bg-[var(--surface-strong)] hover:text-[var(--text)]"}`}
        >
          <Icon className="h-4 w-4" />
          {label}
        </button>
      ))}
    </nav>
  );
}

function StreamStatusCard({ title, message }: { title: string; message: string }) {
  return (
    <div className="flex h-full min-h-[260px] w-full items-center justify-center rounded-[24px] border border-dashed border-white/15 bg-white/6 p-8 text-center">
      <div className="max-w-md">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#E95F45]/18 text-xl font-semibold text-[#FFB9A4]">
          LIVE
        </div>
        <h3 className="mt-5 text-2xl font-semibold tracking-[-0.04em] text-white">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-slate-400">{message}</p>
      </div>
    </div>
  );
}
