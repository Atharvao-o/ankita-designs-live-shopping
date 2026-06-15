"use client";

import { Search, X } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { CategoryRail, ExploreGrid, SocialEmptyState, SocialShell, useSocialShoppingData } from "@/components/social/social-shopping";

export default function ExplorePage() {
  return (
    <Suspense fallback={<SocialShell><div className="h-[520px] animate-pulse rounded-[30px] bg-card" /></SocialShell>}>
      <ExploreContent />
    </Suspense>
  );
}

function ExploreContent() {
  const searchParams = useSearchParams();
  const [search, setSearch] = useState("");
  const { posts, isLoading, error } = useSocialShoppingData(60);
  const category = searchParams.get("category")?.trim().toLowerCase() || "";

  const filteredPosts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return posts.filter((post) => {
      const searchable = [
        post.vendorName,
        post.caption,
        post.postType,
        post.stall?.category,
        post.product?.title,
        post.product?.description
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return (!query || searchable.includes(query)) && (!category || searchable.includes(category));
    });
  }, [category, posts, search]);

  return (
    <SocialShell>
      <div className="grid gap-4">
        <label className="sticky top-[132px] z-30 mt-14 flex min-h-12 items-center gap-3 rounded-2xl border border-border bg-card px-4 shadow-soft sm:top-[76px] sm:mt-0">
          <Search className="h-5 w-5 shrink-0 text-muted-foreground" />
          <span className="sr-only">Search vendors, products, and categories</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search vendors, products, categories"
            className="min-w-0 flex-1 bg-transparent py-3 text-sm font-semibold text-foreground outline-none placeholder:text-muted-foreground"
          />
          {search ? (
            <button type="button" onClick={() => setSearch("")} className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground transition hover:bg-secondary hover:text-foreground" aria-label="Clear search">
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </label>
        <section className="rounded-[30px] border border-border bg-card p-5 shadow-soft">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">Explore</p>
          <h1 className="mt-1 text-3xl font-black tracking-[-0.05em] text-foreground">Find products and vendors visually.</h1>
          <p className="mt-2 text-sm font-semibold leading-6 text-muted-foreground">A fast product grid built from active vendor catalogue items.</p>
        </section>
        <CategoryRail />
        {error ? <SocialEmptyState title="Explore is unavailable" description={error} /> : null}
        {!isLoading && !error && !filteredPosts.length ? (
          <SocialEmptyState title="No matching products" description="Try another vendor, product, or category." />
        ) : null}
        {isLoading ? <div className="h-[520px] animate-pulse rounded-[30px] bg-card" /> : <ExploreGrid posts={filteredPosts} />}
      </div>
    </SocialShell>
  );
}
