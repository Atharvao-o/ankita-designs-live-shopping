"use client";

import { useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

function getFallbackPath(pathname: string) {
  if (pathname.startsWith("/admin/")) return "/admin";
  if (pathname.startsWith("/vendor/")) return "/vendor";
  if (pathname.startsWith("/exhibition/")) return "/exhibitions";
  if (pathname.startsWith("/stalls/")) return "/exhibitions";
  if (pathname.startsWith("/live/")) return "/exhibitions";
  if (pathname.startsWith("/settings/")) return "/settings";
  return "/";
}

export function GlobalBackButton() {
  const pathname = usePathname();
  const router = useRouter();
  const fallbackPath = useMemo(() => getFallbackPath(pathname), [pathname]);

  if (pathname === "/") {
    return null;
  }

  const goBack = () => {
    const hasInternalReferrer = typeof document !== "undefined" && document.referrer.startsWith(window.location.origin);
    if (hasInternalReferrer && window.history.length > 1) {
      router.back();
      return;
    }
    router.push(fallbackPath);
  };

  return (
    <button
      type="button"
      onClick={goBack}
      className="fixed left-3 top-20 z-[65] inline-flex min-h-11 items-center gap-2 rounded-full border border-border bg-card px-4 text-sm font-black text-card-foreground shadow-strong transition hover:-translate-y-0.5 hover:border-primary hover:bg-secondary hover:text-secondary-foreground focus:outline-none focus:ring-2 focus:ring-ring sm:left-5 sm:top-24"
      aria-label="Go back"
    >
      <ArrowLeft className="h-4 w-4" aria-hidden />
      <span className="hidden sm:inline">Back</span>
    </button>
  );
}
