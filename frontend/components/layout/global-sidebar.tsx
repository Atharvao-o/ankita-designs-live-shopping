"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  BarChart3,
  Home,
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
  Package,
  ReceiptText,
  Settings as SettingsIcon,
  ShoppingBag,
  Store,
  UserRound,
  Users,
  X
} from "lucide-react";
import { useState } from "react";
import { useExpoStore } from "@/lib/cart-store";
import { cn } from "@/lib/utils";

const groups = [
  {
    title: "Public",
    links: [
      { label: "Home", href: "/", icon: Home },
      { label: "Login", href: "/login", icon: LogIn },
      { label: "Register", href: "/register", icon: UserRound }
    ]
  },
  {
    title: "Customer",
    links: [
      { label: "Live Stalls", href: "/exhibitions", icon: Store },
      { label: "Cart", href: "/cart", icon: ShoppingBag },
      { label: "Checkout", href: "/checkout", icon: ShoppingBag }
    ]
  },
  {
    title: "Vendor",
    links: [
      { label: "Dashboard", href: "/vendor", icon: LayoutDashboard },
      { label: "Products", href: "/vendor/products", icon: Package },
      { label: "Orders", href: "/vendor/orders", icon: ShoppingBag }
    ]
  },
  {
    title: "Admin",
    links: [
      { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
      { label: "Exhibitions", href: "/admin/exhibitions", icon: Store },
      { label: "Vendors", href: "/admin/vendors", icon: Users },
      { label: "Stalls", href: "/admin/stalls", icon: Store },
      { label: "Orders", href: "/admin/orders", icon: ShoppingBag },
      { label: "Analytics", href: "/admin/analytics", icon: BarChart3 }
    ]
  }
];

const loginLinks = [
  { label: "Admin Login", href: "/login?role=admin" },
  { label: "Vendor Login", href: "/login?role=vendor" },
  { label: "User Login", href: "/login?role=user" }
];

export function GlobalSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const currentUser = useExpoStore((state) => state.currentUser);
  const logout = useExpoStore((state) => state.logout);
  const openCart = useExpoStore((state) => state.openCart);
  const hideMobileQuickNav = pathname.startsWith("/vendor") || pathname.startsWith("/admin");

  if (pathname.startsWith("/live/")) {
    return null;
  }

  const close = () => setOpen(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 left-5 z-[75] hidden min-h-12 items-center gap-2 rounded-full border border-[color:var(--gold)] bg-[var(--bg-soft)] px-4 py-3 text-sm font-semibold text-[var(--text)] shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5 md:inline-flex"
        aria-label="Open navigation menu"
      >
        <Menu className="h-4 w-4 text-[var(--gold)]" />
        <span className="hidden sm:inline">Menu</span>
      </button>

      {!hideMobileQuickNav ? (
        <nav className="fixed inset-x-3 bottom-4 z-[70] grid grid-cols-5 gap-1 rounded-[24px] border border-[color:var(--border)] bg-[var(--bg-soft)] p-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] text-[var(--muted)] shadow-[var(--shadow-soft)] md:hidden" aria-label="Mobile quick navigation">
          <MobileNavLink href="/" label="Home" icon={Home} active={pathname === "/"} />
          <MobileNavLink href="/exhibitions" label="Exhibitions" icon={Store} active={pathname.startsWith("/exhibition")} />
          <MobileNavLink href="/orders" label="Orders" icon={ReceiptText} active={pathname.startsWith("/orders")} />
          <button
            type="button"
            onClick={openCart}
            className={cn(
              "flex min-h-12 flex-col items-center justify-center gap-1 rounded-2xl px-1 text-[11px] font-bold transition hover:bg-[var(--surface-strong)] hover:text-[var(--text)]",
              pathname.startsWith("/cart") ? "bg-[var(--surface-strong)] text-[var(--gold)]" : "text-[var(--muted)]"
            )}
            aria-label="Open cart"
          >
            <ShoppingBag className="h-4 w-4" />
            <span className="max-w-full truncate">Cart</span>
          </button>
          <MobileNavLink href="/settings" label="Settings" icon={SettingsIcon} active={pathname.startsWith("/settings")} />
        </nav>
      ) : null}

      <AnimatePresence>
        {open ? (
          <>
            <motion.button
              type="button"
              aria-label="Close navigation menu"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={close}
              className="fixed inset-0 z-[80] bg-slate-950/35 backdrop-blur-sm"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 260, damping: 30 }}
              className="fixed inset-y-0 left-0 z-[90] flex w-[min(92vw,390px)] flex-col border-r border-[color:var(--border)] bg-[var(--bg-soft)] p-4 shadow-[var(--shadow-strong)]"
            >
              <div className="flex items-start justify-between gap-3 rounded-[28px] border border-[color:var(--border)] bg-[var(--surface)] p-4 shadow-soft">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full border border-[color:var(--border)] bg-[var(--surface-strong)] font-serif text-sm font-bold text-[var(--gold)]">
                    AE
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-[var(--text)]">Ankita Designs</p>
                    <p className="text-xs text-[var(--muted)]">Live Shopping Marketplace</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={close}
                  className="rounded-full border border-[color:var(--border)] bg-[var(--surface)] p-2 text-[var(--muted)] hover:text-[var(--gold)]"
                  aria-label="Close menu"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-4 rounded-[24px] border border-[color:var(--border)] bg-[var(--surface)] p-4 shadow-soft">
                <p className="text-xs uppercase tracking-[0.16em] text-[var(--gold)]">Current session</p>
                <p className="mt-2 text-sm font-semibold text-[var(--text)]">{currentUser?.name ?? "Not logged in"}</p>
                <p className="mt-1 text-xs capitalize text-[var(--muted)]">{currentUser?.role ?? "Choose a login role"}</p>
                {currentUser ? (
                  <button
                    type="button"
                    onClick={() => {
                      logout();
                      close();
                      router.push("/login");
                    }}
                    className="mt-4 inline-flex w-full items-center justify-center rounded-full border border-[color:var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold text-[var(--text)] hover:bg-[var(--surface-strong)]"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </button>
                ) : null}
              </div>

              <div className="mt-4 flex-1 overflow-y-auto pr-1">
                <div className="rounded-[24px] border border-[color:var(--border)] bg-[var(--surface)] p-3 shadow-soft">
                  <p className="px-2 py-2 text-xs uppercase tracking-[0.16em] text-[var(--gold)]">Quick logins</p>
                  <div className="grid gap-2">
                    {loginLinks.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={close}
                        className="rounded-2xl bg-[var(--surface-strong)] px-4 py-3 text-sm font-semibold text-[var(--text)] transition hover:text-[var(--gold)]"
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                </div>

                {groups.map((group) => (
                  <div key={group.title} className="mt-4 rounded-[24px] border border-[color:var(--border)] bg-[var(--surface)] p-3 shadow-soft">
                    <p className="px-2 py-2 text-xs uppercase tracking-[0.16em] text-[var(--gold)]">{group.title}</p>
                    <div className="grid gap-1">
                      {group.links.map((item) => {
                        const active = pathname === item.href;
                        const Icon = item.icon;
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={close}
                            className={cn(
                              "flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold transition",
                              active
                                ? "bg-[var(--surface-strong)] text-[var(--gold)]"
                                : "text-[var(--muted)] hover:bg-[var(--surface-strong)] hover:text-[var(--text)]"
                            )}
                          >
                            <Icon className="h-4 w-4" />
                            {item.label}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>
    </>
  );
}

function MobileNavLink({
  active,
  href,
  icon: Icon,
  label
}: {
  active: boolean;
  href: string;
  icon: typeof Home;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex min-h-12 flex-col items-center justify-center gap-1 rounded-2xl px-1 text-[11px] font-bold transition hover:bg-[var(--surface-strong)] hover:text-[var(--text)]",
        active ? "bg-[var(--surface-strong)] text-[var(--gold)]" : "text-[var(--muted)]"
      )}
    >
      <Icon className="h-4 w-4" />
      <span className="max-w-full truncate">{label}</span>
    </Link>
  );
}
