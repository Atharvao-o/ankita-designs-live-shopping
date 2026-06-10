"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Boxes, Home, LayoutDashboard, ReceiptText, Settings, ShoppingBag, Store } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/lib/types";

type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  highlight?: boolean;
};

const visitorItems: NavItem[] = [
  { label: "Home", href: "/", icon: Home },
  { label: "Exhibitions", href: "/exhibitions", icon: Store },
  { label: "Orders", href: "/orders", icon: ReceiptText },
  { label: "Cart", href: "/cart", icon: ShoppingBag },
  { label: "Settings", href: "/settings", icon: Settings }
];

const vendorItems: NavItem[] = [
  { label: "Dashboard", href: "/vendor", icon: LayoutDashboard },
  { label: "Exhibitions", href: "/vendor/exhibitions", icon: Store },
  { label: "Stall", href: "/vendor/stall", icon: Store },
  { label: "Products", href: "/vendor/products", icon: Boxes },
  { label: "Orders", href: "/vendor/orders", icon: ReceiptText }
];

export function MobileBottomNav({ role }: { role: Extract<UserRole, "user" | "vendor"> }) {
  const pathname = usePathname();
  const items = role === "vendor" ? vendorItems : visitorItems;

  return (
    <nav
      aria-label={`${role} mobile navigation`}
      className="mobile-bottom-nav"
    >
      <div className="grid grid-cols-5 items-end gap-1">
        {items.map((item) => {
          const itemPath = item.href.split("?")[0];
          const isRootItem = itemPath === "/vendor" || itemPath === "/exhibitions";
          const active = pathname === itemPath || (!isRootItem && pathname.startsWith(`${itemPath}/`));
          const Icon = item.icon;

          return (
            <Link
              key={`${item.href}-${item.label}`}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "mobile-bottom-nav__item",
                active && "mobile-bottom-nav__item--active",
                item.highlight && "mobile-bottom-nav__item--featured"
              )}
            >
              <Icon className={cn("h-5 w-5", item.highlight ? "h-6 w-6" : "")} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
