"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowLeft,
  BadgeCheck,
  CheckCircle2,
  Clock3,
  Eye,
  Flame,
  Handshake,
  MessageCircle,
  PackageCheck,
  Radio,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  Store,
  Tag,
  Users,
  Video
} from "lucide-react";
import { AppImage } from "@/components/ui/app-image";
import { buttonStyles } from "@/components/ui/button";
import { FloatingActionBar, LiveBadge, PremiumProductCard, QuickShopBadge } from "@/components/ui/app-primitives";
import { LiveElapsedCounter } from "@/components/marketplace/live-timers";
import { addCartItem, getStall, getStallProducts } from "@/lib/api";
import { useExpoStore } from "@/lib/cart-store";
import { Product, Stall } from "@/lib/types";
import { cn } from "@/lib/utils";

type CollectionTab = "new" | "best" | "deals";

function formatPrice(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(value);
}

function compactNumber(value?: number | null) {
  return new Intl.NumberFormat("en-IN", {
    notation: "compact",
    maximumFractionDigits: 1
  }).format(value ?? 0);
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

function isDealProduct(product: Product) {
  return Boolean(product.offerCode) || discountPercent(product) > 0;
}

function productBadge(product: Product) {
  if (product.offerCode) return `Code ${product.offerCode}`;
  const discount = discountPercent(product);
  return discount ? `${discount}% off` : undefined;
}

function productStockLabel(product: Product) {
  if (product.stock <= 0) return "Sold out";
  if (product.stock <= 5) return `Only ${product.stock} left`;
  return "Ready to ship";
}

function productRank(product: Product) {
  return discountPercent(product) * 1000 + Math.max(0, product.compareAtPrice - product.price) + Math.min(product.stock, 20);
}

function liveStatusLabel(stall?: Stall | null) {
  const status = stall?.liveStatus || stall?.status || "offline";
  if (status === "live") return "Live now";
  if (status === "break") return "On break";
  if (status === "busy") return "Busy";
  if (status === "starting-soon") return "Starting soon";
  return "Offline";
}

function liveStatusClass(stall?: Stall | null) {
  const status = stall?.liveStatus || stall?.status || "offline";
  if (status === "live") return "border-emerald-400/40 bg-emerald-500/12 text-emerald-700 dark:text-emerald-200";
  if (status === "break" || status === "busy" || status === "starting-soon") {
    return "border-[color:var(--warning)]/35 bg-[color:var(--warning)]/12 text-[var(--warning)]";
  }
  return "border-[color:var(--border)] bg-[var(--surface)] text-muted-foreground";
}

export function VendorStoreScreen({ stallId }: { stallId: string }) {
  const setCartItems = useExpoStore((state) => state.setCartItems);
  const openCart = useExpoStore((state) => state.openCart);
  const currentUser = useExpoStore((state) => state.currentUser);
  const addLocalCartItem = useExpoStore((state) => state.addToCart);
  const [stall, setStall] = useState<Stall | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [query, setQuery] = useState("");
  const [activeCollection, setActiveCollection] = useState<CollectionTab>("new");
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

  const vendorName = stall?.vendorName || stall?.assignedVendorName || stall?.name || "Vendor store";
  const isLive = stall?.liveStatus === "live" || stall?.status === "live";
  const bannerImage = stall?.bannerImage || stall?.featuredImage || stall?.image || "/stalls/stall-placeholder.png";
  const boutiqueDescription =
    stall?.description ||
    "A curated live shopping stall from Ankita Designs, with products, seller chat, and secure checkout in one place.";

  const bestSellerProducts = useMemo(
    () => [...products].sort((left, right) => productRank(right) - productRank(left) || right.price - left.price),
    [products]
  );

  const liveDealProducts = useMemo(() => {
    const deals = products.filter(isDealProduct).sort((left, right) => discountPercent(right) - discountPercent(left));
    return deals.length ? deals : bestSellerProducts.slice(0, 6);
  }, [bestSellerProducts, products]);

  const shelfProducts = useMemo(() => {
    const featured = [liveDealProducts[0], ...bestSellerProducts, ...products].filter(Boolean) as Product[];
    return Array.from(new Map(featured.map((product) => [product.id, product])).values()).slice(0, 8);
  }, [bestSellerProducts, liveDealProducts, products]);

  const collectionProducts = useMemo(() => {
    if (activeCollection === "best") return bestSellerProducts;
    if (activeCollection === "deals") return liveDealProducts;
    return products;
  }, [activeCollection, bestSellerProducts, liveDealProducts, products]);

  const filteredProducts = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return collectionProducts;
    }
    return collectionProducts.filter((product) =>
      [product.title, product.description, product.offerCode]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized))
    );
  }, [collectionProducts, query]);

  const collectionTabs = useMemo(
    () => [
      { id: "new" as const, label: "New", count: products.length, icon: Sparkles },
      { id: "best" as const, label: "Best Sellers", count: bestSellerProducts.length, icon: Star },
      { id: "deals" as const, label: "Live Deals", count: liveDealProducts.length, icon: Flame }
    ],
    [bestSellerProducts.length, liveDealProducts.length, products.length]
  );

  const pinnedProduct = shelfProducts[0] ?? null;

  const addProduct = async (product: Product) => {
    setAddingId(product.id);
    setCartMessage("");
    if (!currentUser) {
      addLocalCartItem({
        id: product.id,
        title: product.title,
        price: product.price,
        quantity: 1,
        vendorName,
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

  return (
    <main className="app-page min-h-screen pb-28 text-foreground md:pb-8">
      <section className="relative isolate min-h-[520px] overflow-hidden border-b border-[color:var(--border)] bg-[var(--brand-black)] text-[var(--brand-cream)]">
        <AppImage
          src={bannerImage}
          alt={`${vendorName} stall banner`}
          fallbackSrc="/stalls/stall-placeholder.png"
          className="absolute inset-0 h-full w-full rounded-none object-cover opacity-58"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(5,4,10,0.92)_0%,rgba(17,16,26,0.72)_48%,rgba(242,116,87,0.32)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_18%,rgba(244,200,121,0.24),transparent_28%),linear-gradient(0deg,rgba(5,4,10,0.68),transparent_42%)]" />

        <div className="relative z-10 mx-auto flex min-h-[520px] max-w-7xl flex-col px-4 py-5 sm:px-6 lg:px-10">
          <div className="flex items-center justify-between gap-3">
            <Link
              href="/exhibitions"
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/16 bg-white/10 px-4 text-sm font-black text-white backdrop-blur transition hover:bg-white/16 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Exhibitions
            </Link>
            <span className={cn("inline-flex min-h-10 items-center rounded-full border px-4 text-xs font-black uppercase", liveStatusClass(stall))}>
              {liveStatusLabel(stall)}
            </span>
          </div>

          <div className="grid flex-1 items-end gap-8 py-12 lg:grid-cols-[minmax(0,1fr)_380px]">
            <div className="max-w-3xl">
              <div className="flex flex-wrap items-center gap-2">
                {isLive ? <LiveBadge label="Live shopping" /> : <QuickShopBadge label="Boutique stall" />}
                <span className="inline-flex items-center gap-2 rounded-full border border-white/16 bg-white/10 px-3 py-1.5 text-xs font-black uppercase text-white/82 backdrop-blur">
                  <Sparkles className="h-3.5 w-3.5 text-[var(--gold)]" />
                  {stall?.category || "Curated collection"}
                </span>
              </div>
              <h1 className="mt-5 max-w-4xl text-4xl font-black leading-[0.95] text-white sm:text-6xl lg:text-7xl">
                {vendorName}
              </h1>
              <p className="mt-5 max-w-2xl text-base font-semibold leading-7 text-white/76 sm:text-lg">
                {boutiqueDescription}
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link href={`/live/${stallId}`} className={buttonStyles("primary", "min-h-12 justify-center px-6 py-3 text-sm")}>
                  <MessageCircle className="mr-2 h-4 w-4" />
                  {isLive ? "Watch and Chat" : "Open Live Room"}
                </Link>
                <Link href={`/live/${stallId}?intent=best-price`} className={buttonStyles("secondary", "min-h-12 justify-center px-6 py-3 text-sm")}>
                  <Handshake className="mr-2 h-4 w-4" />
                  Ask Best Price
                </Link>
              </div>
            </div>

            <LiveRoomPreview
              stall={stall}
              stallId={stallId}
              product={pinnedProduct}
              isLive={isLive}
              loading={loading}
            />
          </div>
        </div>
      </section>

      <section className="relative z-20 mx-auto -mt-20 max-w-7xl px-4 sm:px-6 lg:px-10">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="app-card app-slide-in p-4 sm:p-5">
            <div className="flex flex-col gap-5 md:flex-row md:items-center">
              <div className="grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-[28px] border border-[color:var(--border)] bg-[linear-gradient(135deg,var(--gold),var(--coral))] text-2xl font-black text-white shadow-[var(--shadow-card)]">
                {stall?.vendorLogo ? (
                  <AppImage src={stall.vendorLogo} alt={`${vendorName} logo`} fallbackSrc="/avatars/default-avatar.png" className="h-full w-full rounded-none object-cover" />
                ) : (
                  vendorInitials(vendorName)
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className="app-section-eyebrow">Vendor boutique</p>
                <h2 className="mt-2 text-2xl font-black leading-tight text-foreground sm:text-3xl">{stall?.name || vendorName}</h2>
                <p className="mt-2 line-clamp-2 text-sm font-semibold leading-6 text-muted-foreground">
                  {stall?.exhibitionTitle ? `${stall.exhibitionTitle} storefront` : "Digital stall for live shopping, product discovery, and customer chat."}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2 md:w-[360px]">
                <StoreStat icon={Users} label="Followers" value={compactNumber(stall?.followerCount)} />
                <StoreStat icon={Sparkles} label="Posts" value={compactNumber(stall?.postCount)} />
                <StoreStat icon={ShoppingBag} label="Products" value={compactNumber(products.length || stall?.productCount)} />
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <TrustRow icon={BadgeCheck} title="Verified Vendor" description="Approved Ankita Designs seller." />
              <TrustRow icon={ShieldCheck} title="Secure Orders" description="Cart and checkout stay protected." />
              <TrustRow icon={PackageCheck} title="Active Catalogue" description={`${products.length || stall?.productCount || 0} products ready.`} />
            </div>

            {stall?.liveStatus === "break" ? (
              <div className="mt-5 rounded-2xl border border-[color:var(--warning)]/30 bg-[color:var(--warning)]/12 px-4 py-3 text-sm font-bold text-[var(--warning)]">
                {stall.breakMessage || "Vendor is currently on break. You can browse products and send enquiries."}
              </div>
            ) : null}
          </div>

          <aside className="app-card app-slide-in h-fit p-4">
            <p className="app-section-eyebrow">Stall status</p>
            <div className="mt-3 grid gap-3">
              <StatusRow icon={Radio} label="Live room" value={liveStatusLabel(stall)} active={isLive} />
              <StatusRow icon={Eye} label="Watching now" value={compactNumber(stall?.viewerCount)} />
              <StatusRow icon={Clock3} label="Delivery area" value={stall?.deliveryArea || "Vendor confirmed"} />
            </div>
            <Link href={`/live/${stallId}`} className={buttonStyles(isLive ? "primary" : "secondary", "mt-5 w-full justify-center px-5 py-4")}>
              {isLive ? "Join Live Room" : "Enter Live Room"}
            </Link>
          </aside>
        </div>
      </section>

      <section className="mx-auto mt-8 max-w-7xl px-4 sm:px-6 lg:px-10">
        {cartMessage ? (
          <p className="mb-5 rounded-2xl border border-[color:var(--border)] bg-[var(--surface)] px-4 py-3 text-sm font-semibold text-muted-foreground" role="status">
            {cartMessage}
          </p>
        ) : null}

        <div className="grid gap-8">
          <section className="app-slide-in">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="app-section-eyebrow">Product shelves</p>
                <h2 className="mt-2 text-2xl font-black text-foreground sm:text-3xl">Featured from this stall</h2>
              </div>
              {isLive ? <LiveElapsedCounter startedAt={stall?.liveStartedAt} size="md" /> : null}
            </div>

            {loading ? (
              <LoadingGrid />
            ) : error ? (
              <StoreError message={error} />
            ) : shelfProducts.length ? (
              <div className="app-no-scrollbar flex snap-x gap-4 overflow-x-auto pb-2">
                {shelfProducts.map((product) => (
                  <PremiumProductCard
                    key={product.id}
                    href={`#product-${product.id}`}
                    image={product.images[0] || "/products/product-placeholder.png"}
                    title={product.title}
                    price={product.price}
                    compareAtPrice={discountPercent(product) ? product.compareAtPrice : undefined}
                    vendorName={vendorName}
                    badge={productBadge(product)}
                    stockLabel={productStockLabel(product)}
                    className="min-w-[220px] snap-start sm:min-w-[260px]"
                    action={
                      <button
                        type="button"
                        onClick={() => void addProduct(product)}
                        disabled={addingId === product.id || product.stock <= 0}
                        className={buttonStyles("secondary", "min-h-10 w-full justify-center px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-50")}
                      >
                        <ShoppingBag className="mr-2 h-4 w-4" />
                        {addingId === product.id ? "Adding" : "Quick Add"}
                      </button>
                    }
                  />
                ))}
              </div>
            ) : (
              <StoreEmptyState />
            )}
          </section>

          <section className="app-card p-4 sm:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="app-section-eyebrow">Collections</p>
                <h2 className="mt-2 text-2xl font-black text-foreground sm:text-3xl">Shop the boutique</h2>
              </div>
              <label className="flex min-h-12 items-center gap-2 rounded-full border border-[color:var(--border)] bg-[var(--surface)] px-4 text-foreground lg:min-w-80">
                <Search className="h-4 w-4 shrink-0 text-[var(--gold)]" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search products"
                  className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-foreground outline-none placeholder:text-muted-foreground"
                />
              </label>
            </div>

            <div className="app-no-scrollbar mt-5 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Product collections">
              {collectionTabs.map((tab) => {
                const Icon = tab.icon;
                const active = activeCollection === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setActiveCollection(tab.id)}
                    className={cn(
                      "inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-black transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                      active
                        ? "border-primary bg-primary text-primary-foreground shadow-[var(--shadow-card)]"
                        : "border-[color:var(--border)] bg-[var(--surface)] text-muted-foreground hover:border-primary/45 hover:text-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                    <span className={cn("rounded-full px-2 py-0.5 text-[10px]", active ? "bg-white/18 text-white" : "bg-muted text-muted-foreground")}>
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {loading ? (
              <LoadingGrid className="mt-6" />
            ) : error ? (
              <StoreError message={error} className="mt-6" />
            ) : filteredProducts.length ? (
              <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
                {filteredProducts.map((product) => (
                  <BoutiqueProductCard
                    key={product.id}
                    product={product}
                    vendorName={vendorName}
                    adding={addingId === product.id}
                    onAdd={() => void addProduct(product)}
                  />
                ))}
              </div>
            ) : (
              <StoreEmptyState
                title="No products in this collection"
                description="Try another collection tab or clear the search to see more from this vendor."
                className="mt-6"
              />
            )}
          </section>
        </div>
      </section>

      <FloatingActionBar className="fixed inset-x-3 bottom-3 z-50 md:hidden">
        <Link href={`/live/${stallId}`} className={buttonStyles("secondary", "min-h-11 flex-1 justify-center px-4 text-sm")}>
          <MessageCircle className="mr-2 h-4 w-4" />
          Chat
        </Link>
        <button type="button" onClick={openCart} className={buttonStyles("primary", "min-h-11 flex-1 justify-center px-4 text-sm")}>
          <ShoppingBag className="mr-2 h-4 w-4" />
          Cart
        </button>
      </FloatingActionBar>
    </main>
  );
}

function StoreStat({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[color:var(--border)] bg-[var(--surface)] px-3 py-3 text-center">
      <Icon className="mx-auto h-4 w-4 text-[var(--gold)]" />
      <p className="mt-1 text-lg font-black leading-tight text-foreground">{value}</p>
      <p className="text-[10px] font-black uppercase text-muted-foreground">{label}</p>
    </div>
  );
}

function TrustRow({ icon: Icon, title, description }: { icon: LucideIcon; title: string; description: string }) {
  return (
    <div className="flex min-w-0 gap-3 rounded-2xl border border-[color:var(--border)] bg-[var(--surface)] px-4 py-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[color:var(--gold)]/12 text-[var(--gold)]">
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-black text-foreground">{title}</span>
        <span className="mt-0.5 block text-xs font-semibold leading-5 text-muted-foreground">{description}</span>
      </span>
    </div>
  );
}

function StatusRow({ icon: Icon, label, value, active = false }: { icon: LucideIcon; label: string; value: string; active?: boolean }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-[color:var(--border)] bg-[var(--surface)] px-4 py-3">
      <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-2xl", active ? "bg-emerald-500/12 text-emerald-600 dark:text-emerald-200" : "bg-[color:var(--gold)]/12 text-[var(--gold)]")}>
        <Icon className={cn("h-5 w-5", active && "animate-pulse")} />
      </span>
      <span className="min-w-0">
        <span className="block text-xs font-black uppercase text-muted-foreground">{label}</span>
        <span className="mt-0.5 block truncate text-sm font-black text-foreground">{value}</span>
      </span>
    </div>
  );
}

function LiveRoomPreview({
  stall,
  stallId,
  product,
  isLive,
  loading
}: {
  stall: Stall | null;
  stallId: string;
  product: Product | null;
  isLive: boolean;
  loading: boolean;
}) {
  return (
    <aside className="app-card app-slide-in overflow-hidden border-white/12 bg-black/44 p-3 text-white backdrop-blur">
      <div className="relative aspect-[4/3] overflow-hidden rounded-[22px] bg-[#0b0b11]">
        <AppImage
          src={product?.images[0] || stall?.featuredImage || stall?.bannerImage || "/products/product-placeholder.png"}
          alt={product?.title || `${stall?.name || "Vendor"} live room`}
          fallbackSrc="/products/product-placeholder.png"
          className="absolute inset-0 h-full w-full rounded-none object-cover opacity-64"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,4,10,0.14),rgba(5,4,10,0.86))]" />
        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          {isLive ? <LiveBadge /> : <span className="rounded-full bg-white/12 px-3 py-1.5 text-xs font-black uppercase text-white/82">Preview</span>}
          <span className="inline-flex items-center gap-1.5 rounded-full bg-black/48 px-3 py-1.5 text-xs font-black text-white">
            <Eye className="h-3.5 w-3.5 text-[var(--gold)]" />
            {compactNumber(stall?.viewerCount)} watching
          </span>
        </div>
        <div className="absolute inset-x-4 bottom-4">
          <p className="text-xs font-black uppercase text-[var(--gold)]">{isLive ? "Now on stage" : "Live room ready"}</p>
          <h2 className="mt-1 line-clamp-2 text-2xl font-black leading-tight text-white">{product?.title || "Live shopping stage"}</h2>
          {product ? <p className="mt-1 text-sm font-black text-white/78">{formatPrice(product.price)}</p> : null}
        </div>
      </div>
      <div className="grid gap-3 p-2">
        {loading ? (
          <div className="h-16 rounded-2xl bg-white/10" />
        ) : (
          <p className="text-sm font-semibold leading-6 text-white/70">
            {isLive
              ? "Join the room for product demos, seller chat, and bargain requests."
              : "Browse the catalogue now and enter the room when the vendor starts selling live."}
          </p>
        )}
        <Link href={`/live/${stallId}`} className={buttonStyles(isLive ? "primary" : "secondary", "w-full justify-center px-5 py-3 text-sm")}>
          <Video className="mr-2 h-4 w-4" />
          {isLive ? "Watch Live" : "Open Room"}
        </Link>
      </div>
    </aside>
  );
}

function BoutiqueProductCard({
  product,
  vendorName,
  adding,
  onAdd
}: {
  product: Product;
  vendorName: string;
  adding: boolean;
  onAdd: () => void;
}) {
  const discount = discountPercent(product);
  const disabled = product.stock <= 0 || adding;

  return (
    <article id={`product-${product.id}`} className="premium-product-card app-hover-lift scroll-mt-28">
      <div className="relative aspect-[4/5] overflow-hidden bg-muted">
        <AppImage
          src={product.images[0] || "/products/product-placeholder.png"}
          alt={product.title}
          fallbackSrc="/products/product-placeholder.png"
          className="absolute inset-0 h-full w-full rounded-none object-cover transition duration-500 hover:scale-105"
        />
        <div className="absolute left-3 top-3 flex max-w-[calc(100%-1.5rem)] flex-wrap gap-2">
          {discount ? <span className="rounded-full bg-destructive px-3 py-1 text-[11px] font-black text-destructive-foreground">{discount}% off</span> : null}
          {product.offerCode ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-black/72 px-3 py-1 text-[11px] font-black text-white">
              <Tag className="h-3 w-3" />
              {product.offerCode}
            </span>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onAdd}
          disabled={disabled}
          className="absolute bottom-3 right-3 grid h-11 w-11 place-items-center rounded-full border border-white/28 bg-white text-[#17120C] shadow-[var(--shadow-card)] transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-55 dark:bg-[#11101A] dark:text-[#FFF8EA]"
          aria-label={`Add ${product.title} to cart`}
        >
          <ShoppingBag className="h-5 w-5" />
        </button>
      </div>
      <div className="grid gap-2 p-3 sm:p-4">
        <p className="line-clamp-1 text-[11px] font-black uppercase text-[var(--gold)]">{vendorName}</p>
        <h3 className="line-clamp-2 min-h-10 text-sm font-black leading-5 text-foreground sm:min-h-12 sm:text-base sm:leading-6">{product.title}</h3>
        <p className="line-clamp-2 min-h-9 text-xs font-semibold leading-5 text-muted-foreground sm:min-h-10 sm:text-sm">{product.description}</p>
        <div className="flex flex-wrap items-end gap-2">
          <p className="text-lg font-black text-foreground sm:text-2xl">{formatPrice(product.price)}</p>
          {discount ? <p className="pb-1 text-xs font-bold text-muted-foreground line-through">{formatPrice(product.compareAtPrice)}</p> : null}
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className={cn("inline-flex min-h-7 items-center rounded-full px-3 text-[11px] font-black", product.stock <= 0 ? "bg-destructive/10 text-destructive" : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-200")}>
            <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
            {productStockLabel(product)}
          </span>
          <button
            type="button"
            onClick={onAdd}
            disabled={disabled}
            className="rounded-full bg-primary px-3 py-1.5 text-[11px] font-black text-primary-foreground transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-55"
          >
            {adding ? "Adding" : "Add"}
          </button>
        </div>
      </div>
    </article>
  );
}

function LoadingGrid({ className }: { className?: string }) {
  return (
    <div className={cn("grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4", className)}>
      {Array.from({ length: 8 }).map((_, index) => (
        <div key={index} className="app-skeleton h-72 rounded-[var(--radius-card)] border border-[color:var(--border)] sm:h-96" />
      ))}
    </div>
  );
}

function StoreError({ message, className }: { message: string; className?: string }) {
  return (
    <div className={cn("rounded-[var(--radius-card)] border border-destructive/25 bg-destructive/10 p-6 text-sm font-semibold text-destructive", className)}>
      {message}
    </div>
  );
}

function StoreEmptyState({
  title = "No products listed yet",
  description = "This vendor store will show active products once the vendor adds them from their dashboard.",
  className
}: {
  title?: string;
  description?: string;
  className?: string;
}) {
  return (
    <div className={cn("rounded-[var(--radius-card)] border border-dashed border-[color:var(--border)] bg-[var(--surface)] p-8 text-center", className)}>
      <Store className="mx-auto h-10 w-10 text-[var(--gold)]" />
      <h3 className="mt-4 text-2xl font-black text-foreground">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">{description}</p>
    </div>
  );
}
