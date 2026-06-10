"use client";

import { useEffect, useMemo, useState } from "react";
import { Flame, Gem, Gift, Home as HomeIcon, PackageOpen, Shirt, Sparkles, Utensils, Wand2 } from "lucide-react";
import { CartDrawer } from "@/components/cart/cart-drawer";
import { HomepageAdvertisementCarousel } from "@/components/marketplace/homepage-advertisement-carousel";
import {
  AppHeader,
  CategoryCard,
  CategoryStrip,
  EmptyState,
  ExhibitionCard,
  MarketplaceBanner,
  MarketplaceBottomNav,
  PageShell,
  ProductCard,
  SectionHeader,
  StallCard
} from "@/components/marketplace/marketplace-ui";
import { getExhibitions, getProducts, getPublicStalls } from "@/lib/api";
import { useExpoStore } from "@/lib/cart-store";
import type { Exhibition, Product, Stall } from "@/lib/types";

const navItems = [
  { label: "All", href: "/exhibitions" },
  { label: "Live Exhibitions", href: "/exhibitions?status=live" },
  { label: "Today Live", href: "/exhibitions?status=live" },
  { label: "Saree", href: "/exhibitions?category=Saree" },
  { label: "Kurti", href: "/exhibitions?category=Kurti" },
  { label: "Jewellery", href: "/exhibitions?category=Jewellery" },
  { label: "White Metal", href: "/exhibitions?category=White%20Metal" },
  { label: "Pooja Material", href: "/exhibitions?category=Pooja%20Material" },
  { label: "Home Decor", href: "/exhibitions?category=Home%20Decor" },
  { label: "Food Products", href: "/exhibitions?category=Food%20Products" },
  { label: "Cosmetics", href: "/exhibitions?category=Cosmetics" },
  { label: "Offers", href: "/exhibitions?category=Offers" },
  { label: "New Arrivals", href: "/exhibitions?category=New%20Arrivals" }
];

const categoryTiles = [
  { name: "Saree", icon: Shirt, href: "/exhibitions?category=Saree" },
  { name: "Kurti", icon: Sparkles, href: "/exhibitions?category=Kurti" },
  { name: "Jewellery", icon: Gem, href: "/exhibitions?category=Jewellery" },
  { name: "White Metal", icon: Gift, href: "/exhibitions?category=White%20Metal" },
  { name: "Pooja Material", icon: Flame, href: "/exhibitions?category=Pooja%20Material" },
  { name: "Home Decor", icon: HomeIcon, href: "/exhibitions?category=Home%20Decor" },
  { name: "Food Products", icon: Utensils, href: "/exhibitions?category=Food%20Products" },
  { name: "Cosmetics", icon: Wand2, href: "/exhibitions?category=Cosmetics" }
];

export default function Home() {
  const [exhibitions, setExhibitions] = useState<Exhibition[]>([]);
  const [stalls, setStalls] = useState<Stall[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const openCart = useExpoStore((state) => state.openCart);

  useEffect(() => {
    let active = true;
    Promise.allSettled([getExhibitions(), getPublicStalls(), getProducts()])
      .then(([exhibitionResult, stallResult, productResult]) => {
        if (!active) return;
        if (exhibitionResult.status === "fulfilled") {
          setExhibitions(exhibitionResult.value.filter((item) => item.status !== "draft" && item.status !== "cancelled").slice(0, 8));
        }
        if (stallResult.status === "fulfilled") {
          setStalls(stallResult.value.slice(0, 8));
        }
        if (productResult.status === "fulfilled") {
          setProducts(productResult.value.filter((product) => product.status === "active").slice(0, 18));
        }
        setLoadError(
          exhibitionResult.status === "rejected" && stallResult.status === "rejected" && productResult.status === "rejected"
            ? "Marketplace data is unavailable. Start the backend to load exhibitions, stalls, and products."
            : ""
        );
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const liveOrUpcomingExhibitions = useMemo(() => {
    const priority: Record<Exhibition["status"], number> = { live: 0, scheduled: 1, paused: 2, ended: 3, draft: 4, cancelled: 5 };
    return [...exhibitions].sort((a, b) => priority[a.status] - priority[b.status]);
  }, [exhibitions]);
  const featuredStalls = useMemo(() => stalls.filter((stall) => stall.liveStatus === "live" || stall.status === "live" || stall.isFeatured).slice(0, 4), [stalls]);
  const dealProducts = useMemo(() => products.filter((product) => product.compareAtPrice > product.price || product.offerCode).slice(0, 6), [products]);
  const trendingProducts = products.slice(0, 6);
  const festivalProducts = products.slice(6, 12);
  const recentlyAdded = products.slice(12, 18);

  const submitSearch = () => {
    const query = search.trim();
    window.location.href = query ? `/exhibitions?search=${encodeURIComponent(query)}` : "/exhibitions";
  };

  return (
    <PageShell>
      <AppHeader search={search} setSearch={setSearch} onSearch={submitSearch} onCart={openCart} />
      <CategoryStrip items={navItems} />

      <section className="marketplace-container grid gap-4 py-4">
        {loadError ? (
          <div className="rounded-2xl border border-amber-300 bg-amber-100 px-4 py-3 text-sm font-bold text-amber-950 dark:border-amber-400/30 dark:bg-amber-500/15 dark:text-amber-100">
            {loadError}
          </div>
        ) : null}
        <HomepageAdvertisementCarousel />
        <MarketplaceBanner
          title="Shop live exhibitions from trusted vendor stalls."
          subtitle="Watch demos, bargain together, unlock live-only offers, and order securely through Ankita Designs."
          primaryHref="/exhibitions"
          primaryLabel="Explore Live Exhibitions"
          secondaryHref="/register?role=vendor"
          secondaryLabel="Become a Vendor"
          image="/images/home/live-shopping-sale-banner.png"
        />
      </section>

      <section className="marketplace-container py-5">
        <SectionHeader eyebrow="Main event" title="Live / Upcoming Exhibitions" actionHref="/exhibitions" />
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-80 animate-pulse rounded-[26px] bg-card" />)}
          </div>
        ) : liveOrUpcomingExhibitions.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {liveOrUpcomingExhibitions.slice(0, 4).map((exhibition) => <ExhibitionCard key={exhibition.id} exhibition={exhibition} />)}
          </div>
        ) : (
          <EmptyState title="No exhibitions published yet" description="Admin-created live or upcoming exhibitions will appear here when the backend has data." />
        )}
      </section>

      <section className="marketplace-container py-5">
        <SectionHeader eyebrow="Inside exhibitions" title="Featured Live Stalls" actionHref="/exhibitions?status=live" />
        {featuredStalls.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {featuredStalls.map((stall) => <StallCard key={stall.id} stall={stall} />)}
          </div>
        ) : (
          <EmptyState title="No featured live stalls yet" description="Live and featured stalls from active exhibitions will appear here after vendors go live." />
        )}
      </section>

      <section className="marketplace-container py-5">
        <SectionHeader eyebrow="Browse faster" title="Shop By Category" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          {categoryTiles.map((item) => <CategoryCard key={item.name} {...item} />)}
        </div>
      </section>

      <section className="marketplace-container py-5">
        <SectionHeader eyebrow="Offers" title="Best Bargain Deals" actionHref="/exhibitions" />
        {dealProducts.length ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-6">
            {dealProducts.map((product) => <ProductCard key={product.id} product={product} />)}
          </div>
        ) : (
          <EmptyState title="Deals will appear here" description="Products with offer codes or compare-at pricing will show in this section." />
        )}
      </section>

      <section className="marketplace-container grid gap-5 py-5 lg:grid-cols-2">
        <div>
          <SectionHeader eyebrow="Product discovery" title="Trending Products" actionHref="/exhibitions" />
          {trendingProducts.length ? (
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
              {trendingProducts.map((product) => <ProductCard key={product.id} product={product} />)}
            </div>
          ) : (
            <EmptyState title="No products listed yet" description="Vendor products will appear here after approved vendors add active catalogue items." />
          )}
        </div>
        <div>
          <SectionHeader eyebrow="Seasonal" title="Festival Specials" actionHref="/exhibitions" />
          {festivalProducts.length ? (
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
              {festivalProducts.map((product) => <ProductCard key={product.id} product={product} />)}
            </div>
          ) : (
            <EmptyState title="Festival specials will appear here" description="Seasonal products from live exhibitions will show here when available." />
          )}
        </div>
      </section>

      <section className="marketplace-container py-5">
        <SectionHeader eyebrow="New" title="Recently Added" actionHref="/exhibitions" />
        {recentlyAdded.length ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-6">
            {recentlyAdded.map((product) => <ProductCard key={product.id} product={product} />)}
          </div>
        ) : (
          <EmptyState title="Recently added products will appear here" description="This section stays empty until real active products are available from the API." />
        )}
      </section>

      <footer className="mt-6 border-t border-border bg-card px-4 py-7 text-muted-foreground">
        <div className="marketplace-container flex flex-col gap-4 text-sm font-semibold sm:flex-row sm:items-center sm:justify-between">
          <p className="font-black text-foreground">Ankita Designs Online Live Exhibition</p>
          <div className="flex flex-wrap gap-4">
            <a href="#" className="hover:text-primary">About Us</a>
            <a href="#" className="hover:text-primary">Privacy Policy</a>
            <a href="#" className="hover:text-primary">Return Policy</a>
            <a href="#" className="hover:text-primary">Vendor Policy</a>
            <a href="#" className="hover:text-primary">Contact</a>
          </div>
        </div>
      </footer>

      <MarketplaceBottomNav />
      <CartDrawer />
    </PageShell>
  );
}
