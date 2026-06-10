"use client";

import { Clock3, Radio } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Exhibition } from "@/lib/types";
import { cn } from "@/lib/utils";

type Size = "sm" | "md";

function parseTime(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? null : date;
}

function formatDuration(milliseconds: number) {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000));
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${secs}s`;
  return `${secs}s`;
}

function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(intervalId);
  }, [intervalMs]);
  return now;
}

export function ExhibitionLiveCountdown({
  exhibition,
  className,
  size = "sm",
  showIcon = true
}: {
  exhibition: Pick<Exhibition, "status" | "startDate" | "endDate">;
  className?: string;
  size?: Size;
  showIcon?: boolean;
}) {
  const now = useNow();
  const start = useMemo(() => parseTime(exhibition.startDate), [exhibition.startDate]);
  const end = useMemo(() => parseTime(exhibition.endDate), [exhibition.endDate]);
  const isLiveByTime = Boolean(start && start.getTime() <= now && (!end || end.getTime() > now));
  const isLive = exhibition.status === "live" || isLiveByTime;
  const isUpcoming = exhibition.status === "scheduled" && Boolean(start && start.getTime() > now);
  const isEnded = exhibition.status === "ended" || Boolean(end && end.getTime() <= now);

  let label = "Schedule pending";
  let helper = "";
  let tone = "border-slate-200 bg-slate-100 text-slate-700 dark:border-white/10 dark:bg-white/10 dark:text-slate-200";

  if (isLive) {
    label = "Live Now";
    helper = start ? `Started ${formatDuration(now - start.getTime())} ago` : "Open for customers";
    tone = "border-emerald-200 bg-emerald-100 text-emerald-800 dark:border-emerald-400/30 dark:bg-emerald-500/15 dark:text-emerald-200";
  } else if (isUpcoming && start) {
    label = `Goes live in ${formatDuration(start.getTime() - now)}`;
    helper = "Upcoming exhibition";
    tone = "border-amber-200 bg-amber-100 text-amber-900 dark:border-amber-400/30 dark:bg-amber-500/15 dark:text-amber-100";
  } else if (isEnded) {
    label = "Ended";
    helper = end ? `Closed ${formatDuration(now - end.getTime())} ago` : "Exhibition closed";
  }

  return (
    <span
      className={cn(
        "inline-flex min-w-0 items-center gap-2 rounded-full border font-black",
        size === "md" ? "px-4 py-2 text-sm" : "px-3 py-1.5 text-xs",
        tone,
        className
      )}
      title={helper || label}
    >
      {showIcon ? <Clock3 className={cn("shrink-0", size === "md" ? "h-4 w-4" : "h-3.5 w-3.5")} /> : null}
      <span className="truncate">{label}</span>
    </span>
  );
}

export function LiveElapsedCounter({
  startedAt,
  status = "live",
  label = "Live for",
  className,
  size = "sm"
}: {
  startedAt?: string | null;
  status?: string | null;
  label?: string;
  className?: string;
  size?: Size;
}) {
  const now = useNow();
  const started = useMemo(() => parseTime(startedAt), [startedAt]);
  const isLive = status === "live";
  const text = isLive && started ? `${label} ${formatDuration(now - started.getTime())}` : isLive ? "Live now" : "Not live";

  return (
    <span
      className={cn(
        "inline-flex min-w-0 items-center gap-2 rounded-full border border-emerald-200 bg-emerald-100 font-black text-emerald-800 dark:border-emerald-400/30 dark:bg-emerald-500/15 dark:text-emerald-200",
        size === "md" ? "px-4 py-2 text-sm" : "px-3 py-1.5 text-xs",
        !isLive && "border-slate-200 bg-slate-100 text-slate-700 dark:border-white/10 dark:bg-white/10 dark:text-slate-200",
        className
      )}
      title={started ? `Started at ${started.toLocaleString("en-IN")}` : text}
    >
      <Radio className={cn("shrink-0", isLive ? "animate-pulse" : "", size === "md" ? "h-4 w-4" : "h-3.5 w-3.5")} />
      <span className="truncate">{text}</span>
    </span>
  );
}
