"use client";

import Link from "next/link";
import {
  BarChart3,
  Bell,
  Boxes,
  CalendarClock,
  Compass,
  CreditCard,
  ExternalLink,
  FileText,
  GalleryHorizontal,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  ReceiptText,
  Search,
  ShoppingBag,
  Store,
  UserRound,
  Users
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useExpoStore } from "@/lib/cart-store";
import { UserRole } from "@/lib/types";
import { buttonStyles } from "@/components/ui/button";
import { AppBrand } from "@/components/ui/app-primitives";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { MobileBottomNav } from "@/components/mobile/mobile-bottom-nav";
import { TutorialAdminControls } from "@/components/tutorial/ReplayTutorialButton";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { cn } from "@/lib/utils";

type RoleNavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  tourId?: string;
};

const roleNavItems: Record<UserRole, RoleNavItem[]> = {
  admin: [
    { label: "Overview", href: "/admin", icon: LayoutDashboard },
    { label: "Feed", href: "/admin/feed", icon: FileText },
    { label: "Products", href: "/admin/products", icon: Boxes },
    { label: "Subscriptions", href: "/admin/subscriptions", icon: CreditCard },
    { label: "Live Slots", href: "/admin/live-slots", icon: CalendarClock },
    { label: "Exhibitions", href: "/admin/exhibitions", icon: Store },
    { label: "Advertisements", href: "/admin/advertisements", icon: GalleryHorizontal },
    { label: "Vendors", href: "/admin/vendors", icon: Users },
    { label: "Stalls", href: "/admin/stalls", icon: Boxes },
    { label: "Orders", href: "/admin/orders", icon: ShoppingBag },
    { label: "Analytics", href: "/admin/analytics", icon: BarChart3 }
  ],
  vendor: [
    { label: "Overview", href: "/vendor", icon: LayoutDashboard },
    { label: "Application", href: "/vendor/application", icon: FileText },
    { label: "Profile", href: "/vendor/profile", icon: UserRound },
    { label: "Posts", href: "/vendor/posts", icon: FileText },
    { label: "Subscription", href: "/vendor/subscription", icon: CreditCard },
    { label: "Live Slots", href: "/vendor/live-slots", icon: CalendarClock },
    { label: "Exhibitions", href: "/vendor/exhibitions", icon: Store },
    { label: "Stall", href: "/vendor/stall", icon: Boxes },
    { label: "Products", href: "/vendor/products", icon: ShoppingBag },
    { label: "Orders", href: "/vendor/orders", icon: ReceiptText }
  ],
  user: [
    { label: "Home", href: "/", icon: Home },
    { label: "Explore", href: "/explore", icon: Compass },
    { label: "Events", href: "/exhibitions", icon: Store },
    { label: "Cart", href: "/cart", icon: ShoppingBag },
    { label: "Orders", href: "/orders", icon: ReceiptText }
  ]
};

const roleLabel: Record<UserRole, string> = {
  admin: "Admin Panel",
  vendor: "Vendor Workspace",
  user: "Social Shopping"
};

function isActivePath(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href === "/admin" || href === "/vendor") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

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
  const [drawerOpen, setDrawerOpen] = useState(false);
  const currentUser = useExpoStore((state) => state.currentUser);
  const logout = useExpoStore((state) => state.logout);

  const doLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <ProtectedRoute role={role}>
      <main className="theme-transition app-page lg:grid lg:grid-cols-[280px_minmax(0,1fr)]">
        <RoleSidebar
          role={role}
          pathname={pathname}
          currentUserName={currentUser?.name ?? roleLabel[role]}
          onLogout={doLogout}
          className="hidden lg:flex"
        />

        {drawerOpen ? (
          <div className="fixed inset-0 z-[90] lg:hidden" role="dialog" aria-modal="true" aria-label={`${roleLabel[role]} navigation`}>
            <button type="button" aria-label="Close navigation menu" onClick={() => setDrawerOpen(false)} className="absolute inset-0 bg-black/55" />
            <RoleSidebar
              role={role}
              pathname={pathname}
              currentUserName={currentUser?.name ?? roleLabel[role]}
              onLogout={doLogout}
              onNavigate={() => setDrawerOpen(false)}
              className="relative z-10 flex h-full w-[min(88vw,320px)]"
            />
          </div>
        ) : null}

        <section className="relative z-10 min-w-0">
          <RoleTopBar
            role={role}
            title={title}
            userName={currentUser?.name ?? "Guest"}
            onOpenMenu={() => setDrawerOpen(true)}
            onLogout={doLogout}
          />
          {children}
        </section>

        {role === "admin" || pathname === "/vendor/live" ? null : <MobileBottomNav role={role as Extract<UserRole, "user" | "vendor">} />}
      </main>
    </ProtectedRoute>
  );
}

function RoleTopBar({
  role,
  title,
  userName,
  onOpenMenu,
  onLogout
}: {
  role: UserRole;
  title: string;
  userName: string;
  onOpenMenu: () => void;
  onLogout: () => void;
}) {
  const searchPlaceholder =
    role === "admin"
      ? "Search exhibitions, vendors, stalls..."
      : role === "vendor"
        ? "Search products, posts, orders..."
        : "Search orders and shopping...";

  return (
    <header className="app-topbar sticky top-0 z-40 border-b">
      <div className="flex min-h-[72px] items-center gap-3 px-3 sm:px-5 xl:px-8">
        <button type="button" onClick={onOpenMenu} className="app-icon-button h-11 w-11 lg:hidden" aria-label="Open navigation menu">
          <Menu className="h-5 w-5" />
        </button>

        <AppBrand context={roleLabel[role]} href={role === "admin" ? "/admin" : role === "vendor" ? "/vendor" : "/"} compact className="min-w-[150px] lg:hidden" />

        <div className="hidden min-w-0 lg:block">
          <p className="app-section-eyebrow">{roleLabel[role]}</p>
          <h1 className="truncate text-xl font-black text-foreground">{title}</h1>
        </div>

        <label className="relative ml-auto hidden min-w-[220px] max-w-xl flex-1 md:block">
          <span className="sr-only">{searchPlaceholder}</span>
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--gold)]" />
          <input placeholder={searchPlaceholder} className="app-input h-12 w-full px-11 text-sm font-semibold" />
        </label>

        <div className="ml-auto flex items-center gap-2 sm:gap-3 md:ml-0">
          <ThemeToggle className="h-11 w-11" />
          <button type="button" className="app-icon-button relative h-11 w-11" aria-label="Notifications">
            <Bell className="h-5 w-5" />
            <span className="absolute right-2.5 top-2.5 h-2.5 w-2.5 rounded-full bg-[var(--coral)]" />
          </button>
          <Link href="/" className={buttonStyles("secondary", "hidden min-h-11 px-4 py-2.5 sm:inline-flex")}>
            Visit Site
            <ExternalLink className="ml-2 h-4 w-4" />
          </Link>
          {role === "admin" ? <TutorialAdminControls /> : null}
          <div className="hidden items-center gap-3 rounded-[var(--radius-control)] border border-[color:var(--border)] bg-[var(--surface)] px-3 py-2 shadow-[var(--shadow-card)] xl:flex">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-[color:var(--gold)]/12 text-xs font-black text-[var(--gold)]">AD</span>
            <span className="min-w-0">
              <span className="block max-w-[150px] truncate text-sm font-black text-foreground">{userName}</span>
              <span className="block text-xs font-semibold text-muted-foreground">{roleLabel[role]}</span>
            </span>
          </div>
          <button type="button" onClick={onLogout} className={buttonStyles("ghost", "hidden min-h-11 px-3 py-2 sm:inline-flex")} aria-label="Logout">
            <LogOut className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
}

function RoleSidebar({
  role,
  pathname,
  currentUserName,
  onLogout,
  onNavigate,
  className
}: {
  role: UserRole;
  pathname: string;
  currentUserName: string;
  onLogout: () => void;
  onNavigate?: () => void;
  className?: string;
}) {
  return (
    <aside className={cn("app-sidebar min-h-screen flex-col border-r p-4", className)}>
      <AppBrand context={roleLabel[role]} href={role === "admin" ? "/admin" : role === "vendor" ? "/vendor" : "/"} className="px-1 py-2" />

      <nav className="mt-7 grid gap-1.5" aria-label={`${roleLabel[role]} navigation`}>
        {roleNavItems[role].map((item) => {
          const active = isActivePath(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={`${item.href}-${item.label}`}
              href={item.href}
              data-tour-id={item.tourId}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-11 items-center gap-3 rounded-[var(--radius-control)] px-3 py-2 text-sm font-black transition",
                active ? "bg-primary text-primary-foreground shadow-[var(--shadow-hover)]" : "text-muted-foreground hover:bg-secondary hover:text-secondary-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="app-card-flat mt-auto p-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[color:var(--gold)]/12 text-sm font-black text-[var(--gold)]">AD</span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-black text-foreground">{currentUserName}</span>
            <span className="block text-xs font-semibold text-muted-foreground">{roleLabel[role]}</span>
          </span>
        </div>
        <button type="button" onClick={onLogout} className={buttonStyles("secondary", "mt-4 min-h-11 w-full justify-center px-4 py-3 text-sm")}>
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </button>
      </div>
    </aside>
  );
}
