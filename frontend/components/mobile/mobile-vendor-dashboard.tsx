"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Activity, AlertCircle, ArrowRight, ArrowUpRight, BadgeIndianRupee, Boxes, CalendarClock, CheckCircle2, CreditCard, FilePlus2, Handshake, PackagePlus, Radio, ReceiptText, Store, Trash2, WalletCards } from "lucide-react";
import { AppImage } from "@/components/ui/app-image";
import { buttonStyles } from "@/components/ui/button";
import { Exhibition, LiveSlot, Product, Stall, VendorDashboard, VendorExhibitionRequest, VendorPost, VendorSubscriptionState } from "@/lib/types";
import { formatPrice } from "@/lib/utils";

type Props = {
  dashboard: VendorDashboard | null;
  stall: Stall | null;
  exhibition: Exhibition | null;
  latestRequest?: VendorExhibitionRequest | null;
  subscription?: VendorSubscriptionState | null;
  nextLiveSlot?: LiveSlot | null;
  posts?: VendorPost[];
  archivingPostId?: string;
  onArchivePost?: (postId: string) => Promise<void>;
  postActionError?: string;
  revenue: number;
  error?: string;
};

export function MobileVendorDashboard({
  dashboard,
  stall,
  exhibition,
  latestRequest,
  subscription,
  nextLiveSlot,
  posts = [],
  archivingPostId = "",
  onArchivePost,
  postActionError,
  revenue,
  error
}: Props) {
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
  const activePosts = posts.filter((post) => post.status !== "archived");
  const attentionOrders = orders.filter((order) => !["delivered", "fulfilled", "cancelled"].includes(order.orderStatus)).slice(0, 3);
  const productPerformance = [...(dashboard?.products ?? [])]
    .sort((left, right) => left.stock - right.stock || right.price - left.price)
    .slice(0, 3);
  const readinessItems = [
    { label: "Approved vendor", complete: true },
    { label: "Stall assigned", complete: Boolean(stall) },
    { label: "Two active products", complete: productCount >= 2 },
    { label: "Live slot approved", complete: Boolean(nextLiveSlot) }
  ];
  const readinessComplete = readinessItems.filter((item) => item.complete).length;
  const readinessPercent = Math.round((readinessComplete / readinessItems.length) * 100);
  const todayAction = isLive
    ? { eyebrow: "Live now", title: "Keep your live room moving", description: `${stats?.visitors ?? dashboard?.activeViewers ?? 0} viewers are connected.`, href: "/vendor/live", label: "Open console", icon: Radio }
    : !stall
      ? { eyebrow: "Today first", title: "Request an exhibition stall", description: "A stall unlocks your boutique, products, and live selling.", href: "/vendor/exhibitions", label: "Find exhibition", icon: Store }
      : productCount < 2
        ? { eyebrow: "Catalog readiness", title: "Add products for live selling", description: `${Math.max(0, 2 - productCount)} more active product${2 - productCount === 1 ? "" : "s"} needed.`, href: "/vendor/products", label: "Add products", icon: Boxes }
        : attentionOrders.length
          ? { eyebrow: "Orders need attention", title: `Move ${attentionOrders.length} active order${attentionOrders.length === 1 ? "" : "s"} forward`, description: "Review packing and fulfillment before your next live slot.", href: "/vendor/orders", label: "Review orders", icon: ReceiptText }
          : nextLiveSlot
            ? { eyebrow: "Next live slot", title: new Date(nextLiveSlot.startTime).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }), description: nextLiveSlot.title || "Your approved selling window is ready.", href: "/vendor/live", label: "Prepare room", icon: CalendarClock }
            : { eyebrow: "Live schedule", title: "Request your next live slot", description: "Your stall and catalog are ready for the next event.", href: "/vendor/live-slots", label: "Request slot", icon: CalendarClock };

  const confirmArchivePost = async (postId: string) => {
    if (!onArchivePost || !window.confirm("Delete this post from your active feed?")) return;
    await onArchivePost(postId);
  };

  return (
    <section className="mobile-vendor-page">
      <div className="space-y-5">
        <div>
          <p className="mobile-vendor-muted text-sm">Vendor dashboard</p>
          <h1 className="mobile-vendor-heading mt-1 text-3xl font-black">{vendor?.displayName ?? "Vendor"}</h1>
        </div>

        <MobileTodayAction action={todayAction} readinessPercent={readinessPercent} />

        <div>
          <h2 className="mb-3 text-xl font-black">Quick actions</h2>
          <div className="grid grid-cols-2 gap-3">
            <ActionCard href="/vendor/exhibitions" icon={Handshake} label="Join Exhibition" featured />
            <ActionCard href="/vendor/products" icon={PackagePlus} label="Add Product" />
            <ActionCard href="/vendor/posts" icon={FilePlus2} label="Create Post" />
            <ActionCard href="/vendor/stall" icon={Store} label="Manage Stall" />
            <ActionCard href="/vendor/subscription" icon={CreditCard} label="Subscription" />
            <ActionCard href="/vendor/live-slots" icon={CalendarClock} label="Live Slots" />
            {canOpenLive || isLive ? <ActionCard href="/vendor/live" icon={Radio} label="Live Console" /> : null}
            <ActionCard href="/vendor/orders" icon={WalletCards} label="Orders" />
          </div>
        </div>

        {error ? <p className="rounded-[22px] border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p> : null}

        <div className="mobile-vendor-card relative overflow-hidden rounded-[34px] p-5">
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,120,92,0.12),transparent_58%)]" />
          <div className="relative">
            <p className="mobile-vendor-eyebrow text-xs font-bold uppercase tracking-[0.18em]">Order revenue</p>
            <div className="mt-3 flex items-end justify-between gap-3">
              <p className="break-words text-4xl font-black">{formatPrice(revenue)}</p>
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
            <h2 className="mobile-vendor-heading mt-2 text-2xl font-black">{stall?.name ?? "No stall assigned"}</h2>
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

        <MobileReadinessChecklist items={readinessItems} percent={readinessPercent} />
        <MobileProductPerformance products={productPerformance} />

        <div>
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="mobile-vendor-eyebrow text-xs font-bold uppercase tracking-[0.16em]">Social shop</p>
              <h2 className="mobile-vendor-heading mt-1 text-xl font-black">Your posts</h2>
            </div>
            <Link href="/vendor/posts" className={buttonStyles("primary", "min-h-10 justify-center px-4 py-2 text-xs")}>
              <FilePlus2 className="h-4 w-4" />
              New post
            </Link>
          </div>
          {postActionError ? <p className="mb-3 rounded-[20px] border border-red-300 bg-red-50 p-3 text-sm font-bold text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">{postActionError}</p> : null}
          <div className="grid gap-3">
            {activePosts.length ? activePosts.slice(0, 3).map((post) => (
              <article key={post.id} className="mobile-vendor-card flex items-center gap-3 rounded-[24px] p-3">
                <AppImage
                  src={post.thumbnailUrl || post.mediaUrls[0] || post.product?.images?.[0] || "/products/product-placeholder.png"}
                  alt={post.product?.title || post.caption}
                  className="h-16 w-16 shrink-0 rounded-2xl"
                  fallbackSrc="/products/product-placeholder.png"
                />
                <Link href="/vendor/posts" className="min-w-0 flex-1">
                  <p className="mobile-vendor-heading line-clamp-1 text-sm font-black">{post.product?.title || post.caption}</p>
                  <p className="mobile-vendor-muted mt-1 text-xs capitalize">{post.status} | {post.moderationStatus}</p>
                </Link>
                <button
                  type="button"
                  onClick={() => void confirmArchivePost(post.id)}
                  disabled={archivingPostId === post.id}
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-red-300 bg-red-50 text-red-600 transition active:scale-95 disabled:opacity-50 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
                  aria-label={`Delete post ${post.product?.title || post.caption}`}
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </article>
            )) : (
              <Link href="/vendor/posts" className="mobile-vendor-card mobile-vendor-muted rounded-[24px] p-5 text-sm">
                No active posts. Tap here to create your first social shopping post.
              </Link>
            )}
          </div>
          {activePosts.length > 3 ? <Link href="/vendor/posts" className="mt-3 block text-center text-xs font-black text-[var(--gold)]">Manage all {activePosts.length} posts</Link> : null}
        </div>

        <MobileLiveTimeline subscription={subscription} nextLiveSlot={nextLiveSlot} />

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
            <div>
              <p className="mobile-vendor-eyebrow text-xs font-bold uppercase">Needs attention</p>
              <h2 className="mobile-vendor-heading mt-1 text-xl font-black">Active orders</h2>
            </div>
            <Link href="/vendor/orders" className="text-xs font-bold text-[var(--gold)]">View all</Link>
          </div>
          <div className="grid gap-3">
            {attentionOrders.length ? attentionOrders.map((order) => (
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
                No orders need attention right now.
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

function MobileTodayAction({
  action,
  readinessPercent
}: {
  action: { eyebrow: string; title: string; description: string; href: string; label: string; icon: typeof Store };
  readinessPercent: number;
}) {
  const Icon = action.icon;
  return (
    <article className="mobile-vendor-card overflow-hidden rounded-[30px] border border-[var(--coral)]/20 p-5">
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 rounded-full bg-[var(--coral)]/12 px-3 py-1.5 text-xs font-black uppercase text-[var(--coral)]">
          <Icon className="h-4 w-4" />
          {action.eyebrow}
        </span>
        <span className="mobile-vendor-pill rounded-full px-3 py-1 text-xs font-black">{readinessPercent}% ready</span>
      </div>
      <h2 className="mobile-vendor-heading mt-4 text-2xl font-black leading-tight">{action.title}</h2>
      <p className="mobile-vendor-muted mt-2 text-sm font-semibold leading-6">{action.description}</p>
      <Link href={action.href} className={buttonStyles("primary", "mt-5 w-full justify-center px-5 py-3")}>
        {action.label}
        <ArrowRight className="ml-2 h-4 w-4" />
      </Link>
    </article>
  );
}

function MobileReadinessChecklist({ items, percent }: { items: Array<{ label: string; complete: boolean }>; percent: number }) {
  return (
    <article className="mobile-vendor-card rounded-[30px] p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="mobile-vendor-eyebrow text-xs font-bold uppercase">Readiness</p>
          <h2 className="mobile-vendor-heading mt-1 text-xl font-black">Live selling checklist</h2>
        </div>
        <span className="mobile-vendor-pill rounded-full px-3 py-1 text-xs font-black">{percent}%</span>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-[var(--surface)]">
        <div className="h-full rounded-full bg-[linear-gradient(90deg,var(--coral),var(--gold))]" style={{ width: `${percent}%` }} />
      </div>
      <div className="mt-4 grid gap-2">
        {items.map((item) => (
          <div key={item.label} className="mobile-vendor-soft flex items-center gap-3 rounded-2xl p-3">
            <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${item.complete ? "bg-emerald-500/12 text-emerald-600 dark:text-emerald-200" : "bg-[var(--gold)]/12 text-[var(--gold)]"}`}>
              {item.complete ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            </span>
            <p className="mobile-vendor-heading text-sm font-black">{item.label}</p>
          </div>
        ))}
      </div>
    </article>
  );
}

function MobileProductPerformance({ products }: { products: Product[] }) {
  return (
    <section>
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <p className="mobile-vendor-eyebrow text-xs font-bold uppercase">Product performance</p>
          <h2 className="mobile-vendor-heading mt-1 text-xl font-black">Catalog health</h2>
        </div>
        <Link href="/vendor/products" className="text-xs font-black text-[var(--gold)]">Manage</Link>
      </div>
      {products.length ? (
        <div className="grid gap-3">
          {products.map((product) => {
            const discount = product.compareAtPrice > product.price ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100) : 0;
            return (
              <article key={product.id} className="mobile-vendor-card flex items-center gap-3 rounded-[24px] p-3">
                <AppImage src={product.images[0] || "/products/product-placeholder.png"} alt={product.title} fallbackSrc="/products/product-placeholder.png" className="h-16 w-16 shrink-0 rounded-2xl" />
                <div className="min-w-0 flex-1">
                  <p className="mobile-vendor-heading line-clamp-1 text-sm font-black">{product.title}</p>
                  <p className="mt-1 text-sm font-black text-[var(--coral)]">{formatPrice(product.price)}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${product.stock <= 5 ? "bg-red-500/10 text-red-600 dark:text-red-300" : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"}`}>{product.stock} stock</span>
                    {discount ? <span className="rounded-full bg-[var(--gold)]/12 px-2 py-0.5 text-[10px] font-black text-[var(--gold)]">{discount}% offer</span> : null}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="mobile-vendor-card mobile-vendor-muted rounded-[24px] p-5 text-sm">
          Add products to track inventory and offer health.
        </div>
      )}
    </section>
  );
}

function MobileLiveTimeline({
  subscription,
  nextLiveSlot
}: {
  subscription?: VendorSubscriptionState | null;
  nextLiveSlot?: LiveSlot | null;
}) {
  const timeline = [
    { label: "Plan", value: subscription?.currentSubscription?.plan?.name ?? "No active plan", complete: Boolean(subscription?.currentSubscription) },
    { label: "Slot approval", value: nextLiveSlot?.status ?? "Not requested", complete: nextLiveSlot?.status === "approved" },
    { label: "Next live", value: nextLiveSlot ? new Date(nextLiveSlot.startTime).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : "No slot scheduled", complete: Boolean(nextLiveSlot) }
  ];

  return (
    <article className="mobile-vendor-card rounded-[30px] p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="mobile-vendor-eyebrow text-xs font-bold uppercase">Live timeline</p>
          <h2 className="mobile-vendor-heading mt-1 text-xl font-black">Schedule readiness</h2>
        </div>
        <Activity className="h-5 w-5 text-[var(--gold)]" />
      </div>
      <div className="mt-4 grid gap-0">
        {timeline.map((item, index) => (
          <div key={item.label} className="relative grid grid-cols-[24px_1fr] gap-3 pb-4 last:pb-0">
            {index < timeline.length - 1 ? <span className="absolute left-[11px] top-6 h-[calc(100%-0.5rem)] w-px bg-[color:var(--border)]" /> : null}
            <span className={`relative z-10 mt-1 h-6 w-6 rounded-full border-4 border-[var(--card)] ${item.complete ? "bg-emerald-500" : "bg-[var(--gold)]"}`} />
            <div className="mobile-vendor-soft rounded-2xl p-3">
              <p className="mobile-vendor-muted text-[10px] font-black uppercase">{item.label}</p>
              <p className="mobile-vendor-heading mt-1 text-sm font-black">{item.value}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Link href="/vendor/subscription" className={buttonStyles("secondary", "min-h-11 justify-center px-3 py-2 text-xs")}>Plan</Link>
        <Link href="/vendor/live-slots" className={buttonStyles("primary", "min-h-11 justify-center px-3 py-2 text-xs")}>Live slots</Link>
      </div>
    </article>
  );
}

function KpiCard({ icon: Icon, label, value, change }: { icon: typeof Store; label: string; value: string; change: string }) {
  return (
    <div className="mobile-vendor-card rounded-[26px] p-4">
      <div className="flex items-center justify-between">
        <Icon className="mobile-vendor-eyebrow h-5 w-5" />
        <span className="mobile-vendor-pill rounded-full px-2 py-1 text-[10px] font-bold text-emerald-600">{change}</span>
      </div>
      <p className="mobile-vendor-heading mt-5 break-words text-2xl font-black">{value}</p>
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
