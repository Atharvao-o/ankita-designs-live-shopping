"use client";

import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import {
  EmptyState,
  ExhibitionCard,
  MarketplaceBottomNav,
  PageShell,
  SearchBar,
  SectionHeader,
  StatusBadge
} from "@/components/marketplace/marketplace-ui";
import { getExhibitions } from "@/lib/api";
import type { Exhibition } from "@/lib/types";

const statusFilters = ["all", "live", "scheduled", "ended"] as const;

type StatusFilter = (typeof statusFilters)[number];

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
    <PageShell>
      <section className="border-b border-border bg-card">
        <div className="marketplace-container py-5">
          <SectionHeader
            eyebrow="Live marketplace"
            title="Exhibitions"
            description={`${filteredExhibitions.length} available exhibitions from real backend data.`}
          />

          <div className="grid gap-3 md:grid-cols-[1fr_auto]">
            <SearchBar value={search} onChange={setSearch} onSubmit={() => undefined} placeholder="Search exhibitions, categories, vendors" />
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as StatusFilter)}
              className="marketplace-input h-11 rounded-2xl px-4 text-sm font-black outline-none focus:border-primary focus:ring-2 focus:ring-ring"
              aria-label="Filter exhibitions by status"
            >
              <option value="all">All status</option>
              <option value="live">Live</option>
              <option value="scheduled">Upcoming</option>
              <option value="ended">Ended</option>
            </select>
          </div>

          <div className="mt-3 flex gap-2 overflow-x-auto">
            {statusFilters.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setStatus(item)}
                className={`shrink-0 rounded-full border px-4 py-2 text-xs font-black transition ${
                  status === item
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground hover:text-foreground"
                }`}
              >
                {item === "all" ? "All" : <StatusBadge status={item} className="border-0 bg-transparent p-0 text-current" />}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="marketplace-container py-5">
        {error ? (
          <div className="rounded-[24px] border border-red-300 bg-red-100 p-5 text-sm font-bold text-red-800 dark:border-red-400/30 dark:bg-red-500/10 dark:text-red-200">{error}</div>
        ) : isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => <div key={index} className="h-80 animate-pulse rounded-[26px] bg-card" />)}
          </div>
        ) : filteredExhibitions.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {filteredExhibitions.map((exhibition) => <ExhibitionCard key={exhibition.id} exhibition={exhibition} />)}
          </div>
        ) : (
          <EmptyState title="No exhibitions found" description="Try another search or status filter." actionHref="/" actionLabel="Back to homepage" />
        )}
      </section>
      <MarketplaceBottomNav />
    </PageShell>
  );
}
