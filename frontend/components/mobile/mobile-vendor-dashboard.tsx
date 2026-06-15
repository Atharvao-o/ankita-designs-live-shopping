"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ArrowUpRight, BadgeIndianRupee, Handshake, PackagePlus, Radio, ReceiptText, Store, WalletCards } from "lucide-react";
import { AppImage } from "@/components/ui/app-image";
import { buttonStyles } from "@/components/ui/button";
import { Exhibition, Stall, VendorDashboard, VendorExhibitionRequest } from "@/lib/types";
import { formatPrice } from "@/lib/utils";

type Props = {
  dashboard: VendorDashboard | null;
  stall: Stall | null;
  exhibition: Exhibition | null;
  latestRequest?: VendorExhibitionRequest | null;
  revenue: number;
  error?: string;
};

export function MobileVendorDashboard({ dashboard, stall, exhibition, latestRequest, revenue, error }: Props) {
  const vendor = dashboard?.vendor;
  const orders = dashboard?.orders ?? [];
  const currentLiveSession = dashboard?.currentLiveSession ?? (dashboard?.liveSession?.status === "live" ? dashboard.liveSession : null);
  const liveStatus = stall ? currentLiveSession?.status ?? "offline" : "unavailable";
  const isLive = Boolean(stall) && liveStatus === "live";
  const stats = dashboard?.stats;
  const productCount = stats?.productCount ?? dashboard?.products?.length ?? 0;
  const canOpenLive = Boolean(stall && productCount >= 2);
  const paidOrders = orders.filter((order) => order.paymentStatus === "paid");
  const salesTrend = useMemo(() => {
    const today = new Date();
    return Array.from({ length: 7 }).map((_, index) => {
      const date = new Date(today);
      date.setHours(0, 0, 0, 0);
      date.setDate(today.getDate() - (6 - index));
      const nextDate = new Date(date);
      nextDate.setDate(date.getDate() + 1);
      const value = orders
        .filter((order) => {
          const createdAt = new Date(order.createdAt);
          return createdAt >= date && createdAt < nextDate;
        })
        .reduce((sum, order) => sum + order.totalAmount, 0);
      return {
        label: date.toLocaleDateString([], { weekday: "short" }),
        value
      };
    });
  }, [orders]);
  const maxTrendValue = Math.max(...salesTrend.map((item) => item.value), 0);

  return (
    <section className="mobile-vendor-page">
      <div className="space-y-5">
        <div>
          <h2 className="mb-3 text-xl font-black tracking-[-0.04em]">Quick actions</h2>
          <div className="grid grid-cols-2 gap-3">
            <ActionCard href="/vendor/exhibitions" icon={Handshake} label="Join Exhibition" featured />
            <ActionCard href="/vendor/products" icon={PackagePlus} label="Add Product" />
            <ActionCard href="/vendor/stall" icon={Store} label="Manage Stall" />
            {canOpenLive || isLive ? <ActionCard href="/vendor/live" icon={Radio} label="Live Console" /> : null}
            <ActionCard href="/vendor/orders" icon={WalletCards} label="Orders" />
          </div>
        </div>

        <div>
          <p className="mobile-vendor-muted text-sm">Good morning</p>
          <h1 className="mobile-vendor-heading mt-1 text-3xl font-black tracking-[-0.06em]">{vendor?.displayName ?? "Vendor"}</h1>
        </div>

        {error ? <p className="rounded-[22px] border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p> : null}

        <div className="mobile-vendor-card relative overflow-hidden rounded-[34px] p-5">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_18%,rgba(255,120,92,0.18),transparent_34%),radial-gradient(circle_at_10%_100%,rgba(214,172,99,0.14),transparent_34%)]" />
          <div className="relative">
            <p className="mobile-vendor-eyebrow text-xs font-bold uppercase tracking-[0.18em]">Order revenue</p>
            <div className="mt-3 flex items-end justify-between gap-3">
              <p className="text-4xl font-black tracking-[-0.06em]">{formatPrice(revenue)}</p>
              <span className="rounded-full bg-emerald-500/14 px-3 py-1 text-xs font-bold text-emerald-500">{paidOrders.length} paid</span>
            </div>
          </div>
        </div>

        <article className="mobile-vendor-card overflow-hidden rounded-[34px]">
          <div className="relative h-40">
            {vendor?.image ? (
              <AppImage src={vendor.image} alt={vendor.displayName} className="h-full w-full rounded-none" fallbackSrc="/stalls/stall-placeholder.png" />
            ) : (
              <div className="mobile-vendor-preview h-full" />
            )}
            <div className="mobile-vendor-preview-overlay absolute inset-0" />
            <span className="absolute left-4 top-4 rounded-full bg-[var(--coral)] px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-white">
              {isLive ? "You are LIVE" : stall ? "Offline" : "No assigned stall"}
            </span>
          </div>
          <div className="p-5">
            <p className="mobile-vendor-eyebrow text-xs font-bold uppercase tracking-[0.18em]">{exhibition?.title ?? "No active exhibition"}</p>
            <h2 className="mobile-vendor-heading mt-2 text-2xl font-black tracking-[-0.05em]">{stall?.name ?? "No stall assigned"}</h2>
            <p className="mobile-vendor-muted mt-2 text-sm leading-6">
              {stall ? "Your stall is connected to exhibition operations and live selling tools." : "Participate in an exhibition before going live."}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Link href={isLive || canOpenLive ? "/vendor/live" : stall ? "/vendor/products" : "/vendor/exhibitions"} className={buttonStyles("primary", "min-h-12 justify-center px-4 py-3")}>
                {isLive ? "Resume Live" : canOpenLive ? "Go Live" : stall ? "Add 2 Products" : "Request Stall"}
              </Link>
              <Link href="/vendor/exhibitions" className={buttonStyles("secondary", "min-h-12 justify-center px-4 py-3")}>
                Exhibitions
              </Link>
            </div>
          </div>
        </article>

        <div className="grid grid-cols-2 gap-3">
          <KpiCard icon={ReceiptText} label="Orders" value={String(stats?.orderCount ?? orders.length)} change={`${paidOrders.length} paid`} />
          <KpiCard icon={BadgeIndianRupee} label="Revenue" value={formatPrice(revenue)} change="Orders" />
          <KpiCard icon={Radio} label="Visitors" value={String(stats?.visitors ?? dashboard?.activeViewers ?? 0)} change={isLive ? "Live" : "Offline"} />
          <KpiCard icon={Store} label="Products" value={String(productCount)} change={`${stats?.productsSold ?? dashboard?.productsSold ?? 0} sold`} />
        </div>

        <div className="mobile-vendor-card rounded-[30px] p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="mobile-vendor-eyebrow text-xs font-bold uppercase tracking-[0.16em]">Sales trend</p>
              <h3 className="mobile-vendor-heading mt-1 text-lg font-black">Last 7 days</h3>
            </div>
            <span className="mobile-vendor-pill rounded-full px-3 py-1 text-xs font-bold">{orders.length} orders</span>
          </div>
          {maxTrendValue > 0 ? (
            <div className="mt-5 flex h-32 items-end gap-2">
              {salesTrend.map((item) => (
                <div key={item.label} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                  <span className="w-full rounded-t-2xl bg-gradient-to-t from-[var(--coral)] to-[var(--gold)]" style={{ height: `${Math.max(8, (item.value / maxTrendValue) * 100)}%` }} />
                  <span className="mobile-vendor-muted text-[10px] font-bold">{item.label}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="mobile-vendor-soft mobile-vendor-muted mt-5 rounded-[22px] p-4 text-sm">
              No order revenue in the last 7 days.
            </div>
          )}
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xl font-black tracking-[-0.04em]">Recent orders</h2>
            <Link href="/vendor/orders" className="text-xs font-bold text-[var(--gold)]">View all</Link>
          </div>
          <div className="grid gap-3">
            {orders.length ? orders.slice(0, 3).map((order) => (
              <Link key={order.id} href="/vendor/orders" className="mobile-vendor-card flex items-center gap-3 rounded-[24px] p-3 transition active:scale-[0.99]">
                <AppImage src={order.items[0]?.image || "/products/product-placeholder.png"} alt={order.items[0]?.title ?? "Order product"} className="h-14 w-14 rounded-2xl" fallbackSrc="/products/product-placeholder.png" />
                <div className="min-w-0 flex-1">
                  <p className="mobile-vendor-heading truncate text-sm font-bold">{order.items[0]?.title ?? order.id}</p>
                  <p className="mobile-vendor-muted mt-1 text-xs">{order.id} - {order.orderStatus}</p>
                </div>
                <p className="text-sm font-black text-[var(--coral)]">{formatPrice(order.totalAmount)}</p>
              </Link>
            )) : (
              <div className="mobile-vendor-card mobile-vendor-muted rounded-[24px] p-5 text-sm">
                No orders yet. Orders from live shopping and checkout will appear here.
              </div>
            )}
          </div>
        </div>

        {latestRequest ? (
          <div className="mobile-vendor-card mobile-vendor-muted rounded-[24px] p-4 text-sm">
            Latest exhibition request: <span className="mobile-vendor-heading font-bold">{latestRequest.status}</span>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function KpiCard({ icon: Icon, label, value, change }: { icon: typeof Store; label: string; value: string; change: string }) {
  return (
    <div className="mobile-vendor-card rounded-[26px] p-4">
      <div className="flex items-center justify-between">
        <Icon className="mobile-vendor-eyebrow h-5 w-5" />
        <span className="mobile-vendor-pill rounded-full px-2 py-1 text-[10px] font-bold text-emerald-600">{change}</span>
      </div>
      <p className="mobile-vendor-heading mt-5 text-2xl font-black tracking-[-0.05em]">{value}</p>
      <p className="mobile-vendor-muted mt-1 text-xs font-bold uppercase tracking-[0.14em]">{label}</p>
    </div>
  );
}

function ActionCard({ href, icon: Icon, label, featured = false }: { href: string; icon: typeof Store; label: string; featured?: boolean }) {
  return (
    <Link href={href} className={`mobile-vendor-card mobile-vendor-heading flex min-h-24 items-center justify-between rounded-[26px] p-4 transition active:scale-[0.99] ${featured ? "mobile-vendor-action-primary col-span-2" : ""}`}>
      <span className="font-bold">{label}</span>
      <span className="mobile-vendor-soft mobile-vendor-eyebrow grid h-11 w-11 place-items-center rounded-2xl">
        <Icon className="h-5 w-5" />
      </span>
      <ArrowUpRight className="sr-only h-4 w-4" />
    </Link>
  );
}
