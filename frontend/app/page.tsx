"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { HomepageAdvertisementCarousel } from "@/components/marketplace/homepage-advertisement-carousel";
import {
  CategoryRail,
  FeedCard,
  SocialEmptyState,
  SocialShell,
  StoriesRow,
  useSocialShoppingData
} from "@/components/social/social-shopping";

export default function Home() {
  const { posts, stalls, exhibitions, isLoading, isLoadingMore, hasMore, loadMore, error } = useSocialShoppingData(8);
  const [visibleCount, setVisibleCount] = useState(6);
  const loadTriggerRef = useRef<HTMLDivElement | null>(null);
  const visiblePosts = useMemo(() => posts.slice(0, visibleCount), [posts, visibleCount]);
  const hasHiddenPosts = visibleCount < posts.length;
  const canLoadMore = hasHiddenPosts || hasMore;

  const loadNextBatch = useCallback(() => {
    if (isLoading || isLoadingMore) return;
    if (hasHiddenPosts) {
      setVisibleCount((count) => Math.min(count + 5, posts.length));
      return;
    }
    if (hasMore) void loadMore();
  }, [hasHiddenPosts, hasMore, isLoading, isLoadingMore, loadMore, posts.length]);

  useEffect(() => {
    const target = loadTriggerRef.current;
    if (!target || !canLoadMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadNextBatch();
      },
      { rootMargin: "700px 0px" }
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [canLoadMore, loadNextBatch, posts.length, visibleCount]);

  return (
    <SocialShell>
      <div className="grid gap-0 sm:gap-4">
        <StoriesRow stalls={stalls} exhibitions={exhibitions} />
        <CategoryRail />
        {error ? (
          <div className="border-b border-amber-300 bg-amber-100 px-4 py-3 text-sm font-black text-amber-950 dark:border-amber-400/30 dark:bg-amber-500/15 dark:text-amber-100 sm:rounded-[24px] sm:border">
            {error}
          </div>
        ) : null}
        <HomepageAdvertisementCarousel />
        {isLoading ? (
          <div className="grid gap-0 sm:gap-4">
            {Array.from({ length: 3 }).map((_, index) => <div key={index} className="h-[620px] animate-pulse border-b border-border bg-muted sm:h-[520px] sm:rounded-[30px] sm:border-0 sm:bg-card" />)}
          </div>
        ) : posts.length ? (
          <div className="grid gap-0 sm:gap-5">
            {visiblePosts.map((post) => <FeedCard key={`${post.isRealPost ? "post" : "product"}-${post.id}`} post={post} />)}
            <div ref={loadTriggerRef} className="min-h-8" aria-hidden="true">
              {canLoadMore ? (
                <div className="grid gap-3 py-2">
                  <div className="mx-auto h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                    <span className="block h-full w-1/2 animate-pulse rounded-full bg-primary" />
                  </div>
                  {isLoadingMore ? <div className="h-[560px] animate-pulse border-y border-border bg-muted sm:h-[420px] sm:rounded-[30px] sm:border-0 sm:bg-card" /> : null}
                </div>
              ) : (
                <p className="py-4 text-center text-xs font-bold text-muted-foreground">You are all caught up.</p>
              )}
            </div>
          </div>
        ) : (
          <SocialEmptyState title="No feed posts yet" description="Active vendor products will become social shopping posts when vendors publish catalogue items." />
        )}
      </div>
    </SocialShell>
  );
}
