"use client";

import { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { EmptyStateCard, MovingBorder } from "@/components/ui/aceternity";

export function PremiumCard({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  className?: string;
}) {
  return (
    <MovingBorder {...props} wrapperClassName={cn("rounded-[28px] sm:rounded-[34px]", className)} className="luxury-card p-5 sm:p-6">
      {children}
    </MovingBorder>
  );
}

export function SectionHeader({
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
    <div className={cn("flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between", className)}>
      <div className="min-w-0">
        {eyebrow ? <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--gold)]">{eyebrow}</p> : null}
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.055em] text-[var(--text)] sm:text-5xl">{title}</h1>
        {description ? <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)] sm:text-base">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function StatusBadge({
  status,
  className
}: {
  status: string;
  className?: string;
}) {
  const normalized = status.toLowerCase();
  const live = ["live", "approved", "assigned", "active", "paid"].includes(normalized);
  const warning = ["scheduled", "pending", "starting-soon", "paused"].includes(normalized);
  const closed = ["ended", "completed", "cancelled", "rejected", "denied", "offline", "inactive", "failed"].includes(normalized);

  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-3 py-1 text-xs font-semibold capitalize",
        live && "border-emerald-200 bg-emerald-50 text-emerald-700",
        warning && "border-[#E9C98D] bg-[rgba(216,183,106,0.14)] text-[var(--gold)]",
        closed && "border-slate-200 bg-slate-100 text-slate-500",
        !live && !warning && !closed && "border-[color:var(--border)] bg-[var(--surface)] text-[var(--muted)]",
        className
      )}
    >
      {status}
    </span>
  );
}

export function PremiumMetricCard({
  label,
  value,
  helper,
  className
}: {
  label: string;
  value: string | number;
  helper?: string;
  className?: string;
}) {
  return (
    <div className={cn("rounded-[24px] border border-[color:var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-soft)]", className)}>
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--gold)]">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[var(--text)]">{value}</p>
      {helper ? <p className="mt-1 text-xs text-[var(--muted)]">{helper}</p> : null}
    </div>
  );
}

export function VendorBanner({
  image,
  logo,
  title,
  subtitle,
  className
}: {
  image?: string | null;
  logo?: string | null;
  title: string;
  subtitle?: string;
  className?: string;
}) {
  const initials = title
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "AE";

  return (
    <div
      className={cn("relative overflow-hidden rounded-[24px] border border-white/70 bg-gradient-to-br from-[#8A5A24] via-[#C59A4A] to-[#E95F45] p-4 text-white", className)}
      style={{
        backgroundImage: image
          ? `linear-gradient(110deg, rgba(23,18,12,0.74), rgba(138,90,36,0.5), rgba(233,95,69,0.32)), url("${image}")`
          : undefined,
        backgroundPosition: "center",
        backgroundSize: "cover"
      }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_16%,rgba(255,255,255,0.26),transparent_28%)]" />
      <div className="relative flex items-center gap-3">
        <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/70 bg-[#FFF7EB] text-sm font-black text-[#8A5A24]">
          <span>{initials}</span>
          {logo ? <img src={logo} alt={`${title} logo`} className="absolute inset-0 h-full w-full object-cover" /> : null}
        </div>
        <div className="min-w-0">
          <p className="truncate text-base font-semibold">{title}</p>
          {subtitle ? <p className="mt-0.5 truncate text-xs font-medium text-white/80">{subtitle}</p> : null}
        </div>
      </div>
    </div>
  );
}

export { EmptyStateCard };
