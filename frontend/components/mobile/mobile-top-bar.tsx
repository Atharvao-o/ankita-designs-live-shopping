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
  subtitle = "Exhibit | Connect | Sell",
  avatarSrc,
  avatarAlt = "Profile",
  profileHref = "/orders"
}: MobileTopBarProps) {
  const { theme, toggleTheme } = useTheme();
  const nextTheme = theme === "dark" ? "light" : "dark";

  return (
    <header className="app-topbar sticky top-0 z-[60] border-b px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))]">
      <div className="flex items-center gap-3">
        <Link href="/exhibitions" className="flex min-w-0 flex-1 items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-[color:var(--border)] bg-[color:var(--gold)]/12 text-sm font-black text-[var(--gold)] shadow-sm">
            AD
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-black text-foreground">{title}</span>
            <span className="block truncate text-[10px] font-black uppercase text-[var(--gold)]">{subtitle}</span>
          </span>
        </Link>

        <button
          type="button"
          onClick={toggleTheme}
          className="app-icon-button h-11 w-11"
          aria-label={`Switch to ${nextTheme} mode`}
        >
          {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>
        <button type="button" className="app-icon-button relative h-11 w-11" aria-label="Notifications">
          <Bell className="h-5 w-5" />
          <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-[var(--coral)]" />
        </button>
        <Link href={profileHref} className="app-icon-button h-11 w-11 overflow-hidden" aria-label={avatarAlt}>
          {avatarSrc ? <AppImage src={avatarSrc} alt={avatarAlt} className="h-full w-full rounded-2xl" fallbackSrc="/avatars/default-avatar.png" /> : <span className="font-black">AD</span>}
        </Link>
      </div>
    </header>
  );
}
