"use client";

import Link from "next/link";
import { Bell, Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme/theme-provider";
import { AppImage } from "@/components/ui/app-image";

type MobileTopBarProps = {
  title?: string;
  subtitle?: string;
  avatarSrc?: string;
  avatarAlt?: string;
  profileHref?: string;
};

export function MobileTopBar({
  title = "Ankita Designs",
  subtitle = "Exhibit • Connect • Sell",
  avatarSrc,
  avatarAlt = "Profile",
  profileHref = "/orders"
}: MobileTopBarProps) {
  const { theme, toggleTheme } = useTheme();
  const nextTheme = theme === "dark" ? "light" : "dark";

  return (
    <header className="sticky top-0 z-[60] border-b border-[color:var(--border)] bg-[var(--nav-bg)] px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] backdrop-blur-2xl">
      <div className="flex items-center gap-3">
        <Link href="/exhibitions" className="flex min-w-0 flex-1 items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-[color:var(--border)] bg-[var(--surface)] font-serif text-sm font-bold text-[var(--gold)] shadow-sm">
            AE
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-bold text-[var(--text)]">{title}</span>
            <span className="block truncate text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--gold)]">{subtitle}</span>
          </span>
        </Link>

        <button
          type="button"
          onClick={toggleTheme}
          className="grid h-11 w-11 place-items-center rounded-2xl border border-[color:var(--border)] bg-[var(--surface)] text-[var(--gold)] shadow-sm"
          aria-label={`Switch to ${nextTheme} mode`}
        >
          {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>
        <button type="button" className="relative grid h-11 w-11 place-items-center rounded-2xl border border-[color:var(--border)] bg-[var(--surface)] text-[var(--gold)] shadow-sm" aria-label="Notifications">
          <Bell className="h-5 w-5" />
          <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-[var(--coral)]" />
        </button>
        <Link href={profileHref} className="grid h-11 w-11 place-items-center overflow-hidden rounded-2xl border border-[color:var(--border)] bg-[var(--surface)] text-[var(--gold)] shadow-sm" aria-label={avatarAlt}>
          {avatarSrc ? <AppImage src={avatarSrc} alt={avatarAlt} className="h-full w-full rounded-2xl" fallbackSrc="/avatars/default-avatar.png" /> : <span className="font-serif font-bold">AE</span>}
        </Link>
      </div>
    </header>
  );
}
