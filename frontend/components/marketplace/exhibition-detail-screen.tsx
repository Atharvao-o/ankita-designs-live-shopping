"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ChevronDown, PackageOpen, Search, Store, Video } from "lucide-react";
import { AppImage } from "@/components/ui/app-image";
import { ExhibitionLiveCountdown, LiveElapsedCounter } from "@/components/marketplace/live-timers";
import { getExhibition, getStalls } from "@/lib/api";
import { Exhibition, Stall } from "@/lib/types";
import { cn } from "@/lib/utils";

const categoryFallbacks = ["Saree", "Kurti", "Jewellery", "White Metal", "Pooja Material", "Home Decor", "Food Products", "Cosmetics"];
const statusFilters = ["all", "live", "break", "offline", "busy"] as const;

type StatusFilter = (typeof statusFilters)[number];

function formatDateRange(exhibition: Exhibition) {
  const start = exhibition.startDate ? new Date(exhibition.startDate) : null;
  const end = exhibition.endDate ? new Date(exhibition.endDate) : null;
  const format: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" };

  if (start && end && !Number.isNaN(start.valueOf()) && !Number.isNaN(end.valueOf())) {
    return `${start.toLocaleString("en-IN", format)} - ${end.toLocaleString("en-IN", format)}`;
  }
  if (start && !Number.isNaN(start.valueOf())) return start.toLocaleString("en-IN", format);
  return "Schedule pending";
}

function exhibitionStatusLabel(status?: Exhibition["status"]) {
  if (status === "live") return "Live";
  if (status === "scheduled") return "Upcoming";
  if (status === "paused") return "Paused";
  if (status === "ended") return "Ended";
  return "Exhibition";
}

function exhibitionStatusClass(status?: Exhibition["status"]) {
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

function StallRow({
  expanded,
  onHover,
  onLeave,
  onToggle,
  stall
}: {
  expanded: boolean;
  onHover: () => void;
  onLeave: () => void;
  onToggle: () => void;
  stall: Stall;
}) {
  const banner = stall.bannerImage || stall.featuredImage || stall.image || "/stalls/stall-placeholder.png";
  const vendorName = stall.vendorName || stall.assignedVendorName || stall.name || "Vendor Stall";

  return (
    <article
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      className="overflow-hidden rounded-2xl border border-[#E8DCC7] bg-white shadow-[0_10px_24px_rgba(28,37,65,0.05)] transition hover:border-[#D1A340] dark:border-white/10 dark:bg-[#121826] dark:shadow-none dark:hover:border-[#F5D878]/60"
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="grid min-h-24 w-full gap-3 p-4 text-left transition hover:bg-[#FFF8EA] focus:outline-none focus:ring-2 focus:ring-[#FACC15]/40 dark:hover:bg-white/[0.04] sm:grid-cols-[1fr_auto] sm:items-center"
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn("rounded-full border px-3 py-1 text-xs font-black", stallStatusClass(stall))}>{stallStatus(stall)}</span>
            {stall.isFeatured ? <span className="rounded-full bg-[#DC2626] px-3 py-1 text-xs font-black text-white">Offer</span> : null}
            {stall.liveStatus === "live" ? <LiveElapsedCounter startedAt={stall.liveStartedAt} /> : null}
            <span className="hidden rounded-full bg-[#FFF2CC] px-3 py-1 text-xs font-black text-[#7C4A03] dark:bg-[#FACC15]/15 dark:text-[#F5D878] sm:inline-flex">
              {stall.category || "General"}
            </span>
          </div>
          <h2 className="mt-2 truncate text-lg font-black tracking-[-0.03em] text-[#111827] dark:text-[#FFF8EA] sm:text-xl">{vendorName}</h2>
          <p className="mt-1 line-clamp-1 text-sm font-semibold text-[#6B5D4A] dark:text-[#D7CBB9]">{stall.name || stall.category || "Vendor stall"}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-[#5B4631] dark:text-[#D7CBB9] sm:justify-end">
          <span className="inline-flex items-center gap-2 rounded-xl bg-[#F5F0E8] px-3 py-2 dark:bg-white/10">
            <Store className="h-4 w-4 text-[#A16207] dark:text-[#F5D878]" />
            {stall.productCount ?? 0} products
          </span>
          <span className="inline-flex items-center gap-2 rounded-xl bg-[#F5F0E8] px-3 py-2 dark:bg-white/10">
            <Video className="h-4 w-4 text-[#A16207] dark:text-[#F5D878]" />
            {stall.liveStatus === "live" ? "Live room" : "Room"}
          </span>
          <ChevronDown className={cn("h-5 w-5 text-[#A16207] transition dark:text-[#F5D878]", expanded && "rotate-180")} />
        </div>
      </button>

      <div className={cn("grid transition-[grid-template-rows] duration-200 ease-out", expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
        <div className="overflow-hidden">
          <div className="grid gap-4 border-t border-[#E8DCC7] bg-[#FFFDF8] p-4 dark:border-white/10 dark:bg-[#0B111D] md:grid-cols-[minmax(18rem,24rem)_1fr]">
            <AppImage src={banner} alt={`${vendorName} stall banner`} fallbackSrc="/stalls/stall-placeholder.png" className="h-40 w-full rounded-xl md:h-44" />
            <div className="flex min-w-0 flex-col">
              <h3 className="text-xl font-black tracking-[-0.03em] text-[#111827] dark:text-[#FFF8EA]">{vendorName}</h3>
              <p className="mt-2 line-clamp-3 text-sm font-semibold leading-6 text-[#6B5D4A] dark:text-[#D7CBB9]">
                {stall.description || stall.breakMessage || "Open this stall to view products, chat with the vendor, and join the live room."}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-full bg-[#FFF2CC] px-3 py-1 text-xs font-black text-[#7C4A03] dark:bg-[#FACC15]/15 dark:text-[#F5D878]">
                  {stall.category || "General"}
                </span>
                {stall.liveStatus === "live" ? <LiveElapsedCounter startedAt={stall.liveStartedAt} /> : null}
                <span className="rounded-full bg-[#F5F0E8] px-3 py-1 text-xs font-black text-[#5B4631] dark:bg-white/10 dark:text-[#D7CBB9]">
                  {stall.stallType || "standard"} stall
                </span>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200">
                  Verified
                </span>
              </div>
              {stall.liveStatus === "break" ? (
                <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800 dark:border-amber-400/30 dark:bg-amber-500/15 dark:text-amber-100">
                  {stall.breakMessage || "Vendor is currently on break. You can still browse products."}
                </p>
              ) : null}
              <div className="mt-4 grid gap-3 sm:flex">
                <Link href={`/stalls/${stall.id}/store`} className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#F97316] px-5 text-sm font-black text-white transition hover:bg-[#EA580C] focus:outline-none focus:ring-2 focus:ring-[#F97316]/40">
                  Enter Stall
                </Link>
                <Link href={`/live/${stall.id}`} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#D9C39D] bg-[#FFF8EA] px-5 text-sm font-black text-[#172554] transition hover:bg-[#FFF2CC] dark:border-white/12 dark:bg-white/10 dark:text-[#FFF8EA] dark:hover:bg-white/15">
                  Live Room
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

function EmptyPanel({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-[#D9C39D] bg-white p-8 text-center dark:border-white/15 dark:bg-[#121826]">
      <PackageOpen className="mx-auto h-10 w-10 text-[#B58118] dark:text-[#F5D878]" />
      <h2 className="mt-4 text-2xl font-black tracking-[-0.03em] text-[#111827] dark:text-[#FFF8EA]">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#6B5D4A] dark:text-[#D7CBB9]">{description}</p>
    </div>
  );
}

export function ExhibitionDetailScreen({ exhibitionId }: { exhibitionId: string }) {
  const [exhibition, setExhibition] = useState<Exhibition | null>(null);
  const [stalls, setStalls] = useState<Stall[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [expandedId, setExpandedId] = useState("");
  const [hoveredId, setHoveredId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const isEnded = exhibition?.status === "ended";

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    Promise.all([getExhibition(exhibitionId), getStalls(exhibitionId)])
      .then(([exhibitionResponse, stallResponse]) => {
        if (!active) return;
        setExhibition(exhibitionResponse);
        setStalls(stallResponse);
        setError("");
      })
      .catch((requestError) => {
        if (active) setError(requestError instanceof Error ? requestError.message : "Could not load exhibition.");
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [exhibitionId]);

  const categories = useMemo(() => {
    const fromData = stalls.map((stall) => stall.category).filter(Boolean);
    return ["all", ...Array.from(new Set([...categoryFallbacks, ...fromData]))];
  }, [stalls]);

  const filteredStalls = useMemo(() => {
    const search = query.trim().toLowerCase();
    return stalls.filter((stall) => {
      const liveStatus = stall.liveStatus || stall.status || "offline";
      const vendorName = stall.vendorName || stall.assignedVendorName || stall.name;
      const matchesSearch = !search || [vendorName, stall.name, stall.category, stall.description].filter(Boolean).some((value) => String(value).toLowerCase().includes(search));
      const matchesCategory = category === "all" || String(stall.category || "").toLowerCase() === category.toLowerCase();
      const matchesStatus = status === "all" || liveStatus === status;
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [category, query, stalls, status]);

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#F8F1E7] pb-28 text-[#111827] dark:bg-[#070B12] dark:text-[#FFF8EA] md:pb-0">
      <section className="border-b border-[#E8DCC7] bg-[#FFFDF8] dark:border-white/10 dark:bg-[#090D16]">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/exhibitions" className="inline-flex items-center gap-2 rounded-full border border-[#D9C39D] bg-white px-4 py-2 text-sm font-black text-[#172554] transition hover:bg-[#FFF7DE] dark:border-white/12 dark:bg-[#121826] dark:text-[#FFF8EA] dark:hover:bg-white/10">
            <ArrowLeft className="h-4 w-4" />
            Back to exhibitions
          </Link>

          <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap gap-2">
                <span className={cn("rounded-full border px-3 py-1 text-xs font-black", exhibitionStatusClass(exhibition?.status))}>
                  {exhibitionStatusLabel(exhibition?.status)}
                </span>
                {exhibition ? <ExhibitionLiveCountdown exhibition={exhibition} /> : null}
                <span className="rounded-full bg-[#FFF2CC] px-3 py-1 text-xs font-black text-[#7C4A03] dark:bg-[#FACC15]/15 dark:text-[#F5D878]">
                  {filteredStalls.length} vendors
                </span>
              </div>
              <h1 className="mt-3 truncate text-2xl font-black tracking-[-0.04em] text-[#111827] dark:text-[#FFF8EA] sm:text-3xl">
                {isLoading ? "Loading exhibition..." : exhibition?.title || "Exhibition unavailable"}
              </h1>
              <p className="mt-1 text-sm font-semibold text-[#6B5D4A] dark:text-[#D7CBB9]">
                {exhibition ? formatDateRange(exhibition) : "Schedule loading"}
              </p>
            </div>

            {!isEnded ? (
            <div className="grid gap-2 md:min-w-[34rem] md:grid-cols-[1fr_auto_auto]">
              <label className="relative block">
                <span className="sr-only">Search vendors</span>
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#B58118] dark:text-[#F5D878]" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search vendors"
                  className="h-11 w-full rounded-xl border border-[#D9C39D] bg-white px-11 text-sm font-semibold text-[#101827] outline-none placeholder:text-[#806F5D] focus:border-[#B58118] focus:ring-2 focus:ring-[#FACC15]/30 dark:border-white/12 dark:bg-[#121826] dark:text-[#FFF8EA] dark:placeholder:text-[#B8AA97]"
                />
              </label>
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="h-11 rounded-xl border border-[#D9C39D] bg-white px-4 text-sm font-black text-[#172554] outline-none focus:border-[#B58118] focus:ring-2 focus:ring-[#FACC15]/30 dark:border-white/12 dark:bg-[#121826] dark:text-[#FFF8EA]"
                aria-label="Filter vendors by category"
              >
                {categories.map((item) => (
                  <option key={item} value={item}>{item === "all" ? "All category" : item}</option>
                ))}
              </select>
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value as StatusFilter)}
                className="h-11 rounded-xl border border-[#D9C39D] bg-white px-4 text-sm font-black text-[#172554] outline-none focus:border-[#B58118] focus:ring-2 focus:ring-[#FACC15]/30 dark:border-white/12 dark:bg-[#121826] dark:text-[#FFF8EA]"
                aria-label="Filter vendors by live status"
              >
                <option value="all">All status</option>
                <option value="live">Live</option>
                <option value="break">Break</option>
                <option value="offline">Offline</option>
                <option value="busy">Busy</option>
              </select>
            </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700 dark:border-red-400/30 dark:bg-red-500/10 dark:text-red-200">{error}</div>
        ) : isLoading ? (
          <div className="grid gap-3">
            {Array.from({ length: 10 }).map((_, index) => <div key={index} className="h-24 animate-pulse rounded-2xl bg-white dark:bg-[#121826]" />)}
          </div>
        ) : isEnded ? (
          <div className="rounded-2xl border border-[#E8DCC7] bg-white p-6 text-center shadow-[0_10px_24px_rgba(28,37,65,0.05)] dark:border-white/10 dark:bg-[#121826] dark:shadow-none sm:p-10">
            <PackageOpen className="mx-auto h-12 w-12 text-[#B58118] dark:text-[#F5D878]" />
            <h2 className="mt-4 text-3xl font-black tracking-[-0.04em] text-[#111827] dark:text-[#FFF8EA]">Exhibition has ended</h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm font-semibold leading-6 text-[#6B5D4A] dark:text-[#D7CBB9]">
              This exhibition is completed. Live stalls, vendor chat, product demos, and ordering from this exhibition are closed.
            </p>
            {exhibition?.message ? (
              <p className="mx-auto mt-3 max-w-xl rounded-xl border border-[#E8DCC7] bg-[#FFF8EA] px-4 py-3 text-sm font-black text-[#7C4A03] dark:border-white/10 dark:bg-white/10 dark:text-[#F5D878]">
                {exhibition.message}
              </p>
            ) : null}
            <Link href="/exhibitions" className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-[#F97316] px-5 text-sm font-black text-white transition hover:bg-[#EA580C] focus:outline-none focus:ring-2 focus:ring-[#F97316]/40">
              Back to Exhibitions
            </Link>
          </div>
        ) : filteredStalls.length ? (
          <div className="grid gap-3">
            {filteredStalls.map((stall) => (
              <StallRow
                key={stall.id}
                stall={stall}
                expanded={expandedId === stall.id || hoveredId === stall.id}
                onHover={() => setHoveredId(stall.id)}
                onLeave={() => setHoveredId("")}
                onToggle={() => setExpandedId((current) => (current === stall.id ? "" : stall.id))}
              />
            ))}
          </div>
        ) : (
          <EmptyPanel title="No vendors found" description="Try another search, category, or status filter." />
        )}
      </section>
    </main>
  );
}
