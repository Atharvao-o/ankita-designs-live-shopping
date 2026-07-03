"use client";

import Link from "next/link";
import type { HTMLAttributes, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, PackageOpen } from "lucide-react";
import { buttonStyles } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
      <span className={cn("grid shrink-0 place-items-center rounded-full border border-[color:var(--border)] bg-[color:var(--gold)]/12 font-black text-[var(--gold)]", compact ? "h-10 w-10 text-sm" : "h-12 w-12 text-base")}>
        AD
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
    <div className={cn("flex flex-col items-center justify-center rounded-[var(--radius-card)] border border-dashed border-[color:var(--border)] bg-[var(--surface)] p-6 text-center", compact ? "min-h-[180px]" : "min-h-[260px]", className)}>
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
        <div key={index} className="min-h-28 animate-pulse rounded-[var(--radius-card)] border border-[color:var(--border)] bg-[var(--surface)]" />
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
    : ["pending", "scheduled", "available", "starting-soon", "paused"].includes(normalized)
      ? "border-[color:var(--warning)]/30 bg-[color:var(--warning)]/12 text-[var(--warning)]"
      : ["rejected", "denied", "failed", "cancelled", "ended", "inactive", "offline"].includes(normalized)
        ? "border-destructive/25 bg-destructive/10 text-destructive"
        : "app-status-pill";

  return <span className={cn("inline-flex min-h-7 shrink-0 items-center rounded-full border px-3 text-xs font-black capitalize", tone, className)}>{status}</span>;
}
