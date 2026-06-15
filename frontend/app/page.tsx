"use client";

import Link from "next/link";
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
  const { posts, stalls, exhibitions, isLoading, error } = useSocialShoppingData(16);

  return (
    <SocialShell>
      <div className="grid gap-4">
        <StoriesRow stalls={stalls} exhibitions={exhibitions} />
        <CategoryRail />
        {error ? (
          <div className="rounded-[24px] border border-amber-300 bg-amber-100 px-4 py-3 text-sm font-black text-amber-950 dark:border-amber-400/30 dark:bg-amber-500/15 dark:text-amber-100">
            {error}
          </div>
        ) : null}
        <HomepageAdvertisementCarousel />
        <section className="rounded-[30px] border border-border bg-card p-4 text-card-foreground shadow-soft">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">Social shopping feed</p>
              <h1 className="mt-1 text-2xl font-black tracking-[-0.05em] text-foreground sm:text-3xl">Discover small vendors, product drops, and live deals.</h1>
              <p className="mt-2 text-sm font-semibold leading-6 text-muted-foreground">
                Browse vendor posts, save products, enter live rooms, and buy directly from trusted sellers.
              </p>
            </div>
            <Link href="/explore" className="hidden shrink-0 rounded-2xl bg-primary px-4 py-3 text-sm font-black text-primary-foreground sm:inline-flex">
              Explore
            </Link>
          </div>
        </section>
        {isLoading ? (
          <div className="grid gap-4">
            {Array.from({ length: 3 }).map((_, index) => <div key={index} className="h-[520px] animate-pulse rounded-[30px] bg-card" />)}
          </div>
        ) : posts.length ? (
          <div className="grid gap-5">
            {posts.map((post) => <FeedCard key={post.id} post={post} />)}
          </div>
        ) : (
          <SocialEmptyState title="No feed posts yet" description="Active vendor products will become social shopping posts when vendors publish catalogue items." />
        )}
      </div>
    </SocialShell>
  );
}
