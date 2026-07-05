"use client";

import Link from "next/link";
import type { HTMLAttributes, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, BadgeCheck, PackageOpen, Radio, ShoppingBag, Sparkles } from "lucide-react";
import { AppImage } from "@/components/ui/app-image";
import { buttonStyles } from "@/components/ui/button";
import { cn, formatPrice } from "@/lib/utils";

export function AppBrand({
  context = "Social shopping",
  href = "/",
  compact = false,
  className
}: {
  context?: string;
  href?: string;
  compact?: boolean;
  className?: string;
}) {
  return (
    <Link href={href} className={cn("flex min-w-0 items-center gap-3", className)} aria-label="Ankita Designs home">
      <span className={cn("ad-monogram grid shrink-0 place-items-center rounded-full font-black", compact ? "h-10 w-10 text-sm" : "h-12 w-12 text-base")}>
        <span>AD</span>
      </span>
      <span className="min-w-0 leading-tight">
        <span className={cn("block truncate font-black text-foreground", compact ? "text-sm" : "text-base")}>Ankita Designs</span>
        <span className="block truncate text-[10px] font-black uppercase text-[var(--gold)]">{context}</span>
      </span>
    </Link>
  );
}

export function AppCard({
  children,
  className,
  flat = false,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  flat?: boolean;
}) {
  return (
    <div {...props} className={cn(flat ? "app-card-flat" : "app-card", className)}>
      {children}
    </div>
  );
}

export function AppSectionTitle({
  eyebrow,
  title,
  description,
  action,
  className
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between", className)}>
      <div className="min-w-0">
        {eyebrow ? <p className="app-section-eyebrow">{eyebrow}</p> : null}
        <h1 className="mt-2 text-3xl font-black leading-tight text-foreground sm:text-4xl">{title}</h1>
        {description ? <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function AppStatCard({
  label,
  value,
  helper,
  icon: Icon,
  compact = false,
  className
}: {
  label: string;
  value: string | number;
  helper?: string;
  icon?: LucideIcon;
  compact?: boolean;
  className?: string;
}) {
  return (
    <AppCard flat className={cn(compact ? "p-3" : "p-4", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-black uppercase text-muted-foreground">{label}</p>
          <p className={cn("mt-2 break-words font-black leading-tight text-foreground", compact ? "text-xl" : "text-2xl")}>{value}</p>
        </div>
        {Icon ? (
          <span className={cn("grid shrink-0 place-items-center rounded-2xl bg-[color:var(--gold)]/12 text-[var(--gold)]", compact ? "h-9 w-9" : "h-11 w-11")}>
            <Icon className={compact ? "h-4 w-4" : "h-5 w-5"} />
          </span>
        ) : null}
      </div>
      {helper ? <p className={cn("mt-2 leading-5 text-muted-foreground", compact ? "text-xs" : "text-sm")}>{helper}</p> : null}
    </AppCard>
  );
}

export function AppEmptyState({
  icon: Icon = PackageOpen,
  title,
  description,
  actionHref,
  actionLabel,
  secondaryHref,
  secondaryLabel,
  compact = false,
  className
}: {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
  compact?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("app-slide-in flex flex-col items-center justify-center rounded-[var(--radius-card)] border border-dashed border-[color:var(--border)] bg-[var(--surface)] p-6 text-center", compact ? "min-h-[180px]" : "min-h-[260px]", className)}>
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-[color:var(--gold)]/12 text-[var(--gold)]">
        <Icon className="h-6 w-6" />
      </span>
      <h3 className="mt-4 text-lg font-black text-foreground">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">{description}</p>
      {actionHref && actionLabel ? (
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <Link href={actionHref} className={buttonStyles("primary", "justify-center px-5 py-3 text-sm")}>
            {actionLabel}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
          {secondaryHref && secondaryLabel ? (
            <Link href={secondaryHref} className={buttonStyles("secondary", "justify-center px-5 py-3 text-sm")}>
              {secondaryLabel}
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function AppLoadingState({ rows = 3, className = "" }: { rows?: number; className?: string }) {
  return (
    <div className={cn("grid gap-3", className)}>
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="app-skeleton min-h-28 rounded-[var(--radius-card)] border border-[color:var(--border)]" />
      ))}
    </div>
  );
}

export function AppStatusPill({
  status,
  className
}: {
  status: string;
  className?: string;
}) {
  const normalized = status.toLowerCase();
  const tone = ["live", "active", "approved", "accepted", "paid", "assigned"].includes(normalized)
    ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200"
    : ["pending", "scheduled", "available", "starting-soon", "paused", "changes_requested", "changes requested"].includes(normalized)
      ? "border-[color:var(--warning)]/30 bg-[color:var(--warning)]/12 text-[var(--warning)]"
      : ["rejected", "denied", "failed", "cancelled", "ended", "inactive", "offline"].includes(normalized)
        ? "border-destructive/25 bg-destructive/10 text-destructive"
        : "app-status-pill";

  return <span className={cn("inline-flex min-h-7 shrink-0 items-center rounded-full border px-3 text-xs font-black capitalize", tone, className)}>{status}</span>;
}

export function LiveBadge({
  label = "Live now",
  className
}: {
  label?: string;
  className?: string;
}) {
  return <span className={cn("live-badge", className)}>{label}</span>;
}

export function StoryCircle({
  href,
  image,
  title,
  subtitle,
  live = false,
  className
}: {
  href: string;
  image?: string | null;
  title: string;
  subtitle?: string;
  live?: boolean;
  className?: string;
}) {
  return (
    <Link href={href} className={cn("group w-[64px] shrink-0 snap-start text-center sm:w-[82px]", className)}>
      <span className={cn("mx-auto grid h-16 w-16 place-items-center rounded-full p-[3px] transition group-hover:-translate-y-1 sm:h-[74px] sm:w-[74px]", live ? "story-ring-live" : "story-ring")}>
        <span className="relative h-full w-full overflow-hidden rounded-full bg-muted">
          <AppImage src={image || "/stalls/stall-placeholder.png"} alt={title} fallbackSrc="/stalls/stall-placeholder.png" className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
          {live ? <span className="absolute inset-x-1 bottom-1 rounded-full bg-[var(--live)] px-1 py-0.5 text-[8px] font-black uppercase text-[var(--live-foreground)]">Live</span> : null}
        </span>
      </span>
      <span className="mt-2 block truncate text-[10px] font-black text-foreground sm:text-[11px]">{title}</span>
      {subtitle ? <span className="block truncate text-[9px] font-semibold text-muted-foreground sm:text-[10px]">{subtitle}</span> : null}
    </Link>
  );
}

export function PremiumProductCard({
  href,
  image,
  title,
  price,
  compareAtPrice,
  vendorName,
  badge,
  stockLabel,
  action,
  className
}: {
  href: string;
  image?: string | null;
  title: string;
  price?: number | string;
  compareAtPrice?: number | string;
  vendorName?: string;
  badge?: string;
  stockLabel?: string;
  action?: ReactNode;
  className?: string;
}) {
  const priceText = typeof price === "number" ? formatPrice(price) : price;
  const compareText = typeof compareAtPrice === "number" ? formatPrice(compareAtPrice) : compareAtPrice;

  return (
    <article className={cn("premium-product-card app-hover-lift app-slide-in", className)}>
      <Link href={href} className="block">
        <div className="relative aspect-[4/5] overflow-hidden bg-muted">
          <AppImage src={image || "/products/product-placeholder.png"} alt={title} fallbackSrc="/products/product-placeholder.png" className="absolute inset-0 h-full w-full rounded-none object-cover transition duration-500 hover:scale-105" />
          {badge ? <span className="absolute left-3 top-3 rounded-full bg-primary px-3 py-1 text-[11px] font-black text-primary-foreground shadow-[var(--shadow-card)]">{badge}</span> : null}
          {stockLabel ? <span className="absolute bottom-3 left-3 rounded-full bg-black/72 px-3 py-1 text-[11px] font-black text-white">{stockLabel}</span> : null}
        </div>
      </Link>
      <div className="grid gap-2 p-3">
        {vendorName ? <p className="line-clamp-1 text-[11px] font-black uppercase text-[var(--gold)]">{vendorName}</p> : null}
        <Link href={href} className="line-clamp-2 min-h-10 text-sm font-black leading-5 text-foreground transition hover:text-primary">
          {title}
        </Link>
        <div className="flex min-w-0 items-center gap-2">
          {priceText ? <span className="truncate text-base font-black text-foreground">{priceText}</span> : null}
          {compareText ? <span className="truncate text-xs font-bold text-muted-foreground line-through">{compareText}</span> : null}
        </div>
        {action ? <div className="pt-1">{action}</div> : null}
      </div>
    </article>
  );
}

export function ProductRail({
  eyebrow,
  title,
  description,
  action,
  children,
  className
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("app-card app-slide-in p-4", className)}>
      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0">
          {eyebrow ? <p className="app-section-eyebrow">{eyebrow}</p> : null}
          <h2 className="mt-1 text-xl font-black text-foreground">{title}</h2>
          {description ? <p className="mt-1 text-sm font-semibold text-muted-foreground">{description}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className="app-no-scrollbar mt-4 flex gap-3 overflow-x-auto pb-1">
        {children}
      </div>
    </section>
  );
}

export function VendorBoutiqueHeader({
  banner,
  logo,
  title,
  category,
  description,
  stats,
  actions,
  live = false,
  className
}: {
  banner?: string | null;
  logo?: string | null;
  title: string;
  category?: string;
  description?: string;
  stats?: Array<{ label: string; value: string | number }>;
  actions?: ReactNode;
  live?: boolean;
  className?: string;
}) {
  return (
    <section className={cn("boutique-header app-slide-in", className)}>
      {banner ? <AppImage src={banner} alt={title} fallbackSrc="/stalls/stall-placeholder.png" className="absolute inset-0 h-full w-full rounded-none object-cover opacity-42" /> : null}
      <div className="absolute inset-0 bg-gradient-to-t from-black/82 via-black/54 to-black/18" />
      <div className="relative z-10 grid gap-5 p-5 sm:p-7">
        <div className="flex flex-wrap items-center gap-3">
          <span className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-full border border-white/28 bg-white/12 text-2xl font-black text-white shadow-[var(--shadow-card)]">
            {logo ? <AppImage src={logo} alt={`${title} logo`} fallbackSrc="/avatars/default-avatar.png" className="h-full w-full object-cover" /> : title.slice(0, 1).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              {category ? <span className="rounded-full border border-white/18 bg-white/10 px-3 py-1 text-[11px] font-black uppercase text-white/82">{category}</span> : null}
              <span className="inline-flex items-center gap-1 rounded-full border border-white/18 bg-white/10 px-3 py-1 text-[11px] font-black uppercase text-white/82">
                <BadgeCheck className="h-3.5 w-3.5" />
                Verified stall
              </span>
              {live ? <LiveBadge /> : null}
            </div>
            <h1 className="mt-3 text-3xl font-black leading-tight text-white sm:text-5xl">{title}</h1>
            {description ? <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-white/76">{description}</p> : null}
          </div>
        </div>
        {stats?.length || actions ? (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            {stats?.length ? (
              <div className="grid grid-cols-3 gap-2 sm:min-w-[360px]">
                {stats.map((item) => (
                  <div key={item.label} className="rounded-2xl border border-white/14 bg-white/10 px-3 py-2 text-center">
                    <p className="text-lg font-black text-white">{item.value}</p>
                    <p className="text-[10px] font-bold uppercase text-white/60">{item.label}</p>
                  </div>
                ))}
              </div>
            ) : null}
            {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}

export function FloatingActionBar({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("floating-action-bar app-slide-in flex items-center justify-center gap-2 px-3 py-2", className)}>{children}</div>;
}

export function DashboardStatCard(props: Parameters<typeof AppStatCard>[0]) {
  return <AppStatCard {...props} className={cn("app-hover-lift", props.className)} />;
}

export function LiveStageBadge({ viewers }: { viewers?: number }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/14 bg-black/54 px-3 py-1.5 text-xs font-black text-white">
      <Radio className="h-3.5 w-3.5 text-[var(--live)]" />
      {viewers ? `${viewers} watching` : "Live stage"}
    </span>
  );
}

export function QuickShopBadge({ label = "Quick shop" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-[color:var(--gold)]/14 px-3 py-1.5 text-xs font-black text-[var(--gold)]">
      <ShoppingBag className="h-3.5 w-3.5" />
      {label}
    </span>
  );
}

export function ImmersiveKicker({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-black uppercase text-[var(--gold)]">
      <Sparkles className="h-3.5 w-3.5" />
      {children}
    </span>
  );
}
