"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  Flame,
  Gem,
  Gift,
  Home as HomeIcon,
  PackageOpen,
  Search,
  ShieldCheck,
  Shirt,
  ShoppingBag,
  Sparkles,
  Store,
  UserRound,
  Utensils,
  Wand2
} from "lucide-react";
import { CartDrawer } from "@/components/cart/cart-drawer";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { AppImage } from "@/components/ui/app-image";
import { ExhibitionLiveCountdown, LiveElapsedCounter } from "@/components/marketplace/live-timers";
import { HomepageAdvertisementCarousel } from "@/components/marketplace/homepage-advertisement-carousel";
import { getExhibitions, getProducts, getPublicStalls } from "@/lib/api";
import { useExpoStore } from "@/lib/cart-store";
import { Exhibition, Product, Stall } from "@/lib/types";
import { cn, formatPrice } from "@/lib/utils";

const navItems = [
  "All",
  "Live Exhibitions",
  "Today Live",
  "Saree",
  "Kurti",
  "Jewellery",
  "White Metal",
  "Pooja Material",
  "Home Decor",
  "Food Products",
  "Cosmetics",
  "Offers",
  "New Arrivals"
];

const categoryTiles = [
  { name: "Saree", icon: Shirt, href: "/exhibitions?category=Saree" },
  { name: "Kurti", icon: Sparkles, href: "/exhibitions?category=Kurti" },
  { name: "Jewellery", icon: Gem, href: "/exhibitions?category=Jewellery" },
  { name: "White Metal", icon: Gift, href: "/exhibitions?category=White%20Metal" },
  { name: "Pooja Material", icon: Flame, href: "/exhibitions?category=Pooja%20Material" },
  { name: "Home Decor", icon: HomeIcon, href: "/exhibitions?category=Home%20Decor" },
  { name: "Food Products", icon: Utensils, href: "/exhibitions?category=Food%20Products" },
  { name: "Cosmetics", icon: Wand2, href: "/exhibitions?category=Cosmetics" }
];

function exhibitionStatusLabel(status: Exhibition["status"]) {
  if (status === "live") return "Live";
  if (status === "scheduled") return "Upcoming";
  if (status === "paused") return "Paused";
  if (status === "ended") return "Ended";
  return "Exhibition";
}

function exhibitionStatusClass(status: Exhibition["status"]) {
  if (status === "live") return "border-emerald-200 bg-emerald-100 text-emerald-800 dark:border-emerald-400/30 dark:bg-emerald-500/15 dark:text-emerald-200";
  if (status === "scheduled") return "border-amber-200 bg-amber-100 text-amber-900 dark:border-amber-400/30 dark:bg-amber-500/15 dark:text-amber-100";
  return "border-slate-200 bg-slate-100 text-slate-700 dark:border-white/10 dark:bg-white/10 dark:text-slate-200";
}

function stallStatus(stall: Stall) {
  const status = stall.liveStatus || stall.status || "offline";
  if (status === "live") return "Live";
  if (status === "break") return "Break";
  if (status === "busy") return "Busy";
  return "Offline";
}

function stallStatusClass(stall: Stall) {
  const status = stall.liveStatus || stall.status || "offline";
  if (status === "live") return "border-emerald-200 bg-emerald-100 text-emerald-800 dark:border-emerald-400/30 dark:bg-emerald-500/15 dark:text-emerald-200";
  if (status === "break" || status === "busy") return "border-amber-200 bg-amber-100 text-amber-900 dark:border-amber-400/30 dark:bg-amber-500/15 dark:text-amber-100";
  return "border-slate-200 bg-slate-100 text-slate-700 dark:border-white/10 dark:bg-white/10 dark:text-slate-200";
}

function formatExhibitionTime(exhibition: Exhibition) {
  const start = exhibition.startDate ? new Date(exhibition.startDate) : null;
  if (!start || Number.isNaN(start.valueOf())) return "Schedule soon";
  return start.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}

function MarketplaceHeader({ search, setSearch, openCart }: { search: string; setSearch: (value: string) => void; openCart: () => void }) {
  const submitSearch = () => {
    const query = search.trim();
    window.location.href = query ? `/exhibitions?search=${encodeURIComponent(query)}` : "/exhibitions";
  };

  return (
    <header className="sticky top-0 z-40 border-b border-[#E8DCC7] bg-[#FFFDF8]/96 text-[#101827] shadow-sm backdrop-blur dark:border-white/10 dark:bg-[#090D16]/96 dark:text-[#FFF8EA]">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-3 py-3 sm:px-5 lg:px-8">
        <Link href="/" className="flex shrink-0 items-center gap-2" aria-label="Ankita Designs home">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#172554] text-sm font-black text-[#FACC15] dark:bg-[#FACC15] dark:text-[#111827]">AD</span>
          <span className="hidden leading-tight sm:block">
            <span className="block text-sm font-black">Ankita Designs</span>
            <span className="block text-[11px] font-bold text-[#7C5E22] dark:text-[#F5D878]">Live Exhibition</span>
          </span>
        </Link>

        <label className="relative min-w-0 flex-1">
          <span className="sr-only">Search exhibitions, stalls, vendors, products</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#B58118] dark:text-[#F5D878]" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") submitSearch();
            }}
            className="h-11 w-full rounded-xl border border-[#D9C39D] bg-white px-10 text-sm font-semibold text-[#101827] outline-none transition placeholder:text-[#806F5D] focus:border-[#B58118] focus:ring-2 focus:ring-[#FACC15]/30 dark:border-white/12 dark:bg-[#121826] dark:text-[#FFF8EA] dark:placeholder:text-[#B8AA97] dark:focus:border-[#F5D878]"
            placeholder="Search exhibitions, stalls, vendors, products"
          />
          <button type="button" onClick={submitSearch} className="absolute right-1.5 top-1/2 hidden h-8 -translate-y-1/2 rounded-lg bg-[#F97316] px-4 text-xs font-black text-white transition hover:bg-[#EA580C] focus:outline-none focus:ring-2 focus:ring-[#F97316]/40 sm:block">
            Search
          </button>
        </label>

        <Link href="/login" className="hidden min-h-10 items-center rounded-xl border border-[#D9C39D] bg-white px-4 text-sm font-black text-[#172554] transition hover:bg-[#FFF7DE] dark:border-white/12 dark:bg-[#121826] dark:text-[#FFF8EA] dark:hover:bg-white/10 md:inline-flex">
          Login
        </Link>
        <Link href="/register?role=vendor" className="hidden min-h-10 items-center rounded-xl bg-[#172554] px-4 text-sm font-black text-white transition hover:bg-[#0F1E46] dark:bg-[#FACC15] dark:text-[#111827] dark:hover:bg-[#F5D878] lg:inline-flex">
          Vendor
        </Link>
        <button type="button" onClick={openCart} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[#D9C39D] bg-white text-[#172554] transition hover:bg-[#FFF7DE] dark:border-white/12 dark:bg-[#121826] dark:text-[#FFF8EA] dark:hover:bg-white/10" aria-label="Open cart">
          <ShoppingBag className="h-5 w-5" />
        </button>
        <ThemeToggle />
        <button type="button" className="hidden h-10 w-10 shrink-0 place-items-center rounded-xl border border-[#D9C39D] bg-white text-[#172554] transition hover:bg-[#FFF7DE] dark:border-white/12 dark:bg-[#121826] dark:text-[#FFF8EA] dark:hover:bg-white/10 sm:grid" aria-label="Notifications">
          <Bell className="h-5 w-5" />
        </button>
      </div>
      <div className="mx-auto grid max-w-7xl grid-cols-4 gap-2 px-3 pb-3 sm:hidden">
        <Link href="/login" className="inline-flex min-h-11 flex-col items-center justify-center gap-1 rounded-xl border border-[#D9C39D] bg-white px-2 text-[11px] font-black text-[#172554] transition hover:bg-[#FFF7DE] dark:border-white/12 dark:bg-[#121826] dark:text-[#FFF8EA] dark:hover:bg-white/10">
          <UserRound className="h-4 w-4" />
          Login
        </Link>
        <Link href="/register?role=vendor" className="inline-flex min-h-11 flex-col items-center justify-center gap-1 rounded-xl bg-[#172554] px-2 text-[11px] font-black text-white transition hover:bg-[#0F1E46] dark:bg-[#FACC15] dark:text-[#111827] dark:hover:bg-[#F5D878]">
          <Store className="h-4 w-4" />
          Vendor
        </Link>
        <button type="button" onClick={openCart} className="inline-flex min-h-11 flex-col items-center justify-center gap-1 rounded-xl border border-[#D9C39D] bg-white px-2 text-[11px] font-black text-[#172554] transition hover:bg-[#FFF7DE] dark:border-white/12 dark:bg-[#121826] dark:text-[#FFF8EA] dark:hover:bg-white/10">
          <ShoppingBag className="h-4 w-4" />
          Cart
        </button>
        <button type="button" className="inline-flex min-h-11 flex-col items-center justify-center gap-1 rounded-xl border border-[#D9C39D] bg-white px-2 text-[11px] font-black text-[#172554] transition hover:bg-[#FFF7DE] dark:border-white/12 dark:bg-[#121826] dark:text-[#FFF8EA] dark:hover:bg-white/10" aria-label="Notifications">
          <Bell className="h-4 w-4" />
          Alerts
        </button>
      </div>
      <nav className="border-t border-[#EFE2CB] bg-[#FFF8EA] dark:border-white/10 dark:bg-[#101521]" aria-label="Marketplace navigation">
        <div className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-3 py-2 sm:px-5 lg:px-8">
          {navItems.map((item) => {
            const href =
              item === "All"
                ? "/exhibitions"
                : item === "Live Exhibitions" || item === "Today Live"
                  ? "/exhibitions?status=live"
                  : item === "Offers"
                    ? "/exhibitions?category=Offers"
                    : `/exhibitions?category=${encodeURIComponent(item)}`;
            return (
              <Link key={item} href={href} className="shrink-0 rounded-full border border-transparent px-3 py-2 text-xs font-black text-[#4B5563] transition hover:border-[#D9C39D] hover:bg-white hover:text-[#172554] dark:text-[#D7CBB9] dark:hover:border-white/12 dark:hover:bg-white/10 dark:hover:text-white sm:text-sm">
                {item}
              </Link>
            );
          })}
        </div>
      </nav>
    </header>
  );
}

function CategoryTile({ item }: { item: (typeof categoryTiles)[number] }) {
  const Icon = item.icon;
  return (
    <Link href={item.href} className="group rounded-2xl border border-[#E8DCC7] bg-white p-3 text-center shadow-[0_10px_28px_rgba(28,37,65,0.05)] transition hover:-translate-y-0.5 hover:border-[#D1A340] hover:shadow-[0_18px_42px_rgba(28,37,65,0.10)] dark:border-white/10 dark:bg-[#121826] dark:shadow-none dark:hover:border-[#F5D878]/60 dark:hover:bg-[#172033]">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#FFF2CC] text-[#A16207] dark:bg-[#FACC15]/15 dark:text-[#F5D878]">
        <Icon className="h-5 w-5" />
      </div>
      <p className="mt-3 text-sm font-black text-[#111827] dark:text-[#FFF8EA]">{item.name}</p>
      <p className="mt-1 text-xs font-bold text-[#6B5D4A] dark:text-[#D7CBB9]">Explore stalls</p>
    </Link>
  );
}

function ExhibitionCard({ exhibition }: { exhibition: Exhibition }) {
  const stallCount = exhibition.stallCount ?? exhibition.stall_count ?? 0;
  const isEnded = exhibition.status === "ended";

  return (
    <article className="overflow-hidden rounded-2xl border border-[#E8DCC7] bg-white shadow-[0_14px_34px_rgba(28,37,65,0.07)] dark:border-white/10 dark:bg-[#121826] dark:shadow-none">
      <div className="relative h-40 bg-[#F6EDDD] dark:bg-[#172033]">
        <AppImage src={exhibition.bannerImage || "/stalls/stall-placeholder.png"} alt={`${exhibition.title} banner`} fallbackSrc="/stalls/stall-placeholder.png" className="h-full w-full rounded-none object-cover" />
        <span className={cn("absolute left-3 top-3 rounded-full border px-3 py-1 text-xs font-black", exhibitionStatusClass(exhibition.status))}>
          {exhibitionStatusLabel(exhibition.status)}
        </span>
        <ExhibitionLiveCountdown exhibition={exhibition} className="absolute bottom-3 left-3 right-3 justify-center" />
      </div>
      <div className="p-4">
        <h3 className="line-clamp-2 text-lg font-black tracking-[-0.03em] text-[#111827] dark:text-[#FFF8EA]">{exhibition.title}</h3>
        <p className="mt-2 line-clamp-2 text-sm font-semibold leading-6 text-[#6B5D4A] dark:text-[#D7CBB9]">
          {isEnded ? "Exhibition has ended. Live shopping and stall entry are closed." : exhibition.description || "Explore vendor stalls inside this live exhibition."}
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
          <span className="rounded-full bg-[#F5F0E8] px-3 py-1 text-[#5B4631] dark:bg-white/10 dark:text-[#D7CBB9]">{formatExhibitionTime(exhibition)}</span>
          <span className="rounded-full bg-[#FFF2CC] px-3 py-1 text-[#7C4A03] dark:bg-[#FACC15]/15 dark:text-[#F5D878]">{stallCount} stalls</span>
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200">Verified vendors</span>
        </div>
        <Link href={`/exhibition/${exhibition.id}`} className="mt-4 inline-flex min-h-10 w-full items-center justify-center rounded-xl bg-[#F97316] px-4 text-sm font-black text-white transition hover:bg-[#EA580C] focus:outline-none focus:ring-2 focus:ring-[#F97316]/40">
          {isEnded ? "View Ended Exhibition" : "Enter Exhibition"}
        </Link>
      </div>
    </article>
  );
}

function StallCard({ stall }: { stall: Stall }) {
  const banner = stall.bannerImage || stall.featuredImage || stall.image || "/stalls/stall-placeholder.png";
  const vendorName = stall.vendorName || stall.assignedVendorName || stall.name || "Vendor Stall";
  return (
    <article className="overflow-hidden rounded-2xl border border-[#E8DCC7] bg-white shadow-[0_14px_34px_rgba(28,37,65,0.07)] dark:border-white/10 dark:bg-[#121826] dark:shadow-none">
      <div className="relative h-36 bg-[#F6EDDD] dark:bg-[#172033]">
        <AppImage src={banner} alt={`${vendorName} stall banner`} fallbackSrc="/stalls/stall-placeholder.png" className="h-full w-full rounded-none object-cover" />
        <span className={cn("absolute left-3 top-3 rounded-full border px-3 py-1 text-xs font-black", stallStatusClass(stall))}>
          {stallStatus(stall)}
        </span>
        {stall.isFeatured ? <span className="absolute right-3 top-3 rounded-full bg-[#DC2626] px-3 py-1 text-xs font-black text-white">Offer</span> : null}
        {stall.liveStatus === "live" ? <LiveElapsedCounter startedAt={stall.liveStartedAt} className="absolute bottom-3 left-3 right-3 justify-center" /> : null}
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-base font-black text-[#111827] dark:text-[#FFF8EA]">{vendorName}</h3>
            <p className="mt-1 text-sm font-semibold text-[#6B5D4A] dark:text-[#D7CBB9]">{stall.category || "General"}</p>
          </div>
          <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-300" aria-label="Verified vendor" />
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
          <span className="rounded-full bg-[#F5F0E8] px-3 py-1 text-[#5B4631] dark:bg-white/10 dark:text-[#D7CBB9]">{stall.productCount ?? 0} products</span>
          <span className="rounded-full bg-[#FFF2CC] px-3 py-1 text-[#7C4A03] dark:bg-[#FACC15]/15 dark:text-[#F5D878]">{stall.exhibitionTitle || "Exhibition stall"}</span>
        </div>
        <Link href={`/stalls/${stall.id}/store`} className="mt-4 inline-flex min-h-10 w-full items-center justify-center rounded-xl bg-[#F97316] px-4 text-sm font-black text-white transition hover:bg-[#EA580C] focus:outline-none focus:ring-2 focus:ring-[#F97316]/40">
          Enter Stall
        </Link>
      </div>
    </article>
  );
}

function ProductCard({ product }: { product: Product }) {
  const discount = product.compareAtPrice > product.price ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100) : 0;
  return (
    <article className="overflow-hidden rounded-2xl border border-[#E8DCC7] bg-white shadow-[0_12px_30px_rgba(28,37,65,0.06)] dark:border-white/10 dark:bg-[#121826] dark:shadow-none">
      <div className="relative h-40 bg-[#F6EDDD] dark:bg-[#172033]">
        <AppImage src={product.images[0] || "/products/product-placeholder.png"} alt={product.title} fallbackSrc="/products/product-placeholder.png" className="h-full w-full rounded-none object-cover" />
        {discount ? <span className="absolute left-3 top-3 rounded-full bg-[#DC2626] px-2.5 py-1 text-xs font-black text-white">{discount}% off</span> : null}
      </div>
      <div className="p-4">
        <h3 className="line-clamp-2 min-h-10 text-sm font-black leading-5 text-[#111827] dark:text-[#FFF8EA]">{product.title}</h3>
        <p className="mt-2 line-clamp-2 min-h-9 text-xs leading-5 text-[#6B5D4A] dark:text-[#D7CBB9]">{product.description || "Product details available in the vendor stall."}</p>
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <p className="text-lg font-black text-[#111827] dark:text-[#FFF8EA]">{formatPrice(product.price)}</p>
          {discount ? <p className="pb-0.5 text-xs font-bold text-[#806F5D] line-through dark:text-[#B8AA97]">{formatPrice(product.compareAtPrice)}</p> : null}
        </div>
        <Link href={`/stalls/${product.stallId}/store`} className="mt-4 inline-flex min-h-10 w-full items-center justify-center rounded-xl border border-[#D9C39D] bg-[#FFF8EA] px-4 text-sm font-black text-[#172554] transition hover:bg-[#FFF2CC] dark:border-white/12 dark:bg-white/10 dark:text-[#FFF8EA] dark:hover:bg-white/15">
          View in Stall
        </Link>
      </div>
    </article>
  );
}

function EmptyPanel({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-[#D9C39D] bg-white p-6 text-center dark:border-white/15 dark:bg-[#121826]">
      <PackageOpen className="mx-auto h-9 w-9 text-[#B58118] dark:text-[#F5D878]" />
      <h3 className="mt-3 text-lg font-black text-[#111827] dark:text-[#FFF8EA]">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#6B5D4A] dark:text-[#D7CBB9]">{description}</p>
    </div>
  );
}

function SectionHeading({ eyebrow, title, href }: { eyebrow?: string; title: string; href?: string }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3">
      <div>
        {eyebrow ? <p className="text-xs font-black uppercase tracking-[0.18em] text-[#A16207] dark:text-[#F5D878]">{eyebrow}</p> : null}
        <h2 className="mt-1 text-xl font-black tracking-[-0.03em] text-[#111827] dark:text-[#FFF8EA] sm:text-2xl">{title}</h2>
      </div>
      {href ? <Link href={href} className="shrink-0 text-sm font-black text-[#F97316] hover:text-[#EA580C] dark:text-[#FDBA74]">View all</Link> : null}
    </div>
  );
}

export default function Home() {
  const [exhibitions, setExhibitions] = useState<Exhibition[]>([]);
  const [stalls, setStalls] = useState<Stall[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const openCart = useExpoStore((state) => state.openCart);

  useEffect(() => {
    let active = true;
    Promise.allSettled([getExhibitions(), getPublicStalls(), getProducts()])
      .then(([exhibitionResult, stallResult, productResult]) => {
        if (!active) return;
        if (exhibitionResult.status === "fulfilled") {
          setExhibitions(exhibitionResult.value.filter((item) => item.status !== "draft" && item.status !== "cancelled").slice(0, 8));
        }
        if (stallResult.status === "fulfilled") {
          setStalls(stallResult.value.slice(0, 8));
        }
        if (productResult.status === "fulfilled") {
          setProducts(productResult.value.filter((product) => product.status === "active").slice(0, 18));
        }
        if (exhibitionResult.status === "rejected" && stallResult.status === "rejected" && productResult.status === "rejected") {
          setLoadError("Marketplace data is unavailable. Start the backend to load exhibitions, stalls, and products.");
        } else {
          setLoadError("");
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const liveOrUpcomingExhibitions = useMemo(() => {
    const priority = { live: 0, scheduled: 1, paused: 2, ended: 3, draft: 4, cancelled: 5 } as Record<Exhibition["status"], number>;
    return [...exhibitions].sort((a, b) => priority[a.status] - priority[b.status]);
  }, [exhibitions]);
  const featuredStalls = useMemo(() => stalls.filter((stall) => stall.liveStatus === "live" || stall.status === "live" || stall.isFeatured).slice(0, 4), [stalls]);
  const dealProducts = useMemo(() => products.filter((product) => product.compareAtPrice > product.price || product.offerCode).slice(0, 6), [products]);
  const trendingProducts = products.slice(0, 6);
  const festivalProducts = products.slice(6, 12);
  const recentlyAdded = products.slice(12, 18);

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#F8F1E7] pb-28 text-[#111827] dark:bg-[#070B12] dark:text-[#FFF8EA] md:pb-0">
      <MarketplaceHeader search={search} setSearch={setSearch} openCart={openCart} />

      <section className="mx-auto max-w-7xl px-3 py-4 sm:px-5 lg:px-8">
        {loadError ? (
          <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900 dark:border-amber-400/30 dark:bg-amber-500/15 dark:text-amber-100">
            {loadError}
          </div>
        ) : null}

        <HomepageAdvertisementCarousel />
      </section>

      <section className="mx-auto max-w-7xl px-3 py-5 sm:px-5 lg:px-8">
        <SectionHeading eyebrow="Main event" title="Live / Upcoming Exhibitions" href="/exhibitions" />
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-80 animate-pulse rounded-2xl bg-white dark:bg-[#121826]" />)}</div>
        ) : liveOrUpcomingExhibitions.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {liveOrUpcomingExhibitions.slice(0, 4).map((exhibition) => <ExhibitionCard key={exhibition.id} exhibition={exhibition} />)}
          </div>
        ) : (
          <EmptyPanel title="No exhibitions published yet" description="Admin-created live or upcoming exhibitions will appear here when the backend has data." />
        )}
      </section>

      <section className="mx-auto max-w-7xl px-3 py-5 sm:px-5 lg:px-8">
        <SectionHeading eyebrow="Inside exhibitions" title="Featured Live Stalls" href="/exhibitions?status=live" />
        {featuredStalls.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {featuredStalls.map((stall) => <StallCard key={stall.id} stall={stall} />)}
          </div>
        ) : (
          <EmptyPanel title="No featured live stalls yet" description="Live and featured stalls from active exhibitions will appear here after vendors go live." />
        )}
      </section>

      <section className="mx-auto max-w-7xl px-3 py-3 sm:px-5 lg:px-8">
        <SectionHeading eyebrow="Browse faster" title="Shop By Category" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          {categoryTiles.map((item) => <CategoryTile key={item.name} item={item} />)}
        </div>
      </section>


      <section className="mx-auto max-w-7xl px-3 py-5 sm:px-5 lg:px-8">
        <SectionHeading eyebrow="Offers" title="Best Bargain Deals" href="/exhibitions" />
        {dealProducts.length ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-6">
            {dealProducts.map((product) => <ProductCard key={product.id} product={product} />)}
          </div>
        ) : (
          <EmptyPanel title="Deals will appear here" description="Products with offer codes or compare-at pricing will show in this section." />
        )}
      </section>

      <section className="mx-auto grid max-w-7xl gap-5 px-3 py-5 sm:px-5 lg:grid-cols-[1fr_1fr] lg:px-8">
        <div>
          <SectionHeading eyebrow="Product discovery" title="Trending Products" href="/exhibitions" />
          {trendingProducts.length ? (
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
              {trendingProducts.map((product) => <ProductCard key={product.id} product={product} />)}
            </div>
          ) : (
            <EmptyPanel title="No products listed yet" description="Vendor products will appear here after approved vendors add active catalogue items." />
          )}
        </div>
        <div>
          <SectionHeading eyebrow="Seasonal" title="Festival Specials" href="/exhibitions" />
          {festivalProducts.length ? (
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
              {festivalProducts.map((product) => <ProductCard key={product.id} product={product} />)}
            </div>
          ) : (
            <EmptyPanel title="Festival specials will appear here" description="Seasonal products from live exhibitions will show here when available." />
          )}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-3 py-5 sm:px-5 lg:px-8">
        <SectionHeading eyebrow="New" title="Recently Added" href="/exhibitions" />
        {recentlyAdded.length ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-6">
            {recentlyAdded.map((product) => <ProductCard key={product.id} product={product} />)}
          </div>
        ) : (
          <EmptyPanel title="Recently added products will appear here" description="This section stays empty until real active products are available from the API." />
        )}
      </section>

      <footer className="mt-6 border-t border-[#E8DCC7] bg-[#FFFDF8] px-4 py-7 text-[#4B5563] dark:border-white/10 dark:bg-[#090D16] dark:text-[#D7CBB9] sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 text-sm font-semibold sm:flex-row sm:items-center sm:justify-between">
          <p className="font-black text-[#172554] dark:text-[#FFF8EA]">Ankita Designs Online Live Exhibition</p>
          <div className="flex flex-wrap gap-4">
            <Link href="#" className="hover:text-[#F97316]">About Us</Link>
            <Link href="#" className="hover:text-[#F97316]">Privacy Policy</Link>
            <Link href="#" className="hover:text-[#F97316]">Return Policy</Link>
            <Link href="#" className="hover:text-[#F97316]">Vendor Policy</Link>
            <Link href="#" className="hover:text-[#F97316]">Contact</Link>
          </div>
        </div>
      </footer>
      <CartDrawer />
    </main>
  );
}

