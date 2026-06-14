"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, BadgeCheck, Handshake, MessageCircle, Radio, Search, ShieldCheck, ShoppingBag, Store, Tag, Video } from "lucide-react";
import { AppImage } from "@/components/ui/app-image";
import { buttonStyles } from "@/components/ui/button";
import { LiveElapsedCounter } from "@/components/marketplace/live-timers";
import { addCartItem, getStall, getStallProducts } from "@/lib/api";
import { useExpoStore } from "@/lib/cart-store";
import { Product, Stall } from "@/lib/types";
import { cn } from "@/lib/utils";

function formatPrice(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(value);
}

function discountPercent(product: Product) {
  if (!product.compareAtPrice || product.compareAtPrice <= product.price) {
    return 0;
  }
  return Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100);
}

function vendorInitials(name?: string | null) {
  return (name || "Vendor")
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function liveStatusLabel(stall?: Stall | null) {
  const status = stall?.liveStatus || stall?.status || "offline";
  if (status === "live") return "Live now";
  if (status === "break") return "On break";
  if (status === "busy") return "Busy";
  return "Offline";
}

function liveStatusClass(stall?: Stall | null) {
  const status = stall?.liveStatus || stall?.status || "offline";
  if (status === "live") return "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/12 dark:text-emerald-300";
  if (status === "break" || status === "busy") return "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-100";
  return "bg-[#F4E8D8] text-[#8A5A24] dark:bg-card dark:text-white/64";
}

export function VendorStoreScreen({ stallId }: { stallId: string }) {
  const setCartItems = useExpoStore((state) => state.setCartItems);
  const openCart = useExpoStore((state) => state.openCart);
  const currentUser = useExpoStore((state) => state.currentUser);
  const addLocalCartItem = useExpoStore((state) => state.addToCart);
  const [stall, setStall] = useState<Stall | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [cartMessage, setCartMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [addingId, setAddingId] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([getStall(stallId), getStallProducts(stallId)])
      .then(([stallResponse, productResponse]) => {
        if (!active) {
          return;
        }
        setStall(stallResponse);
        setProducts(productResponse.filter((product) => product.status === "active"));
        setError("");
      })
      .catch((requestError) => {
        if (active) {
          setError(requestError instanceof Error ? requestError.message : "Could not load vendor store.");
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [stallId]);

  const filteredProducts = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return products;
    }
    return products.filter((product) =>
      [product.title, product.description, product.offerCode]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized))
    );
  }, [products, query]);

  const addProduct = async (product: Product) => {
    setAddingId(product.id);
    setCartMessage("");
    if (!currentUser) {
      addLocalCartItem({
        id: product.id,
        title: product.title,
        price: product.price,
        quantity: 1,
        vendorName: stall?.vendorName || stall?.assignedVendorName || stall?.name || "Vendor",
        image: product.images[0] || "/products/product-placeholder.png",
        vendorId: product.vendorId,
        stallId: product.stallId
      });
      openCart();
      setCartMessage(`${product.title} added to cart.`);
      setAddingId("");
      return;
    }
    try {
      const items = await addCartItem(product.id, 1);
      setCartItems(items);
      openCart();
      setCartMessage(`${product.title} added to cart.`);
    } catch (requestError) {
      setCartMessage(requestError instanceof Error ? requestError.message : "Could not add product to cart.");
    } finally {
      setAddingId("");
    }
  };

  const isLive = stall?.liveStatus === "live" || stall?.status === "live";
  const pinnedProduct = products[0] ?? null;

  return (
    <main className="min-h-screen bg-[#FAF7F0] px-4 py-5 pb-28 text-[#1B1A17] dark:bg-[#05040A] dark:text-[#FFF8EA] sm:px-6 md:pb-5 lg:px-10">
      <section className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="overflow-hidden rounded-[30px] border border-[#E8DDCC] bg-[#FFFDF8] shadow-[0_24px_80px_rgba(80,52,20,0.10)] dark:border-white/10 dark:bg-[#11101A] dark:shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
          <div
            className="relative min-h-56 overflow-hidden bg-gradient-to-br from-[#F7E9D2] via-[#F8F4EA] to-[#F27457] p-5 dark:from-[#241B2E] dark:via-[#15121E] dark:to-[#5A2B24] sm:p-8"
            style={{
              backgroundImage: stall?.bannerImage
                ? `linear-gradient(110deg, rgba(255,253,248,0.86), rgba(247,233,210,0.74), rgba(242,116,87,0.36)), url("${stall.bannerImage}")`
                : undefined,
              backgroundSize: "cover",
              backgroundPosition: "center"
            }}
          >
            <Link href="/exhibitions" className="inline-flex items-center gap-2 rounded-full border border-[#E8DDCC] bg-card px-4 py-2 text-sm font-bold text-[#6F675C] dark:border-white/10 dark:bg-[#11111a] dark:text-white/72">
              <ArrowLeft className="h-4 w-4" />
              Back to exhibitions
            </Link>
            <div className="mt-12 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.28em] text-[#B88A3D] dark:text-[#F4C879]">Vendor Store</p>
                <h1 className="mt-3 max-w-2xl text-4xl font-black tracking-[-0.06em] text-[#11101A] dark:text-[#FFF8EA] sm:text-6xl">
                  {stall?.vendorName || stall?.assignedVendorName || stall?.name || "Vendor store"}
                </h1>
                <p className="mt-3 text-sm font-semibold text-[#6F675C] dark:text-white/64">
                  {stall ? `${stall.name} | ${stall.category || "General"}` : "Products are loaded from this vendor stall."}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200">
                    <BadgeCheck className="h-3.5 w-3.5" />
                    Verified vendor
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-1.5 text-xs font-black text-[#8A5A24] dark:bg-[#11111a] dark:text-[#F4C879]">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Ankita Designs secure order
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className={cn("rounded-full px-4 py-2 text-sm font-black", liveStatusClass(stall))}>
                  {liveStatusLabel(stall)}
                </span>
                {isLive ? <LiveElapsedCounter startedAt={stall?.liveStartedAt} size="md" /> : null}
                <span className="rounded-full bg-card px-4 py-2 text-sm font-black text-[#8A5A24] dark:bg-[#11111a] dark:text-[#F4C879]">
                  {products.length} products
                </span>
              </div>
            </div>
            {stall?.liveStatus === "break" ? (
              <div className="mt-5 rounded-[22px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
                {stall.breakMessage || "Vendor is currently on break. You can browse products and send enquiries."}
              </div>
            ) : null}
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href={`/live/${stallId}`} className={buttonStyles("primary", "min-h-11 justify-center px-5 py-2")}>
                <MessageCircle className="mr-2 h-4 w-4" />
                Chat with Vendor
              </Link>
              <Link href={`/live/${stallId}?intent=best-price`} className={buttonStyles("secondary", "min-h-11 justify-center px-5 py-2")}>
                Ask Best Price
              </Link>
              <Link href={`/live/${stallId}`} className={buttonStyles("secondary", "min-h-11 justify-center px-5 py-2")}>
                {isLive ? "Watch Live" : "Live Room"}
              </Link>
            </div>
          </div>

          <div className="p-5 sm:p-8">
            <section className="mb-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
              <div className="overflow-hidden rounded-[24px] border border-[#E8DDCC] bg-[#111827] text-white shadow-[0_18px_48px_rgba(80,52,20,0.10)] dark:border-white/10 dark:bg-[#11111a]">
                <div className="relative grid min-h-64 place-items-center bg-[radial-gradient(circle_at_20%_10%,rgba(244,200,121,0.24),transparent_34%),linear-gradient(135deg,#111827,#241B2E)] p-6">
                  <div className="text-center">
                    <span className={cn("mx-auto inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-black", isLive ? "bg-emerald-500/18 text-emerald-100" : "bg-[#1d1d27] text-white/72")}>
                      <Video className="h-4 w-4" />
                      {isLive ? "Vendor live stream" : "Live stream not active"}
                    </span>
                    {isLive ? (
                      <div className="mt-3 flex justify-center">
                        <LiveElapsedCounter startedAt={stall?.liveStartedAt} className="border-white/10 bg-[#1d1d27] text-white dark:border-white/10 dark:bg-[#23232d] dark:text-white" />
                      </div>
                    ) : null}
                    <h2 className="mt-4 text-2xl font-black tracking-[-0.04em] text-white">Live shopping room</h2>
                    <p className="mx-auto mt-2 max-w-md text-sm font-semibold leading-6 text-white/70">
                      {isLive
                        ? "Watch the vendor demo products, ask questions, and move items into cart from the catalogue."
                        : "The catalogue remains available. Join the live room to chat or check back when the vendor goes live."}
                    </p>
                    <Link href={`/live/${stallId}`} className={buttonStyles(isLive ? "primary" : "secondary", "mt-5 justify-center px-5 py-3")}>
                      {isLive ? "Watch Live Demo" : "Open Live Room"}
                    </Link>
                  </div>
                </div>
              </div>

              <aside className="grid gap-3 rounded-[24px] border border-[#E8DDCC] bg-[#FFF7EB] p-4 dark:border-white/10 dark:bg-[#171720]">
                <div className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-[#6F675C] dark:bg-[#1d1d27] dark:text-white/66">
                  <ShieldCheck className="mr-2 inline h-4 w-4 text-[#B88A3D]" />
                  Verified seller managed by Ankita Designs.
                </div>
                <div className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-[#6F675C] dark:bg-[#1d1d27] dark:text-white/66">
                  <Handshake className="mr-2 inline h-4 w-4 text-[#B88A3D]" />
                  Chat and bargain before checkout.
                </div>
                <div className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-[#6F675C] dark:bg-[#1d1d27] dark:text-white/66">
                  <ShoppingBag className="mr-2 inline h-4 w-4 text-[#B88A3D]" />
                  Secure cart and order placement.
                </div>
              </aside>
            </section>

            {pinnedProduct ? (
              <section className="mb-6 rounded-[24px] border border-[#E8DDCC] bg-[#FFF7EB] p-4 dark:border-white/10 dark:bg-[#171720]">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <AppImage src={pinnedProduct.images[0] || "/products/product-placeholder.png"} alt={pinnedProduct.title} fallbackSrc="/products/product-placeholder.png" className="h-28 w-full rounded-2xl sm:w-32" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-[#B88A3D] dark:text-[#F4C879]">Highlighted product</p>
                    <h3 className="mt-1 line-clamp-2 text-xl font-black text-[#1B1A17] dark:text-[#FFF8EA]">{pinnedProduct.title}</h3>
                    <p className="mt-1 text-sm font-semibold text-[#6F675C] dark:text-white/64">{formatPrice(pinnedProduct.price)}</p>
                  </div>
                  <button type="button" onClick={() => void addProduct(pinnedProduct)} disabled={addingId === pinnedProduct.id || pinnedProduct.stock <= 0} className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#F27457] px-5 text-sm font-black text-white transition hover:bg-[#E95F45] disabled:opacity-50">
                    Add to Cart
                  </button>
                </div>
              </section>
            ) : null}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-[#B88A3D] dark:text-[#F4C879]">Catalogue</p>
                <h2 className="mt-1 text-2xl font-black tracking-[-0.04em]">Shop vendor products</h2>
              </div>
              <label className="flex min-h-12 items-center gap-2 rounded-full border border-[#E8DDCC] bg-[#F7F1E8] px-4 dark:border-white/10 dark:bg-[#1d1d27] sm:min-w-80">
                <Search className="h-4 w-4 text-[#B88A3D]" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search products"
                  className="w-full bg-transparent text-sm font-semibold text-[#1B1A17] outline-none placeholder:text-[#9A8F82] dark:text-[#FFF8EA] dark:placeholder:text-white/38"
                />
              </label>
            </div>

            {cartMessage ? (
              <p className="mt-4 rounded-2xl border border-[#E8DDCC] bg-[#FFF7EB] px-4 py-3 text-sm font-semibold text-[#6F675C] dark:border-white/10 dark:bg-[#1d1d27] dark:text-white/70">
                {cartMessage}
              </p>
            ) : null}

            {loading ? (
              <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div key={index} className="h-64 animate-pulse rounded-[24px] bg-[#F0E7D9] dark:bg-[#1d1d27] sm:h-80 sm:rounded-[28px]" />
                ))}
              </div>
            ) : error ? (
              <div className="mt-6 rounded-[28px] border border-red-400/30 bg-red-500/10 p-6 text-sm font-semibold text-red-600 dark:text-red-200">
                {error}
              </div>
            ) : filteredProducts.length ? (
              <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
                {filteredProducts.map((product) => {
                  const discount = discountPercent(product);
                  return (
                    <article key={product.id} className="overflow-hidden rounded-[22px] border border-[#E8DDCC] bg-[#FFFDF8] shadow-[0_14px_38px_rgba(80,52,20,0.08)] dark:border-white/10 dark:bg-[#171720] sm:rounded-[28px]">
                      <div className="relative">
                        <AppImage src={product.images[0] ?? "/products/product-placeholder.png"} alt={product.title} fallbackSrc="/products/product-placeholder.png" className="h-40 w-full rounded-none sm:h-64" />
                        {discount ? <span className="absolute left-2 top-2 rounded-full bg-[#B91C1C] px-2.5 py-1 text-[10px] font-black text-white sm:left-3 sm:top-3 sm:text-xs">Sale</span> : null}
                        <button
                          type="button"
                          onClick={() => void addProduct(product)}
                          disabled={addingId === product.id || product.stock <= 0}
                          className="absolute bottom-2 right-2 grid h-9 w-9 place-items-center rounded-full border border-[#E8DDCC] bg-white text-[#1B1A17] shadow-soft disabled:opacity-50 dark:border-white/10 dark:bg-[#11101A] dark:text-[#FFF8EA] sm:bottom-3 sm:right-3 sm:h-11 sm:w-11"
                          aria-label={`Add ${product.title} to cart`}
                        >
                          <ShoppingBag className="h-4 w-4 sm:h-5 sm:w-5" />
                        </button>
                      </div>
                      <div className="p-3 sm:p-4">
                        <h3 className="line-clamp-2 min-h-10 text-sm font-bold leading-5 sm:min-h-12 sm:text-base sm:leading-6">{product.title}</h3>
                        <p className="mt-1 line-clamp-2 min-h-9 text-xs text-[#6F675C] dark:text-white/56 sm:mt-2 sm:min-h-10 sm:text-sm">{product.description}</p>
                        <div className="mt-3 flex flex-wrap items-end gap-2">
                          <p className="text-lg font-black sm:text-2xl">{formatPrice(product.price)}</p>
                          {discount ? <p className="pb-0.5 text-xs font-bold text-[#9A8F82] line-through sm:text-sm">{formatPrice(product.compareAtPrice)}</p> : null}
                          {discount ? <p className="w-full text-[10px] font-black text-emerald-600 dark:text-emerald-300 sm:w-auto sm:pb-1 sm:text-xs">{discount}% OFF</p> : null}
                        </div>
                        {discount ? <div className="mt-3 rounded-lg bg-[#EF3B37] px-3 py-2 text-center text-[10px] font-black text-white sm:text-xs">{discount}% OFF</div> : null}
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="mt-6 rounded-[28px] border border-dashed border-[#D9C7A8] bg-[#FFF7EB] p-8 text-center dark:border-white/14 dark:bg-[#15151e]">
                <Store className="mx-auto h-10 w-10 text-[#B88A3D]" />
                <h3 className="mt-4 text-2xl font-black">No products listed yet</h3>
                <p className="mx-auto mt-2 max-w-md text-sm text-[#6F675C] dark:text-white/58">
                  This vendor store will show active products once the vendor adds them from their dashboard.
                </p>
              </div>
            )}
          </div>
        </div>

        <aside className="h-fit rounded-[30px] border border-[#E8DDCC] bg-[#FFFDF8] p-5 shadow-[0_24px_80px_rgba(80,52,20,0.10)] dark:border-white/10 dark:bg-[#11101A]">
          <div className="flex items-center gap-3">
            <div className="grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-[#F4C879] to-[#F27457] text-sm font-black text-white">
              {vendorInitials(stall?.vendorName || stall?.assignedVendorName)}
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[#B88A3D]">Vendor stall</p>
              <h2 className="mt-1 text-xl font-black">{stall?.name ?? "Stall"}</h2>
            </div>
          </div>
          <div className="mt-5 grid gap-3">
            <div className="rounded-2xl bg-[#F7F1E8] px-4 py-3 text-sm font-semibold text-[#6F675C] dark:bg-[#1d1d27] dark:text-white/64">
              <Radio className="mr-2 inline h-4 w-4 text-[#B88A3D]" />
              {stall?.viewerCount ?? 0} viewers
            </div>
            <div className="rounded-2xl bg-[#F7F1E8] px-4 py-3 text-sm font-semibold text-[#6F675C] dark:bg-[#1d1d27] dark:text-white/64">
              <Tag className="mr-2 inline h-4 w-4 text-[#B88A3D]" />
              {products.length} active products
            </div>
          </div>
          <Link href={`/live/${stallId}`} className={buttonStyles(isLive ? "primary" : "secondary", "mt-5 w-full justify-center px-5 py-4")}>
            {isLive ? `Join ${stall?.number ?? "Live"}` : "View live room"}
          </Link>
          {!isLive ? (
            <p className="mt-3 text-center text-xs font-semibold text-[#9A8F82] dark:text-white/42">
              The vendor is not live. You can still browse the store catalogue.
            </p>
          ) : null}
        </aside>
      </section>
    </main>
  );
}
