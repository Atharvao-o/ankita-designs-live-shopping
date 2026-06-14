"use client";

import Link from "next/link";
import { useState } from "react";
import { Bookmark, Radio, Search, Sparkles, Store, Users } from "lucide-react";
import { AppImage } from "@/components/ui/app-image";
import { buttonStyles } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/premium";
import { Exhibition } from "@/lib/types";
import { cn } from "@/lib/utils";

type StatusFilter = "all" | "live" | "scheduled" | "ended";

type MobileExplorePageProps = {
  exhibitions: Exhibition[];
  filteredExhibitions: Exhibition[];
  statusFilter: StatusFilter;
  setStatusFilter: (filter: StatusFilter) => void;
  search: string;
  setSearch: (value: string) => void;
  isLoading: boolean;
  error: string;
  onRetry: () => void;
  selectedAvatarId: string | null;
  categories: string[];
  categoryFilter: string;
  setCategoryFilter: (category: string) => void;
};

const chips: Array<{ label: string; value: StatusFilter }> = [
  { label: "All", value: "all" },
  { label: "Live", value: "live" },
  { label: "Scheduled", value: "scheduled" },
  { label: "Ended", value: "ended" }
];

const segments: Array<{ label: string; status: StatusFilter | null }> = [
  { label: "Live", status: "live" },
  { label: "Upcoming", status: "scheduled" },
  { label: "All", status: "all" },
  { label: "Ended", status: "ended" }
];

function eventTime(exhibition: Exhibition) {
  const target = exhibition.status === "scheduled" ? exhibition.startDate : exhibition.endDate;
  if (!target) return "Schedule unavailable";
  return `${exhibition.status === "scheduled" ? "Starts" : "Ends"} ${new Date(target).toLocaleDateString([], { month: "short", day: "numeric" })}`;
}

export function MobileExplorePage({
  exhibitions,
  filteredExhibitions,
  statusFilter,
  setStatusFilter,
  search,
  setSearch,
  isLoading,
  error,
  onRetry,
  selectedAvatarId,
  categories,
  categoryFilter,
  setCategoryFilter
}: MobileExplorePageProps) {
  const [activeSegment, setActiveSegment] = useState("Live");
  const liveExhibition = exhibitions.find((item) => item.status === "live") ?? exhibitions[0];
  const liveVendors = filteredExhibitions.filter((item) => item.status === "live").slice(0, 6);

  return (
    <section className="min-h-[100dvh] bg-[var(--bg)] px-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-4 text-[var(--text)]">
      <div className="space-y-6">
        <div>
          <p className="text-sm font-medium text-[var(--muted)]">Welcome back</p>
          <h1 className="mt-1 font-serif text-[2.55rem] font-semibold leading-[0.95] tracking-[-0.07em]">
            Explore Digital <span className="text-[var(--coral)]">Exhibitions</span>
          </h1>
          <p className="mt-3 max-w-[19rem] text-sm leading-6 text-[var(--muted)]">Discover live stalls, connect, and shop in real time.</p>
        </div>

        <article className="relative overflow-hidden rounded-[34px] border border-[color:var(--border)] bg-[var(--surface-strong)] p-4 shadow-[var(--shadow-soft)]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_18%,rgba(255,120,92,0.22),transparent_32%),radial-gradient(circle_at_10%_100%,rgba(214,172,99,0.16),transparent_34%)]" />
          <div className="relative">
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-[var(--coral)] px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-white">Featured Expo</span>
              <span className="rounded-full border border-[color:var(--border)] bg-[var(--surface)] px-3 py-1 text-xs font-bold text-[var(--gold)]">
                {liveExhibition?.status ?? "No expo"}
              </span>
            </div>
            <div className="mt-4 grid gap-4">
              <AppImage src={liveExhibition?.bannerImage || "/stalls/stall-placeholder.png"} alt={liveExhibition?.title ?? "Featured exhibition"} className="h-44 w-full rounded-[26px]" fallbackSrc="/stalls/stall-placeholder.png" priority />
              <div>
                <h2 className="text-xl font-bold tracking-[-0.04em] text-[var(--text)]">{liveExhibition?.title ?? "No exhibitions available"}</h2>
                <p className="mt-1 line-clamp-2 text-sm leading-6 text-[var(--muted)]">{liveExhibition?.description ?? "Admin-created exhibitions will appear here."}</p>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  <MiniStat icon={Store} label="Stalls" value={String(liveExhibition?.stallCount ?? liveExhibition?.stall_count ?? 0)} />
                  <MiniStat icon={Radio} label="Live" value={String(liveExhibition?.liveSessionsCount ?? 0)} />
                  <MiniStat icon={Users} label="Assigned" value={String(liveExhibition?.assignedStallsCount ?? 0)} />
                </div>
                <Link
                  href="/exhibitions"
                  className={buttonStyles("primary", "mt-4 min-h-12 w-full justify-center px-5 py-3")}
                >
                  {liveExhibition?.status === "live" ? "Enter Expo" : "Browse Exhibitions"}
                </Link>
              </div>
            </div>
          </div>
        </article>

        <div className="grid gap-3">
          <label className="relative block">
            <span className="sr-only">Search exhibitions</span>
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--gold)]" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search exhibitions, stalls, products"
              className="h-14 w-full rounded-[22px] border border-[color:var(--border)] bg-[var(--surface-strong)] px-11 py-4 text-sm text-[var(--text)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--gold)]"
            />
          </label>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {chips.map((chip) => (
              <button
                key={chip.value}
                type="button"
                onClick={() => setStatusFilter(chip.value)}
                className={cn(
                  "min-h-10 shrink-0 rounded-full border px-4 text-sm font-bold transition",
                  statusFilter === chip.value ? "border-[var(--coral)] bg-[var(--coral)] text-white" : "border-[color:var(--border)] bg-[var(--surface)] text-[var(--muted)]"
                )}
              >
                {chip.label}
              </button>
            ))}
          </div>
          {categories.length ? <div className="flex gap-2 overflow-x-auto pb-1">
            {["all", ...categories].map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setCategoryFilter(category)}
                className={cn(
                  "min-h-10 shrink-0 rounded-full border px-3 py-2 text-xs font-bold capitalize transition",
                  categoryFilter === category ? "border-[var(--gold)] bg-secondary text-[var(--gold)]" : "border-[color:var(--border)] bg-[var(--surface)] text-[var(--muted)]"
                )}
              >
                {category}
              </button>
            ))}
          </div> : null}
          <div className="grid grid-cols-4 gap-1 rounded-[22px] border border-[color:var(--border)] bg-[var(--surface)] p-1">
            {segments.map((segment) => (
              <button
                key={segment.label}
                type="button"
                onClick={() => {
                  setActiveSegment(segment.label);
                  setStatusFilter(segment.status ?? "all");
                }}
                className={cn(
                  "min-h-10 rounded-[18px] px-2 text-[11px] font-black transition",
                  activeSegment === segment.label ? "bg-[var(--coral)] text-white shadow-[0_10px_28px_rgba(255,120,92,0.24)]" : "text-[var(--muted)]"
                )}
              >
                {segment.label}
              </button>
            ))}
          </div>
        </div>

        <MobileSectionTitle title="Live Now" action="View all" />
        <div className="flex snap-x gap-3 overflow-x-auto pb-1">
          {liveVendors.length ? liveVendors.map((exhibition) => (
            <Link key={exhibition.id} href={exhibition.status === "live" && selectedAvatarId ? `/exhibition/${exhibition.id}` : "/exhibitions"} className="w-[78vw] shrink-0 snap-start rounded-[28px] border border-[color:var(--border)] bg-[var(--surface-strong)] p-3 shadow-[var(--shadow-soft)]">
              <AppImage src={exhibition.bannerImage || "/stalls/stall-placeholder.png"} alt={exhibition.title} className="h-32 w-full rounded-[22px]" fallbackSrc="/stalls/stall-placeholder.png" />
              <div className="mt-3 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="truncate text-base font-bold text-[var(--text)]">{exhibition.title}</h3>
                  <p className="mt-1 text-xs text-[var(--muted)]">{exhibition.category ?? "Virtual Expo"}</p>
                </div>
                <StatusBadge status={exhibition.status} />
              </div>
            </Link>
          )) : (
            <div className="w-[78vw] shrink-0 rounded-[28px] border border-[color:var(--border)] bg-[var(--surface-strong)] p-5 text-sm text-[var(--muted)] shadow-[var(--shadow-soft)]">
              No live exhibitions right now. Scheduled and ended exhibitions remain available below.
            </div>
          )}
        </div>

        <MobileSectionTitle title="Explore Exhibitions" action={`${filteredExhibitions.length} results`} />
        <div className="grid gap-4">
          {error ? (
            <div className="rounded-[28px] border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <p>{error}</p>
              <button type="button" onClick={onRetry} className="mt-3 min-h-11 rounded-full bg-red-600 px-5 text-sm font-bold text-white">Retry</button>
            </div>
          ) : isLoading ? (
            <div className="rounded-[28px] border border-[color:var(--border)] bg-[var(--surface-strong)] p-5 text-sm font-bold text-[var(--muted)]">Loading exhibitions...</div>
          ) : filteredExhibitions.length ? filteredExhibitions.map((exhibition) => (
            <article key={exhibition.id} className="overflow-hidden rounded-[30px] border border-[color:var(--border)] bg-[var(--surface-strong)] shadow-[var(--shadow-soft)]">
              <div className="relative">
                <AppImage src={exhibition.bannerImage || "/stalls/stall-placeholder.png"} alt={exhibition.title} className="h-44 w-full rounded-none" fallbackSrc="/stalls/stall-placeholder.png" />
                <div className="absolute left-3 top-3"><StatusBadge status={exhibition.status} /></div>
                <button type="button" aria-label={`Bookmark ${exhibition.title}`} className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-2xl border border-white/20 bg-[#11111a] text-white">
                  <Bookmark className="h-4 w-4" />
                </button>
              </div>
              <div className="p-4">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--gold)]">{exhibition.category ?? "Virtual Expo"}</p>
                <h3 className="mt-2 text-xl font-bold tracking-[-0.04em] text-[var(--text)]">{exhibition.title}</h3>
                <p className="mt-2 line-clamp-1 text-sm text-[var(--muted)]">{exhibition.description || "Explore stalls, products, and live shopping."}</p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-[var(--muted)]">
                  <span className="rounded-full bg-[var(--surface)] px-3 py-1.5">{exhibition.stallCount ?? exhibition.stall_count ?? 0} stalls</span>
                  <span className="rounded-full bg-[var(--surface)] px-3 py-1.5">{exhibition.liveSessionsCount ?? 0} live</span>
                  <span className="rounded-full bg-[var(--surface)] px-3 py-1.5">{eventTime(exhibition)}</span>
                </div>
                {exhibition.status === "live" && selectedAvatarId ? (
                  <Link href={`/exhibition/${exhibition.id}`} className={buttonStyles("primary", "mt-4 min-h-12 w-full justify-center px-5 py-3")}>Join Live</Link>
                ) : (
                  <button type="button" disabled className={buttonStyles("secondary", "mt-4 min-h-12 w-full justify-center px-5 py-3 opacity-70")}>
                    {exhibition.status === "scheduled" ? "Notify Me" : selectedAvatarId ? "View Details" : "Choose Avatar"}
                  </button>
                )}
              </div>
            </article>
          )) : (
            <div className="rounded-[28px] border border-[color:var(--border)] bg-[var(--surface-strong)] p-6 text-center">
              <Sparkles className="mx-auto h-8 w-8 text-[var(--gold)]" />
              <h3 className="mt-3 text-lg font-bold text-[var(--text)]">No exhibitions available</h3>
              <p className="mt-2 text-sm text-[var(--muted)]">Published exhibitions will appear here when admin starts or schedules them.</p>
            </div>
          )}
        </div>

        {liveExhibition ? (
          <Link href={liveExhibition.status === "live" && selectedAvatarId ? `/exhibition/${liveExhibition.id}` : "/exhibitions"} className="block rounded-[30px] border border-[color:var(--border)] bg-[var(--surface-strong)] p-4 shadow-[var(--shadow-soft)]">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--gold)]">Interactive floor</p>
            <h3 className="mt-1 text-lg font-bold text-[var(--text)]">{liveExhibition.title}</h3>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              {liveExhibition.status === "live"
                ? "Open live stalls to discover assigned vendors and live rooms."
                : "Live stall browsing becomes available when vendors are ready."}
            </p>
          </Link>
        ) : null}
      </div>
    </section>
  );
}

function MiniStat({ icon: Icon, label, value }: { icon: typeof Store; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[color:var(--border)] bg-[var(--surface)] p-3">
      <Icon className="h-4 w-4 text-[var(--gold)]" />
      <p className="mt-2 text-base font-black text-[var(--text)]">{value}</p>
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--muted)]">{label}</p>
    </div>
  );
}

function MobileSectionTitle({ title, action }: { title: string; action?: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-xl font-bold tracking-[-0.04em] text-[var(--text)]">{title}</h2>
      {action ? <span className="text-xs font-bold text-[var(--gold)]">{action}</span> : null}
    </div>
  );
}
