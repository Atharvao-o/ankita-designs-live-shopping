"use client";

import Link from "next/link";
import { Globe, Instagram, MessageCircle, Package, Radio } from "lucide-react";
import { StallCardPosition, TiledStallZone } from "@/components/exhibition/phaser-map";
import { buttonStyles } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function safeExternalUrl(url?: string) {
  if (!url) {
    return null;
  }
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

function vendorInitials(name?: string) {
  const source = name?.trim() || "Vendor";
  return source
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function StallInfoCard({ zone, position }: { zone: TiledStallZone; position?: StallCardPosition | null }) {
  const live = zone.liveStatus === "live";
  const startingSoon = zone.liveStatus === "starting-soon";
  const instagram = safeExternalUrl(zone.socialLinks?.instagram);
  const website = safeExternalUrl(zone.socialLinks?.website);
  const whatsapp = safeExternalUrl(zone.socialLinks?.whatsapp);
  const bannerImage = zone.bannerImage ?? zone.featuredImage;
  const logoAlt = `${zone.vendorName ?? "Vendor"} logo`;
  const card = (
    <>
      <div
        className="relative overflow-hidden rounded-[24px] border border-white/70 bg-gradient-to-br from-[#8A5A24] via-[#C59A4A] to-[#E95F45] p-4 text-white shadow-[0_16px_44px_rgba(80,52,20,0.18),inset_0_1px_0_rgba(255,255,255,0.28)]"
        style={{
          backgroundImage: bannerImage
            ? `linear-gradient(110deg, rgba(23,18,12,0.76), rgba(138,90,36,0.54), rgba(233,95,69,0.42)), url("${bannerImage}")`
            : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center"
        }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.26),transparent_30%)]" />
        <div className="relative flex items-center gap-3">
          <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/70 bg-[#FFF7EB] text-sm font-black text-[#8A5A24] shadow-soft">
            <span aria-hidden="true">{vendorInitials(zone.vendorName)}</span>
            {zone.vendorLogo ? (
              <img
                src={zone.vendorLogo}
                alt={logoAlt}
                onError={(event) => {
                  event.currentTarget.style.display = "none";
                }}
                className="absolute h-14 w-14 rounded-full object-cover"
              />
            ) : null}
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/72">Vendor Banner</p>
            <p className="mt-1 truncate text-base font-semibold" title={zone.vendorName}>
              {zone.vendorName ?? "No vendor assigned"}
            </p>
            <p className="truncate text-xs font-medium text-white/82" title={zone.label}>
              {zone.label}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8A5A24]">
            {zone.number ?? "Stall"}
          </p>
          <h3 className="mt-1 truncate text-xl font-semibold tracking-[-0.04em] text-[#17120C]" title={zone.label}>
            {zone.label}
          </h3>
          <p className="mt-1 truncate text-sm text-[#7B7065]" title={zone.vendorName}>
            {zone.vendorName ?? "No vendor assigned"}
          </p>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full px-3 py-1 text-xs font-semibold",
            live && "bg-[#DCFCE7] text-[#168A54]",
            startingSoon && "bg-[#FFF4D8] text-[#8A5A24]",
            !live && !startingSoon && "bg-[#F4E8D8] text-[#7B7065]"
          )}
        >
          {live ? "Live now" : startingSoon ? "Starting soon" : "Offline"}
        </span>
      </div>

      <p className="mt-3 line-clamp-2 text-sm leading-6 text-[#7B7065]">
        {zone.description ?? "No vendor has been assigned to this stall yet."}
      </p>
      <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-2xl bg-[#FFF7EB] px-3 py-2 font-semibold text-[#7B7065]">
          <Radio className="mr-2 inline h-4 w-4 text-[#8A5A24]" />
          {zone.viewerCount ? `${zone.viewerCount.toLocaleString()} watching` : "No viewers"}
        </div>
        <div className="rounded-2xl bg-[#FFF7EB] px-3 py-2 font-semibold text-[#7B7065]">
          <Package className="mr-2 inline h-4 w-4 text-[#8A5A24]" />
          {zone.productCount ?? 0} products
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {instagram ? (
          <a href={instagram} target="_blank" rel="noopener noreferrer" aria-label={`${zone.vendorName} Instagram`} className="rounded-full border border-[#E9D9BE] p-2 text-[#7B7065] hover:bg-[#FFF7EB] hover:text-[#8A5A24]">
            <Instagram className="h-4 w-4" />
          </a>
        ) : null}
        {website ? (
          <a href={website} target="_blank" rel="noopener noreferrer" aria-label={`${zone.vendorName} website`} className="rounded-full border border-[#E9D9BE] p-2 text-[#7B7065] hover:bg-[#FFF7EB] hover:text-[#8A5A24]">
            <Globe className="h-4 w-4" />
          </a>
        ) : null}
        {whatsapp ? (
          <a href={whatsapp} target="_blank" rel="noopener noreferrer" aria-label={`${zone.vendorName} WhatsApp`} className="rounded-full border border-[#E9D9BE] p-2 text-[#7B7065] hover:bg-[#FFF7EB] hover:text-[#8A5A24]">
            <MessageCircle className="h-4 w-4" />
          </a>
        ) : null}
      </div>

      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        <Link href={`/stalls/${zone.stallId}/store`} aria-label={`View store for ${zone.label}`} className={buttonStyles("secondary", "justify-center px-4 py-3")}>
          View Store
        </Link>
        {live ? (
          <Link href={zone.route || `/live/${zone.stallId}`} aria-label={`Join live stream for ${zone.label}`} className={buttonStyles("primary", "justify-center px-4 py-3")}>
            Join Live
          </Link>
        ) : (
          <button type="button" disabled className={buttonStyles("secondary", "justify-center px-4 py-3 opacity-55")}>
            Not Live
          </button>
        )}
      </div>
    </>
  );

  return (
    <>
      {position ? (
        <aside
          className="pointer-events-auto absolute z-40 hidden max-h-[calc(100%-32px)] w-[360px] overflow-y-auto rounded-[30px] border border-[#E4C88C]/80 bg-[#FFFDF8]/96 p-5 opacity-100 shadow-[0_24px_80px_rgba(80,52,20,0.24)] transition-transform duration-150 md:block"
          style={{ transform: `translate3d(${position.x}px, ${position.y}px, 0)` }}
        >
          <span
            className={cn(
              "absolute h-4 w-4 rotate-45 border border-[#E9D9BE] bg-[#FFFDF8]/96",
              position.placement === "above" && "-bottom-2 left-1/2 -translate-x-1/2 border-l-0 border-t-0",
              position.placement === "below" && "-top-2 left-1/2 -translate-x-1/2 border-b-0 border-r-0",
              position.placement === "right" && "-left-2 top-1/2 -translate-y-1/2 border-r-0 border-t-0",
              position.placement === "left" && "-right-2 top-1/2 -translate-y-1/2 border-b-0 border-l-0"
            )}
          />
          {card}
        </aside>
      ) : null}
      <aside className="fixed inset-x-3 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-40 max-h-[58dvh] overflow-y-auto rounded-[30px] border border-[#E4C88C]/80 bg-[#FFFDF8]/96 p-4 shadow-[0_22px_70px_rgba(80,52,20,0.2)] md:hidden">
        {card}
      </aside>
    </>
  );
}
