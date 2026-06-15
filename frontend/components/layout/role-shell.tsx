"use client";

import Link from "next/link";
import { BarChart3, Bell, Boxes, ExternalLink, FileText, GalleryHorizontal, LayoutDashboard, LogOut, Menu, Search, ShoppingBag, Store, UserRound, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useExpoStore } from "@/lib/cart-store";
import { UserRole } from "@/lib/types";
import { buttonStyles } from "@/components/ui/button";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { AuroraBackground } from "@/components/ui/aceternity";
import { MobileBottomNav } from "@/components/mobile/mobile-bottom-nav";
import { MobileTopBar } from "@/components/mobile/mobile-top-bar";
import { ResponsiveDeviceView } from "@/components/mobile/responsive-device-view";
import { TutorialAdminControls } from "@/components/tutorial/ReplayTutorialButton";
import { ThemeToggle } from "@/components/theme/theme-toggle";

const navByRole: Record<UserRole, Array<{ label: string; href: string; tourId?: string }>> = {
  admin: [
    { label: "Dashboard", href: "/admin" },
    { label: "Feed", href: "/admin/feed" },
    { label: "Products", href: "/admin/products" },
    { label: "Exhibitions", href: "/admin/exhibitions" },
    { label: "Advertisements", href: "/admin/advertisements" },
    { label: "Vendors", href: "/admin/vendors" },
    { label: "Stalls", href: "/admin/stalls" },
    { label: "Orders", href: "/admin/orders" },
    { label: "Analytics", href: "/admin/analytics" }
  ],
  vendor: [
    { label: "Dashboard", href: "/vendor" },
    { label: "Profile", href: "/vendor/profile" },
    { label: "Posts", href: "/vendor/posts" },
    { label: "Exhibitions", href: "/vendor/exhibitions" },
    { label: "Stall", href: "/vendor/stall" },
    { label: "Products", href: "/vendor/products" },
    { label: "Orders", href: "/vendor/orders" }
  ],
  user: [
    { label: "Live Stalls", href: "/exhibitions" },
    { label: "Cart", href: "/cart" },
    { label: "Orders", href: "/orders" }
  ]
};

const adminNavItems: Array<{ label: string; href: string; icon: LucideIcon; tourId?: string }> = [
  { label: "Overview", href: "/admin", icon: LayoutDashboard },
  { label: "Feed", href: "/admin/feed", icon: FileText },
  { label: "Products", href: "/admin/products", icon: Boxes },
  { label: "Exhibitions", href: "/admin/exhibitions", icon: Store },
  { label: "Advertisements", href: "/admin/advertisements", icon: GalleryHorizontal },
  { label: "Stalls", href: "/admin/stalls", icon: Boxes },
  { label: "Vendors", href: "/admin/vendors", icon: Users },
  { label: "Orders", href: "/admin/orders", icon: ShoppingBag },
  { label: "Analytics", href: "/admin/analytics", icon: BarChart3 }
];

export function RoleShell({
  role,
  title,
  children
}: {
  role: UserRole;
  title: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [adminDrawerOpen, setAdminDrawerOpen] = useState(false);
  const currentUser = useExpoStore((state) => state.currentUser);
  const logout = useExpoStore((state) => state.logout);
  const doLogout = () => {
    logout();
    router.push("/login");
  };

  if (role === "admin") {
    return (
      <ProtectedRoute role={role}>
        <main className="theme-transition relative min-h-screen overflow-x-hidden bg-background text-foreground lg:grid lg:grid-cols-[292px_minmax(0,1fr)]">
          <AdminSidebar pathname={pathname} currentUserName={currentUser?.name ?? "Admin"} onLogout={doLogout} className="hidden lg:flex" />

          {adminDrawerOpen ? (
            <div className="fixed inset-0 z-[90] lg:hidden" role="dialog" aria-modal="true" aria-label="Admin navigation">
              <button type="button" aria-label="Close admin menu" onClick={() => setAdminDrawerOpen(false)} className="absolute inset-0 bg-[#070A0F]/55" />
              <AdminSidebar
                pathname={pathname}
                currentUserName={currentUser?.name ?? "Admin"}
                onLogout={doLogout}
                onNavigate={() => setAdminDrawerOpen(false)}
                className="relative z-10 flex h-full w-[min(88vw,320px)]"
              />
            </div>
          ) : null}

          <section className="relative z-10 min-w-0">
            <header className="sticky top-0 z-40 border-b border-border bg-card">
              <div className="flex min-h-[76px] items-center gap-3 px-3 sm:px-5 xl:px-8">
                <button
                  type="button"
                  onClick={() => setAdminDrawerOpen(true)}
                  className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[color:var(--border)] bg-[var(--surface)] text-[var(--gold)] shadow-sm lg:hidden"
                  aria-label="Open admin menu"
                >
                  <Menu className="h-5 w-5" />
                </button>
                <label className="relative hidden min-w-0 flex-1 md:block">
                  <span className="sr-only">Search admin dashboard</span>
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--gold)]" />
                  <input
                    placeholder="Search exhibitions, vendors, stalls..."
                    className="luxury-input h-12 w-full rounded-2xl px-11 text-sm"
                  />
                </label>
                <div className="ml-auto flex items-center gap-2 sm:gap-3">
                  <ThemeToggle />
                  <button type="button" className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-border bg-card text-primary shadow-sm" aria-label="Notifications">
                    <Bell className="h-5 w-5" />
                  </button>
                  <Link href="/" className={buttonStyles("secondary", "hidden min-h-11 px-4 py-2.5 sm:inline-flex")}>
                    Visit Site
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </Link>
                  <TutorialAdminControls />
                  <div className="hidden items-center gap-3 rounded-2xl border border-border bg-card px-3 py-2 shadow-sm sm:flex">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-sm font-bold text-secondary-foreground">AE</span>
                    <span>
                      <span className="block text-sm font-semibold text-foreground">{currentUser?.name ?? "Admin"}</span>
                      <span className="block text-xs text-muted-foreground">Admin</span>
                    </span>
                  </div>
                </div>
              </div>
              <div className="px-3 pb-3 md:hidden">
                <label className="relative block">
                  <span className="sr-only">Search admin dashboard</span>
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--gold)]" />
                  <input placeholder="Search dashboard..." className="luxury-input h-12 w-full rounded-2xl px-11 text-sm" />
                </label>
              </div>
            </header>
            {children}
          </section>
        </main>
      </ProtectedRoute>
    );
  }

  const isActiveNav = (href: string) => (href === "/vendor" ? pathname === href : pathname.startsWith(href));

  return (
    <ProtectedRoute role={role}>
      <AuroraBackground className="theme-transition min-h-screen overflow-x-hidden bg-background text-foreground">
      <ResponsiveDeviceView
        mobile={
          <MobileTopBar
            title="Ankita Designs"
            subtitle={role === "vendor" ? "Vendor Workspace" : "Live Shopping"}
            avatarAlt={currentUser?.name ?? "Profile"}
            profileHref={role === "vendor" ? "/vendor/stall" : "/orders"}
          />
        }
      />
      <ResponsiveDeviceView
        desktop={
      <header className="sticky top-0 z-40 border-b border-border bg-card">
        <div className="flex min-h-16 items-center justify-between gap-3 px-3 sm:px-5">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#D7BE86] bg-[#F7F1E8] text-xs font-serif font-bold text-[#8A5A24] shadow-sm dark:border-[#D6AC63]/35 dark:bg-[#D6AC63]/10 dark:text-[#F4C879] sm:h-11 sm:w-11 sm:text-sm">
              AE
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-[#1B1A17] dark:text-[#FFF8EA]">Ankita Designs</span>
              <span className="block text-xs uppercase tracking-[0.16em] text-[#B88A3D] dark:text-[#D6AC63]">{title}</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-2 lg:flex">
            {navByRole[role].map((item) => {
              const active = isActiveNav(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  data-tour-id={item.tourId}
                  className={`min-h-10 rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                    active
                      ? "bg-[#F36B4F] text-white shadow-[0_16px_36px_rgba(243,107,79,0.22)]"
                      : "text-muted-foreground hover:bg-secondary hover:text-secondary-foreground"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle className="hidden sm:grid" />
            <span className="hidden text-sm text-muted-foreground sm:inline">{currentUser?.name ?? "Guest"}</span>
            <button
              type="button"
              onClick={doLogout}
              className={buttonStyles("secondary", "px-3 py-2 sm:px-4")}
            >
              <LogOut className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
        <nav className="flex gap-2 overflow-x-auto border-t border-[#E8DDCC] px-3 py-2 dark:border-white/10 lg:hidden">
          {navByRole[role].map((item) => {
            const active = isActiveNav(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                data-tour-id={item.tourId}
                className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold transition ${
                  active
                    ? "bg-[#F36B4F] text-white shadow-[0_14px_28px_rgba(243,107,79,0.2)]"
                    : "border border-border bg-card text-muted-foreground hover:bg-secondary hover:text-secondary-foreground"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>
        }
      />
        {children}
        {pathname === "/vendor/live" ? null : <ResponsiveDeviceView mobile={<MobileBottomNav role={role as Extract<UserRole, "user" | "vendor">} />} />}
      </AuroraBackground>
    </ProtectedRoute>
  );
}

function AdminSidebar({
  pathname,
  currentUserName,
  onLogout,
  onNavigate,
  className
}: {
  pathname: string;
  currentUserName: string;
  onLogout: () => void;
  onNavigate?: () => void;
  className?: string;
}) {
  return (
    <aside className={`flex min-h-screen flex-col border-r border-border bg-card p-5 text-card-foreground shadow-[24px_0_70px_rgba(128,91,44,0.12)] dark:shadow-[24px_0_80px_rgba(0,0,0,0.34)] ${className ?? ""}`}>
      <div className="flex items-center gap-3 px-1 py-2">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[#D7BE86] bg-[#F7F1E8] font-serif text-lg font-bold text-[#8A5A24] shadow-sm dark:border-[#D6AC63]/35 dark:bg-[#D6AC63]/10 dark:text-[#F4C879]">
          AE
        </span>
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold text-[#1B1A17] dark:text-[#FFFDF8]">Ankita Designs</p>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#B88A3D] dark:text-[#D6AC63]">Admin Panel</p>
        </div>
      </div>

      <nav className="mt-8 grid gap-2">
        {adminNavItems.map((item) => {
          const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={`${item.href}-${item.label}`}
              href={item.href}
              data-tour-id={item.tourId}
              onClick={onNavigate}
              className={`flex min-h-12 items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                active
                  ? "bg-[#F36B4F] text-white shadow-[0_18px_44px_rgba(243,107,79,0.24)]"
                  : "text-muted-foreground hover:bg-secondary hover:text-secondary-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto rounded-[26px] border border-border bg-background p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#FFFDF8] text-sm font-bold text-[#8A5A24] dark:bg-[#FFF7EB]">AE</span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[#1B1A17] dark:text-white">{currentUserName}</p>
            <p className="text-xs text-[#6F675C] dark:text-[#CDBCA8]">Admin</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onLogout}
          className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-border bg-card px-4 py-3 text-sm font-semibold text-card-foreground transition hover:bg-secondary hover:text-secondary-foreground"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </aside>
  );
}

