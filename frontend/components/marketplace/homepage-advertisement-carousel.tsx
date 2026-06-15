"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppImage } from "@/components/ui/app-image";
import { getAdvertisements } from "@/lib/api";
import { AdvertisementBanner } from "@/lib/types";

const ROTATION_INTERVAL_MS = 5000;

export function HomepageAdvertisementCarousel() {
  const [banners, setBanners] = useState<AdvertisementBanner[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    let active = true;
    getAdvertisements()
      .then((response) => {
        if (active) setBanners(response);
      })
      .catch(() => {
        if (active) setBanners([]);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (activeIndex >= banners.length) setActiveIndex(0);
  }, [activeIndex, banners.length]);

  useEffect(() => {
    if (isPaused || banners.length < 2) return;
    const interval = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % banners.length);
    }, ROTATION_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [banners.length, isPaused]);

  if (!banners.length) {
    return (
      <section className="overflow-hidden rounded-[28px] border border-border bg-card text-card-foreground shadow-soft">
        <div className="relative hidden aspect-[16/5] min-h-[230px] bg-[#101827] text-white sm:block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/home/live-shopping-sale-banner.png"
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover object-center"
          />
          <div className="relative z-10 flex h-full max-w-[52%] flex-col justify-center px-7 py-6 lg:px-10">
            <span className="w-fit rounded-full bg-[#FACC15] px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-[#111827]">
              Social shopping · vendor drops
            </span>
            <h1 className="mt-3 max-w-xl text-3xl font-black leading-[1.05] tracking-[-0.04em] lg:text-4xl">
              Discover small vendors through products, posts, and live drops.
            </h1>
            <p className="mt-3 max-w-lg text-sm font-semibold leading-6 text-[#F8E9D2] lg:text-base">
              Follow vendors, explore fresh products, save favorites, and shop securely through Ankita Designs.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href="/explore" className="inline-flex min-h-11 items-center rounded-xl bg-[#F97316] px-5 text-sm font-black text-white transition hover:bg-[#EA580C] focus:outline-none focus:ring-2 focus:ring-[#FDBA74]">
                Explore Products
              </Link>
            <Link href="/exhibitions?status=live" className="inline-flex min-h-11 items-center rounded-xl border border-[#F5D878] bg-[#FFFDF8] px-5 text-sm font-black text-[#172554] transition hover:bg-[#FFF2CC] focus:outline-none focus:ring-2 focus:ring-[#F5D878]">
                Live Events
              </Link>
            </div>
          </div>
        </div>

        <div className="sm:hidden">
          <div className="relative aspect-[16/9] overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/home/live-shopping-sale-banner.png"
              alt="Sarees, jewellery, cosmetics, and home decor available from trusted vendors"
              className="absolute inset-0 h-full w-full object-cover object-[70%_center]"
            />
          </div>
          <div className="bg-card px-5 py-5 text-card-foreground">
            <span className="inline-flex rounded-full bg-[#FACC15] px-3 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-[#111827]">
              Social shopping
            </span>
            <h1 className="mt-3 text-2xl font-black leading-tight tracking-[-0.035em] text-foreground">
              Discover vendors. Save products. Shop securely.
            </h1>
            <p className="mt-2 text-sm font-semibold leading-6 text-muted-foreground">
              Browse products, vendor profiles, live drops, and shopping events in one feed.
            </p>
            <Link href="/explore" className="mt-4 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-[#F97316] px-5 text-sm font-black text-white transition hover:bg-[#EA580C] focus:outline-none focus:ring-2 focus:ring-[#FDBA74]">
              Explore Products
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <div
      className="group relative overflow-hidden rounded-[28px] border border-border bg-card shadow-soft"
      role="region"
      aria-roledescription="carousel"
      aria-label="Featured advertisements"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocusCapture={() => setIsPaused(true)}
      onBlurCapture={() => setIsPaused(false)}
    >
      <div
        className="flex transition-transform duration-700 ease-out motion-reduce:transition-none"
        style={{ transform: `translateX(-${activeIndex * 100}%)` }}
      >
        {banners.map((banner, index) => (
          <Link
            key={banner.id}
            href={banner.destinationUrl}
            className="relative block aspect-[16/5] w-full shrink-0"
            aria-label={`${banner.title}. Open ${banner.destinationType}.`}
            aria-hidden={index !== activeIndex}
            tabIndex={index === activeIndex ? 0 : -1}
          >
            <AppImage
              src={banner.imageUrl}
              alt={banner.altText || banner.title}
              priority={index === 0}
              fallbackSrc="/images/home/hero-expo-bg-light.webp"
              className="h-full w-full rounded-none"
            />
          </Link>
        ))}
      </div>
    </div>
  );
}
