"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType, ReactNode } from "react";
import {
  Bell,
  Boxes,
  Home,
  LayoutDashboard,
  PackageOpen,
  ReceiptText,
  Search,
  Settings,
  ShoppingBag,
  Store,
  UserRound
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { AppImage } from "@/components/ui/app-image";
import { cn, formatPrice } from "@/lib/utils";
import type { Exhibition, Product, Stall, UserRole } from "@/lib/types";

type IconComponent = LucideIcon | ComponentType<{ className?: string }>;

export function PageShell({
  children,
  className,
  withBottomPadding = true
}: {
  children: ReactNode;
  className?: string;
  withBottomPadding?: boolean;
}) {
  return (
    <main className={cn("marketplace-page", withBottomPadding && "pb-24 md:pb-0", className)}>
      {children}
    </main>
  );
}

export function AppHeader({
  search,
  setSearch,
  onSearch,
  onCart,
  vendorHref = "/register?role=vendor"
}: {
  search?: string;
  setSearch?: (value: string) => void;
  onSearch?: () => void;
  onCart?: () => void;
  vendorHref?: string;
}) {
  const submit = () => {
    if (onSearch) {
      onSearch();
      return;
    }
    const query = search?.trim();
    window.location.href = query ? `/exhibitions?search=${encodeURIComponent(query)}` : "/exhibitions";
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card text-foreground shadow-[0_10px_32px_rgba(80,52,20,0.08)] dark:shadow-[0_12px_34px_rgba(0,0,0,0.28)]">
      <div className="marketplace-container flex items-center gap-2 py-3 sm:gap-3">
        <Link href="/" className="flex shrink-0 items-center gap-2" aria-label="Ankita Designs home">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-accent text-sm font-black text-accent-foreground shadow-sm ring-1 ring-border">
            AD
          </span>
          <span className="hidden leading-tight sm:block">
            <span className="block text-sm font-black text-foreground">Ankita Designs</span>
            <span className="block text-[11px] font-black uppercase tracking-[0.12em] text-primary">ExpoVerse</span>
          </span>
        </Link>

        <SearchBar
          value={search ?? ""}
          onChange={setSearch ?? (() => undefined)}
          onSubmit={submit}
          className="min-w-0 flex-1"
          placeholder="Search exhibitions, stalls, vendors, products"
        />

        <Link className="hidden min-h-10 items-center rounded-2xl border border-border bg-background px-4 text-sm font-black text-foreground transition hover:border-primary hover:bg-secondary md:inline-flex" href="/login">
          Login
        </Link>
        <Link className="hidden min-h-10 items-center rounded-2xl bg-accent px-4 text-sm font-black text-accent-foreground transition hover:brightness-95 lg:inline-flex" href={vendorHref}>
          Vendor
        </Link>
        <button type="button" onClick={onCart} className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-border bg-background text-foreground transition hover:border-primary hover:bg-secondary" aria-label="Open cart">
          <ShoppingBag className="h-5 w-5" />
        </button>
        <ThemeToggle />
        <button type="button" className="hidden h-10 w-10 shrink-0 place-items-center rounded-2xl border border-border bg-background text-foreground transition hover:border-primary hover:bg-secondary sm:grid" aria-label="Notifications">
          <Bell className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
}

export function SearchBar({
  value,
  onChange,
  onSubmit,
  placeholder,
  className
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder: string;
  className?: string;
}) {
  return (
    <label className={cn("relative block", className)}>
      <span className="sr-only">{placeholder}</span>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" aria-hidden />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") onSubmit();
        }}
        className="marketplace-input h-11 w-full rounded-2xl px-10 pr-3 text-sm font-semibold shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-ring sm:pr-24"
        placeholder={placeholder}
      />
      <button type="button" onClick={onSubmit} className="absolute right-1.5 top-1/2 hidden h-8 -translate-y-1/2 rounded-xl bg-primary px-4 text-xs font-black text-primary-foreground transition hover:brightness-105 sm:block">
        Search
      </button>
    </label>
  );
}

export function CategoryStrip({ items }: { items: Array<{ label: string; href: string }> }) {
  return (
    <nav className="border-b border-border bg-background" aria-label="Marketplace categories">
      <div className="marketplace-container flex gap-2 overflow-x-auto py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((item) => (
          <Link
            key={`${item.href}-${item.label}`}
            href={item.href}
            className="shrink-0 rounded-full border border-border bg-card px-3 py-2 text-xs font-black text-muted-foreground shadow-sm transition hover:border-primary hover:bg-secondary hover:text-secondary-foreground sm:text-sm"
          >
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  actionHref,
  actionLabel = "View all",
  description,
  className
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actionHref?: string;
  actionLabel?: string;
  className?: string;
}) {
  return (
    <div className={cn("mb-4 flex items-end justify-between gap-4", className)}>
      <div className="min-w-0">
        {eyebrow ? <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">{eyebrow}</p> : null}
        <h2 className="mt-1 text-xl font-black tracking-[-0.035em] text-foreground sm:text-2xl">{title}</h2>
        {description ? <p className="mt-1 max-w-2xl text-sm font-semibold leading-6 text-muted-foreground">{description}</p> : null}
      </div>
      {actionHref ? (
        <Link href={actionHref} className="shrink-0 text-sm font-black text-primary transition hover:opacity-80">
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}

export function MarketplaceBanner({
  title,
  subtitle,
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
  image
}: {
  title: string;
  subtitle: string;
  primaryHref: string;
  primaryLabel: string;
  secondaryHref?: string;
  secondaryLabel?: string;
  image?: string;
}) {
  return (
    <section className="relative overflow-hidden rounded-[28px] border border-border bg-card text-card-foreground shadow-soft">
      <div
        className="absolute inset-0 opacity-90"
        style={{
          backgroundImage: image
            ? `linear-gradient(90deg, rgba(16,14,22,0.92), rgba(16,14,22,0.62), rgba(16,14,22,0.18)), url("${image}")`
            : "radial-gradient(circle at 80% 15%, color-mix(in srgb, var(--accent) 30%, transparent), transparent 28%), linear-gradient(135deg, var(--card), var(--muted-surface))",
          backgroundPosition: "center",
          backgroundSize: "cover"
        }}
      />
      <div className="relative p-5 sm:p-8 lg:p-10">
        <p className="inline-flex rounded-full bg-accent px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-accent-foreground">
          Live exhibition marketplace
        </p>
        <h1 className="mt-5 max-w-2xl text-3xl font-black leading-[0.98] tracking-[-0.06em] text-white sm:text-5xl">
          {title}
        </h1>
        <p className="mt-4 max-w-xl text-sm font-bold leading-6 text-white/86 sm:text-base">{subtitle}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href={primaryHref} className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-primary px-5 text-sm font-black text-primary-foreground transition hover:brightness-105">
            {primaryLabel}
          </Link>
          {secondaryHref && secondaryLabel ? (
            <Link href={secondaryHref} className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-white bg-white px-5 text-sm font-black text-[#18131f] transition hover:bg-[#fff1c7]">
              {secondaryLabel}
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export function StatusBadge({ status, className }: { status?: string | null; className?: string }) {
  const normalized = (status || "offline").toLowerCase();
  const live = ["live", "active", "approved", "paid", "fulfilled"].includes(normalized);
  const warning = ["scheduled", "upcoming", "pending", "break", "busy", "placed", "packed"].includes(normalized);
  const closed = ["ended", "completed", "cancelled", "rejected", "offline", "failed", "withdrawn"].includes(normalized);

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-black capitalize",
        live && "border-emerald-200 bg-emerald-100 text-emerald-800 dark:border-emerald-400/30 dark:bg-emerald-500/15 dark:text-emerald-200",
        warning && "border-amber-200 bg-amber-100 text-amber-900 dark:border-amber-400/30 dark:bg-amber-500/15 dark:text-amber-100",
        closed && "border-border bg-muted text-muted-foreground",
        !live && !warning && !closed && "border-border bg-muted text-muted-foreground",
        className
      )}
    >
      {normalized.replace(/_/g, " ")}
    </span>
  );
}

export function EmptyState({
  title,
  description,
  actionHref,
  actionLabel
}: {
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="marketplace-card rounded-[28px] border-dashed p-8 text-center">
      <PackageOpen className="mx-auto h-10 w-10 text-primary" aria-hidden />
      <h3 className="mt-4 text-xl font-black tracking-[-0.03em] text-foreground">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm font-semibold leading-6 text-muted-foreground">{description}</p>
      {actionHref && actionLabel ? (
        <Link href={actionHref} className="mt-5 inline-flex min-h-11 items-center justify-center rounded-2xl bg-primary px-5 text-sm font-black text-primary-foreground">
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}

export function CategoryCard({
  name,
  href,
  icon: Icon
}: {
  name: string;
  href: string;
  icon: IconComponent;
}) {
  return (
    <Link href={href} className="marketplace-card group rounded-[24px] p-3 text-center transition hover:-translate-y-0.5 hover:border-primary">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-secondary text-secondary-foreground transition group-hover:bg-accent group-hover:text-accent-foreground">
        <Icon className="h-6 w-6" aria-hidden />
      </div>
      <p className="mt-3 text-sm font-black text-foreground">{name}</p>
      <p className="mt-1 text-xs font-bold text-muted-foreground">Explore now</p>
    </Link>
  );
}

export function ExhibitionCard({ exhibition }: { exhibition: Exhibition }) {
  const stallCount = exhibition.stallCount ?? exhibition.stall_count ?? 0;
  const isEnded = exhibition.status === "ended";
  const href = `/exhibition/${exhibition.id}`;
  const description = isEnded ? "Exhibition has ended. Live shopping and stall entry are closed." : exhibition.description || "Enter the exhibition and explore verified vendor stalls.";

  return (
    <article className="marketplace-card overflow-hidden rounded-[22px] transition hover:border-primary hover:shadow-strong md:rounded-[26px] md:hover:-translate-y-1">
      <Link href={href} className="flex min-h-[132px] gap-3 p-3 md:hidden">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <StatusBadge status={exhibition.status} className="px-2.5 py-0.5 text-[11px]" />
            <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-black text-secondary-foreground">{stallCount} stalls</span>
          </div>
          <h3 className="line-clamp-1 text-base font-black leading-5 tracking-[-0.02em] text-foreground">{exhibition.title}</h3>
          <p className="mt-1 line-clamp-2 text-xs font-semibold leading-5 text-muted-foreground">{description}</p>
          <p className="mt-2 inline-flex rounded-full bg-muted px-2.5 py-1 text-[11px] font-black text-muted-foreground">Verified vendors</p>
        </div>
        <span className="grid w-[112px] shrink-0 place-items-center self-stretch rounded-2xl bg-primary px-3 text-center text-xs font-black leading-4 text-primary-foreground">
          {isEnded ? "View Ended" : "Enter Exhibition"}
        </span>
      </Link>

      <div className="hidden md:block">
        <div className="relative aspect-[16/10] bg-muted">
        <AppImage src={exhibition.bannerImage || "/stalls/stall-placeholder.png"} alt={`${exhibition.title} banner`} fallbackSrc="/stalls/stall-placeholder.png" className="absolute inset-0 h-full w-full rounded-none object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/68 via-black/8 to-transparent" />
        <StatusBadge status={exhibition.status} className="absolute left-3 top-3" />
        </div>
        <div className="p-4">
          <h3 className="line-clamp-2 min-h-12 text-lg font-black leading-6 tracking-[-0.03em] text-foreground">{exhibition.title}</h3>
          <p className="mt-2 line-clamp-2 min-h-10 text-sm font-semibold leading-5 text-muted-foreground">{description}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-full bg-secondary px-3 py-1 text-xs font-black text-secondary-foreground">{stallCount} stalls</span>
            <span className="rounded-full bg-muted px-3 py-1 text-xs font-black text-muted-foreground">Verified vendors</span>
          </div>
          <Link href={href} className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-2xl bg-primary px-4 text-sm font-black text-primary-foreground transition hover:brightness-105">
            {isEnded ? "View Ended Exhibition" : "Enter Exhibition"}
          </Link>
        </div>
      </div>
    </article>
  );
}

export function StallCard({ stall }: { stall: Stall }) {
  const status = stall.liveStatus || stall.status || "offline";
  const banner = stall.bannerImage || stall.featuredImage || stall.image || "/stalls/stall-placeholder.png";
  const vendorName = stall.vendorName || stall.assignedVendorName || stall.name || "Vendor Stall";
  const href = `/stalls/${stall.id}/store`;

  return (
    <article className="marketplace-card overflow-hidden rounded-[22px] transition hover:border-primary hover:shadow-strong md:rounded-[26px] md:hover:-translate-y-1">
      <Link href={href} className="flex min-h-[118px] gap-3 p-3 md:hidden">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <StatusBadge status={status} className="px-2.5 py-0.5 text-[11px]" />
            {stall.isFeatured ? <span className="rounded-full bg-destructive px-2.5 py-0.5 text-[11px] font-black text-destructive-foreground">Offer</span> : null}
          </div>
          <h3 className="line-clamp-1 text-base font-black leading-5 tracking-[-0.02em] text-foreground">{vendorName}</h3>
          <p className="mt-1 line-clamp-1 text-xs font-semibold text-muted-foreground">{stall.category || "General"}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-black text-secondary-foreground">{stall.productCount ?? 0} products</span>
            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-black text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200">Verified</span>
          </div>
        </div>
        <span className="grid w-[96px] shrink-0 place-items-center self-stretch rounded-2xl bg-primary px-3 text-center text-xs font-black leading-4 text-primary-foreground">
          Enter Stall
        </span>
      </Link>

      <div className="hidden md:block">
        <div className="relative aspect-[16/9] bg-muted">
        <AppImage src={banner} alt={`${vendorName} stall banner`} fallbackSrc="/stalls/stall-placeholder.png" className="absolute inset-0 h-full w-full rounded-none object-cover" />
        <StatusBadge status={status} className="absolute left-3 top-3" />
        {stall.isFeatured ? <span className="absolute right-3 top-3 rounded-full bg-destructive px-3 py-1 text-xs font-black text-destructive-foreground">Offer</span> : null}
        </div>
        <div className="p-4">
          <h3 className="truncate text-base font-black text-foreground">{vendorName}</h3>
          <p className="mt-1 text-sm font-semibold text-muted-foreground">{stall.category || "General"}</p>
          <div className="mt-3 flex items-center justify-between gap-2">
            <span className="rounded-full bg-secondary px-3 py-1 text-xs font-black text-secondary-foreground">{stall.productCount ?? 0} products</span>
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200">Verified</span>
          </div>
          <Link href={href} className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-2xl bg-primary px-4 text-sm font-black text-primary-foreground transition hover:brightness-105">
            Enter Stall
          </Link>
        </div>
      </div>
    </article>
  );
}

export function ProductCard({ product }: { product: Product }) {
  const discount = product.compareAtPrice > product.price ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100) : 0;

  return (
    <article className="marketplace-card overflow-hidden rounded-[24px] transition hover:-translate-y-1 hover:border-primary hover:shadow-strong">
      <div className="relative aspect-[4/5] bg-muted">
        <AppImage src={product.images[0] || "/products/product-placeholder.png"} alt={product.title} fallbackSrc="/products/product-placeholder.png" className="absolute inset-0 h-full w-full rounded-none object-cover" />
        {discount ? <span className="absolute left-2 top-2 rounded-full bg-destructive px-2.5 py-1 text-[11px] font-black text-destructive-foreground">{discount}% off</span> : null}
      </div>
      <div className="p-3">
        <h3 className="line-clamp-2 min-h-10 text-sm font-black leading-5 text-foreground">{product.title}</h3>
        <div className="mt-2 flex flex-wrap items-end gap-2">
          <p className="text-base font-black text-foreground">{formatPrice(product.price)}</p>
          {discount ? <p className="text-xs font-bold text-muted-foreground line-through">{formatPrice(product.compareAtPrice)}</p> : null}
        </div>
        <Link href={`/stalls/${product.stallId}/store`} className="mt-3 inline-flex min-h-10 w-full items-center justify-center rounded-2xl border border-border bg-secondary px-3 text-sm font-black text-secondary-foreground transition hover:bg-accent hover:text-accent-foreground">
          View
        </Link>
      </div>
    </article>
  );
}

export function DashboardStatCard({
  label,
  value,
  helper,
  icon: Icon
}: {
  label: string;
  value: string | number;
  helper?: string;
  icon?: IconComponent;
}) {
  return (
    <div className="marketplace-card rounded-[26px] p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">{label}</p>
          <p className="mt-3 text-3xl font-black tracking-[-0.05em] text-foreground">{value}</p>
          {helper ? <p className="mt-1 text-sm font-semibold text-muted-foreground">{helper}</p> : null}
        </div>
        {Icon ? (
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-secondary text-secondary-foreground">
            <Icon className="h-5 w-5" aria-hidden />
          </div>
        ) : null}
      </div>
    </div>
  );
}

const customerNav = [
  { label: "Home", href: "/", icon: Home },
  { label: "Exhibitions", href: "/exhibitions", icon: Store },
  { label: "Orders", href: "/orders", icon: ReceiptText },
  { label: "Cart", href: "/cart", icon: ShoppingBag },
  { label: "Settings", href: "/settings", icon: Settings }
];

const vendorNav = [
  { label: "Home", href: "/vendor", icon: LayoutDashboard },
  { label: "Exhibitions", href: "/vendor/exhibitions", icon: Store },
  { label: "Products", href: "/vendor/products", icon: Boxes },
  { label: "Orders", href: "/vendor/orders", icon: ReceiptText },
  { label: "Stall", href: "/vendor/stall", icon: UserRound }
];

export function MarketplaceBottomNav({ role = "user" }: { role?: Extract<UserRole, "user" | "vendor"> }) {
  const pathname = usePathname();
  const items = role === "vendor" ? vendorNav : customerNav;

  return (
    <nav aria-label={`${role} bottom navigation`} className="fixed inset-x-3 bottom-3 z-50 rounded-[28px] border border-border bg-card px-2 py-2 text-card-foreground shadow-strong md:hidden">
      <div className="grid grid-cols-5 gap-1">
        {items.map((item) => {
          const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(`${item.href}/`));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-h-12 flex-col items-center justify-center gap-1 rounded-2xl text-[11px] font-black text-muted-foreground transition",
                active && "bg-secondary text-secondary-foreground"
              )}
            >
              <Icon className="h-5 w-5" aria-hidden />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
