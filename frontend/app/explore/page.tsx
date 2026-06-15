"use client";

import { useMemo } from "react";
import { CategoryRail, ExploreGrid, SocialEmptyState, SocialShell, useSocialShoppingData } from "@/components/social/social-shopping";

export default function ExplorePage() {
  const { posts, isLoading, error } = useSocialShoppingData(60);
  const sortedPosts = useMemo(() => posts, [posts]);

  return (
    <SocialShell>
      <div className="grid gap-4">
        <section className="rounded-[30px] border border-border bg-card p-5 shadow-soft">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">Explore</p>
          <h1 className="mt-1 text-3xl font-black tracking-[-0.05em] text-foreground">Find products and vendors visually.</h1>
          <p className="mt-2 text-sm font-semibold leading-6 text-muted-foreground">A fast product grid built from active vendor catalogue items.</p>
        </section>
        <CategoryRail />
        {error ? <SocialEmptyState title="Explore is unavailable" description={error} /> : null}
        {isLoading ? <div className="h-[520px] animate-pulse rounded-[30px] bg-card" /> : <ExploreGrid posts={sortedPosts} />}
      </div>
    </SocialShell>
  );
}
