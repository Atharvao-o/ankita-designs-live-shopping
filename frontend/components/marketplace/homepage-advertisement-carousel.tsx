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

  if (!banners.length) return null;

  return (
    <div
      className="group relative overflow-hidden border-b border-border bg-card sm:rounded-[28px] sm:border sm:shadow-soft"
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
