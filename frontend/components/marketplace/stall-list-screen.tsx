"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Filter, RefreshCw, Search, ShoppingBag, Star, Store } from "lucide-react";
import { AppImage } from "@/components/ui/app-image";
import { buttonStyles } from "@/components/ui/button";
import { getPublicStalls } from "@/lib/api";
import { Stall } from "@/lib/types";
import { cn } from "@/lib/utils";

const statusFilters = ["all", "live", "break", "offline", "busy"];
const fallbackCategories = ["Saree", "Kurti", "Puja Items", "White Metal", "Food Products", "Home Decor", "Cosmetics"];

function statusLabel(stall: Stall) {
  const status = stall.liveStatus || stall.status || "offline";
  if (status === "break") return "On Break";
  if (status === "live") return "Live Now";
  if (status === "busy") return "Busy";
  return "Offline";
}

function statusClass(stall: Stall) {
  const status = stall.liveStatus || stall.status || "offline";
  if (status === "live") return "bg-emerald-100 text-emerald-700 border-emerald-200";
  if (status === "break" || status === "busy") return "bg-amber-100 text-amber-800 border-amber-200";
  return "bg-slate-100 text-slate-600 border-slate-200";
}

function StallCard({ stall }: { stall: Stall }) {
  const banner = stall.bannerImage || stall.featuredImage || stall.image || "/stalls/stall-placeholder.png";
  const vendorName = stall.vendorName || stall.assignedVendorName || stall.name || "Vendor Stall";

  return (
    <article className="overflow-hidden rounded-[24px] border border-[#E7D8BD] bg-white shadow-[0_18px_48px_rgba(28,37,65,0.08)]">
      <div className="relative h-44 bg-[#F6F0E5]">
        <AppImage src={banner} alt={`${vendorName} stall banner`} fallbackSrc="/stalls/stall-placeholder.png" className="h-full w-full rounded-none object-cover" />
        <span className={cn("absolute left-4 top-4 rounded-full border px-3 py-1 text-xs font-black", statusClass(stall))}>
          {statusLabel(stall)}
        </span>
        {stall.isFeatured ? (
          <span className="absolute right-4 top-4 rounded-full bg-[#E2211C] px-3 py-1 text-xs font-black text-white">Featured</span>
        ) : null}
      </div>
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-xl font-black tracking-[-0.03em] text-[#111827]">{vendorName}</h2>
            <p className="mt-1 text-sm font-semibold text-[#6B7280]">{stall.category || "General"}</p>
          </div>
          <div className="flex shrink-0 items-center gap-1 rounded-full bg-[#FFF7DE] px-2.5 py-1 text-xs font-bold text-[#9A6A00]">
            <Star className="h-3.5 w-3.5 fill-current" />
            4.8
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold text-[#5B6475]">
          <span className="rounded-full bg-[#F3F6FA] px-3 py-1">{stall.productCount ?? 0} products</span>
          <span className="rounded-full bg-[#F3F6FA] px-3 py-1">{stall.stallType || "standard"} stall</span>
          {stall.paymentStatus === "paid" ? <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">Rent paid</span> : null}
        </div>
        {stall.liveStatus === "break" ? (
          <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
            {stall.breakMessage || "Vendor is currently on break. You can still browse products."}
          </p>
        ) : null}
        <div className="mt-5 grid grid-cols-2 gap-3">
          <Link href={`/stalls/${stall.id}/store`} className={buttonStyles("primary", "min-h-11 justify-center px-4 py-2")}>
            Enter Stall
          </Link>
          <Link href={`/live/${stall.id}`} className={buttonStyles("secondary", "min-h-11 justify-center px-4 py-2")}>
            Quick View
          </Link>
        </div>
      </div>
    </article>
  );
}

export function StallListScreen() {
  const [stalls, setStalls] = useState<Stall[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const categories = useMemo(() => {
    const fromData = stalls.map((stall) => stall.category).filter(Boolean);
    return ["all", ...Array.from(new Set([...fallbackCategories, ...fromData]))];
  }, [stalls]);

  const loadStalls = async () => {
    setIsLoading(true);
    try {
      const response = await getPublicStalls({ search, category, status, featured: featuredOnly });
      setStalls(response);
      setError("");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not load live stalls.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const initialSearch = params.get("search");
    const initialCategory = params.get("category");
    if (initialSearch) setSearch(initialSearch);
    if (initialCategory) setCategory(initialCategory);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadStalls(), 250);
    return () => window.clearTimeout(timer);
  }, [search, category, status, featuredOnly]);

  return (
    <main className="min-h-screen bg-[#F8FAFC] text-[#111827]">
      <section className="border-b border-[#E7D8BD] bg-white">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-[#C49119]">Live marketplace</p>
              <h1 className="mt-3 text-4xl font-black tracking-[-0.05em] sm:text-5xl">Explore Live Exhibition Stalls</h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-[#5B6475]">
                Browse vendors directly, compare products, ask best price, and checkout through Ankita Designs.
              </p>
            </div>
            <Link href="/register?role=vendor" className={buttonStyles("secondary", "min-h-12 justify-center px-5 py-3")}>
              <Store className="mr-2 h-4 w-4" />
              Become Vendor
            </Link>
          </div>

          <div className="mt-8 grid gap-3 lg:grid-cols-[1fr_auto_auto]">
            <label className="relative block">
              <span className="sr-only">Search stalls</span>
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#C49119]" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search vendor, category, products"
                className="h-12 w-full rounded-2xl border border-[#E7D8BD] bg-[#FFFDF8] px-11 py-3 text-sm font-semibold outline-none focus:border-[#C49119]"
              />
            </label>
            <button
              type="button"
              onClick={() => setFeaturedOnly((value) => !value)}
              className={cn(
                "inline-flex min-h-12 items-center justify-center rounded-2xl border px-4 text-sm font-black",
                featuredOnly ? "border-[#C49119] bg-[#FFF7DE] text-[#8A5A24]" : "border-[#E7D8BD] bg-white text-[#5B6475]"
              )}
            >
              <Filter className="mr-2 h-4 w-4" />
              Offers / Featured
            </button>
            <button type="button" onClick={() => void loadStalls()} className={buttonStyles("secondary", "min-h-12 justify-center px-4 py-3")}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </button>
          </div>

          <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
            {categories.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setCategory(item)}
                className={cn(
                  "min-h-10 shrink-0 rounded-full border px-4 text-sm font-bold capitalize",
                  category === item ? "border-[#C49119] bg-[#FFF7DE] text-[#8A5A24]" : "border-[#E7D8BD] bg-white text-[#5B6475]"
                )}
              >
                {item}
              </button>
            ))}
          </div>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {statusFilters.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setStatus(item)}
                className={cn(
                  "min-h-10 shrink-0 rounded-full border px-4 text-sm font-bold capitalize",
                  status === item ? "border-[#172554] bg-[#172554] text-white" : "border-[#D8DEE9] bg-white text-[#5B6475]"
                )}
              >
                {item === "all" ? "All Status" : item}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700">{error}</div>
        ) : isLoading ? (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-96 animate-pulse rounded-[24px] bg-white" />
            ))}
          </div>
        ) : stalls.length ? (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {stalls.map((stall) => <StallCard key={stall.id} stall={stall} />)}
          </div>
        ) : (
          <div className="rounded-[28px] border border-dashed border-[#D8C097] bg-white p-10 text-center">
            <ShoppingBag className="mx-auto h-10 w-10 text-[#C49119]" />
            <h2 className="mt-4 text-2xl font-black tracking-[-0.03em]">No stalls found</h2>
            <p className="mt-2 text-sm text-[#5B6475]">Try another category or check back when vendors go live.</p>
          </div>
        )}
      </section>
    </main>
  );
}
