"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PackageOpen, Search } from "lucide-react";
import { AppImage } from "@/components/ui/app-image";
import { getExhibitions } from "@/lib/api";
import { Exhibition } from "@/lib/types";
import { cn } from "@/lib/utils";

const statusFilters = ["all", "live", "scheduled", "ended"] as const;

type StatusFilter = (typeof statusFilters)[number];

function statusLabel(status: Exhibition["status"]) {
  if (status === "live") return "Live";
  if (status === "scheduled") return "Upcoming";
  if (status === "paused") return "Paused";
  if (status === "ended") return "Ended";
  return "Exhibition";
}

function statusClass(status: Exhibition["status"]) {
  if (status === "live") return "border-emerald-200 bg-emerald-100 text-emerald-800 dark:border-emerald-400/30 dark:bg-emerald-500/15 dark:text-emerald-200";
  if (status === "scheduled") return "border-amber-200 bg-amber-100 text-amber-900 dark:border-amber-400/30 dark:bg-amber-500/15 dark:text-amber-100";
  return "border-slate-200 bg-slate-100 text-slate-700 dark:border-white/10 dark:bg-white/10 dark:text-slate-200";
}

function ExhibitionRow({
  exhibition
}: {
  exhibition: Exhibition;
}) {
  const isEnded = exhibition.status === "ended";

  return (
    <article className="overflow-hidden rounded-2xl border border-[#E8DCC7] bg-white shadow-[0_14px_34px_rgba(28,37,65,0.08)] transition hover:border-[#D1A340] dark:border-white/10 dark:bg-[#121826] dark:shadow-none dark:hover:border-[#F5D878]/60">
      <div className="relative aspect-[16/5] min-h-[150px] overflow-hidden sm:min-h-[180px]">
        <AppImage
          src={exhibition.bannerImage || "/stalls/stall-placeholder.png"}
          alt={`${exhibition.title} banner`}
          fallbackSrc="/stalls/stall-placeholder.png"
          className="absolute inset-0 h-full w-full rounded-none"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/78 via-black/34 to-black/8 dark:from-black/82 dark:via-black/42 dark:to-black/14" />
        <div className="relative z-10 flex h-full flex-col justify-between p-4 sm:p-5">
          <span className={cn("w-fit rounded-full border px-3 py-1 text-xs font-black", statusClass(exhibition.status))}>
            {statusLabel(exhibition.status)}
          </span>
          <div className="max-w-2xl">
            <h2 className="line-clamp-2 text-2xl font-black tracking-[-0.04em] text-white sm:text-3xl">{exhibition.title}</h2>
            {isEnded ? <p className="mt-2 text-sm font-bold text-[#F8E9D2]">Exhibition has ended.</p> : null}
            <Link href={`/exhibition/${exhibition.id}`} className="mt-4 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-[#F97316] px-6 text-sm font-black text-white transition hover:bg-[#EA580C] focus:outline-none focus:ring-2 focus:ring-[#FDBA74] sm:w-auto">
              {isEnded ? "View Ended Exhibition" : "Join Exhibition"}
            </Link>
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

export function ExhibitionListScreen() {
  const [exhibitions, setExhibitions] = useState<Exhibition[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const visibleExhibitions = useMemo(() => exhibitions.filter((item) => item.status !== "draft" && item.status !== "cancelled"), [exhibitions]);

  const filteredExhibitions = useMemo(() => {
    const query = search.trim().toLowerCase();
    return visibleExhibitions.filter((exhibition) => {
      const matchesSearch = !query || [exhibition.title, exhibition.description, exhibition.category].filter(Boolean).some((value) => String(value).toLowerCase().includes(query));
      const matchesStatus = status === "all" || exhibition.status === status;
      return matchesSearch && matchesStatus;
    });
  }, [search, status, visibleExhibitions]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const initialSearch = params.get("search") || params.get("category");
    const initialStatus = params.get("status") as StatusFilter | null;
    if (initialSearch) setSearch(initialSearch);
    if (initialStatus && statusFilters.includes(initialStatus)) setStatus(initialStatus);

    let active = true;
    setIsLoading(true);
    getExhibitions()
      .then((response) => {
        if (!active) return;
        setExhibitions(response);
        setError("");
      })
      .catch((requestError) => {
        if (active) setError(requestError instanceof Error ? requestError.message : "Could not load exhibitions.");
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#F8F1E7] pb-28 text-[#111827] dark:bg-[#070B12] dark:text-[#FFF8EA] md:pb-0">
      <section className="border-b border-[#E8DCC7] bg-[#FFFDF8] dark:border-white/10 dark:bg-[#090D16]">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-black tracking-[-0.04em] text-[#111827] dark:text-[#FFF8EA] sm:text-3xl">Exhibitions</h1>
              <p className="mt-1 text-sm font-semibold text-[#6B5D4A] dark:text-[#D7CBB9]">{filteredExhibitions.length} available</p>
            </div>

            <div className="grid gap-2 md:min-w-[30rem] md:grid-cols-[1fr_auto]">
              <label className="relative block">
                <span className="sr-only">Search exhibitions</span>
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#B58118] dark:text-[#F5D878]" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search exhibitions"
                  className="h-11 w-full rounded-xl border border-[#D9C39D] bg-white px-11 text-sm font-semibold text-[#101827] outline-none placeholder:text-[#806F5D] focus:border-[#B58118] focus:ring-2 focus:ring-[#FACC15]/30 dark:border-white/12 dark:bg-[#121826] dark:text-[#FFF8EA] dark:placeholder:text-[#B8AA97]"
                />
              </label>
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value as StatusFilter)}
                className="h-11 rounded-xl border border-[#D9C39D] bg-white px-4 text-sm font-black text-[#172554] outline-none focus:border-[#B58118] focus:ring-2 focus:ring-[#FACC15]/30 dark:border-white/12 dark:bg-[#121826] dark:text-[#FFF8EA]"
                aria-label="Filter exhibitions by status"
              >
                <option value="all">All status</option>
                <option value="live">Live</option>
                <option value="scheduled">Upcoming</option>
                <option value="ended">Ended</option>
              </select>
            </div>
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
        ) : filteredExhibitions.length ? (
          <div className="grid gap-3">
            {filteredExhibitions.map((exhibition) => (
              <ExhibitionRow
                key={exhibition.id}
                exhibition={exhibition}
              />
            ))}
          </div>
        ) : (
          <EmptyPanel title="No exhibitions found" description="Try another search or status filter." />
        )}
      </section>
    </main>
  );
}
