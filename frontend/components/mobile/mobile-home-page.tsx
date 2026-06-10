"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CalendarDays, CheckCircle2, Heart, Search, Sparkles, Store, Users } from "lucide-react";
import { AppImage } from "@/components/ui/app-image";
import { buttonStyles } from "@/components/ui/button";
import { MobileBottomNav } from "@/components/mobile/mobile-bottom-nav";
import { MobileTopBar } from "@/components/mobile/mobile-top-bar";
import { formatPrice } from "@/lib/utils";
import { getExhibitions, getProducts, getStalls } from "@/lib/api";
import { useExpoStore } from "@/lib/cart-store";
import type { Exhibition, Product, Stall } from "@/lib/types";

export function MobileHomePage() {
  const currentUser = useExpoStore((state) => state.currentUser);
  const selectedAvatarId = useExpoStore((state) => state.selectedAvatarId);
  const [exhibitions, setExhibitions] = useState<Exhibition[]>([]);
  const [liveStalls, setLiveStalls] = useState<Stall[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [audience, setAudience] = useState<"user" | "vendor">("user");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const loadMobileHome = async () => {
      setIsLoading(true);
      try {
        const [exhibitionResponse, productResponse] = await Promise.all([getExhibitions(), getProducts()]);
        const visibleExhibitions = exhibitionResponse.filter((exhibition) => exhibition.status !== "draft");
        const liveOrFirstExhibition = visibleExhibitions.find((exhibition) => exhibition.status === "live") ?? visibleExhibitions[0];
        const stallResponse = liveOrFirstExhibition ? await getStalls(liveOrFirstExhibition.id).catch(() => []) : [];

        if (!active) return;
        setExhibitions(visibleExhibitions);
        setLiveStalls(
          stallResponse.filter((stall) => stall.liveStatus === "live" || stall.status === "live" || stall.status === "active")
        );
        setProducts(productResponse.filter((product) => product.status === "active"));
        setError("");
      } catch (errorValue) {
        if (active) {
          setError(errorValue instanceof Error ? errorValue.message : "Could not load mobile home data.");
          setExhibitions([]);
          setLiveStalls([]);
          setProducts([]);
        }
      } finally {
        if (active) setIsLoading(false);
      }
    };

    loadMobileHome();
    return () => {
      active = false;
    };
  }, []);

  const featuredExpos = useMemo(
    () =>
      [...exhibitions]
        .sort((a, b) => {
          const rank = { live: 0, scheduled: 1, paused: 2, ended: 3, cancelled: 4, draft: 5 };
          return (rank[a.status] ?? 5) - (rank[b.status] ?? 5);
        })
        .slice(0, 4),
    [exhibitions]
  );
  const categories = useMemo(
    () => ["All", ...Array.from(new Set(exhibitions.map((exhibition) => exhibition.category).filter(Boolean)))],
    [exhibitions]
  );
  const upcomingExhibition = exhibitions.find((exhibition) => exhibition.status === "scheduled");

  return (
    <section className="min-h-[100dvh] bg-[var(--bg)] text-[var(--text)]">
      <MobileTopBar />
      <main className="px-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-4">
        <div className="space-y-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm text-[var(--muted)]">{currentUser?.name ? `Welcome back, ${currentUser.name}` : "Welcome to Ankita Designs"}</p>
              <h1 className="mt-1 text-[2.55rem] font-black leading-[0.92] tracking-[-0.075em]">
                Discover Live <span className="text-[var(--coral)]">Expos</span>
              </h1>
            </div>
            <Link href="/exhibitions" className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-[color:var(--border)] bg-[var(--surface-strong)] text-[var(--gold)] shadow-[var(--shadow-soft)]" aria-label="Search exhibitions">
              <Search className="h-5 w-5" />
            </Link>
          </div>

          {error ? (
            <div className="rounded-[26px] border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>
          ) : null}

          {!currentUser ? (
            <MobileAudiencePanel audience={audience} onAudienceChange={setAudience} />
          ) : null}

          <div className="flex snap-x gap-4 overflow-x-auto pb-1">
            {isLoading ? (
              <LoadingCard label="Loading exhibitions..." />
            ) : featuredExpos.length ? featuredExpos.map((expo) => (
              <article key={expo.id} className="relative h-[24rem] w-[84vw] shrink-0 snap-start overflow-hidden rounded-[36px] border border-[color:var(--border)] bg-[var(--surface-strong)] shadow-[var(--shadow-soft)]">
                <AppImage src={expo.bannerImage || "/stalls/stall-placeholder.png"} alt={expo.title} className="absolute inset-0 h-full w-full rounded-none" fallbackSrc="/stalls/stall-placeholder.png" priority />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/10" />
                <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                  <span className="rounded-full bg-[var(--coral)] px-3 py-1 text-xs font-black uppercase tracking-[0.14em]">{expo.status}</span>
                  <h2 className="mt-4 text-2xl font-black tracking-[-0.05em]">{expo.title}</h2>
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-white/75">{expo.description || "Explore stalls, vendors, live rooms, and products."}</p>
                  <div className="mt-4 flex items-center gap-3 text-xs font-bold text-white/80">
                    <span className="rounded-full bg-white/14 px-3 py-1.5"><Users className="mr-1 inline h-3.5 w-3.5" />{expo.assignedStallsCount ?? 0} assigned</span>
                    <span className="rounded-full bg-white/14 px-3 py-1.5"><Store className="mr-1 inline h-3.5 w-3.5" />{expo.stallCount ?? expo.stall_count ?? 0} stalls</span>
                  </div>
                  <Link
                    href="/exhibitions"
                    className={buttonStyles("primary", "mt-5 min-h-12 w-full justify-center px-5 py-3")}
                  >
                    {expo.status === "live" ? "Enter Expo" : "View Details"}
                  </Link>
                </div>
              </article>
            )) : (
              <EmptyRailCard title="No exhibitions available" description="Published exhibitions will appear here after admin creates them." />
            )}
          </div>

          {categories.length > 1 ? <div className="flex gap-2 overflow-x-auto pb-1">
            {categories.map((category) => (
              <button key={category} type="button" className="min-h-11 shrink-0 rounded-full border border-[color:var(--border)] bg-[var(--surface-strong)] px-4 text-sm font-bold text-[var(--muted)] first:bg-[var(--coral)] first:text-white">
                {category}
              </button>
            ))}
          </div> : null}

          <MobileTitle title="Live Now" href="/exhibitions" />
          <div className="flex gap-3 overflow-x-auto pb-1">
            {liveStalls.length ? liveStalls.map((vendor) => (
              <article key={vendor.id} className="w-44 shrink-0 rounded-[28px] border border-[color:var(--border)] bg-[var(--surface-strong)] p-3 shadow-[var(--shadow-soft)]">
                <div className="relative h-28 overflow-hidden rounded-[22px]">
                  <AppImage src={vendor.bannerImage || vendor.featuredImage || vendor.image || "/stalls/stall-placeholder.png"} alt={vendor.name} className="h-full w-full rounded-[22px]" fallbackSrc="/stalls/stall-placeholder.png" />
                  <span className="absolute left-2 top-2 rounded-full bg-[var(--coral)] px-2 py-1 text-[10px] font-black text-white">LIVE</span>
                </div>
                <h3 className="mt-3 truncate text-sm font-black text-[var(--text)]">{vendor.name}</h3>
                <p className="mt-1 text-xs text-[var(--muted)]">{vendor.category}</p>
                <p className="mt-2 text-xs font-bold text-[var(--gold)]">{vendor.viewerCount ?? 0} watching</p>
              </article>
            )) : (
              <EmptyRailCard title="No live vendors right now" description="Live vendor stalls will appear here when vendors start streaming." />
            )}
          </div>

          <MobileTitle title="Trending Products" href="/exhibitions" />
          <div className="flex gap-3 overflow-x-auto pb-1">
            {products.length ? products.slice(0, 8).map((product) => (
              <article key={product.id} className="w-40 shrink-0 rounded-[26px] border border-[color:var(--border)] bg-[var(--surface-strong)] p-3 shadow-[var(--shadow-soft)]">
                <div className="relative">
                  <AppImage src={product.images[0] ?? "/products/product-placeholder.png"} alt={product.title} className="h-32 w-full rounded-[20px]" fallbackSrc="/products/product-placeholder.png" />
                  <button type="button" className="absolute right-2 top-2 grid h-9 w-9 place-items-center rounded-full bg-black/30 text-white backdrop-blur" aria-label={`Wishlist ${product.title}`}>
                    <Heart className="h-4 w-4" />
                  </button>
                </div>
                <h3 className="mt-3 line-clamp-2 text-sm font-black text-[var(--text)]">{product.title}</h3>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <p className="text-sm font-black text-[var(--coral)]">{formatPrice(product.price)}</p>
                  <span className="truncate text-xs font-bold text-[var(--gold)]">{product.stock} in stock</span>
                </div>
              </article>
            )) : (
              <EmptyRailCard title="No products available" description="Active vendor products will appear here." />
            )}
          </div>

          {upcomingExhibition ? <div className="rounded-[30px] border border-[color:var(--border)] bg-[var(--surface-strong)] p-4 shadow-[var(--shadow-soft)]">
            <div className="flex items-center gap-4">
              <div className="grid h-16 w-16 place-items-center rounded-2xl bg-[var(--surface)] text-[var(--gold)]">
                <CalendarDays className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--gold)]">Upcoming</p>
                <h3 className="truncate text-base font-black text-[var(--text)]">{upcomingExhibition.title}</h3>
                <p className="text-xs text-[var(--muted)]">Starts {new Date(upcomingExhibition.startDate).toLocaleDateString([], { month: "short", day: "numeric" })}</p>
              </div>
              <Link href="/exhibitions" className="inline-flex min-h-11 items-center rounded-full border border-[color:var(--border)] bg-[var(--surface)] px-4 text-xs font-bold text-[var(--text)]">View</Link>
            </div>
          </div> : null}
        </div>
      </main>
      <MobileBottomNav role="user" />
    </section>
  );
}

function MobileAudiencePanel({
  audience,
  onAudienceChange
}: {
  audience: "user" | "vendor";
  onAudienceChange: (audience: "user" | "vendor") => void;
}) {
  const details = audience === "user"
    ? {
        title: "Customer guide",
        description: "Create an account, browse live stalls, join live rooms, chat, and checkout.",
        href: "/register?role=user",
        cta: "Register as Customer",
        points: ["Avatar", "Featured expo", "Live room", "Checkout"]
      }
    : {
        title: "Vendor guide",
        description: "Create a vendor account, submit your business profile, get approved, add products, and go live.",
        href: "/register?role=vendor",
        cta: "Register as Vendor",
        points: ["Approval", "Products", "Stall request", "Live selling"]
      };

  return (
    <section className="rounded-[30px] border border-[color:var(--border)] bg-[var(--surface-strong)] p-4 shadow-[var(--shadow-soft)]">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--gold)]">Start here</p>
      <h2 className="mt-2 text-2xl font-black tracking-[-0.05em] text-[var(--text)]">What are you here to do?</h2>
      <div data-tour-id="homepage-role-choice" className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onAudienceChange("user")}
          className={`rounded-2xl border px-3 py-3 text-left text-sm font-black ${audience === "user" ? "border-[var(--gold)] bg-[var(--gold)]/15 text-[var(--text)]" : "border-[color:var(--border)] bg-[var(--surface)] text-[var(--muted)]"}`}
        >
          <Users className="mb-2 h-4 w-4 text-[var(--gold)]" />
          Customer
        </button>
        <button
          type="button"
          onClick={() => onAudienceChange("vendor")}
          className={`rounded-2xl border px-3 py-3 text-left text-sm font-black ${audience === "vendor" ? "border-[var(--gold)] bg-[var(--gold)]/15 text-[var(--text)]" : "border-[color:var(--border)] bg-[var(--surface)] text-[var(--muted)]"}`}
        >
          <Store className="mb-2 h-4 w-4 text-[var(--gold)]" />
          Vendor
        </button>
      </div>
      <div className="mt-4 rounded-[24px] border border-[color:var(--border)] bg-[var(--surface)] p-4">
        <h3 className="text-lg font-black text-[var(--text)]">{details.title}</h3>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{details.description}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {details.points.map((point) => (
            <span key={point} className="inline-flex items-center gap-1 rounded-full bg-[var(--surface-strong)] px-3 py-1.5 text-[11px] font-bold text-[var(--muted)]">
              <CheckCircle2 className="h-3 w-3 text-[var(--gold)]" />
              {point}
            </span>
          ))}
        </div>
        <Link data-tour-id="homepage-role-register" href={details.href} className={buttonStyles("primary", "mt-4 min-h-12 w-full justify-center px-5 py-3")}>
          {details.cta}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}

function LoadingCard({ label }: { label: string }) {
  return (
    <div className="grid h-[24rem] w-[84vw] shrink-0 place-items-center rounded-[36px] border border-[color:var(--border)] bg-[var(--surface-strong)] p-6 text-sm font-bold text-[var(--muted)] shadow-[var(--shadow-soft)]">
      {label}
    </div>
  );
}

function EmptyRailCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="w-[84vw] shrink-0 rounded-[30px] border border-[color:var(--border)] bg-[var(--surface-strong)] p-5 shadow-[var(--shadow-soft)]">
      <Sparkles className="h-6 w-6 text-[var(--gold)]" />
      <h3 className="mt-3 text-base font-black text-[var(--text)]">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{description}</p>
    </div>
  );
}

function MobileTitle({ title, href }: { title: string; href: string }) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-xl font-black tracking-[-0.04em] text-[var(--text)]">{title}</h2>
      <Link href={href} className="text-xs font-black text-[var(--gold)]">View all</Link>
    </div>
  );
}
