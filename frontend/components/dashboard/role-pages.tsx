"use client";

import { FormEvent, HTMLAttributes, ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { Activity, AlertCircle, ArrowRight, BarChart3, Boxes, CalendarClock, CalendarDays, CheckCircle2, ClipboardList, Database, Filter, Gavel, MessageCircleMore, MousePointer2, PlusCircle, Radio, RefreshCw, Search, ShieldCheck, ShoppingBag, Sparkles, Store, UserPlus, Users } from "lucide-react";
import { RoleShell } from "@/components/layout/role-shell";
import { AppImage } from "@/components/ui/app-image";
import { buttonStyles } from "@/components/ui/button";
import { EmptyStateCard, PremiumCard, PremiumMetricCard, SectionHeader, StatusBadge } from "@/components/ui/premium";
import { useExpoStore } from "@/lib/cart-store";
import { avatarOptions } from "@/lib/avatar-options";
import { MAP_TEMPLATE_OPTIONS, getMapTemplate, getTemplateForStallCount, validateMapTemplateCapacity } from "@/lib/map-templates";
import {
  createVendorProduct,
  deleteVendorProduct as deleteVendorProductApi,
  endVendorLive,
  approveAdminVendor,
  createAdminExhibition,
  acceptVendorRequest,
  assignVendorToStall,
  cancelExhibition,
  denyVendorRequest,
  endExhibition,
  getAdminAnalytics,
  getAdminDashboard,
  getAdminExhibitions,
  getAdminExhibitionStalls,
  getAdminStalls,
  getAdminOrders,
  getAdminVendors,
  getAuthMe,
  getBargainState,
  getCart,
  getExhibitionVendorRequests,
  getExhibitions,
  getLiveMessages,
  getLiveSessionState,
  getStalls,
  isApiNotFoundError,
  getVendorProducts,
  getVendorLiveAccess,
  getVendorLiveSlots,
  getVendorSubscription,
  getVendorDashboard,
  getVendorExhibitions,
  getVendorExhibitionRequests,
  getVendorOrders,
  getVendorStall,
  getUserOrders,
  leaveVendorExhibition,
  patchVendorProduct,
  patchAdminExhibition,
  pinLiveProduct,
  pauseExhibition,
  postLiveMessage,
  rejectAdminVendor,
  removeVendorFromStall,
  requestJoinExhibition,
  resumeExhibition,
  startExhibition,
  startBargain,
  startVendorLive,
  acceptBargainGroup,
  closeBargain,
  counterBargain,
  updateCartItem,
  updateVendorOrderStatus
} from "@/lib/api";
import { AdminDashboardResponse, AdminRecentActivity, AvatarOption, BargainState, Exhibition, LiveAccessStatus, LiveKitConnection, LiveSlot, Order, Product, Stall, Vendor, VendorExhibitionRequest, VendorSubscriptionState } from "@/lib/types";
import { formatPrice } from "@/lib/utils";
import { LiveKitStage } from "@/components/live/livekit-stage";
import { LiveChatPanel } from "@/components/live/live-chat-panel";
import { LiveElapsedCounter } from "@/components/marketplace/live-timers";
import { ImageCropUpload } from "@/components/uploads/image-crop-upload";
import { MobileExplorePage } from "@/components/mobile/mobile-explore-page";
import { MobileVendorDashboard } from "@/components/mobile/mobile-vendor-dashboard";
import { ResponsiveDeviceView } from "@/components/mobile/responsive-device-view";
import { EmptyState as MarketplaceEmptyState, MarketplaceBottomNav, PageShell } from "@/components/marketplace/marketplace-ui";

type ExhibitionStatusFilter = "all" | "live" | "scheduled" | "ended";

export function ExhibitionsPageContent() {
  const [exhibitions, setExhibitions] = useState<Awaited<ReturnType<typeof getExhibitions>>>([]);
  const [statusFilter, setStatusFilter] = useState<ExhibitionStatusFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [now, setNow] = useState(() => Date.now());
  const selectedAvatarId = useExpoStore((state) => state.selectedAvatarId);
  const selectedAvatar = avatarOptions.find((avatar) => avatar.id === selectedAvatarId);
  const categories = Array.from(new Set(exhibitions.map((exhibition) => exhibition.category).filter(Boolean))) as string[];
  const filteredExhibitions = exhibitions
    .filter((exhibition) => exhibition.status !== "draft")
    .filter((exhibition) => statusFilter === "all" || (statusFilter === "ended" ? ["ended", "cancelled"].includes(exhibition.status) : exhibition.status === statusFilter))
    .filter((exhibition) => categoryFilter === "all" || exhibition.category === categoryFilter)
    .filter((exhibition) => {
      const query = search.trim().toLowerCase();
      if (!query) return true;
      return `${exhibition.title} ${exhibition.description} ${exhibition.category ?? ""}`.toLowerCase().includes(query);
    })
    .sort((a, b) => {
      const rank = { live: 0, scheduled: 1, paused: 2, ended: 3, cancelled: 4, draft: 5 };
      return (rank[a.status] ?? 5) - (rank[b.status] ?? 5);
    });

  const loadExhibitions = async () => {
    setIsLoading(true);
    try {
      const exhibitionResponse = await getExhibitions();
      setExhibitions(exhibitionResponse);
      setError("");
    } catch (errorValue) {
      setError(errorValue instanceof Error ? errorValue.message : "Could not load exhibitions.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadExhibitions();
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const filterChips: Array<{ label: string; value: ExhibitionStatusFilter }> = [
    { label: "All", value: "all" },
    { label: "Live", value: "live" },
    { label: "Scheduled", value: "scheduled" },
    { label: "Ended", value: "ended" }
  ];

  const formatEventTime = (exhibition: Exhibition) => {
    const targetDate = exhibition.status === "scheduled" ? exhibition.startDate : exhibition.endDate;
    const label = exhibition.status === "scheduled" ? "Starts" : "Ends";
    return `${label} ${new Date(targetDate).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}`;
  };
  const useLegacyDesktopLayout = process.env.NEXT_PUBLIC_EXHIBITIONS_DESKTOP_LAYOUT === "legacy";

  return (
    <RoleShell role="user" title="Customer">
      <ResponsiveDeviceView
        mobile={
          <MobileExplorePage
            exhibitions={exhibitions}
            filteredExhibitions={filteredExhibitions}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            search={search}
            setSearch={setSearch}
            isLoading={isLoading}
            error={error}
            onRetry={loadExhibitions}
            selectedAvatarId={selectedAvatarId}
            categories={categories}
            categoryFilter={categoryFilter}
            setCategoryFilter={setCategoryFilter}
          />
        }
        desktop={
          useLegacyDesktopLayout ? (
      <section className="min-h-[calc(100vh-64px)] p-3 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:p-5">
        <div className="grid gap-5">
          <PremiumCard className="md:hidden p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h1 className="text-2xl font-semibold tracking-[-0.05em] text-[var(--text)]">Live Exhibitions</h1>
                <p className="mt-1 text-sm text-[var(--muted)]">Choose an expo to enter</p>
              </div>
              <Link
                href="/orders"
                className="flex min-h-12 shrink-0 items-center gap-2 rounded-full border border-[color:var(--border)] bg-[var(--surface)] px-2.5 py-2 text-xs font-semibold text-[var(--gold)]"
                aria-label={selectedAvatar ? `Change avatar from ${selectedAvatar.name}` : "Choose avatar"}
              >
                {selectedAvatar ? (
                  <AppImage src={selectedAvatar.image} alt={selectedAvatar.name} fallbackSrc="/avatars/default-avatar.png" className="h-8 w-8 rounded-full" />
                ) : (
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-[var(--surface-strong)] font-serif text-[var(--gold)]">AE</span>
                )}
                <span>{selectedAvatar ? "Change" : "Avatar"}</span>
              </Link>
            </div>

            {!selectedAvatarId ? (
              <p className="mt-3 rounded-2xl border border-[#E9C98D] bg-[#FFF4D8] px-3 py-2 text-xs font-semibold text-[#8A5A24]">
                Choose an avatar before entering a live exhibition.
              </p>
            ) : null}

            <label className="relative mt-4 block">
              <span className="sr-only">Search exhibitions</span>
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--gold)]" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search exhibitions..."
                className="luxury-input h-12 w-full rounded-2xl px-11 text-sm"
              />
            </label>

            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {filterChips.map((chip) => (
                <button
                  key={chip.value}
                  type="button"
                  onClick={() => setStatusFilter(chip.value)}
                  className={`min-h-10 shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                    statusFilter === chip.value
                      ? "border-[color:var(--gold)] bg-secondary text-[var(--gold)]"
                      : "border-[color:var(--border)] bg-[var(--surface)] text-[var(--muted)]"
                  }`}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </PremiumCard>

          <PremiumCard className="relative hidden overflow-hidden p-0 md:block">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_18%,rgba(197,154,74,0.18),transparent_24%)]" />
            <div className="relative grid gap-6 p-5 sm:p-7 xl:grid-cols-[1.1fr_0.9fr]">
              <div className="flex flex-col justify-between">
                <SectionHeader
                  eyebrow="Exhibit â€¢ Connect â€¢ Sell"
                  title="Choose an Exhibition"
                  description="Enter a live exhibition, discover premium vendor stalls, watch live shopping streams, and buy from the products being showcased in real time."
                  action={<Link href="/exhibitions" className={buttonStyles("secondary", "justify-center px-5 py-3")}>Browse Stalls</Link>}
                />
                <div className="mt-6 flex flex-wrap gap-2">
                  {["Live Shopping", "Smart Map", "Vendor Showcase", "Real-time Chat", "Secure & Scalable"].map((item) => (
                    <span key={item} className="rounded-full border border-[#E9D9BE] bg-card px-4 py-2 text-xs font-semibold text-[#8A5A24]">
                      {item}
                    </span>
                  ))}
                </div>
                {!selectedAvatarId ? (
                  <p className="mt-5 rounded-2xl border border-[#E9C98D] bg-[#FFF4D8] px-4 py-3 text-sm text-[#8A5A24]">
                    No avatar selected yet. You can browse exhibitions, but choose an avatar before entering.
                  </p>
                ) : null}
              </div>
              <div className="overflow-hidden rounded-[30px] border border-[#E9D9BE] bg-[#FFFDF8] p-3 shadow-soft">
                <AppImage src="/stalls/stall-placeholder.png" alt="Ankita Designs exhibition marketplace" fallbackSrc="/stalls/stall-placeholder.png" className="h-64 w-full rounded-[24px] sm:h-80 xl:h-full" priority />
              </div>
            </div>
          </PremiumCard>

          <PremiumCard data-tour-id="exhibition-list" className="p-3 sm:p-6">
          {error ? (
            <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <span>{error}</span>
                <button type="button" onClick={loadExhibitions} className="min-h-10 rounded-full border border-red-200 px-4 py-2 text-sm font-semibold">
                  Retry
                </button>
              </div>
            </div>
          ) : null}

          <div className="mt-3 hidden gap-3 md:grid lg:grid-cols-[1fr_auto_auto]">
            <label className="block text-sm font-medium text-slate-700">
              Search exhibitions
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by name or category" className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3" />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Status
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 lg:w-44">
                <option value="all">All</option>
                <option value="live">Live</option>
                <option value="scheduled">Scheduled</option>
                <option value="ended">Ended</option>
              </select>
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Theme
              <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 lg:w-52">
                <option value="all">All themes</option>
                {categories.map((category) => <option key={category} value={category}>{category}</option>)}
              </select>
            </label>
          </div>

          <div className="mt-3 grid gap-4 md:mt-6 lg:grid-cols-2 2xl:grid-cols-3">
            {isLoading ? (
              <div className="rounded-[26px] border border-[color:var(--border)] bg-[var(--surface)] p-6 text-sm font-semibold text-[var(--muted)] lg:col-span-2 2xl:col-span-3">
                Loading exhibitions...
              </div>
            ) : filteredExhibitions.length ? filteredExhibitions.map((exhibition) => {
              const canEnter = exhibition.status === "live" && Boolean(selectedAvatarId);
              return (
                <article key={exhibition.id} data-tour-id="exhibition-card" className="flex flex-col overflow-hidden rounded-[26px] border border-[#E9D9BE] bg-[#FFFDF8] shadow-soft sm:rounded-[30px]">
                  <div className="relative">
                    <AppImage src={exhibition.bannerImage || "/stalls/stall-placeholder.png"} alt={exhibition.title} fallbackSrc="/stalls/stall-placeholder.png" className="h-40 w-full rounded-none sm:h-48" />
                    <div className="absolute left-3 top-3">
                      <StatusBadge status={exhibition.status} />
                    </div>
                  </div>
                  <div className="flex flex-1 flex-col p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[#8A5A24]">{exhibition.category ?? "General"}</p>
                        <h2 className="mt-1 line-clamp-2 text-xl font-semibold tracking-[-0.04em] text-[#17120C] sm:text-2xl">{exhibition.title}</h2>
                      </div>
                      <div className="hidden sm:block">
                        <StatusBadge status={exhibition.status} />
                      </div>
                    </div>
                    <p className="mt-2 line-clamp-1 text-sm leading-6 text-[#7B7065] sm:line-clamp-2">{exhibition.description || "No description provided."}</p>
                    <div className="mt-4 grid grid-cols-3 gap-2">
                      <PremiumMetricCard label="Stalls" value={exhibition.stallCount ?? exhibition.stall_count ?? 0} className="rounded-2xl p-2.5 sm:p-3" />
                      <PremiumMetricCard label="Live" value={exhibition.liveSessionsCount ?? 0} className="rounded-2xl p-2.5 sm:p-3" />
                      <PremiumMetricCard label="Assigned" value={exhibition.assignedStallsCount ?? 0} className="rounded-2xl p-2.5 sm:p-3" />
                    </div>
                    <p className="mt-4 text-xs text-[#7B7065]">
                      {formatEventTime(exhibition)}
                    </p>
                    <PremiereCountdown exhibition={exhibition} now={now} />
                    {canEnter ? (
                      <Link data-tour-id="enter-live-room" href={`/exhibition/${exhibition.id}`} className={buttonStyles("primary", "mt-5 min-h-12 justify-center px-5 py-3")}>
                        Enter Exhibition
                      </Link>
                    ) : (
                      <button type="button" disabled className={buttonStyles("secondary", "mt-5 min-h-12 justify-center px-5 py-3 opacity-60")}>
                        {exhibition.status === "ended" ? "Exhibition Has Ended" : !selectedAvatarId ? "Choose Avatar First" : exhibition.status === "scheduled" ? "Starts Soon" : exhibition.status === "paused" ? "View Details" : "View Details"}
                      </button>
                    )}
                  </div>
                </article>
              );
            }) : (
              <div className="lg:col-span-2 2xl:col-span-3">
                <EmptyStateCard
                  title={exhibitions.length ? "No matching exhibitions" : "No exhibitions available"}
                  description={exhibitions.length ? "Try changing your search or status filter." : "When admin creates and publishes exhibitions, they will appear here."}
                />
              </div>
            )}
          </div>
          </PremiumCard>
        </div>
      </section>
          ) : (
            <DesktopExhibitionsExperience
              categories={categories}
              categoryFilter={categoryFilter}
              error={error}
              exhibitions={exhibitions}
              filterChips={filterChips}
              filteredExhibitions={filteredExhibitions}
              formatEventTime={formatEventTime}
              isLoading={isLoading}
              now={now}
              onRetry={loadExhibitions}
              search={search}
              selectedAvatar={selectedAvatar}
              selectedAvatarId={selectedAvatarId}
              setCategoryFilter={setCategoryFilter}
              setSearch={setSearch}
              setStatusFilter={setStatusFilter}
              statusFilter={statusFilter}
            />
          )
        }
      />
    </RoleShell>
  );
}

function DesktopExhibitionsExperience({
  categories,
  categoryFilter,
  error,
  exhibitions,
  filterChips,
  filteredExhibitions,
  formatEventTime,
  isLoading,
  now,
  onRetry,
  search,
  selectedAvatar,
  selectedAvatarId,
  setCategoryFilter,
  setSearch,
  setStatusFilter,
  statusFilter
}: {
  categories: string[];
  categoryFilter: string;
  error: string;
  exhibitions: Exhibition[];
  filterChips: Array<{ label: string; value: ExhibitionStatusFilter }>;
  filteredExhibitions: Exhibition[];
  formatEventTime: (exhibition: Exhibition) => string;
  isLoading: boolean;
  now: number;
  onRetry: () => void;
  search: string;
  selectedAvatar?: AvatarOption;
  selectedAvatarId: string | null;
  setCategoryFilter: (value: string) => void;
  setSearch: (value: string) => void;
  setStatusFilter: (value: ExhibitionStatusFilter) => void;
  statusFilter: ExhibitionStatusFilter;
}) {
  const reduceMotion = useReducedMotion();
  const publishedExhibitions = exhibitions.filter((exhibition) => exhibition.status !== "draft");
  const liveCount = exhibitions.filter((exhibition) => exhibition.status === "live").length;
  const scheduledCount = exhibitions.filter((exhibition) => exhibition.status === "scheduled").length;
  const featuredExhibition = filteredExhibitions[0] ?? publishedExhibitions[0] ?? null;
  const totalStalls = filteredExhibitions.reduce((sum, exhibition) => sum + (exhibition.stallCount ?? exhibition.stall_count ?? 0), 0);
  const totalLiveRooms = filteredExhibitions.reduce((sum, exhibition) => sum + (exhibition.liveSessionsCount ?? 0), 0);
  const activeFilterCount = [statusFilter !== "all", categoryFilter !== "all", Boolean(search.trim())].filter(Boolean).length;

  const containerVariants = reduceMotion
    ? undefined
    : {
        hidden: { opacity: 0 },
        show: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.04 } }
      };
  const itemVariants = reduceMotion
    ? undefined
    : {
        hidden: { opacity: 0, y: 24 },
        show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: "easeOut" } }
      };

  return (
    <motion.section
      initial={reduceMotion ? false : "hidden"}
      animate={reduceMotion ? undefined : "show"}
      variants={containerVariants}
      className="relative min-h-[calc(100vh-64px)] overflow-hidden p-5 xl:p-8"
    >
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--gold)] to-transparent opacity-50" />
      </div>

      <div className="mx-auto grid max-w-[1840px] gap-6">
        <motion.div variants={itemVariants} className="overflow-hidden rounded-[44px] border border-[color:var(--border)] bg-[var(--surface-strong)] shadow-[var(--shadow-strong)]">
          <div className="relative grid gap-8 p-8 xl:grid-cols-[1.03fr_0.97fr] xl:p-12">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_28%_18%,rgba(216,183,106,0.2),transparent_28%),radial-gradient(circle_at_62%_82%,rgba(244,111,80,0.2),transparent_26%)]" />
            <div className="relative z-10 flex min-h-[410px] flex-col justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border)] bg-[var(--surface)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.32em] text-[var(--gold)]">
                  <Sparkles className="h-4 w-4" />
                  Exhibit â€¢ Connect â€¢ Sell
                </div>
                <h1 className="mt-6 max-w-4xl text-6xl font-semibold leading-[0.96] tracking-[-0.07em] text-[var(--text)] 2xl:text-7xl">
                  Choose an Exhibition
                </h1>
                <p className="mt-5 max-w-3xl text-lg leading-8 text-[var(--muted)]">
                  Enter a live exhibition, discover vendor stalls, watch live shopping streams, and buy from products showcased in real time.
                </p>
              </div>

              <div className="mt-8 grid gap-4">
                <div className="grid gap-3 sm:grid-cols-3">
                  <DesktopHeroMetric label="Available" value={publishedExhibitions.length} />
                  <DesktopHeroMetric label="Live now" value={liveCount} tone="live" />
                  <DesktopHeroMetric label="Scheduled" value={scheduledCount} />
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <Link href="/exhibitions" className={buttonStyles("secondary", "min-h-12 justify-center px-5 py-3")}>
                    {selectedAvatar ? "Change Avatar" : "Choose Avatar"}
                  </Link>
                  <div className="flex items-center gap-3 rounded-full border border-[color:var(--border)] bg-[var(--surface)] px-4 py-2">
                    {selectedAvatar ? (
                      <AppImage src={selectedAvatar.image} alt={selectedAvatar.name} fallbackSrc="/avatars/default-avatar.png" className="h-9 w-9 rounded-full" />
                    ) : (
                      <span className="grid h-9 w-9 place-items-center rounded-full bg-[var(--surface-strong)] text-sm font-semibold text-[var(--gold)]">AE</span>
                    )}
                    <span className="text-sm font-semibold text-[var(--text)]">{selectedAvatar?.name ?? "Avatar required before entry"}</span>
                  </div>
                </div>
                {!selectedAvatarId ? (
                  <div className="rounded-[22px] border border-[color:var(--border)] bg-secondary px-4 py-3 text-sm font-semibold text-[var(--gold)]">
                    You can browse exhibitions now. Choose an avatar before entering a live exhibition.
                  </div>
                ) : null}
              </div>
            </div>

            <div className="relative z-10 min-h-[410px]">
              <motion.div
                animate={reduceMotion ? undefined : { y: [0, -10, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                className="relative h-full overflow-hidden rounded-[38px] border border-[color:var(--border)] bg-[var(--surface-strong)] p-3 shadow-[var(--shadow-soft)]"
              >
                <AppImage
                  src={featuredExhibition?.bannerImage || "/stalls/stall-placeholder.png"}
                  alt={featuredExhibition?.title || "Ankita Designs exhibition"}
                  fallbackSrc="/stalls/stall-placeholder.png"
                  className="h-[410px] rounded-[30px] xl:h-full"
                  priority
                />
                <div className="absolute inset-3 rounded-[30px] bg-gradient-to-t from-black/72 via-black/10 to-transparent" />
                <div className="absolute bottom-7 left-7 right-7">
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--gold)]">Featured floor</p>
                  <h2 className="mt-2 max-w-xl text-3xl font-semibold tracking-[-0.05em] text-white">{featuredExhibition?.title ?? "No published exhibitions yet"}</h2>
                  <p className="mt-2 line-clamp-2 max-w-2xl text-sm leading-6 text-white/72">
                    {featuredExhibition?.description ?? "Once admin publishes exhibitions, the live floor preview appears here from real exhibition data."}
                  </p>
                </div>
              </motion.div>

              <FloatingMapCallout
                className="left-[-26px] top-10"
                label="Current filter"
                value={activeFilterCount ? `${activeFilterCount} active` : "All exhibitions"}
                reduceMotion={Boolean(reduceMotion)}
              />
              <FloatingMapCallout
                className="right-[-18px] top-24"
                label="Live rooms"
                value={String(totalLiveRooms)}
                reduceMotion={Boolean(reduceMotion)}
                delay={0.7}
              />
              <FloatingMapCallout
                className="bottom-12 right-10"
                label="Visible stalls"
                value={String(totalStalls)}
                reduceMotion={Boolean(reduceMotion)}
                delay={1.2}
              />
            </div>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="rounded-[36px] border border-[color:var(--border)] bg-[var(--surface-strong)] p-5 shadow-[var(--shadow-soft)] xl:p-6">
          {error ? (
            <div className="mb-5 rounded-[24px] border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-500">
              <div className="flex items-center justify-between gap-4">
                <span>{error}</span>
                <button type="button" onClick={onRetry} className="min-h-10 rounded-full border border-red-500/30 px-4 py-2 text-sm font-semibold">
                  Retry
                </button>
              </div>
            </div>
          ) : null}

          <div className="grid gap-4 xl:grid-cols-[1fr_auto_auto]">
            <label className="block text-sm font-semibold text-[var(--text)]">
              Search exhibitions
              <span className="relative mt-2 block">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--gold)]" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by exhibition name, category, or description"
                  className="h-14 w-full rounded-[20px] border border-[color:var(--border)] bg-[var(--surface)] px-12 text-base text-[var(--text)] outline-none transition focus:border-[var(--gold)] focus:ring-4 focus:ring-[rgba(216,183,106,0.16)]"
                />
              </span>
            </label>
            <label className="block text-sm font-semibold text-[var(--text)]">
              Status
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as ExhibitionStatusFilter)}
                className="mt-2 h-14 w-full rounded-[20px] border border-[color:var(--border)] bg-[var(--surface)] px-4 text-base text-[var(--text)] outline-none transition focus:border-[var(--gold)] focus:ring-4 focus:ring-[rgba(216,183,106,0.16)] xl:w-48"
              >
                <option value="all">All</option>
                <option value="live">Live</option>
                <option value="scheduled">Scheduled</option>
                <option value="ended">Ended</option>
              </select>
            </label>
            <label className="block text-sm font-semibold text-[var(--text)]">
              Theme
              <select
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value)}
                className="mt-2 h-14 w-full rounded-[20px] border border-[color:var(--border)] bg-[var(--surface)] px-4 text-base text-[var(--text)] outline-none transition focus:border-[var(--gold)] focus:ring-4 focus:ring-[rgba(216,183,106,0.16)] xl:w-56"
              >
                <option value="all">All themes</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {filterChips.map((chip) => (
                <button
                  key={chip.value}
                  type="button"
                  onClick={() => setStatusFilter(chip.value)}
                  className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                    statusFilter === chip.value
                      ? "border-[var(--gold)] bg-secondary text-[var(--gold)] shadow-[var(--shadow-soft)]"
                      : "border-[color:var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:border-[var(--gold)] hover:text-[var(--text)]"
                  }`}
                >
                  <Filter className="h-4 w-4" />
                  {chip.label}
                </button>
              ))}
            </div>
            <p className="rounded-full border border-[color:var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold text-[var(--muted)]">
              Showing <span className="text-[var(--text)]">{filteredExhibitions.length}</span> of <span className="text-[var(--text)]">{publishedExhibitions.length}</span>
            </p>
          </div>
        </motion.div>

        <motion.div variants={containerVariants} className="grid gap-5 xl:grid-cols-2 2xl:grid-cols-3">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, index) => <DesktopExhibitionSkeleton key={index} />)
          ) : filteredExhibitions.length ? (
            filteredExhibitions.map((exhibition) => (
              <DesktopExhibitionCard
                key={exhibition.id}
                exhibition={exhibition}
                formatEventTime={formatEventTime}
                now={now}
                reduceMotion={Boolean(reduceMotion)}
                selectedAvatarId={selectedAvatarId}
              />
            ))
          ) : (
            <motion.div variants={itemVariants} className="xl:col-span-2 2xl:col-span-3">
              <EmptyStateCard
                title={exhibitions.length ? "No matching exhibitions" : "No exhibitions available"}
                description={exhibitions.length ? "Try changing your search, status, or theme filter." : "When admin creates and publishes exhibitions, they will appear here from the database."}
              />
            </motion.div>
          )}
        </motion.div>
      </div>
    </motion.section>
  );
}

function DesktopHeroMetric({ label, value, tone = "default" }: { label: string; value: number; tone?: "default" | "live" }) {
  return (
    <div className="rounded-[24px] border border-[color:var(--border)] bg-[var(--surface)] p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--gold)]">{label}</p>
      <p className={`mt-2 text-3xl font-semibold tracking-[-0.05em] ${tone === "live" ? "text-[var(--coral)]" : "text-[var(--text)]"}`}>{value}</p>
    </div>
  );
}

function FloatingMapCallout({
  className,
  delay = 0,
  label,
  reduceMotion,
  value
}: {
  className?: string;
  delay?: number;
  label: string;
  reduceMotion: boolean;
  value: string;
}) {
  return (
    <motion.div
      animate={reduceMotion ? undefined : { y: [0, -8, 0], opacity: [0.92, 1, 0.92] }}
      transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay }}
      className={`absolute rounded-[22px] border border-[color:var(--border)] bg-[#12101c] px-4 py-3 text-white shadow-[0_24px_70px_rgba(0,0,0,0.28)] ${className ?? ""}`}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--gold)]">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </motion.div>
  );
}

function DesktopExhibitionCard({
  exhibition,
  formatEventTime,
  now,
  reduceMotion,
  selectedAvatarId
}: {
  exhibition: Exhibition;
  formatEventTime: (exhibition: Exhibition) => string;
  now: number;
  reduceMotion: boolean;
  selectedAvatarId: string | null;
}) {
  const canEnter = exhibition.status === "live" && Boolean(selectedAvatarId);
  const stallCount = exhibition.stallCount ?? exhibition.stall_count ?? 0;

  return (
    <motion.article
      variants={reduceMotion ? undefined : { hidden: { opacity: 0, y: 22 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } } }}
      whileHover={reduceMotion ? undefined : { y: -10, scale: 1.01 }}
      transition={{ duration: 0.22 }}
      className="group/expo relative flex min-h-[620px] flex-col overflow-hidden rounded-[34px] border border-[color:var(--border)] bg-[var(--surface-strong)] shadow-[var(--shadow-soft)]"
    >
      <div className="absolute inset-0 opacity-0 transition duration-500 group-hover/expo:opacity-100">
        <div className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-[var(--gold)] to-transparent" />
      </div>

      <div className="relative h-64 overflow-hidden">
        <motion.div whileHover={reduceMotion ? undefined : { scale: 1.06 }} transition={{ duration: 0.55 }} className="h-full">
          <AppImage
            src={exhibition.bannerImage || "/stalls/stall-placeholder.png"}
            alt={exhibition.title}
            fallbackSrc="/stalls/stall-placeholder.png"
            className="h-full rounded-none"
          />
        </motion.div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/82 via-black/16 to-transparent" />
        <div className="absolute left-5 top-5">
          <StatusBadge status={exhibition.status} />
        </div>
        <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--gold)]">{exhibition.category ?? "General"}</p>
            <h2 className="mt-2 line-clamp-2 text-3xl font-semibold leading-none tracking-[-0.06em] text-white">{exhibition.title}</h2>
          </div>
          <CalendarClock className="h-7 w-7 shrink-0 text-white/76" />
        </div>
      </div>

      <div className="relative z-10 flex flex-1 flex-col p-6">
        <p className="line-clamp-2 min-h-[3.5rem] text-base leading-7 text-[var(--muted)]">
          {exhibition.description || "No description provided."}
        </p>

        <div className="mt-5 grid grid-cols-3 gap-3">
          <DesktopCardMetric label="Stalls" value={stallCount} />
          <DesktopCardMetric label="Live" value={exhibition.liveSessionsCount ?? 0} tone="coral" />
          <DesktopCardMetric label="Assigned" value={exhibition.assignedStallsCount ?? 0} />
        </div>

        <div className="mt-5 rounded-[24px] border border-[color:var(--border)] bg-[var(--surface)] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--gold)]">Schedule</p>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{formatEventTime(exhibition)}</p>
        </div>

        <PremiereCountdown exhibition={exhibition} now={now} />

        {canEnter ? (
          <Link href={`/exhibition/${exhibition.id}`} className={buttonStyles("primary", "mt-auto min-h-[3.25rem] justify-center gap-2 px-5 py-4 text-base")}>
            Enter Exhibition
            <ArrowRight className="h-5 w-5" />
          </Link>
        ) : (
          <button type="button" disabled className={buttonStyles("secondary", "mt-auto min-h-[3.25rem] justify-center px-5 py-4 text-base opacity-65")}>
            {exhibition.status === "ended" ? "Exhibition Has Ended" : !selectedAvatarId ? "Choose Avatar First" : exhibition.status === "scheduled" ? "Starts Soon" : exhibition.status === "paused" ? "Paused" : "Not Live"}
          </button>
        )}
      </div>
    </motion.article>
  );
}

function DesktopCardMetric({ label, value, tone = "default" }: { label: string; value: number; tone?: "default" | "coral" }) {
  return (
    <div className="rounded-[20px] border border-[color:var(--border)] bg-[var(--surface)] p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--gold)]">{label}</p>
      <p className={`mt-2 text-3xl font-semibold tracking-[-0.05em] ${tone === "coral" ? "text-[var(--coral)]" : "text-[var(--text)]"}`}>{value}</p>
    </div>
  );
}

function DesktopExhibitionSkeleton() {
  return (
    <div className="min-h-[620px] overflow-hidden rounded-[34px] border border-[color:var(--border)] bg-[var(--surface-strong)] p-5 shadow-[var(--shadow-soft)]">
      <div className="h-60 animate-pulse rounded-[28px] bg-[var(--surface)]" />
      <div className="mt-6 h-7 w-3/4 animate-pulse rounded-full bg-[var(--surface)]" />
      <div className="mt-3 h-4 w-full animate-pulse rounded-full bg-[var(--surface)]" />
      <div className="mt-2 h-4 w-2/3 animate-pulse rounded-full bg-[var(--surface)]" />
      <div className="mt-6 grid grid-cols-3 gap-3">
        <div className="h-24 animate-pulse rounded-[20px] bg-[var(--surface)]" />
        <div className="h-24 animate-pulse rounded-[20px] bg-[var(--surface)]" />
        <div className="h-24 animate-pulse rounded-[20px] bg-[var(--surface)]" />
      </div>
    </div>
  );
}

export function CartPageContent() {
  const router = useRouter();
  const cart = useExpoStore((state) => state.cart);
  const currentUser = useExpoStore((state) => state.currentUser);
  const setCartItems = useExpoStore((state) => state.setCartItems);
  const [error, setError] = useState("");
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discount = total ? Math.min(100, total) : 0;
  const delivery = total ? 49 : 0;
  const payable = total ? total - discount + delivery : 0;

  useEffect(() => {
    if (!currentUser) {
      setError("");
      return;
    }
    let active = true;
    getCart()
      .then((items) => {
        if (active) {
          setCartItems(items);
          setError("");
        }
      })
      .catch((requestError) => {
        if (active) setError(requestError instanceof Error ? requestError.message : "Could not load cart.");
      });
    return () => {
      active = false;
    };
  }, [currentUser, setCartItems]);

  const updateQuantity = async (productId: string, quantity: number) => {
    if (!currentUser) {
      useExpoStore.getState().updateQuantity(productId, quantity);
      return;
    }
    try {
      const items = await updateCartItem(productId, quantity);
      setCartItems(items);
      setError("");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not update cart.");
    }
  };

  return (
    <PageShell>
      <section className="marketplace-container grid min-h-[calc(100dvh-2rem)] gap-5 py-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="marketplace-card rounded-[30px] p-4 sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">Shopping cart</p>
              <h1 className="mt-1 text-3xl font-black tracking-[-0.05em] text-foreground sm:text-4xl">Ready to checkout</h1>
            </div>
            <p className="rounded-full bg-secondary px-3 py-1 text-xs font-black text-secondary-foreground">{cart.length} items</p>
          </div>
          {error ? <p className="mt-4 rounded-2xl border border-red-300 bg-red-100 px-4 py-3 text-sm font-bold text-red-800 dark:border-red-400/30 dark:bg-red-500/10 dark:text-red-200">{error}</p> : null}

          <div className="mt-6 grid gap-3">
            {cart.length ? cart.map((item) => (
              <article key={item.id} className="grid gap-4 rounded-[24px] border border-border bg-background p-3 sm:grid-cols-[7rem_1fr_auto] sm:items-center sm:p-4">
                <AppImage src={item.image} alt={item.title} fallbackSrc="/products/product-placeholder.png" className="aspect-square h-auto w-full rounded-[20px] object-cover sm:h-28 sm:w-28" />
                <div className="min-w-0">
                  <p className="line-clamp-2 text-lg font-black text-foreground">{item.title}</p>
                  <p className="mt-1 truncate text-sm font-semibold text-muted-foreground">{item.vendorName}</p>
                  <p className="mt-3 text-base font-black text-primary">{formatPrice(item.price)}</p>
                </div>
                <div className="flex items-center justify-between gap-2 sm:justify-end">
                  <button type="button" onClick={() => void updateQuantity(item.id, item.quantity - 1)} className="grid h-10 w-10 place-items-center rounded-full border border-border bg-card text-lg font-black text-foreground">-</button>
                  <span className="w-10 text-center text-sm font-black text-foreground">{item.quantity}</span>
                  <button type="button" onClick={() => void updateQuantity(item.id, item.quantity + 1)} className="grid h-10 w-10 place-items-center rounded-full border border-border bg-card text-lg font-black text-foreground">+</button>
                </div>
              </article>
            )) : (
              <MarketplaceEmptyState title="Your cart is empty" description="Products you add from live vendor stalls will appear here." actionHref="/exhibitions" actionLabel="Browse exhibitions" />
            )}
          </div>
        </div>

        <aside className="marketplace-card h-fit rounded-[30px] p-4 sm:p-6 lg:sticky lg:top-24">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">Order summary</p>
          <div className="mt-5 rounded-[24px] border border-border bg-background p-5">
            <div className="flex justify-between text-sm font-semibold text-muted-foreground">
              <span>Subtotal</span>
              <span>{formatPrice(total)}</span>
            </div>
            <div className="mt-3 flex justify-between text-sm font-semibold text-muted-foreground">
              <span>LIVE100</span>
              <span>-{formatPrice(discount)}</span>
            </div>
            <div className="mt-3 flex justify-between text-sm font-semibold text-muted-foreground">
              <span>Delivery</span>
              <span>{formatPrice(delivery)}</span>
            </div>
            <div className="mt-4 flex justify-between border-t border-border pt-4 text-xl font-black text-foreground">
              <span>Total</span>
              <span>{formatPrice(payable)}</span>
            </div>
          </div>
          <button
            disabled={!cart.length}
            onClick={() => router.push("/checkout")}
            className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-2xl bg-primary px-6 text-sm font-black text-primary-foreground transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Checkout
          </button>
        </aside>
      </section>
      <MarketplaceBottomNav />
    </PageShell>
  );
}

function PremiereCountdown({ exhibition, now }: { exhibition: Exhibition; now: number }) {
  const target = exhibition.status === "scheduled" ? new Date(exhibition.startDate).getTime() : exhibition.status === "live" ? new Date(exhibition.endDate).getTime() : 0;
  if (!target) {
    return null;
  }
  const seconds = Math.max(0, Math.floor((target - now) / 1000));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  const label = exhibition.status === "scheduled" ? "Premiere starts in" : "Live closes in";

  return (
    <div className="mt-4 rounded-[24px] border border-[#E9D9BE] bg-[#17120C] p-4 text-white shadow-[0_18px_50px_rgba(23,18,12,0.18)]">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#D8BE82]">{label}</p>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        {[
          ["Hours", hours],
          ["Minutes", minutes],
          ["Seconds", secs]
        ].map(([unit, value]) => (
          <div key={unit} className="rounded-2xl bg-[#1d1d27] px-2 py-3">
            <p className="font-mono text-2xl font-black text-[#FFB199]">{String(value).padStart(2, "0")}</p>
            <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-white/60">{unit}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function UserOrdersPageContent() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    getUserOrders()
      .then((response) => {
        if (active) {
          setOrders(response);
          setError("");
        }
      })
      .catch((errorValue) => {
        if (active) setError(errorValue instanceof Error ? errorValue.message : "Could not load orders.");
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <RoleShell role="user" title="Orders">
      <OrdersSection title="Your orders" orders={orders} error={error} />
    </RoleShell>
  );
}

function VendorPageFrame({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section className={`min-h-[calc(100vh-76px)] bg-[#FAF7F0] px-3 pb-[calc(7.5rem+env(safe-area-inset-bottom))] pt-4 text-[#1B1A17] dark:bg-[#05040A] dark:text-[#FFF8EA] sm:px-5 sm:py-6 xl:px-8 ${className}`}>
      {children}
    </section>
  );
}

function VendorPanel({ children, className = "", ...props }: HTMLAttributes<HTMLDivElement> & { children: ReactNode; className?: string }) {
  return (
    <div {...props} className={`rounded-[30px] border border-[#E8DDCC] bg-[#FFFDF8] shadow-[0_24px_80px_rgba(128,91,44,0.12)] dark:border-white/10 dark:bg-[#11101A] dark:shadow-[0_24px_90px_rgba(0,0,0,0.34)] ${className}`}>
      {children}
    </div>
  );
}

function VendorSectionTitle({
  eyebrow,
  title,
  description,
  action
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        {eyebrow ? <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#B88A3D] dark:text-[#F4C879]">{eyebrow}</p> : null}
        <h1 className="luxury-display mt-2 text-3xl font-semibold tracking-[-0.06em] text-[#1B1A17] dark:text-[#FFF8EA] sm:text-5xl">{title}</h1>
        {description ? <p className="mt-3 max-w-3xl text-sm leading-6 text-[#6F675C] dark:text-white/58">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

function VendorMetricCard({
  label,
  value,
  helper,
  icon: Icon,
  compact = false
}: {
  label: string;
  value: string;
  helper?: string;
  icon?: typeof Store;
  compact?: boolean;
}) {
  return (
    <div className={`${compact ? "rounded-[20px] p-3" : "rounded-[24px] p-4"} border border-[#E8DDCC] bg-[#F7F1E8] dark:border-white/10 dark:bg-card`}>
      <div className="flex items-center justify-between gap-3">
        <p className={`${compact ? "text-[10px] tracking-[0.12em]" : "text-xs tracking-[0.14em]"} font-bold uppercase text-[#8A8176] dark:text-white/45`}>{label}</p>
        {Icon ? (
          <span className={`${compact ? "h-8 w-8 rounded-xl" : "h-9 w-9 rounded-2xl"} grid place-items-center bg-[#B88A3D]/10 text-[#B88A3D] dark:bg-[#D6AC63]/12 dark:text-[#F4C879]`}>
            <Icon className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
          </span>
        ) : null}
      </div>
      <p className={`${compact ? "mt-2 text-xl" : "mt-3 text-2xl"} break-words font-semibold tracking-[-0.04em] text-[#1B1A17] dark:text-[#FFF8EA]`}>{value}</p>
      {helper ? <p className={`${compact ? "mt-0.5 line-clamp-2 text-[10px] leading-4" : "mt-1 text-xs leading-5"} text-[#6F675C] dark:text-white/48`}>{helper}</p> : null}
    </div>
  );
}

function VendorEmptyState({
  icon: Icon,
  title,
  description,
  actionHref,
  actionLabel,
  compact = false
}: {
  icon: typeof Store;
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
  compact?: boolean;
}) {
  return (
    <div className={`flex flex-col items-center justify-center rounded-[26px] border border-dashed border-[#D7BE86] bg-[#F7F1E8] p-6 text-center dark:border-[#D6AC63]/30 dark:bg-card ${compact ? "min-h-[180px]" : "min-h-[260px]"}`}>
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-[#B88A3D]/10 text-[#B88A3D] dark:bg-[#D6AC63]/12 dark:text-[#F4C879]">
        <Icon className="h-6 w-6" />
      </span>
      <h3 className="mt-4 text-lg font-semibold tracking-[-0.03em] text-[#1B1A17] dark:text-[#FFF8EA]">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-6 text-[#6F675C] dark:text-white/56">{description}</p>
      {actionHref && actionLabel ? (
        <Link href={actionHref} className={buttonStyles("primary", "mt-5 justify-center px-5 py-3 text-sm")}>
          {actionLabel}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Link>
      ) : null}
    </div>
  );
}

function VendorLoadingState({ rows = 3, className = "" }: { rows?: number; className?: string }) {
  return (
    <div className={`grid gap-3 ${className}`}>
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="min-h-28 animate-pulse rounded-[24px] border border-[#E8DDCC] bg-[#F7F1E8] dark:border-white/10 dark:bg-[#1d1d27]" />
      ))}
    </div>
  );
}

function VendorAlert({ tone = "error", children }: { tone?: "error" | "warning" | "info"; children: ReactNode }) {
  const toneClass =
    tone === "warning"
      ? "border-amber-300/55 bg-amber-100 text-amber-900 dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-100"
      : tone === "info"
        ? "border-[#D7BE86] bg-[#FFF5DF] text-[#8A5A24] dark:border-[#D6AC63]/30 dark:bg-[#D6AC63]/10 dark:text-[#F4C879]"
        : "border-red-200 bg-red-50 text-red-700 dark:border-red-500/25 dark:bg-red-500/10 dark:text-red-100";
  return <p className={`rounded-[20px] border px-4 py-3 text-sm font-medium ${toneClass}`}>{children}</p>;
}

function hasUploadedBrandAsset(value?: string | null) {
  const normalized = value?.trim() ?? "";
  return Boolean(normalized) && !normalized.includes("stall-placeholder");
}

const vendorInputClass =
  "min-h-12 rounded-[18px] border border-[#E8DDCC] bg-white px-4 py-3 text-sm text-[#1B1A17] outline-none transition placeholder:text-[#8A8176] focus:border-[#B88A3D] dark:border-white/10 dark:bg-[#1d1d27] dark:text-[#FFF8EA] dark:placeholder:text-white/38 dark:focus:border-[#D6AC63]/70";

export function VendorDashboardContent() {
  const currentVendor = useExpoStore((state) => state.currentVendor);
  const setCurrentUser = useExpoStore((state) => state.setCurrentUser);
  const [dashboard, setDashboard] = useState<Awaited<ReturnType<typeof getVendorDashboard>> | null>(null);
  const [stall, setStall] = useState<Awaited<ReturnType<typeof getStalls>>[number] | null>(null);
  const [exhibition, setExhibition] = useState<Awaited<ReturnType<typeof getExhibitions>>[number] | null>(null);
  const [participationRequests, setParticipationRequests] = useState<VendorExhibitionRequest[]>([]);
  const [subscriptionState, setSubscriptionState] = useState<VendorSubscriptionState | null>(null);
  const [liveSlots, setLiveSlots] = useState<LiveSlot[]>([]);
  const [liveAccess, setLiveAccess] = useState<LiveAccessStatus | null>(null);
  const [error, setError] = useState("");
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(true);

  useEffect(() => {
    let active = true;
    setIsLoadingDashboard(true);
    Promise.all([
      getVendorDashboard(),
      getVendorStall().catch(() => null),
      getExhibitions(),
      getVendorExhibitionRequests(),
      getVendorSubscription().catch(() => null),
      getVendorLiveSlots().catch(() => []),
      getVendorLiveAccess().catch(() => null)
    ])
      .then(([dashboardResponse, stallResponse, exhibitionResponse, requestResponse, subscriptionResponse, liveSlotResponse, liveAccessResponse]) => {
        if (!active) return;
        const assignedStall = dashboardResponse.assignedStall ?? stallResponse;
        setDashboard(dashboardResponse);
        setStall(assignedStall);
        setParticipationRequests(requestResponse);
        setSubscriptionState(subscriptionResponse);
        setLiveSlots(liveSlotResponse);
        setLiveAccess(liveAccessResponse);
        setExhibition(assignedStall ? exhibitionResponse.find((item) => item.id === assignedStall.exhibitionId) ?? null : null);
        setError("");
      })
      .catch((errorValue) => {
        if (active) setError(errorValue instanceof Error ? errorValue.message : "Could not load vendor dashboard.");
      })
      .finally(() => {
        if (active) setIsLoadingDashboard(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (currentVendor?.status !== "pending") {
      return;
    }

    let isActive = true;
    const refreshVendorStatus = async () => {
      try {
        const session = await getAuthMe();
        if (isActive) {
          setCurrentUser(session.user, session.token, session.vendor ?? null);
        }
      } catch {
        // Keep the existing pending state if the session refresh fails transiently.
      }
    };

    void refreshVendorStatus();
    const intervalId = window.setInterval(refreshVendorStatus, 10000);
    return () => {
      isActive = false;
      window.clearInterval(intervalId);
    };
  }, [currentVendor?.status, setCurrentUser]);

  if (currentVendor?.status === "pending") {
    return (
      <RoleShell role="vendor" title="Vendor">
        <VendorPageFrame>
          <VendorPanel className="mx-auto max-w-5xl overflow-hidden p-5 sm:p-7">
            <VendorSectionTitle
              eyebrow="Approval pending"
              title="Your vendor registration is under review"
              description="Admin approval is required before products, live sessions, and stall assignments become available."
              action={<AdminStatusPill status="pending" />}
            />
            <div className="mt-7 grid gap-4 md:grid-cols-3">
              <VendorMetricCard label="Business" value={currentVendor.businessName} icon={Store} />
              <VendorMetricCard label="Category" value={currentVendor.businessCategory ?? "Not provided"} icon={Boxes} />
              <VendorMetricCard label="Next step" value="Wait for approval" helper="This page refreshes your session automatically." icon={RefreshCw} />
            </div>
            <div className="mt-5">
              <VendorAlert tone="info">
                Once approved, you can request exhibition participation, receive a stall assignment, add products, and go live.
              </VendorAlert>
            </div>
          </VendorPanel>
        </VendorPageFrame>
      </RoleShell>
    );
  }

  if (currentVendor?.status === "rejected") {
    return (
      <RoleShell role="vendor" title="Vendor">
        <VendorPageFrame>
          <VendorPanel className="mx-auto max-w-5xl p-5 sm:p-7">
            <VendorSectionTitle
              eyebrow="Registration rejected"
              title="Vendor access is not active"
              description="Contact the admin team before attempting to sell products, request stalls, or start live sessions."
              action={<AdminStatusPill status="rejected" />}
            />
            <div className="mt-7">
              <VendorAlert>Your vendor registration was rejected. No selling actions are available for this account.</VendorAlert>
            </div>
          </VendorPanel>
        </VendorPageFrame>
      </RoleShell>
    );
  }

  const dashboardStats = dashboard?.stats;
  const assignedStall = dashboard?.assignedStall ?? stall;
  const latestRequest = dashboard?.participation ?? participationRequests[0];
  const currentLiveSession = dashboard?.currentLiveSession ?? (dashboard?.liveSession?.status === "live" ? dashboard.liveSession : null);
  const pinnedProduct = currentLiveSession?.pinned_product ?? (currentLiveSession ? dashboard?.pinnedProduct : null);
  const revenue = dashboardStats?.revenue ?? 0;
  const productCount = dashboardStats?.productCount ?? dashboard?.products?.length ?? 0;
  const orderCount = dashboardStats?.orderCount ?? dashboard?.orders.length ?? 0;
  const viewerCount = dashboardStats?.visitors ?? dashboard?.activeViewers ?? 0;
  const liveConsoleUnlocked = Boolean(assignedStall && productCount >= 2);
  const nextApprovedSlot = liveSlots
    .filter((slot) => slot.status === "approved" && new Date(slot.endTime).getTime() >= Date.now())
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())[0] ?? null;
  const liveStatus = !assignedStall
    ? "No assigned stall"
    : currentLiveSession?.status === "live"
      ? "Live now"
      : liveConsoleUnlocked
        ? "Ready to go live"
        : "Offline";

  return (
    <RoleShell role="vendor" title="Vendor">
      <ResponsiveDeviceView
        mobile={
          <MobileVendorDashboard
            dashboard={dashboard}
            stall={assignedStall}
            exhibition={exhibition}
            latestRequest={latestRequest}
            revenue={revenue}
            subscription={subscriptionState}
            nextLiveSlot={nextApprovedSlot}
            error={error}
          />
        }
        desktop={
          <VendorPageFrame>
            <div className="grid gap-5 xl:grid-cols-[1fr_0.42fr]">
              <VendorPanel className="relative overflow-hidden p-5 sm:p-7">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_10%,rgba(255,120,92,0.14),transparent_30%),radial-gradient(circle_at_5%_15%,rgba(97,73,154,0.16),transparent_34%)]" />
                <div className="relative">
                  <VendorSectionTitle
                    eyebrow={exhibition?.title ?? "Vendor command center"}
                    title={dashboard?.vendor.displayName ?? currentVendor?.businessName ?? "Vendor workspace"}
                    description="Track stall status, products, live selling, orders, and revenue from database records."
                    action={<AdminStatusPill status={liveStatus} />}
                  />
                  {error ? <div className="mt-5"><VendorAlert>{error}</VendorAlert></div> : null}
                  {isLoadingDashboard ? (
                    <VendorLoadingState rows={6} className="mt-7 sm:grid-cols-2 xl:grid-cols-3" />
                  ) : (
                    <>
                  <div data-tour-id="vendor-approval-status" className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <VendorMetricCard label="Revenue" value={formatPrice(revenue)} helper="Paid and confirmed order value" icon={ShoppingBag} />
                        <VendorMetricCard label="Orders" value={String(orderCount)} helper="Orders containing your products" icon={ClipboardList} />
                        <VendorMetricCard label="Products" value={String(productCount)} helper={productCount ? "Catalog available for selling" : "Add products to sell live"} icon={Boxes} />
                        <VendorMetricCard label="Viewers" value={String(viewerCount)} helper="Current persisted live viewers" icon={Activity} />
                      </div>
                      <div className="mt-5 grid gap-4 lg:grid-cols-2">
                        <VendorPanel className="bg-[#F7F1E8] p-5 shadow-none dark:bg-[#171720]">
                          <h2 className="text-xl font-semibold tracking-[-0.04em] text-[#1B1A17] dark:text-[#FFF8EA]">Operations</h2>
                          <div className="mt-4 grid gap-3">
                            <VendorMetricCard label="Assigned stall" value={assignedStall?.name ?? "No stall assigned yet"} helper={assignedStall?.category ?? "Request participation before assignment"} icon={Store} />
                        <VendorMetricCard label="Participation" value={latestRequest ? `${latestRequest.status} request` : "No request submitted"} helper={latestRequest?.message || "Request an exhibition from the exhibitions tab"} icon={UserPlus} />
                        <VendorMetricCard label="Pinned product" value={pinnedProduct?.title ?? "No pinned product"} helper={currentLiveSession ? "Pin a product in the live console" : "Start live to showcase products"} icon={Radio} />
                        <VendorMetricCard label="Plan" value={subscriptionState?.currentSubscription?.plan?.name ?? "No active plan"} helper={subscriptionState?.latestSubscription ? `${subscriptionState.latestSubscription.status} request` : "Request a plan for controlled live access"} icon={ShieldCheck} />
                        <VendorMetricCard label="Next live slot" value={nextApprovedSlot ? formatDateTime(nextApprovedSlot.startTime) : "No approved slot"} helper={liveAccess?.enforcementEnabled ? liveAccess.message : "Slot gating is in rollout mode"} icon={CalendarClock} />
                      </div>
                        </VendorPanel>
                        <VendorPanel className="flex flex-col overflow-hidden bg-[#F7F1E8] shadow-none dark:bg-[#171720]">
                          {dashboard?.vendor.image ? (
                            <AppImage src={dashboard.vendor.image} alt={dashboard.vendor.displayName} className="h-64 w-full rounded-none" />
                          ) : (
                            <div className="grid h-64 place-items-center bg-[radial-gradient(circle_at_70%_20%,rgba(255,120,92,0.22),transparent_32%),linear-gradient(135deg,#F7F1E8,#FFFDF8)] text-sm text-[#6F675C] dark:bg-[radial-gradient(circle_at_70%_20%,rgba(255,120,92,0.16),transparent_32%),linear-gradient(135deg,#11101A,#171525)] dark:text-white/54">
                              Vendor image unavailable
                            </div>
                          )}
                          <div className="grid gap-3 p-5 sm:grid-cols-2">
                            <Link data-tour-id="vendor-go-live" href={liveConsoleUnlocked || currentLiveSession ? "/vendor/live" : assignedStall ? "/vendor/products" : "/vendor/exhibitions"} className={buttonStyles("primary", "justify-center px-5 py-3")}>
                              {currentLiveSession ? "Open Live Console" : liveConsoleUnlocked ? "Start Live Session" : assignedStall ? "Add 2 Products" : "Request Exhibition"}
                            </Link>
                            <Link data-tour-id="vendor-add-product" href={assignedStall ? "/vendor/products" : "/vendor/exhibitions"} className={buttonStyles("secondary", "justify-center px-5 py-3")}>
                              {assignedStall ? "Manage Products" : "Request Exhibition"}
                            </Link>
                          </div>
                        </VendorPanel>
                      </div>
                    </>
                  )}
                </div>
              </VendorPanel>
              <div className="grid gap-5">
                <VendorPanel className="p-5">
                  <h2 className="text-xl font-semibold tracking-[-0.04em] text-[#1B1A17] dark:text-[#FFF8EA]">Quick actions</h2>
                  <div className="mt-4 grid gap-3">
                    <Link href="/vendor/exhibitions" className={buttonStyles("primary", "justify-between px-5 py-4")}>Join Exhibition <ArrowRight className="h-4 w-4" /></Link>
                    <Link href="/vendor/stall" className={buttonStyles("secondary", "justify-between px-5 py-4")}>Stall <ArrowRight className="h-4 w-4" /></Link>
                    <Link href="/vendor/products" className={buttonStyles("secondary", "justify-between px-5 py-4")}>Products <ArrowRight className="h-4 w-4" /></Link>
                    <Link href="/vendor/subscription" className={buttonStyles("secondary", "justify-between px-5 py-4")}>Subscription <ArrowRight className="h-4 w-4" /></Link>
                    <Link href="/vendor/live-slots" className={buttonStyles("secondary", "justify-between px-5 py-4")}>Live Slots <ArrowRight className="h-4 w-4" /></Link>
                    <Link data-tour-id="vendor-orders" href="/vendor/orders" className={buttonStyles("secondary", "justify-between px-5 py-4")}>Orders <ArrowRight className="h-4 w-4" /></Link>
                  </div>
                </VendorPanel>
                <VendorPanel className="p-5">
                  <h2 className="text-xl font-semibold tracking-[-0.04em] text-[#1B1A17] dark:text-[#FFF8EA]">Readiness</h2>
                  <div className="mt-4 grid gap-3">
                    {[
                      { label: "Vendor approved", complete: currentVendor?.status === "approved" },
                      { label: "Stall assigned", complete: Boolean(assignedStall) },
                      { label: "At least 2 active products", complete: productCount >= 2 }
                    ].map((item) => (
                      <div key={item.label} className="flex items-center gap-3 rounded-[18px] border border-[#E8DDCC] bg-[#F7F1E8] px-4 py-3 dark:border-white/10 dark:bg-[#171720]">
                        <span className={`grid h-9 w-9 place-items-center rounded-full ${item.complete ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300" : "bg-[#B88A3D]/10 text-[#B88A3D] dark:text-[#F4C879]"}`}>
                          {item.complete ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                        </span>
                        <p className="text-sm font-semibold text-[#1B1A17] dark:text-[#FFF8EA]">{item.label}</p>
                      </div>
                    ))}
                  </div>
                </VendorPanel>
              </div>
            </div>
          </VendorPageFrame>
        }
      />
    </RoleShell>
  );
}

export function VendorExhibitionsPageContent() {
  const currentVendor = useExpoStore((state) => state.currentVendor);
  const [exhibitions, setExhibitions] = useState<Awaited<ReturnType<typeof getVendorExhibitions>>>([]);
  const [requests, setRequests] = useState<VendorExhibitionRequest[]>([]);
  const [messageByExhibition, setMessageByExhibition] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const loadVendorExhibitions = async () => {
    setIsLoading(true);
    try {
      const [exhibitionResponse, requestResponse] = await Promise.all([getVendorExhibitions(), getVendorExhibitionRequests()]);
      setExhibitions(exhibitionResponse);
      setRequests(requestResponse);
      setError("");
    } catch (errorValue) {
      setError(errorValue instanceof Error ? errorValue.message : "Could not load exhibitions.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadVendorExhibitions();
  }, []);

  const requestByExhibition = new Map<string, VendorExhibitionRequest>();
  for (const request of requests) {
    if (!requestByExhibition.has(request.exhibition_id)) {
      requestByExhibition.set(request.exhibition_id, request);
    }
  }
  const uniqueRequests = Array.from(requestByExhibition.values());
  const exhibitionById = new Map(exhibitions.map((exhibition) => [exhibition.id, exhibition]));
  const availableExhibitions = exhibitions.filter((exhibition) => exhibition.status !== "ended" && exhibition.status !== "cancelled" && exhibition.status !== "draft");
  const displayRequestStatus = (request: VendorExhibitionRequest) => {
    const exhibition = exhibitionById.get(request.exhibition_id);
    return exhibition?.status === "ended" ? "completed" : request.status;
  };
  const requestStatusLabel = (request: VendorExhibitionRequest) => {
    const status = displayRequestStatus(request);
    if (status === "accepted") return "active";
    if (status === "denied") return "denied";
    if (status === "withdrawn") return "withdrawn";
    if (status === "completed") return "completed";
    return "pending";
  };
  const vendorIsApproved = currentVendor?.status === "approved";
  const leaveExhibition = async (exhibitionId: string, title: string) => {
    const confirmed = window.confirm(`Leave "${title}"? Your participation request will be withdrawn and any assigned stall will be released.`);
    if (!confirmed) return;
    setIsSubmitting(`leave:${exhibitionId}`);
    try {
      await leaveVendorExhibition(exhibitionId);
      await loadVendorExhibitions();
      setError("");
    } catch (errorValue) {
      setError(errorValue instanceof Error ? errorValue.message : "Could not leave exhibition.");
    } finally {
      setIsSubmitting("");
    }
  };

  return (
    <RoleShell role="vendor" title="Exhibitions">
      <VendorPageFrame>
        <div className="vendor-exhibition-page mx-auto grid max-w-7xl items-start gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
        <div className="vendor-exhibition-panel vendor-exhibition-hero-panel relative overflow-hidden rounded-[30px] p-4 sm:p-7">
          <div className="vendor-exhibition-hero-glow pointer-events-none absolute inset-0" />
          <div className="relative">
          <VendorSectionTitle
            eyebrow="Vendor participation"
            title="Join exhibitions"
            description="Request access to published exhibitions. Approved requests can be assigned to real database stalls by admin."
          />
          {error ? <div className="mt-5"><VendorAlert>{error}</VendorAlert></div> : null}
          {!vendorIsApproved ? (
            <div className="mt-5">
            <VendorAlert tone="warning">
              Your vendor account is {currentVendor?.status ?? "pending"}. Admin approval is required before requesting exhibition participation.
            </VendorAlert>
            </div>
          ) : null}
          <button type="button" onClick={loadVendorExhibitions} className={buttonStyles("primary", "mt-5 w-full justify-center px-4 py-3 text-sm")}>
            <RefreshCw className="mr-2 h-4 w-4" />Refresh exhibition data
          </button>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <VendorMetricCard compact label="Available" value={String(availableExhibitions.length)} helper="Live or upcoming" icon={CalendarDays} />
            <VendorMetricCard compact label="Active" value={String(uniqueRequests.filter((request) => requestStatusLabel(request) === "active").length)} helper="Accepted now" icon={CheckCircle2} />
            <VendorMetricCard compact label="Pending" value={String(uniqueRequests.filter((request) => requestStatusLabel(request) === "pending").length)} helper="Admin review" icon={RefreshCw} />
            <VendorMetricCard compact label="Completed" value={String(uniqueRequests.filter((request) => requestStatusLabel(request) === "completed").length)} helper="Your ended events" icon={ClipboardList} />
          </div>
          <div className="vendor-exhibition-workflow mt-5 rounded-[20px] p-4 text-sm leading-6">
            <h2 className="text-lg font-semibold text-[#1B1A17] dark:text-[#FFF8EA]">How it works</h2>
            <div className="mt-3 grid gap-2">
              <span className="vendor-exhibition-step rounded-xl px-3 py-2">Request an available exhibition.</span>
              <span className="vendor-exhibition-step rounded-xl px-3 py-2">Admin accepts and assigns your stall.</span>
              <span className="vendor-exhibition-step rounded-xl px-3 py-2">Ended exhibitions move to completed.</span>
            </div>
          </div>
          <div className="mt-5 grid gap-3">
            <h2 className="text-lg font-semibold tracking-[-0.03em] text-[#1B1A17] dark:text-[#FFF8EA]">Your requests</h2>
            {isLoading ? (
              <VendorLoadingState rows={3} />
            ) : uniqueRequests.length ? uniqueRequests.map((request) => (
              <div key={request.id} className="vendor-exhibition-request-card rounded-[24px] p-4">
                {(() => {
                  const exhibition = exhibitionById.get(request.exhibition_id);
                  const exhibitionTitle = exhibition?.title ?? request.exhibition_id;
                  const displayStatus = displayRequestStatus(request);
                  const canLeave = exhibition?.status !== "ended" && (request.status === "pending" || request.status === "accepted");
                  return (
                    <>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-[#1B1A17] dark:text-[#FFF8EA]">{exhibitionTitle}</p>
                    <p className="mt-1 text-sm text-[#6F675C] dark:text-white/52">{request.message || "No participation note."}</p>
                  </div>
                  <StatusBadge status={displayStatus === "accepted" ? "active" : displayStatus === "denied" ? "denied" : displayStatus} />
                </div>
                {displayStatus === "completed" ? (
                  <p className="mt-3 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-[#6F675C] dark:bg-[#1d1d27] dark:text-white/70">Exhibition completed.</p>
                ) : request.admin_note ? <p className="mt-3 rounded-2xl bg-white px-4 py-3 text-sm text-[#6F675C] dark:bg-[#1d1d27] dark:text-white/54">Admin note: {request.admin_note}</p> : null}
                {canLeave ? (
                  <button
                    type="button"
                    disabled={isSubmitting === `leave:${request.exhibition_id}`}
                    onClick={() => leaveExhibition(request.exhibition_id, exhibitionTitle)}
                    className={buttonStyles("secondary", "mt-3 w-full justify-center border-red-200 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-60 dark:border-red-400/30 dark:text-red-300 dark:hover:bg-red-500/10")}
                  >
                    {isSubmitting === `leave:${request.exhibition_id}` ? "Leaving..." : "Leave Exhibition"}
                  </button>
                ) : null}
                    </>
                  );
                })()}
              </div>
            )) : (
              <VendorEmptyState icon={UserPlus} title="No requests yet" description="Participation requests will appear here after you request an exhibition." compact />
            )}
          </div>
          </div>
        </div>
        <div className="vendor-exhibition-panel vendor-exhibition-list-panel rounded-[30px] p-4 sm:p-7">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#B88A3D] dark:text-[#F4C879]">Database exhibitions</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#1B1A17] dark:text-[#FFF8EA]">Available exhibitions</h2>
            </div>
            <div className="self-start sm:self-auto"><AdminStatusPill status={`${availableExhibitions.length} available`} /></div>
          </div>
          <div className="mt-5 grid gap-4">
            {isLoading ? (
              <VendorLoadingState rows={4} />
            ) : exhibitions.length ? exhibitions.map((exhibition) => {
              const request = requestByExhibition.get(exhibition.id);
              const isEnded = exhibition.status === "ended";
              const canRequest = !isEnded && vendorIsApproved && (!request || request.status === "denied" || request.status === "withdrawn");
              const requestDisplay = request ? displayRequestStatus(request) : null;
              return (
                <div key={exhibition.id} className="vendor-exhibition-card rounded-[22px] p-4 transition hover:-translate-y-0.5">
                  <div className="grid gap-4 md:grid-cols-[96px_minmax(0,1fr)] xl:grid-cols-[112px_minmax(0,1fr)_auto] xl:items-start">
                    <AppImage src={exhibition.bannerImage} alt={exhibition.title} fallbackSrc="/stalls/stall-placeholder.png" className="h-24 w-full rounded-[18px] md:h-24" />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge status={exhibition.status} />
                        {requestDisplay ? <StatusBadge status={requestDisplay === "accepted" ? "active" : requestDisplay} /> : null}
                        <span className="rounded-full border border-[#E8DDCC] bg-[#FFF7E7] px-3 py-1 text-xs font-semibold text-[#6F675C] dark:border-white/10 dark:bg-[#1d1d27] dark:text-white/62">
                          {exhibition.stallCount ?? 0} stalls
                        </span>
                        {exhibition.liveSessionsCount ? (
                          <span className="rounded-full bg-red-500 px-3 py-1 text-xs font-black text-white">{exhibition.liveSessionsCount} live</span>
                        ) : null}
                      </div>
                      <h3 className="mt-2 truncate text-xl font-semibold text-[#1B1A17] dark:text-[#FFF8EA]">{exhibition.title}</h3>
                      <p className="mt-1 line-clamp-1 text-sm leading-6 text-[#6F675C] dark:text-white/62">{exhibition.description || "No description provided."}</p>
                      {request ? (
                        <p className="vendor-exhibition-note mt-3 rounded-xl px-3 py-2 text-sm">
                          Request status: <span className="font-semibold capitalize text-[#1B1A17] dark:text-[#FFF8EA]">{requestDisplay === "accepted" ? "active" : requestDisplay}</span>
                        </p>
                      ) : null}
                      {isEnded ? (
                        <p className="vendor-exhibition-note mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 dark:border-white/12 dark:bg-[#23232d] dark:text-slate-200">
                          Exhibition has ended. Vendor participation, stall assignment, and live selling are closed.
                        </p>
                      ) : null}
                      {canRequest ? (
                        <textarea
                          value={messageByExhibition[exhibition.id] ?? ""}
                          onChange={(event) => setMessageByExhibition((state) => ({ ...state, [exhibition.id]: event.target.value }))}
                          placeholder="Optional note for admin"
                          className={`${vendorInputClass} mt-3 min-h-16`}
                        />
                      ) : !request && !vendorIsApproved && !isEnded ? (
                        <p className="vendor-exhibition-note mt-4 rounded-2xl px-4 py-3 text-sm">
                          Admin approval is required before you can request this exhibition.
                        </p>
                      ) : null}
                    </div>
                    <div className="grid gap-2 md:grid-cols-2 xl:min-w-56 xl:grid-cols-1">
                      {canRequest ? (
                        <button
                          type="button"
                          disabled={isSubmitting === exhibition.id}
                          onClick={async () => {
                            setIsSubmitting(exhibition.id);
                            try {
                              await requestJoinExhibition(exhibition.id, messageByExhibition[exhibition.id] ?? "");
                              await loadVendorExhibitions();
                            } catch (errorValue) {
                              setError(errorValue instanceof Error ? errorValue.message : "Could not submit participation request.");
                            } finally {
                              setIsSubmitting("");
                            }
                          }}
                          className={buttonStyles("primary", "justify-center px-5 py-3 disabled:opacity-60")}
                        >
                          {isSubmitting === exhibition.id ? "Submitting..." : request?.status === "withdrawn" || request?.status === "denied" ? "Request Again" : "Request Participation"}
                        </button>
                      ) : null}
                      {request?.status === "accepted" && !isEnded ? (
                        <>
                          <Link href="/vendor/stall" className={buttonStyles("secondary", "justify-center px-5 py-3")}>
                            Check Stall Assignment
                          </Link>
                          <button
                            type="button"
                            disabled={isSubmitting === `leave:${exhibition.id}`}
                            onClick={() => leaveExhibition(exhibition.id, exhibition.title)}
                            className={buttonStyles("secondary", "justify-center border-red-200 px-5 py-3 text-red-600 hover:bg-red-50 disabled:opacity-60 dark:border-red-400/30 dark:text-red-300 dark:hover:bg-red-500/10")}
                          >
                            {isSubmitting === `leave:${exhibition.id}` ? "Leaving..." : "Leave Exhibition"}
                          </button>
                        </>
                      ) : null}
                      {request?.status === "pending" && !isEnded ? (
                        <p className="rounded-xl border border-[#E8DDCC] bg-[#FFF7E7] px-4 py-3 text-sm font-semibold text-[#6F675C] dark:border-white/10 dark:bg-[#1d1d27] dark:text-white/62">
                          Awaiting admin approval.
                        </p>
                      ) : null}
                      {isEnded ? (
                        <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 dark:border-white/12 dark:bg-[#23232d] dark:text-slate-200">
                          Completed exhibition.
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            }) : (
              <VendorEmptyState icon={CalendarDays} title="No exhibitions available" description="Approved vendors can request participation once admin publishes exhibitions." compact={false} />
            )}
          </div>
        </div>
        </div>
      </VendorPageFrame>
    </RoleShell>
  );
}

export function VendorStallPageContent() {
  const [stall, setStall] = useState<Awaited<ReturnType<typeof getStalls>>[number] | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    getVendorStall()
      .then((response) => {
        if (active) {
          setStall(response);
          setError("");
        }
      })
      .catch((errorValue) => {
        if (active) setError(errorValue instanceof Error ? errorValue.message : "Could not load stall.");
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <RoleShell role="vendor" title="Stall">
      <VendorPageFrame>
        <div className="grid gap-5 xl:grid-cols-[1fr_0.42fr]">
          <VendorPanel className="p-5 sm:p-7">
            <VendorSectionTitle
              eyebrow="Assigned stall"
              title={stall?.name ?? "No stall assigned"}
              description={stall ? "This stall assignment is loaded from the backend for your vendor account." : "Admin assigns stalls after accepting your exhibition participation request."}
              action={stall ? <AdminStatusPill status={stall.status} /> : <AdminStatusPill status="unassigned" />}
            />
            {error ? <div className="mt-5"><VendorAlert>{error}</VendorAlert></div> : null}
            {isLoading ? (
              <VendorLoadingState rows={4} className="mt-7 sm:grid-cols-2" />
            ) : stall ? (
              <>
                <div className="mt-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
                  <VendorMetricCard compact label="Stall number" value={stall.number ?? stall.stallCode ?? stall.id} icon={Store} />
                  <VendorMetricCard compact label="Category" value={stall.category ?? "No category"} icon={Boxes} />
                  <VendorMetricCard compact label="Live status" value={stall.liveStatus ?? "offline"} helper="Customer-facing status" icon={Radio} />
                  <VendorMetricCard compact label="Product limit" value={String(stall.productLimit ?? "-")} helper={stall.stallType ?? "Assigned stall"} icon={Boxes} />
                </div>
                <div className="mt-5">
                  <VendorAlert tone="info">
                    Controlled live access uses approved live slots. Request or review your slot window from the Live Slots page before planned streams.
                  </VendorAlert>
                </div>
                <div className="mt-6 grid gap-3 pb-[calc(7.5rem+env(safe-area-inset-bottom))] sm:grid-cols-3 sm:pb-0">
                  <Link href="/vendor/products" className={buttonStyles("primary", "justify-center px-5 py-3")}>Add Products</Link>
                  <Link href="/vendor/products" className={buttonStyles("secondary", "justify-center px-5 py-3")}>Manage Products</Link>
                  <Link href="/vendor/exhibitions" className={buttonStyles("secondary", "justify-center px-5 py-3")}>Participation</Link>
                </div>
              </>
            ) : (
              <div className="mt-7">
                <VendorEmptyState icon={Store} title="No stall assigned yet" description="You do not have an assigned stall. Request participation in an exhibition and wait for admin assignment." actionHref="/vendor/exhibitions" actionLabel="Request Exhibition" />
              </div>
            )}
          </VendorPanel>
          <VendorPanel className="overflow-hidden">
            {isLoading ? (
              <div className="h-[520px] animate-pulse bg-[#F7F1E8] dark:bg-[#1d1d27]" />
            ) : stall?.image ? (
              <AppImage src={stall.image} alt={stall.name} className="h-80 w-full rounded-none sm:h-full sm:min-h-[520px]" />
            ) : (
              <div className="grid h-80 place-items-center bg-[radial-gradient(circle_at_70%_20%,rgba(255,120,92,0.22),transparent_32%),linear-gradient(135deg,#F7F1E8,#FFFDF8)] p-6 text-center text-sm text-[#6F675C] dark:bg-[radial-gradient(circle_at_70%_20%,rgba(255,120,92,0.16),transparent_32%),linear-gradient(135deg,#11101A,#171525)] dark:text-white/54 sm:min-h-[520px]">
                Stall image unavailable
              </div>
            )}
          </VendorPanel>
        </div>
      </VendorPageFrame>
    </RoleShell>
  );
}

export function VendorProductsPageContent() {
  const [products, setProducts] = useState<Product[]>([]);
  const [vendorStall, setVendorStall] = useState<Stall | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [compareAtPrice, setCompareAtPrice] = useState("");
  const [stock, setStock] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [productError, setProductError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const loadProducts = async () => {
    setIsLoading(true);
    try {
      const [productResponse, stallResponse] = await Promise.all([getVendorProducts(), getVendorStall()]);
      setProducts(productResponse);
      setVendorStall(stallResponse);
      setProductError("");
    } catch (error) {
      setProductError(error instanceof Error ? error.message : "Could not load vendor products.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const activeProductCount = products.filter((product) => product.status === "active").length;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      const parsedPrice = Number(price);
      const parsedCompareAtPrice = compareAtPrice ? Number(compareAtPrice) : parsedPrice;
      const parsedStock = Number(stock);
      if (!title.trim() || !description.trim() || !Number.isFinite(parsedPrice) || parsedPrice <= 0 || !Number.isFinite(parsedStock) || parsedStock < 0) {
        setProductError("Enter a valid title, description, price, and stock.");
        return;
      }
      if (!Number.isFinite(parsedCompareAtPrice) || parsedCompareAtPrice < parsedPrice) {
        setProductError("Compare at price must be empty or greater than the selling price.");
        return;
      }
      if (!vendorStall?.id) {
        setProductError("Admin must assign you to a stall before products can be created.");
        return;
      }
      if (!imageUrl.trim()) {
        setProductError("Upload and crop a product image before saving.");
        return;
      }
      await createVendorProduct({
        title: title.trim(),
        description: description.trim(),
        price: parsedPrice,
        compareAtPrice: parsedCompareAtPrice,
        stock: parsedStock,
        images: imageUrl.trim() ? [imageUrl.trim()] : [],
        stallId: vendorStall?.id ?? "",
        status: "active"
      });
      setTitle("");
      setDescription("");
      setPrice("");
      setCompareAtPrice("");
      setStock("");
      setImageUrl("");
      await loadProducts();
    } catch (error) {
      setProductError(error instanceof Error ? error.message : "Could not create product.");
    }
  };

  return (
    <RoleShell role="vendor" title="Products">
      <VendorPageFrame>
        <div className="grid gap-5 xl:grid-cols-[1fr_0.4fr]">
          <VendorPanel className="p-5 sm:p-7">
            <VendorSectionTitle
              eyebrow="Product catalog"
              title="Products"
              description="Add, activate, and manage products connected to your assigned stall. All values are loaded from the backend."
              action={<AdminStatusPill status={`${products.length} products`} />}
            />
            {productError ? <div className="mt-5"><VendorAlert>{productError}</VendorAlert></div> : null}
            <div className="mt-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
              <VendorMetricCard compact label="Total products" value={String(products.length)} icon={Boxes} />
              <VendorMetricCard compact label="Active" value={String(activeProductCount)} icon={CheckCircle2} />
              <VendorMetricCard compact label="Stock" value={String(products.reduce((sum, product) => sum + product.stock, 0))} icon={ClipboardList} />
              <VendorMetricCard compact label="Stall" value={vendorStall?.name ?? "Not assigned"} helper={vendorStall ? "Products can be created" : "Admin assignment required"} icon={Store} />
            </div>
            {vendorStall ? (
              <div className="mt-5 rounded-[24px] border border-[#E8DDCC] bg-[#F7F1E8] p-4 dark:border-white/10 dark:bg-[#171720]">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-black text-[#1B1A17] dark:text-[#FFF8EA]">Live readiness</p>
                    <p className="mt-1 text-sm text-[#6F675C] dark:text-white/54">
                      {activeProductCount >= 2 ? "You have enough active products to open the live console." : `Add ${2 - activeProductCount} more active product${2 - activeProductCount === 1 ? "" : "s"} to unlock the live console.`}
                    </p>
                  </div>
                  <Link href={activeProductCount >= 2 ? "/vendor/live" : "/vendor/products"} className={buttonStyles(activeProductCount >= 2 ? "primary" : "secondary", "justify-center px-5 py-3")}>
                    {activeProductCount >= 2 ? "Open Live Console" : "Keep Adding Products"}
                  </Link>
                </div>
              </div>
            ) : null}
            <div className="mt-6 grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
              {isLoading ? (
                <VendorLoadingState rows={6} className="sm:col-span-2 2xl:col-span-3 sm:grid-cols-2 2xl:grid-cols-3" />
              ) : products.length ? products.map((product) => (
                <ProductCard key={product.id} product={product} onChanged={loadProducts} />
              )) : (
                <div className="sm:col-span-2 2xl:col-span-3">
                  <VendorEmptyState icon={Boxes} title="No products yet" description="Add your first product after admin assigns your vendor account to a stall." compact={false} />
                </div>
              )}
            </div>
          </VendorPanel>
          <form data-tour-id="vendor-add-product" onSubmit={submit} className="mb-[calc(7.5rem+env(safe-area-inset-bottom))] self-start rounded-[30px] border border-[#E8DDCC] bg-[#FFFDF8] p-5 shadow-[0_24px_80px_rgba(128,91,44,0.12)] dark:border-white/10 dark:bg-[#11101A] dark:shadow-[0_24px_90px_rgba(0,0,0,0.34)] sm:p-7 xl:sticky xl:top-24 xl:mb-0">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#B88A3D] dark:text-[#F4C879]">Add product</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#1B1A17] dark:text-[#FFF8EA]">New product</h2>
            <p className="mt-2 text-sm leading-6 text-[#6F675C] dark:text-white/56">
              Product creation is blocked until a real stall assignment exists.
            </p>
            <div className="mt-5 grid gap-3">
              <label className="grid gap-2 text-sm font-semibold text-[#6F675C] dark:text-white/56">
                Product title
                <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Product title" required className={vendorInputClass} />
              </label>
              <label className="grid gap-2 text-sm font-semibold text-[#6F675C] dark:text-white/56">
                Description
                <textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Description" required className={`${vendorInputClass} min-h-28`} />
              </label>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                <label className="grid gap-2 text-sm font-semibold text-[#6F675C] dark:text-white/56">
                  Price
                  <input value={price} onChange={(event) => setPrice(event.target.value.replace(/[^\d.]/g, ""))} placeholder="0" inputMode="decimal" required className={vendorInputClass} />
                </label>
                <label className="grid gap-2 text-sm font-semibold text-[#6F675C] dark:text-white/56">
                  Compare at
                  <input value={compareAtPrice} onChange={(event) => setCompareAtPrice(event.target.value.replace(/[^\d.]/g, ""))} placeholder="Original price" inputMode="decimal" className={vendorInputClass} />
                </label>
                <label className="grid gap-2 text-sm font-semibold text-[#6F675C] dark:text-white/56">
                  Stock
                  <input value={stock} onChange={(event) => setStock(event.target.value.replace(/\D/g, ""))} placeholder="0" inputMode="numeric" pattern="[0-9]*" required className={vendorInputClass} />
                </label>
              </div>
              <ImageCropUpload
                uploadType="product_image"
                preset="product"
                value={imageUrl}
                label="Product image"
                onUploaded={setImageUrl}
              />
            </div>
            <button disabled={!vendorStall?.id} className={buttonStyles("primary", "mt-5 w-full justify-center px-8 py-4 text-base disabled:opacity-50")}>Add Product</button>
          </form>
        </div>
      </VendorPageFrame>
    </RoleShell>
  );
}

export function VendorLivePageContent() {
  const liveSession = useExpoStore((state) => state.liveSession);
  const chatMessages = useExpoStore((state) => state.chatMessages);
  const currentUser = useExpoStore((state) => state.currentUser);
  const currentVendor = useExpoStore((state) => state.currentVendor);
  const startLiveState = useExpoStore((state) => state.startLive);
  const endLive = useExpoStore((state) => state.endLive);
  const pinProduct = useExpoStore((state) => state.pinProduct);
  const syncLiveSession = useExpoStore((state) => state.syncLiveSession);
  const setChatMessages = useExpoStore((state) => state.setChatMessages);
  const mergeChatMessages = useExpoStore((state) => state.mergeChatMessages);
  const [message, setMessage] = useState("");
  const [streamMode, setStreamMode] = useState<"camera" | "rtmp">("camera");
  const [livekitConnection, setLivekitConnection] = useState<LiveKitConnection | null>(null);
  const [streamNote, setStreamNote] = useState("");
  const [chatError, setChatError] = useState("");
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [liveSessionId, setLiveSessionId] = useState("");
  const [liveStartedAt, setLiveStartedAt] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [pinnedProduct, setPinnedProduct] = useState<Product | null>(null);
  const [bargainState, setBargainState] = useState<BargainState | null>(null);
  const [bargainError, setBargainError] = useState("");
  const [bargainForm, setBargainForm] = useState({
    basePrice: "",
    sellingPrice: "",
    offerStep: "10",
    quantityLimit: "10",
    durationMinutes: "10"
  });
  const [productError, setProductError] = useState("");
  const [orderError, setOrderError] = useState("");
  const [vendorStall, setVendorStall] = useState<Stall | null>(null);
  const [liveAccess, setLiveAccess] = useState<LiveAccessStatus | null>(null);
  const [isLiveLoading, setIsLiveLoading] = useState(true);
  const activeProductCount = products.filter((product) => product.status === "active").length;
  const pinned = pinnedProduct ?? products.find((product) => product.id === liveSession.pinnedProductId) ?? null;
  const vendorSender = currentUser?.role === "vendor" ? currentUser : null;
  const hasStallBanner = hasUploadedBrandAsset(vendorStall?.bannerImage);
  const hasVendorLogo = hasUploadedBrandAsset(vendorStall?.vendorLogo);
  const liveReadiness = [
    { label: "Vendor approved", done: currentVendor?.status === "approved" },
    { label: "Stall assigned", done: Boolean(vendorStall) },
    { label: "Stall banner uploaded", done: hasStallBanner },
    { label: "Vendor logo uploaded", done: hasVendorLogo },
    { label: "2 active products", done: activeProductCount >= 2 }
  ];
  const readinessIssues = liveReadiness.filter((item) => !item.done);
  const isReadyToSell = readinessIssues.length === 0;
  const isLiveActive = Boolean(vendorStall) && (
    liveSession.status === "live"
    || vendorStall?.status === "live"
    || vendorStall?.liveStatus === "live"
  );
  const canAccessLiveConsole = isLiveActive || isReadyToSell;

  useEffect(() => {
    let active = true;
    setChatMessages([]);
    const syncChat = async () => {
      try {
        const [stallResponse, productResponse] = await Promise.all([getVendorStall(), getVendorProducts()]);
        if (!active) {
          return;
        }
        setVendorStall(stallResponse);
        setProducts(productResponse);
        setProductError("");
        getVendorLiveAccess(stallResponse.id).then((response) => {
          if (active) setLiveAccess(response);
        }).catch(() => {
          if (active) setLiveAccess(null);
        });
        try {
          const response = await getLiveSessionState(stallResponse.id);
          if (!active) {
            return;
          }
          setPinnedProduct(response.pinned_product ?? null);
          const sessionId = response.live_session.id ?? response.live_session.liveSessionId;
          if (sessionId) {
            setLiveSessionId(sessionId);
            const messages = await getLiveMessages(sessionId);
            const bargain = await getBargainState(sessionId).catch(() => null);
            if (active) {
              setChatMessages(messages);
              if (bargain) setBargainState(bargain);
              setChatError("");
            }
          } else if (response.messages) {
            setChatMessages(response.messages);
          }
          const session = response.live_session;
          setLiveStartedAt(session.started_at ?? session.startedAt ?? null);
          syncLiveSession({
            status: session.status,
            pinnedProductId: session.pinnedProductId ?? session.pinned_product_id ?? response.pinned_product?.id,
            viewerCount: session.viewerCount ?? session.viewer_count
          });
        } catch {
          if (active) {
            endLive();
            setLivekitConnection(null);
            setLiveSessionId("");
            setLiveStartedAt(null);
            setPinnedProduct(null);
            setVendorStall((previous) =>
              previous ? { ...previous, status: "assigned", liveStatus: "offline", viewerCount: 0, liveStartedAt: null } : previous
            );
            syncLiveSession({ status: "ended", viewerCount: 0 });
            setChatError("Start your live session to activate vendor chat.");
          }
        }
      } catch {
        if (active) {
          setVendorStall(null);
          setLiveAccess(null);
          setLivekitConnection(null);
          setLiveSessionId("");
          setLiveStartedAt(null);
          setPinnedProduct(null);
          endLive();
          syncLiveSession({ status: "ended", viewerCount: 0 });
          setChatError("Could not load vendor stall. Retrying...");
          setProductError("Could not load assigned stall or products.");
        }
      } finally {
        if (active) {
          setIsLiveLoading(false);
        }
      }
    };
    syncChat();
    const intervalId = window.setInterval(syncChat, 2000);
    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [endLive, setChatMessages, syncLiveSession]);

  useEffect(() => {
    let active = true;
    const loadOrders = async () => {
      try {
        const response = await getVendorOrders();
        if (active) {
          setOrders(response);
          setOrderError("");
        }
      } catch (error) {
        if (active) {
          setOrderError(error instanceof Error ? error.message : "Could not load orders.");
        }
      }
    };
    void loadOrders();
    const intervalId = window.setInterval(loadOrders, 15000);
    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, []);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = message.trim();
    if (!text) {
      return;
    }
    const sessionId = liveSessionId || liveSession.id;
    if (!vendorSender) {
      setChatError("Login as an approved vendor to send chat replies.");
      return;
    }
    if (!sessionId) {
      setChatError("Live chat is connecting. Try again in a moment.");
      return;
    }
    setIsSendingMessage(true);
    try {
      const savedMessage = await postLiveMessage(sessionId, {
        sender_id: vendorSender.id,
        sender_name: vendorSender.name,
        sender_role: "vendor",
        message: text
      });
      mergeChatMessages([savedMessage]);
      const messages = await getLiveMessages(sessionId);
      setChatMessages(messages);
      setChatError("");
      setMessage("");
    } catch {
      setChatError("Message failed to send. Try again.");
    } finally {
      setIsSendingMessage(false);
    }
  };

  const startVendorStream = async () => {
    try {
      setStreamNote("Starting stream...");
      if (!vendorStall || !currentVendor) {
        setStreamNote("Vendor stall assignment is required before going live.");
        return;
      }
      if (!hasUploadedBrandAsset(vendorStall.bannerImage) || !hasUploadedBrandAsset(vendorStall.vendorLogo)) {
        setStreamNote("Upload a stall banner and vendor logo before going live.");
        return;
      }
      if (activeProductCount < 2) {
        setStreamNote("Add at least 2 active products before going live.");
        return;
      }
      const response = await startVendorLive({
        exhibition_id: vendorStall.exhibitionId,
        stall_id: vendorStall.id,
        vendor_id: currentVendor.id,
        stream_mode: streamMode
      });
      if (response.live_access) {
        setLiveAccess(response.live_access);
      }
      const session = response.live_session;
      const sessionId = session.id ?? session.liveSessionId;
      if (sessionId) setLiveSessionId(sessionId);
      setLiveStartedAt(session.started_at ?? session.startedAt ?? null);
      syncLiveSession({
        status: session.status,
        pinnedProductId: session.pinnedProductId ?? session.pinned_product_id,
        viewerCount: session.viewerCount ?? session.viewer_count
      });
      startLiveState();
      setLivekitConnection(response.livekit);
      if (streamMode === "rtmp") {
        setStreamNote(`RTMP URL: ${session.rtmp_url ?? "pending"} | Stream key: ${session.stream_key ?? "pending"}`);
      } else if (response.livekit.mode === "real") {
        setStreamNote("LiveKit camera room connected. Allow camera and microphone permissions.");
      } else if (response.livekit.mode === "fallback") {
        setStreamNote("Stall is live for marketplace testing. LiveKit video is not configured, so customers can use chat, catalogue, and cart without camera video.");
      } else {
        setStreamNote("Camera stream could not start. Check backend LiveKit configuration.");
      }
    } catch (error) {
      setLivekitConnection(null);
      setStreamNote(error instanceof Error ? error.message : "Camera stream could not start. Check backend LiveKit configuration.");
    }
  };

  const openBargainForPinned = async () => {
    const sessionId = liveSessionId || liveSession.id;
    if (!sessionId || !pinned) {
      setBargainError("Start live and pin a product before opening bargain.");
      return;
    }
    try {
      const state = await startBargain({
        liveSessionId: sessionId,
        productId: pinned.id,
        basePrice: Number(bargainForm.basePrice || Math.max(1, Math.floor(pinned.price * 0.75))),
        sellingPrice: Number(bargainForm.sellingPrice || pinned.price),
        minVisibleOffer: Number(bargainForm.basePrice || Math.max(1, Math.floor(pinned.price * 0.75))),
        offerStep: Number(bargainForm.offerStep || 10),
        quantityLimit: Number(bargainForm.quantityLimit || 10),
        durationMinutes: Number(bargainForm.durationMinutes || 10)
      });
      setBargainState(state);
      setBargainError("");
    } catch (error) {
      setBargainError(error instanceof Error ? error.message : "Could not open bargain.");
    }
  };

  const acceptGroup = async (price: number) => {
    if (!bargainState?.session) return;
    try {
      const state = await acceptBargainGroup(bargainState.session.id, price);
      setBargainState(state);
      setBargainError("");
    } catch (error) {
      setBargainError(error instanceof Error ? error.message : "Could not accept group.");
    }
  };

  const sendCounter = async (price: number) => {
    if (!bargainState?.session) return;
    try {
      const state = await counterBargain(bargainState.session.id, price);
      setBargainState(state);
      setBargainError("");
    } catch (error) {
      setBargainError(error instanceof Error ? error.message : "Could not send counter.");
    }
  };

  const closeCurrentBargain = async () => {
    if (!bargainState?.session) return;
    try {
      const state = await closeBargain(bargainState.session.id);
      setBargainState(state);
      setBargainError("");
    } catch (error) {
      setBargainError(error instanceof Error ? error.message : "Could not close bargain.");
    }
  };

  const stopVendorStream = async () => {
    try {
      const session = await endVendorLive();
      syncLiveSession({
        status: session.status,
        pinnedProductId: session.pinnedProductId ?? session.pinned_product_id,
        viewerCount: session.viewerCount ?? session.viewer_count
      });
    } catch {
      // Local state still reflects the vendor ending their session.
    }
    setLivekitConnection(null);
    endLive();
    setLiveStartedAt(null);
    setStreamNote("Live session ended.");
  };

  const showProduct = async (productId: string) => {
    try {
      const sessionId = liveSessionId || liveSession.id;
      const session = await pinLiveProduct(sessionId, productId);
      syncLiveSession({
        status: session.status,
        pinnedProductId: session.pinnedProductId ?? session.pinned_product_id,
        viewerCount: session.viewerCount ?? session.viewer_count
      });
      setPinnedProduct(session.pinned_product ?? products.find((product) => product.id === productId) ?? null);
      pinProduct(productId);
    } catch {
      setProductError("Could not pin product. Check live session and product ownership.");
    }
  };

  if (!isLiveLoading && !canAccessLiveConsole) {
    return (
      <RoleShell role="vendor" title="Live">
        <VendorPageFrame>
          <VendorPanel className="mx-auto max-w-5xl p-5 sm:p-7">
            <VendorSectionTitle
              eyebrow="Live console locked"
              title={vendorStall ? "Complete stall setup before going live" : "No assigned stall"}
              description="Vendors can go live in one assigned exhibition only. Request an exhibition, wait for admin stall assignment, customize your stall, and add at least 2 active products."
              action={<AdminStatusPill status={vendorStall ? `${readinessIssues.length} pending` : "Live unavailable"} />}
            />
            {productError ? <div className="mt-5"><VendorAlert>{productError}</VendorAlert></div> : null}
            <div className="mt-6 grid gap-3">
              {liveReadiness.map((item) => (
                <div key={item.label} className="flex items-center justify-between gap-3 rounded-[20px] border border-[#E8DDCC] bg-[#F7F1E8] px-4 py-3 dark:border-white/10 dark:bg-[#171720]">
                  <p className="text-sm font-semibold text-[#1B1A17] dark:text-[#FFF8EA]">{item.label}</p>
                  <AdminStatusPill status={item.done ? "ready" : "pending"} />
                </div>
              ))}
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <Link href="/vendor/exhibitions" className={buttonStyles("primary", "justify-center px-5 py-3")}>Browse Exhibitions</Link>
              <Link href="/vendor/stall" className={buttonStyles("secondary", "justify-center px-5 py-3")}>Customize Stall</Link>
              <Link href="/vendor/products" className={buttonStyles("secondary", "justify-center px-5 py-3")}>Add Products</Link>
            </div>
          </VendorPanel>
        </VendorPageFrame>
      </RoleShell>
    );
  }

  return (
    <RoleShell role="vendor" title="Live">
      <VendorPageFrame>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.08fr)_minmax(380px,0.92fr)] xl:items-start">
        <VendorPanel data-tour-id="vendor-camera-preview" className="flex flex-col p-4 sm:p-5 xl:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <VendorSectionTitle
              eyebrow="Vendor live console"
              title={vendorStall?.vendorName ?? currentVendor?.businessName ?? "Vendor live workspace"}
              description={vendorStall ? `Streaming from ${vendorStall.name}` : "A real stall assignment is required before going live."}
              action={
                <div className="flex flex-wrap items-center gap-2">
                  <AdminStatusPill status={isLiveActive ? "Live now" : isReadyToSell ? "Ready to go live" : "Offline"} />
                  {isLiveActive ? <LiveElapsedCounter startedAt={liveStartedAt} label="You are live for" /> : null}
                  <span
                    title={isReadyToSell ? "All live selling checks are clear." : readinessIssues.map((item) => item.label).join(", ")}
                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-black uppercase tracking-[0.1em] ${
                      isReadyToSell
                        ? "border-emerald-500/25 bg-emerald-500/12 text-emerald-600 dark:text-emerald-300"
                        : "border-amber-500/25 bg-amber-500/12 text-amber-700 dark:text-amber-300"
                    }`}
                  >
                    {isReadyToSell ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                    {isReadyToSell ? "Ready" : `${readinessIssues.length} issue${readinessIssues.length === 1 ? "" : "s"}`}
                  </span>
                </div>
              }
            />
          </div>
          {productError ? <div className="mt-5"><VendorAlert>{productError}</VendorAlert></div> : null}
          {isLiveActive ? (
            <div className="mt-5 rounded-[20px] border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm font-black text-emerald-700 dark:text-emerald-200">
              <LiveElapsedCounter startedAt={liveStartedAt} label="Live stream running for" size="md" />
            </div>
          ) : null}
          {!hasStallBanner || !hasVendorLogo ? (
            <div className="mt-5">
              <VendorAlert>
                Upload a stall banner and vendor logo before going live. These are used for exhibition listings, stall cards, and customer trust.
              </VendorAlert>
            </div>
          ) : null}
          {activeProductCount < 2 ? (
            <div className="mt-5">
              <VendorAlert>
                Add at least 2 active products before going live. You currently have {activeProductCount}.
              </VendorAlert>
            </div>
          ) : null}
          {liveAccess ? (
            <div className="mt-5 rounded-[22px] border border-[#E8DDCC] bg-[#F7F1E8] p-4 dark:border-white/10 dark:bg-[#171720]">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#B88A3D] dark:text-[#F4C879]">Live access</p>
                  <h3 className="mt-1 text-lg font-black text-[#1B1A17] dark:text-[#FFF8EA]">{liveAccess.message}</h3>
                  <p className="mt-1 text-sm font-semibold text-[#6F675C] dark:text-white/54">
                    {liveAccess.enforcementEnabled ? "Live slot enforcement is active." : "Live slot enforcement is currently in rollout mode."}
                  </p>
                </div>
                <AdminStatusPill status={liveAccess.canGoLive ? "access ready" : liveAccess.blockingCode ? liveAccess.blockingCode.replaceAll("_", " ") : "warning"} />
              </div>
              {liveAccess.activeSubscription || liveAccess.activeSlot ? (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[18px] border border-[#E8DDCC] bg-card px-4 py-3 dark:border-white/10">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#B88A3D] dark:text-[#F4C879]">Plan</p>
                    <p className="mt-1 text-sm font-black text-[#1B1A17] dark:text-[#FFF8EA]">{liveAccess.activeSubscription?.plan?.name ?? "No active plan"}</p>
                  </div>
                  <div className="rounded-[18px] border border-[#E8DDCC] bg-card px-4 py-3 dark:border-white/10">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#B88A3D] dark:text-[#F4C879]">Current slot</p>
                    <p className="mt-1 text-sm font-black text-[#1B1A17] dark:text-[#FFF8EA]">{liveAccess.activeSlot ? formatDateTime(liveAccess.activeSlot.startTime) : "No active slot"}</p>
                  </div>
                </div>
              ) : null}
              {liveAccess.warnings.length ? (
                <div className="mt-4 grid gap-2">
                  {liveAccess.warnings.map((warning) => <VendorAlert key={warning} tone="info">{warning}</VendorAlert>)}
                </div>
              ) : null}
            </div>
          ) : null}
          <div className="hidden" aria-hidden="true">
            {liveReadiness.map((item) => (
              <div key={item.label} className="flex items-center gap-3 rounded-[20px] bg-white px-4 py-3 dark:bg-[#1d1d27]">
                <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-[0px] before:text-sm before:font-black ${item.done ? "bg-emerald-500/10 text-emerald-600 before:content-['OK'] dark:text-emerald-300" : "bg-[#B88A3D]/10 text-[#B88A3D] before:content-['!'] dark:text-[#F4C879]"}`}>
                  {item.done ? "âœ“" : "!"}
                </span>
                <p className="text-sm font-semibold text-[#1B1A17] dark:text-[#FFF8EA]">{item.label}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 grid gap-2 rounded-[20px] border border-[#E8DDCC] bg-[#F7F1E8] p-1.5 dark:border-white/10 dark:bg-[#171720] sm:grid-cols-2">
            {[
              ["camera", "Camera Stream"],
              ["rtmp", "RTMP Setup"]
            ].map(([mode, label]) => (
              <button
                key={mode}
                type="button"
                onClick={() => setStreamMode(mode as "camera" | "rtmp")}
                className={`min-h-10 rounded-[16px] px-4 py-2.5 text-sm font-semibold transition ${
                  streamMode === mode ? "bg-[#1B1A17] text-[#FFF8EA] dark:bg-[#FFF8EA] dark:text-[#11101A]" : "text-[#6F675C] hover:bg-white dark:text-white/54 dark:hover:bg-card"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {isLiveLoading ? (
            <VendorLoadingState rows={1} className="mt-4 aspect-video" />
          ) : livekitConnection?.mode === "real" ? (
            <LiveKitStage connection={livekitConnection} publish className="mt-4 aspect-video max-h-[56vh] w-full rounded-[22px] sm:rounded-[28px]" />
          ) : (
            <VendorStreamStatus mode={streamMode} note={streamNote} />
          )}
          <div className="mt-3 grid grid-cols-2 gap-2 sm:flex">
            <button data-tour-id="vendor-go-live" onClick={startVendorStream} disabled={!isReadyToSell || !vendorStall || !currentVendor} className={buttonStyles("primary", "justify-center px-4 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-55 sm:px-6 sm:py-3")}>Go Live</button>
            <button onClick={stopVendorStream} className={buttonStyles("secondary", "justify-center px-4 py-2.5 text-sm sm:px-6 sm:py-3")}>End Live</button>
            <Link href="/vendor/products" className={buttonStyles("secondary", "hidden justify-center px-6 py-3 sm:inline-flex")}>Manage Products</Link>
          </div>
          {streamNote ? <p className="mt-3 hidden rounded-[20px] border border-[#E8DDCC] bg-[#F7F1E8] px-4 py-3 text-sm text-[#6F675C] dark:border-white/10 dark:bg-[#171720] dark:text-white/54 sm:block">{streamNote}</p> : null}
        </VendorPanel>
        <div className="grid gap-4 xl:sticky xl:top-5">
        <VendorPanel id="vendor-live-chat" data-tour-id="vendor-live-chat" className="p-3 sm:p-5">
          <LiveChatPanel
            messages={chatMessages.slice(-24)}
            message={message}
            setMessage={setMessage}
            onSubmit={submit}
            className="h-[310px] sm:min-h-[420px] xl:h-[calc(100vh-220px)] xl:max-h-[620px]"
            compact
            errorText={chatError}
            isSending={isSendingMessage}
            tone="dark"
          />
        </VendorPanel>
        <VendorPanel id="vendor-live-orders" className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#B88A3D] dark:text-[#F4C879]">Orders glance</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#1B1A17] dark:text-[#FFF8EA]">Recent orders</h2>
              <p className="mt-2 text-sm text-[#6F675C] dark:text-white/52">
                Check incoming orders here without leaving the live console.
              </p>
            </div>
            <AdminStatusPill status={`${orders.length} orders`} />
          </div>
          {orderError ? <p className="mt-3 text-xs font-semibold text-red-500">{orderError}</p> : null}
          <div className="mt-4 grid max-h-56 gap-3 overflow-y-auto pr-1">
            {orders.length ? orders.slice(0, 4).map((order) => (
              <div key={order.id} className="rounded-[20px] border border-[#E8DDCC] bg-[#F7F1E8] p-3 dark:border-white/10 dark:bg-[#171720]">
                <div className="flex items-center justify-between gap-3">
                  <p className="truncate text-sm font-semibold text-[#1B1A17] dark:text-[#FFF8EA]">{order.items[0]?.title ?? order.id}</p>
                  <p className="shrink-0 text-sm font-black text-[#F36B4F]">{formatPrice(order.totalAmount)}</p>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <AdminStatusPill status={order.paymentStatus} />
                  <AdminStatusPill status={order.orderStatus} />
                </div>
              </div>
            )) : (
              <p className="rounded-[20px] border border-dashed border-[#E8DDCC] bg-[#F7F1E8] p-4 text-sm text-[#6F675C] dark:border-white/10 dark:bg-[#171720] dark:text-white/54">
                No orders yet.
              </p>
            )}
          </div>
          <p className="mt-4 rounded-[18px] border border-[#E8DDCC] bg-[#F7F1E8] px-4 py-3 text-xs font-semibold text-[#6F675C] dark:border-white/10 dark:bg-[#171720] dark:text-white/54">
            This panel refreshes while you stay in the live console, so your stream is not interrupted just to check new orders.
          </p>
        </VendorPanel>
        <VendorPanel className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#B88A3D] dark:text-[#F4C879]">Pinned product</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#1B1A17] dark:text-[#FFF8EA]">{pinned?.title ?? "No pinned product"}</h2>
              <p className="mt-2 text-sm text-[#6F675C] dark:text-white/52">
                {pinned ? "This product is highlighted inside the live room." : "Pin a product so visitors know what to buy during the stream."}
              </p>
            </div>
            <span className="rounded-full border border-[#E8DDCC] bg-[#F7F1E8] px-3 py-2 text-xs font-black text-[#8A5A24] dark:border-white/10 dark:bg-[#1d1d27] dark:text-[#F4C879]">
              {liveSession.viewerCount ?? 0} viewers
            </span>
          </div>
        </VendorPanel>
        <VendorBargainPanel
          pinned={pinned}
          bargainState={bargainState}
          bargainForm={bargainForm}
          setBargainForm={setBargainForm}
          onOpen={openBargainForPinned}
          onAcceptGroup={acceptGroup}
          onCounter={sendCounter}
          onClose={closeCurrentBargain}
          error={bargainError}
        />
        <VendorPanel id="vendor-live-products" data-tour-id="vendor-pin-product" className="flex flex-col p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#B88A3D] dark:text-[#F4C879]">Showcase</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#1B1A17] dark:text-[#FFF8EA]">Products</h2>
            </div>
            <AdminStatusPill status={`${products.length} loaded`} />
          </div>
          <div className="mt-4 grid max-h-[420px] gap-3 overflow-y-auto pr-1">
            {isLiveLoading ? (
              <VendorLoadingState rows={3} />
            ) : products.length ? products.map((product) => (
              <button key={product.id} onClick={() => showProduct(product.id)} className="flex min-h-24 items-center gap-3 rounded-[22px] border border-[#E8DDCC] bg-[#F7F1E8] p-3 text-left transition hover:border-[#F36B4F]/60 dark:border-white/10 dark:bg-[#171720]">
                <AppImage src={product.images[0] ?? "/products/product-placeholder.png"} alt={product.title} className="h-16 w-16 rounded-[18px]" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-[#1B1A17] dark:text-[#FFF8EA]">{product.title}</p>
                  <p className="mt-1 text-sm text-[#6F675C] dark:text-white/52">{formatPrice(product.price)}</p>
                </div>
                <span className="rounded-full bg-white px-3 py-2 text-xs font-bold text-[#B88A3D] dark:bg-card dark:text-[#F4C879]">
                  Pin
                </span>
                {product.id === liveSession.pinnedProductId ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : null}
              </button>
            )) : (
              <VendorEmptyState icon={Boxes} title="No products found" description="Add active products before going live so customers can buy from the stream." actionHref="/vendor/products" actionLabel="Add Product" compact />
            )}
          </div>
        </VendorPanel>
        </div>
      </div>
      </VendorPageFrame>
      <VendorLiveStreamBottomNav />
    </RoleShell>
  );
}

function VendorBargainPanel({
  pinned,
  bargainState,
  bargainForm,
  setBargainForm,
  onOpen,
  onAcceptGroup,
  onCounter,
  onClose,
  error
}: {
  pinned: Product | null;
  bargainState: BargainState | null;
  bargainForm: { basePrice: string; sellingPrice: string; offerStep: string; quantityLimit: string; durationMinutes: string };
  setBargainForm: (value: { basePrice: string; sellingPrice: string; offerStep: string; quantityLimit: string; durationMinutes: string }) => void;
  onOpen: () => void;
  onAcceptGroup: (price: number) => void;
  onCounter: (price: number) => void;
  onClose: () => void;
  error: string;
}) {
  const session = bargainState?.session;
  const topGroup = bargainState?.offerGroups[0];
  const livePrice = session?.acceptedPrice ?? session?.sellingPrice ?? 0;
  const counterDefault = topGroup?.offerPrice ?? session?.minVisibleOffer ?? pinned?.price ?? 0;
  const [counterDraft, setCounterDraft] = useState("");
  const [counterTarget, setCounterTarget] = useState<{ offerPrice: number; customers: number } | null>(null);
  const counterValue = Number(counterDraft || 0);
  const canSendCounter = Boolean(session) && counterValue >= Number(session?.minVisibleOffer ?? 0) && counterValue <= Number(session?.sellingPrice ?? 0);
  const openCounterWindow = (group: { offerPrice: number; customers: number }) => {
    const suggested = Math.max(counterDefault, group.offerPrice);
    setCounterTarget(group);
    setCounterDraft(String(suggested));
  };
  const submitCounterWindow = () => {
    if (!canSendCounter) return;
    onCounter(counterValue);
    setCounterTarget(null);
  };

  return (
    <VendorPanel id="vendor-live-bargain" className="p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#B88A3D] dark:text-[#F4C879]">Group bargain</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#1B1A17] dark:text-[#FFF8EA]">
            {session ? "Live bargain running" : "Open live bargain"}
          </h2>
          <p className="mt-2 text-sm text-[#6F675C] dark:text-white/52">
            Accept one shared live price for everyone watching, or counter the group before accepting.
          </p>
        </div>
        <AdminStatusPill status={session?.status ?? "not open"} />
      </div>

      {pinned ? (
        <div className="mt-4 rounded-[20px] border border-[#E8DDCC] bg-[#F7F1E8] p-3 dark:border-white/10 dark:bg-[#171720]">
          <p className="line-clamp-1 text-sm font-black text-[#1B1A17] dark:text-[#FFF8EA]">{pinned.title}</p>
          <p className="mt-1 text-xs text-[#6F675C] dark:text-white/52">Current price {formatPrice(pinned.price)}</p>
        </div>
      ) : (
        <VendorAlert>Pin a product first before opening a bargain.</VendorAlert>
      )}

      <div className="mt-4 grid grid-cols-2 gap-2">
        {[
          ["basePrice", "Base"],
          ["sellingPrice", "Selling"],
          ["offerStep", "Step"],
          ["quantityLimit", "Qty limit"],
          ["durationMinutes", "Minutes"]
        ].map(([key, label]) => (
          <label key={key} className="text-xs font-bold text-[#6F675C] dark:text-white/56">
            {label}
            <input
              value={bargainForm[key as keyof typeof bargainForm]}
              onChange={(event) => setBargainForm({ ...bargainForm, [key]: event.target.value })}
              placeholder={key === "basePrice" ? "Hidden" : key === "sellingPrice" ? String(pinned?.price ?? "") : ""}
              inputMode="numeric"
              className="mt-1 h-11 w-full rounded-2xl border border-[#E8DDCC] bg-[#FFFDF8] px-3 text-sm font-black text-[#1B1A17] outline-none focus:border-[#F36B4F] dark:border-white/10 dark:bg-[#1B1D28] dark:text-[#FFF8EA]"
            />
          </label>
        ))}
      </div>

      <button type="button" onClick={onOpen} disabled={!pinned} className={buttonStyles("primary", "mt-3 w-full justify-center px-5 py-3 disabled:opacity-50")}>
        {session ? "Restart bargain" : "Open bargain"}
      </button>

      {session ? (
        <div className="mt-4 grid gap-2">
          <div className="rounded-[20px] border border-[#E8DDCC] bg-[#F7F1E8] p-3 dark:border-white/10 dark:bg-[#171720]">
            <div className="flex justify-between text-sm text-[#6F675C] dark:text-white/56"><span>Live price</span><strong>{formatPrice(livePrice)}</strong></div>
            <div className="mt-2 flex justify-between text-sm text-[#6F675C] dark:text-white/56"><span>{session.acceptedPrice ? "Accepted price" : "Highest group"}</span><strong>{session.acceptedPrice ? formatPrice(session.acceptedPrice) : topGroup ? `${formatPrice(topGroup.offerPrice)} (${topGroup.customers})` : "No active offers"}</strong></div>
            {session.counterPrice ? <div className="mt-2 flex justify-between text-sm text-[#F36B4F]"><span>Counter sent</span><strong>{formatPrice(session.counterPrice)}</strong></div> : null}
          </div>
          {bargainState.offerGroups.slice(0, 4).map((group) => (
            <div key={group.offerPrice} className="grid grid-cols-[1fr_auto_auto] items-center gap-2 rounded-[18px] border border-[#E8DDCC] bg-[#F7F1E8] p-2 dark:border-white/10 dark:bg-[#171720]">
              <span className="text-sm font-black text-[#1B1A17] dark:text-[#FFF8EA]">{formatPrice(group.offerPrice)} from {group.customers}</span>
              <button type="button" onClick={() => openCounterWindow(group)} className={buttonStyles("secondary", "px-3 py-2 text-xs")}>Counter</button>
              <button type="button" onClick={() => onAcceptGroup(group.offerPrice)} className={buttonStyles("primary", "px-3 py-2 text-xs")}>Accept</button>
            </div>
          ))}
          <button type="button" onClick={onClose} className={buttonStyles("secondary", "justify-center px-5 py-3")}>Close bargain</button>
        </div>
      ) : null}

      {counterTarget && session ? (
        <div className="fixed inset-0 z-[90] grid place-items-center bg-[#05060B] px-4">
          <div className="w-full max-w-md rounded-[28px] border border-[#E8DDCC] bg-[#FFFDF8] p-5 shadow-[0_28px_80px_rgba(0,0,0,0.36)] dark:border-white/10 dark:bg-[#11131B]">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#B88A3D] dark:text-[#F4C879]">Send counter</p>
            <h3 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#1B1A17] dark:text-[#FFF8EA]">Set counter price</h3>
            <p className="mt-2 text-sm text-[#6F675C] dark:text-white/56">
              Customer group offered {formatPrice(counterTarget.offerPrice)} from {counterTarget.customers}. Set the price you want to counter with.
            </p>
            <label className="mt-4 block text-xs font-bold text-[#6F675C] dark:text-white/56">
              Counter price
              <input
                value={counterDraft}
                onChange={(event) => setCounterDraft(event.target.value)}
                inputMode="numeric"
                autoFocus
                className="mt-2 h-12 w-full rounded-2xl border border-[#E8DDCC] bg-white px-4 text-lg font-black text-[#1B1A17] outline-none focus:border-[#F36B4F] dark:border-white/10 dark:bg-[#1B1D28] dark:text-[#FFF8EA]"
              />
            </label>
            <div className="mt-3 rounded-2xl bg-[#F7F1E8] px-3 py-2 text-xs font-bold text-[#6F675C] dark:bg-[#222430] dark:text-white/70">
              Allowed range: {formatPrice(session.minVisibleOffer)} to {formatPrice(session.sellingPrice)}
            </div>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setCounterTarget(null)} className={buttonStyles("secondary", "justify-center px-4 py-3")}>Cancel</button>
              <button type="button" onClick={submitCounterWindow} disabled={!canSendCounter} className={buttonStyles("primary", "justify-center px-4 py-3 disabled:opacity-50")}>Send counter</button>
            </div>
          </div>
        </div>
      ) : null}

      {error ? <p className="mt-3 rounded-2xl bg-red-500/10 px-3 py-2 text-xs font-bold text-red-500">{error}</p> : null}
    </VendorPanel>
  );
}

function VendorLiveStreamBottomNav() {
  const items = [
    { label: "Orders", href: "#vendor-live-orders", icon: ShoppingBag },
    { label: "Products", href: "#vendor-live-products", icon: Boxes },
    { label: "Bargain", href: "#vendor-live-bargain", icon: Gavel },
    { label: "Chat", href: "#vendor-live-chat", icon: MessageCircleMore }
  ];

  return (
    <nav className="fixed inset-x-3 bottom-4 z-[70] grid grid-cols-4 gap-1 rounded-[24px] border border-[#E8DDCC] bg-[#FFFDF8] p-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] shadow-[0_18px_42px_rgba(94,63,32,0.18)] dark:border-white/10 dark:bg-[#111019] dark:shadow-[0_18px_48px_rgba(0,0,0,0.42)] md:hidden" aria-label="Vendor live stream navigation">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <a key={item.href} href={item.href} className="flex min-h-12 flex-col items-center justify-center gap-1 rounded-2xl text-[11px] font-black text-[#7B7166] transition hover:bg-[#F7F1E8] hover:text-[#1B1A17] dark:text-white/62 dark:hover:bg-[#1B1D28] dark:hover:text-[#FFF8EA]">
            <Icon className="h-4 w-4" />
            {item.label}
          </a>
        );
      })}
    </nav>
  );
}

export function VendorOrdersPageContent() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const currentVendor = useExpoStore((state) => state.currentVendor);
  useEffect(() => {
    let active = true;
    setIsLoading(true);
    getVendorOrders()
      .then((response) => {
        if (active) {
          setOrders(response);
          setError("");
        }
      })
      .catch((errorValue) => {
        if (active) setError(errorValue instanceof Error ? errorValue.message : "Could not load vendor orders.");
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const vendorItemsForOrder = (order: Order) => currentVendor?.id ? order.items.filter((item) => item.vendorId === currentVendor.id) : order.items;
  const vendorOrderTotal = (order: Order) => vendorItemsForOrder(order).reduce((sum, item) => sum + item.totalPrice, 0);
  const visibleOrders = orders
    .filter((order) => vendorItemsForOrder(order).length > 0)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const paidOrders = visibleOrders.filter((order) => order.paymentStatus === "paid");
  const openOrders = visibleOrders.filter((order) => !["delivered", "fulfilled", "cancelled"].includes(order.orderStatus));
  const revenue = paidOrders.reduce((sum, order) => sum + vendorOrderTotal(order), 0);

  return (
    <RoleShell role="vendor" title="Orders">
      <VendorPageFrame>
        <VendorPanel className="p-5 sm:p-7">
          <VendorSectionTitle
            eyebrow="Order fulfillment"
            title="Recent orders received"
            description="Every order containing your products appears here, newest first. Totals below show your items only."
            action={<AdminStatusPill status={`${visibleOrders.length} received`} />}
          />
          {error ? <div className="mt-5"><VendorAlert>{error}</VendorAlert></div> : null}
          <div className="mt-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
            <VendorMetricCard compact label="Received" value={String(visibleOrders.length)} icon={ClipboardList} />
            <VendorMetricCard compact label="Paid orders" value={String(paidOrders.length)} icon={CheckCircle2} />
            <VendorMetricCard compact label="Open" value={String(openOrders.length)} icon={Activity} />
            <VendorMetricCard compact label="Revenue" value={formatPrice(revenue)} icon={ShoppingBag} />
          </div>
          <div className="mt-6 rounded-[28px] border border-[#E8DDCC] bg-[#FFFDF8] p-3 dark:border-white/10 dark:bg-card sm:p-4">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 px-1">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#B88A3D] dark:text-[#F4C879]">Live order feed</p>
                <h2 className="mt-1 text-xl font-black tracking-[-0.04em] text-[#1B1A17] dark:text-[#FFF8EA]">All recent customer orders</h2>
              </div>
              <AdminStatusPill status={isLoading ? "Loading" : `${visibleOrders.length} orders`} />
            </div>
            <div className="grid gap-3">
            {isLoading ? (
              <VendorLoadingState rows={5} />
            ) : visibleOrders.length ? visibleOrders.map((order) => (
              <VendorReceivedOrderCard
                key={order.id}
                order={order}
                items={vendorItemsForOrder(order)}
                vendorTotal={vendorOrderTotal(order)}
                onFulfilled={(updatedOrder) => setOrders((currentOrders) => currentOrders.map((item) => item.id === updatedOrder.id ? updatedOrder : item))}
              />
            )) : (
              <VendorEmptyState icon={ShoppingBag} title="No orders yet" description="Orders will appear here after customers purchase your products." compact={false} />
            )}
            </div>
          </div>
        </VendorPanel>
      </VendorPageFrame>
    </RoleShell>
  );
}

function VendorReceivedOrderCard({
  order,
  items,
  vendorTotal,
  onFulfilled
}: {
  order: Order;
  items: Order["items"];
  vendorTotal: number;
  onFulfilled: (order: Order) => void;
}) {
  const [trackingNumber, setTrackingNumber] = useState(order.trackingNumber ?? "");
  const [packagePhotoUrl, setPackagePhotoUrl] = useState(order.packagePhotoUrl ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [fulfillmentError, setFulfillmentError] = useState("");
  const [fulfillmentOpen, setFulfillmentOpen] = useState(false);
  const isFulfilled = ["fulfilled", "delivered"].includes(order.orderStatus);
  const orderedAt = order.createdAt
    ? new Intl.DateTimeFormat("en-IN", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit"
      }).format(new Date(order.createdAt))
    : "Recent";

  return (
    <article className="rounded-[24px] border border-[#E8DDCC] bg-[#F7F1E8] p-4 dark:border-white/10 dark:bg-[#171720]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#B88A3D] dark:text-[#F4C879]">{orderedAt}</p>
          <h3 className="mt-1 break-all text-lg font-black text-[#1B1A17] dark:text-[#FFF8EA]">{order.id}</h3>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <AdminStatusPill status={order.paymentStatus} />
          <AdminStatusPill status={order.orderStatus} />
        </div>
      </div>

      <div className="mt-4 grid gap-2">
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-3 rounded-[18px] border border-[#E1D3BE] bg-white p-2 dark:border-white/10 dark:bg-[#11111a]">
            <AppImage src={item.image} alt={item.title} fallbackSrc="/products/product-placeholder.png" className="h-14 w-14 shrink-0 rounded-[14px]" />
            <div className="min-w-0 flex-1">
              <p className="line-clamp-1 text-sm font-black text-[#1B1A17] dark:text-[#FFF8EA]">{item.title}</p>
              <p className="mt-1 text-xs font-semibold text-[#6F675C] dark:text-white/56">Qty {item.quantity} x {formatPrice(item.unitPrice)}</p>
            </div>
            <p className="shrink-0 text-sm font-black text-[#F36B4F]">{formatPrice(item.totalPrice)}</p>
          </div>
        ))}
      </div>

      {order.shippingAddress ? (
        <div className="mt-3 rounded-[18px] border border-[#E1D3BE] bg-white px-3 py-2 text-sm text-[#6F675C] dark:border-white/10 dark:bg-[#11111a] dark:text-white/62">
          <span className="font-bold text-[#1B1A17] dark:text-[#FFF8EA]">Ship to:</span> {order.shippingAddress}
        </div>
      ) : null}

      <div className="mt-3 grid gap-2 rounded-[18px] border border-[#E1D3BE] bg-white px-3 py-3 text-sm dark:border-white/10 dark:bg-[#11111a]">
        <p className="font-black text-[#1B1A17] dark:text-[#FFF8EA]">Customer details</p>
        <div className="grid gap-1 text-[#6F675C] dark:text-white/62 sm:grid-cols-3">
          <span>Name: <strong className="text-[#1B1A17] dark:text-[#FFF8EA]">{order.customerName ?? "Not available"}</strong></span>
          <span>Phone: <strong className="text-[#1B1A17] dark:text-[#FFF8EA]">{order.customerPhone || "Not available"}</strong></span>
          <span>Email: <strong className="break-all text-[#1B1A17] dark:text-[#FFF8EA]">{order.customerEmail ?? "Not available"}</strong></span>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-[#E1D3BE] pt-3 dark:border-white/10">
        <span className="text-sm font-bold text-[#6F675C] dark:text-white/56">Your order value</span>
        <span className="text-xl font-black tracking-[-0.04em] text-[#F36B4F]">{formatPrice(vendorTotal)}</span>
      </div>

      <div className="mt-4 flex flex-col gap-2 border-t border-[#E1D3BE] pt-3 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-xs font-semibold text-[#6F675C] dark:text-white/56">
          {isFulfilled ? (
            <span>Tracking: <strong className="text-[#1B1A17] dark:text-[#FFF8EA]">{order.trackingNumber ?? "Added"}</strong></span>
          ) : (
            <span>Fulfillment proof required before closing this order.</span>
          )}
        </div>
        <button
          type="button"
          onClick={() => setFulfillmentOpen((open) => !open)}
          className={buttonStyles(isFulfilled ? "secondary" : "primary", "justify-center px-5 py-3 text-sm")}
        >
          {isFulfilled ? (fulfillmentOpen ? "Hide proof" : "View proof") : fulfillmentOpen ? "Close fulfillment" : "Fulfill order"}
        </button>
      </div>

      {fulfillmentOpen ? (
        <div className="mt-4 rounded-[20px] border border-[#E1D3BE] bg-white p-3 dark:border-white/10 dark:bg-[#11111a]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-black text-[#1B1A17] dark:text-[#FFF8EA]">Fulfillment proof</p>
              <p className="mt-1 text-xs font-semibold text-[#6F675C] dark:text-white/56">
                Tracking number and package photo are required before marking fulfilled.
              </p>
            </div>
            {isFulfilled ? <AdminStatusPill status="fulfilled" /> : null}
          </div>

          <label className="mt-3 block text-sm font-bold text-[#6F675C] dark:text-white/62">
            Tracking number
            <input
              value={trackingNumber}
              onChange={(event) => setTrackingNumber(event.target.value)}
              disabled={isFulfilled}
              placeholder="Courier / tracking ID"
              className="mt-2 h-12 w-full rounded-2xl border border-[#E1D3BE] bg-[#FFFDF8] px-4 text-sm font-semibold text-[#1B1A17] outline-none focus:border-[#F36B4F] disabled:opacity-70 dark:border-white/10 dark:bg-[#1B1D28] dark:text-[#FFF8EA]"
            />
          </label>

          <div className="mt-3">
            <ImageCropUpload
              uploadType="package_photo"
              preset="package"
              value={packagePhotoUrl}
              label="Upload package photo"
              onUploaded={setPackagePhotoUrl}
              className={isFulfilled ? "pointer-events-none opacity-70" : ""}
            />
          </div>

          {fulfillmentError ? <p className="mt-3 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600 dark:bg-red-500/10 dark:text-red-200">{fulfillmentError}</p> : null}

          {!isFulfilled ? (
            <button
              type="button"
              disabled={isSaving || !trackingNumber.trim() || !packagePhotoUrl.trim()}
              onClick={async () => {
                setIsSaving(true);
                setFulfillmentError("");
                try {
                  const updatedOrder = await updateVendorOrderStatus(order.id, {
                    orderStatus: "fulfilled",
                    trackingNumber,
                    packagePhotoUrl
                  });
                  onFulfilled(updatedOrder);
                  setFulfillmentOpen(false);
                } catch (requestError) {
                  setFulfillmentError(requestError instanceof Error ? requestError.message : "Could not mark order fulfilled.");
                } finally {
                  setIsSaving(false);
                }
              }}
              className={buttonStyles("primary", "mt-3 w-full justify-center px-5 py-3 disabled:cursor-not-allowed disabled:opacity-55")}
            >
              {isSaving ? "Saving fulfillment..." : "Mark as fulfilled"}
            </button>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

export function AdminDashboardContent() {
  const currentUser = useExpoStore((state) => state.currentUser);
  const [dashboard, setDashboard] = useState<AdminDashboardResponse | null>(null);
  const [operationsTab, setOperationsTab] = useState<"stalls" | "requests" | "assignments">("stalls");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    getAdminDashboard()
      .then((response) => {
        if (!active) return;
        setDashboard(response);
        setError("");
      })
      .catch((errorValue) => {
        if (active) setError(errorValue instanceof Error ? errorValue.message : "Could not load admin dashboard.");
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const retryDashboard = async () => {
    setIsLoading(true);
    try {
      const response = await getAdminDashboard();
      setDashboard(response);
      setError("");
    } catch (errorValue) {
      setError(errorValue instanceof Error ? errorValue.message : "Could not load admin dashboard.");
    } finally {
      setIsLoading(false);
    }
  };

  const totals = dashboard?.totals;
  const hasExhibitions = (totals?.exhibitions ?? 0) > 0;
  const activeExhibitionCards = dashboard?.activeExhibitions ?? [];
  const recentStalls = dashboard?.recentStalls ?? [];
  const vendorRequests = dashboard?.vendorRequests ?? [];
  const recentActivities = dashboard?.recentActivities ?? [];
  const vendorPerformance = dashboard?.vendorPerformance ?? [];
  const hasAnalyticsData = Boolean(
    (totals?.liveVisitors ?? 0) ||
    (totals?.liveSessions ?? 0) ||
    (totals?.orders ?? 0) ||
    (totals?.revenue ?? 0)
  );
  const assignmentTotal = Math.max(totals?.stalls ?? 0, 1);
  const assignmentRatio = Math.round(((totals?.assignedStalls ?? 0) / assignmentTotal) * 100);
  const analyticsMax = Math.max(
    totals?.liveVisitors ?? 0,
    totals?.orders ?? 0,
    totals?.liveSessions ?? 0,
    totals?.revenue ?? 0,
    1
  );

  return (
    <RoleShell role="admin" title="Admin">
      <section className="min-h-[calc(100vh-76px)] bg-[#FAF7F0] px-3 py-4 text-[#1B1A17] dark:bg-[#05040A] dark:text-[#FFF8EA] sm:px-5 sm:py-6 xl:px-8">
        <div className="rounded-[32px] border border-[#E8DDCC] bg-[#FFFDF8] p-4 shadow-[0_24px_80px_rgba(128,91,44,0.12)] dark:border-white/10 dark:bg-[#0B0A12] dark:shadow-[0_24px_90px_rgba(0,0,0,0.34)] sm:p-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex min-h-8 items-center gap-2 rounded-full border border-[#D7BE86] bg-[#FFF5DF] px-3 text-xs font-bold uppercase tracking-[0.16em] text-[#9B6B2F] dark:border-[#D6AC63]/35 dark:bg-[#D6AC63]/10 dark:text-[#F4C879]">
                  <Database className="h-3.5 w-3.5" />
                  Database records only
                </span>
                <span className="inline-flex min-h-8 items-center gap-2 rounded-full border border-[#E8DDCC] bg-white px-3 text-xs font-semibold text-[#6F675C] dark:border-white/10 dark:bg-[#1d1d27] dark:text-white/60">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                  Live platform
                </span>
              </div>
              <h1 className="luxury-display mt-4 text-4xl font-semibold tracking-[-0.06em] text-[#1B1A17] dark:text-[#FFF8EA] sm:text-5xl">
                Admin Command Center
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-[#6F675C] dark:text-white/62">
                Manage exhibitions, vendors, stalls, live sessions, orders, and analytics from one place.
                {currentUser?.name ? ` Signed in as ${currentUser.name}.` : ""}
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-3 xl:min-w-[520px]">
              <Link data-tour-id="admin-create-exhibition" href="/admin/exhibitions" className={buttonStyles(hasExhibitions ? "secondary" : "primary", "justify-center px-4 py-3 text-sm")}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Create Exhibition
              </Link>
              <Link data-tour-id="admin-generate-stalls" href="/admin/stalls" className={buttonStyles("secondary", "justify-center px-4 py-3 text-sm")}>
                <Boxes className="mr-2 h-4 w-4" />
                Generate Stalls
              </Link>
              <Link data-tour-id="admin-vendor-requests" href="/admin/vendors" className={buttonStyles("secondary", "justify-center px-4 py-3 text-sm")}>
                <UserPlus className="mr-2 h-4 w-4" />
                Vendor Requests
              </Link>
            </div>
          </div>
        </div>

        {error ? (
          <div className="mt-4 flex flex-col gap-3 rounded-[26px] border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/25 dark:bg-red-500/10 dark:text-red-100 sm:flex-row sm:items-center sm:justify-between">
            <span className="flex items-center gap-2 font-semibold">
              <AlertCircle className="h-4 w-4" />
              {error}
            </span>
            <button type="button" onClick={retryDashboard} className={buttonStyles("secondary", "w-full justify-center px-4 py-2.5 sm:w-auto")}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </button>
          </div>
        ) : null}

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
          <AdminKpiCard loading={isLoading && !dashboard} label="Total Exhibitions" value={String(totals?.exhibitions ?? 0)} helper={hasExhibitions ? "Created in database" : "Create your first exhibition"} icon={Store} />
          <AdminKpiCard loading={isLoading && !dashboard} label="Active Exhibitions" value={String(totals?.activeExhibitions ?? 0)} helper="Live status only" icon={Radio} />
          <AdminKpiCard loading={isLoading && !dashboard} label="Vendors Pending" value={String(totals?.pendingVendors ?? 0)} helper="Awaiting admin review" icon={UserPlus} />
          <AdminKpiCard loading={isLoading && !dashboard} label="Total Stalls" value={String(totals?.stalls ?? 0)} helper={`${totals?.assignedStalls ?? 0} assigned`} icon={Boxes} />
          <AdminKpiCard loading={isLoading && !dashboard} label="Orders" value={String(totals?.orders ?? 0)} helper="Orders table count" icon={ShoppingBag} />
          <AdminKpiCard loading={isLoading && !dashboard} label="Revenue" value={formatPrice(totals?.revenue ?? 0)} helper="Paid orders only" icon={BarChart3} />
          <AdminKpiCard loading={isLoading && !dashboard} label="Live Visitors" value={String(totals?.liveVisitors ?? 0)} helper="Persisted live viewers" icon={Users} />
        </div>

        <div className="mt-5 grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
          <AdminPanel className="relative overflow-hidden p-5 sm:p-6">
            <div className="relative">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#B88A3D] dark:text-[#D6AC63]">
                {hasExhibitions ? "Operations" : "Onboarding"}
              </p>
              <h2 className="mt-3 text-2xl font-semibold tracking-[-0.05em] text-[#1B1A17] dark:text-[#FFF8EA]">
                {hasExhibitions ? "Manage today's exhibition operations" : "Launch your first digital exhibition"}
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#6F675C] dark:text-white/62">
                {hasExhibitions
                  ? "Use database-backed controls to manage stalls, assignments, vendor approvals, and order operations."
                  : "Create an exhibition, generate stalls, approve vendors, and start accepting live shopping participation."}
              </p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <AdminActionCard href="/admin/exhibitions" icon={PlusCircle} title="Create Exhibition" description="Add dates, category, status, and stall capacity." />
                <AdminActionCard href="/admin/stalls" icon={Boxes} title="Generate Stalls" description="Create or review database stall records." />
                <AdminActionCard href="/admin/vendors" icon={UserPlus} title="Review Requests" description={`${totals?.pendingVendors ?? 0} vendor accounts pending.`} />
                <AdminActionCard href="/admin/orders" icon={ClipboardList} title="View Orders" description="Track purchases and fulfillment status." />
              </div>
            </div>
          </AdminPanel>

          <AdminPanel className="p-5 sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#B88A3D] dark:text-[#D6AC63]">Next actions</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-[#1B1A17] dark:text-[#FFF8EA]">Platform readiness</h2>
              </div>
              <Link href="/admin/analytics" className="text-sm font-bold text-[#B88A3D] transition hover:text-[#F36B4F] dark:text-[#D6AC63]">
                Open analytics
              </Link>
            </div>
            <div className="mt-5 grid gap-3">
              <AdminReadinessRow label="Exhibitions created" value={totals?.exhibitions ?? 0} complete={(totals?.exhibitions ?? 0) > 0} />
              <AdminReadinessRow label="Stalls generated" value={totals?.stalls ?? 0} complete={(totals?.stalls ?? 0) > 0} />
              <AdminReadinessRow label="Vendors approved" value={totals?.approvedVendors ?? 0} complete={(totals?.approvedVendors ?? 0) > 0} />
              <AdminReadinessRow label="Live sessions active" value={totals?.liveSessions ?? 0} complete={(totals?.liveSessions ?? 0) > 0} />
            </div>
          </AdminPanel>
        </div>

        <div className="mt-5 grid gap-5 2xl:grid-cols-[1.08fr_0.92fr]">
          <AdminPanel className="p-5 sm:p-6">
            <AdminSectionTitle title="Active / Upcoming Exhibitions" eyebrow={`${totals?.activeExhibitions ?? 0} live, ${totals?.upcomingExhibitions ?? 0} upcoming`} href="/admin/exhibitions" action="View all" />
            {isLoading && !dashboard ? (
              <AdminLoadingState rows={3} className="lg:grid-cols-2 2xl:grid-cols-3" />
            ) : activeExhibitionCards.length ? (
              <div className="mt-5 grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
                {activeExhibitionCards.map((exhibition) => {
                  const assignedCount = exhibition.assignedStallsCount ?? 0;
                  const stallCount = exhibition.stallCount ?? exhibition.stall_count ?? 0;
                return (
                  <article key={exhibition.id} className="overflow-hidden rounded-[26px] border border-[#E8DDCC] bg-white shadow-[0_16px_45px_rgba(128,91,44,0.1)] dark:border-white/10 dark:bg-[#171720]">
                    <div className="relative h-36">
                      <AppImage src={exhibition.bannerImage || "/stalls/stall-placeholder.png"} alt={exhibition.title} className="h-full w-full rounded-none" fallbackSrc="/stalls/stall-placeholder.png" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                      <div className="absolute left-3 top-3">
                        <AdminStatusPill status={exhibition.status} />
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="line-clamp-1 text-base font-semibold text-[#1B1A17] dark:text-[#FFF8EA]">{exhibition.title}</h3>
                      <p className="mt-1 text-xs text-[#6F675C] dark:text-white/56">{formatDateRange(exhibition.startDate, exhibition.endDate)}</p>
                      <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                        <AdminMiniStat label="Stalls" value={String(stallCount)} />
                        <AdminMiniStat label="Assigned" value={String(assignedCount)} />
                        <AdminMiniStat label="Live" value={String(exhibition.liveSessionsCount ?? 0)} />
                        <AdminMiniStat label="Orders" value={String(exhibition.ordersCount ?? 0)} />
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-2">
                        <Link href="/admin/exhibitions" className={buttonStyles("primary", "justify-center px-3 py-2.5 text-xs")}>
                          Manage
                        </Link>
                        <Link href={`/exhibition/${exhibition.id}`} className={buttonStyles("secondary", "justify-center px-3 py-2.5 text-xs")}>
                          View Floor
                        </Link>
                      </div>
                    </div>
                  </article>
                );})}
              </div>
            ) : (
              <AdminEmptyState
                icon={Store}
                title={hasExhibitions ? "No active or upcoming exhibitions" : "No exhibitions yet"}
                description={hasExhibitions ? "Start or schedule an exhibition to manage live stalls and vendors here." : "Create your first exhibition to start managing stalls, vendors, and live shopping rooms."}
                actionHref="/admin/exhibitions"
                actionLabel="Create Exhibition"
              />
            )}
          </AdminPanel>

          <AdminPanel className="p-5 sm:p-6">
            <AdminSectionTitle title="Vendor & Stall Operations" eyebrow="Database operations" href="/admin/stalls" action="Manage stalls" />
            <div className="mt-4 grid grid-cols-3 gap-2 rounded-2xl border border-[#E8DDCC] bg-[#F7F1E8] p-1 dark:border-white/10 dark:bg-[#171720]">
              {[
                ["stalls", "Stalls"],
                ["requests", "Requests"],
                ["assignments", "Assignments"]
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setOperationsTab(value as "stalls" | "requests" | "assignments")}
                  className={`min-h-11 rounded-xl px-3 text-xs font-bold transition ${
                    operationsTab === value
                      ? "bg-white text-[#1B1A17] shadow-sm dark:bg-[#FF785C] dark:text-white"
                      : "text-[#6F675C] hover:bg-card dark:text-white/58 dark:hover:bg-card"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="mt-5">
              {isLoading && !dashboard ? (
                <AdminLoadingState rows={4} className="mt-0" />
              ) : (
                <>
                  {operationsTab === "stalls" ? (
                    recentStalls.length ? (
                      <div className="grid gap-3">
                        {recentStalls.slice(0, 6).map((stall) => (
                          <div key={stall.id} className="flex items-center justify-between gap-3 rounded-[22px] border border-[#E8DDCC] bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#171720]">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-[#1B1A17] dark:text-[#FFF8EA]">{stall.stallCode ?? stall.number ?? stall.name}</p>
                              <p className="mt-1 truncate text-xs text-[#6F675C] dark:text-white/56">{stall.exhibitionTitle ?? "Exhibition unavailable"}</p>
                              <p className="mt-1 truncate text-xs text-[#6F675C] dark:text-white/56">{stall.vendorName || "Unassigned"}</p>
                            </div>
                            <AdminStatusPill status={stall.status} />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <AdminEmptyState icon={Boxes} title="No stalls generated" description="Generate stalls after creating an exhibition before assigning vendors." actionHref="/admin/stalls" actionLabel="Generate Stalls" compact />
                    )
                  ) : null}

                  {operationsTab === "requests" ? (
                    vendorRequests.length ? (
                      <div className="grid gap-3">
                        {vendorRequests.map((request) => (
                          <div key={request.id} className="rounded-[22px] border border-[#E8DDCC] bg-white p-4 dark:border-white/10 dark:bg-[#171720]">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-[#1B1A17] dark:text-[#FFF8EA]">{request.vendorName ?? request.vendor_id}</p>
                                <p className="mt-1 text-xs text-[#6F675C] dark:text-white/56">{request.businessCategory ?? "Category not provided"}</p>
                              </div>
                              <AdminStatusPill status={request.status} />
                            </div>
                            <p className="mt-3 text-xs text-[#6F675C] dark:text-white/56">{request.message || "No vendor message submitted."}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <AdminEmptyState icon={UserPlus} title="No vendor requests yet" description="Vendor applications and participation requests will appear here for review." actionHref="/admin/vendors" actionLabel="Open Vendors" compact />
                    )
                  ) : null}

                  {operationsTab === "assignments" ? (
                    (totals?.stalls ?? 0) ? (
                      <div className="rounded-[24px] border border-[#E8DDCC] bg-white p-4 dark:border-white/10 dark:bg-[#171720]">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-[#1B1A17] dark:text-[#FFF8EA]">Assigned stall coverage</p>
                            <p className="mt-1 text-xs text-[#6F675C] dark:text-white/56">{totals?.assignedStalls ?? 0} assigned, {totals?.unassignedStalls ?? 0} unassigned</p>
                          </div>
                          <span className="text-2xl font-semibold tracking-[-0.04em] text-[#B88A3D] dark:text-[#D6AC63]">{assignmentRatio}%</span>
                        </div>
                        <div className="mt-4 h-3 overflow-hidden rounded-full bg-[#F1E3CF] dark:bg-[#23232d]">
                          <div className="h-full rounded-full bg-[#F36B4F] transition-all" style={{ width: `${assignmentRatio}%` }} />
                        </div>
                        <Link href="/admin/stalls" className={buttonStyles("secondary", "mt-4 w-full justify-center px-4 py-2.5 text-sm")}>
                          Assign Vendors
                        </Link>
                      </div>
                    ) : (
                      <AdminEmptyState icon={Boxes} title="No assignments available" description="Generate stalls before assigning vendors to an exhibition floor." actionHref="/admin/stalls" actionLabel="Generate Stalls" compact />
                    )
                  ) : null}
                </>
              )}
            </div>
          </AdminPanel>
        </div>

        <div className="mt-5 grid gap-5 2xl:grid-cols-[1.08fr_0.92fr]">
          <AdminPanel className="p-5 sm:p-6">
            <AdminSectionTitle title="Analytics Overview" eyebrow="Database totals" href="/admin/analytics" action="Full analytics" />
            {isLoading && !dashboard ? (
              <AdminLoadingState rows={4} className="sm:grid-cols-2" />
            ) : (
              <>
                <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                  <AdminAnalyticsCard label="Visitors" value={String(totals?.liveVisitors ?? 0)} />
                  <AdminAnalyticsCard label="Live Sessions" value={String(totals?.liveSessions ?? 0)} />
                  <AdminAnalyticsCard label="Orders" value={String(totals?.orders ?? 0)} />
                  <AdminAnalyticsCard label="Revenue" value={formatPrice(totals?.revenue ?? 0)} />
                  <AdminAnalyticsCard label="Conversion" value={`${totals?.conversion ?? 0}%`} />
                </div>

                {hasAnalyticsData ? (
                  <div className="mt-5 grid gap-2 rounded-[24px] border border-[#E8DDCC] bg-white p-4 dark:border-white/10 dark:bg-[#171720]">
                    {[
                      ["Visitors", totals?.liveVisitors ?? 0],
                      ["Orders", totals?.orders ?? 0],
                      ["Live", totals?.liveSessions ?? 0],
                      ["Revenue", totals?.revenue ?? 0]
                    ].map(([label, value]) => (
                      <div key={String(label)} className="grid grid-cols-[86px_1fr_72px] items-center gap-3 text-xs">
                        <span className="font-semibold text-[#6F675C] dark:text-white/56">{label}</span>
                        <span className="h-2 overflow-hidden rounded-full bg-[#F1E3CF] dark:bg-[#23232d]">
                          <span className="block h-full rounded-full bg-[#F36B4F]" style={{ width: `${Math.max(4, Math.round((Number(value) / analyticsMax) * 100))}%` }} />
                        </span>
                        <span className="text-right font-bold text-[#1B1A17] dark:text-[#FFF8EA]">{label === "Revenue" ? formatPrice(Number(value)) : String(value)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <AdminEmptyState icon={Activity} title="Analytics will appear soon" description="Once visitors join exhibitions and orders are placed, metrics will populate automatically." compact />
                )}

                <div className="mt-5 rounded-[24px] border border-[#E8DDCC] bg-[#F7F1E8] p-4 dark:border-white/10 dark:bg-card">
                  <h3 className="text-sm font-semibold text-[#1B1A17] dark:text-[#FFF8EA]">Vendor performance</h3>
                  <div className="mt-3 grid gap-2">
                    {vendorPerformance.length ? vendorPerformance.map((vendor) => (
                      <div key={vendor.vendorId ?? vendor.vendor} className="flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 text-sm dark:bg-[#1d1d27]">
                        <span className="min-w-0 truncate font-semibold text-[#1B1A17] dark:text-[#FFF8EA]">{vendor.vendor}</span>
                        <span className="shrink-0 text-[#6F675C] dark:text-white/56">{formatPrice(vendor.revenue)} | {vendor.viewers} viewers</span>
                      </div>
                    )) : (
                      <p className="rounded-2xl bg-white px-4 py-3 text-sm text-[#6F675C] dark:bg-[#1d1d27] dark:text-white/56">Vendor performance will appear once vendors start selling.</p>
                    )}
                  </div>
                </div>
              </>
            )}
          </AdminPanel>

          <AdminPanel className="p-5 sm:p-6">
            <AdminSectionTitle title="Recent Activity" eyebrow="Latest platform events" href="/admin/vendors" action="Review requests" />
            <div className="mt-4 grid gap-3">
              {isLoading && !dashboard ? (
                <AdminLoadingState rows={5} className="mt-0" />
              ) : recentActivities.length ? recentActivities.map((activity) => {
                const Icon = getActivityIcon(activity);
                return (
                  <Link key={activity.id} href={activity.href ?? "/admin"} className="flex items-center gap-3 rounded-[22px] border border-[#E8DDCC] bg-white p-3 transition hover:-translate-y-0.5 hover:border-[#D6AC63] dark:border-white/10 dark:bg-[#171720]">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#B88A3D]/10 text-[#B88A3D] dark:bg-[#D6AC63]/12 dark:text-[#D6AC63]">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-[#1B1A17] dark:text-[#FFF8EA]">{activity.title}</p>
                      <p className="truncate text-xs text-[#6F675C] dark:text-white/56">{activity.description}</p>
                      <p className="mt-1 text-[11px] text-[#8A8175] dark:text-white/42">{formatDateTime(activity.createdAt)}</p>
                    </div>
                    {activity.status ? <AdminStatusPill status={activity.status} /> : null}
                  </Link>
                );
              }) : (
                <AdminEmptyState icon={Activity} title="No recent activity" description="Admin actions and platform events will appear here." actionHref="/admin/exhibitions" actionLabel="Create Exhibition" compact />
              )}
            </div>
          </AdminPanel>
        </div>

        <AdminPanel className="mt-5 p-5 sm:p-6">
          <AdminSectionTitle title="Quick Actions" eyebrow="Admin shortcuts" />
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
            <AdminActionCard href="/admin/exhibitions" icon={PlusCircle} title="Create Exhibition" description="Add a new exhibition." badge={!hasExhibitions ? "Start here" : undefined} />
            <AdminActionCard href="/admin/stalls" icon={Boxes} title="Generate Stalls" description="Manage stall inventory." />
            <AdminActionCard href="/admin/vendors" icon={UserPlus} title="Review Vendors" description={`${totals?.pendingVendors ?? 0} pending`} badge={(totals?.pendingVendors ?? 0) > 0 ? String(totals?.pendingVendors) : undefined} />
            <AdminActionCard href="/admin/stalls" icon={Users} title="Assign Vendor" description="Connect vendors to stalls." />
            <AdminActionCard href="/admin/orders" icon={ClipboardList} title="View Orders" description="Track order status." />
            <AdminActionCard href="/admin/analytics" icon={BarChart3} title="Open Analytics" description="Inspect platform totals." />
          </div>
        </AdminPanel>
      </section>
    </RoleShell>
  );
}

function AdminPanel({ className = "", children, ...props }: HTMLAttributes<HTMLDivElement> & { className?: string; children: ReactNode }) {
  return (
    <div {...props} className={`rounded-[30px] border border-[#E8DDCC] bg-[#FFFDF8] shadow-[0_22px_70px_rgba(128,91,44,0.1)] dark:border-white/10 dark:bg-[#0F0E18] dark:shadow-[0_22px_80px_rgba(0,0,0,0.28)] ${className}`}>
      {children}
    </div>
  );
}

function AdminSectionTitle({ title, eyebrow, href, action }: { title: string; eyebrow?: string; href?: string; action?: string }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
      <div>
        {eyebrow ? <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#B88A3D] dark:text-[#D6AC63]">{eyebrow}</p> : null}
        <h2 className="mt-1 text-xl font-semibold tracking-[-0.04em] text-[#1B1A17] dark:text-[#FFF8EA]">{title}</h2>
      </div>
      {href && action ? (
        <Link href={href} className="text-sm font-bold text-[#B88A3D] transition hover:text-[#F36B4F] dark:text-[#D6AC63]">
          {action}
        </Link>
      ) : null}
    </div>
  );
}

function AdminKpiCard({
  label,
  value,
  helper,
  icon: Icon,
  loading
}: {
  label: string;
  value: string;
  helper: string;
  icon: typeof Store;
  loading?: boolean;
}) {
  return (
    <div className="rounded-[24px] border border-[#E8DDCC] bg-[#FFFDF8] p-4 shadow-[0_16px_40px_rgba(128,91,44,0.08)] dark:border-white/10 dark:bg-[#171720]">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#E8DDCC] bg-[#F7F1E8] text-[#B88A3D] dark:border-white/10 dark:bg-[#D6AC63]/10 dark:text-[#D6AC63]">
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-xs font-bold uppercase tracking-[0.08em] text-[#6F675C] dark:text-white/52">{label}</p>
          {loading ? (
            <span className="mt-2 block h-7 w-16 animate-pulse rounded-xl bg-[#E8DDCC] dark:bg-[#23232d]" />
          ) : (
            <p className="mt-1 text-2xl font-semibold tracking-[-0.05em] text-[#1B1A17] dark:text-[#FFF8EA]">{value}</p>
          )}
        </div>
      </div>
      <p className="mt-3 text-xs font-semibold text-[#6F675C] dark:text-white/50">{helper}</p>
    </div>
  );
}

function AdminMiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-[#F7F1E8] px-3 py-2 dark:bg-[#1d1d27]">
      <p className="text-[11px] text-[#6F675C] dark:text-white/50">{label}</p>
      <p className="mt-1 text-sm font-semibold text-[#1B1A17] dark:text-[#FFF8EA]">{value}</p>
    </div>
  );
}

function AdminAnalyticsCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[22px] border border-[#E8DDCC] bg-white p-4 dark:border-white/10 dark:bg-[#171720]">
      <p className="text-xs font-semibold text-[#6F675C] dark:text-white/52">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#1B1A17] dark:text-[#FFF8EA]">{value}</p>
    </div>
  );
}

function AdminActionCard({
  href,
  title,
  description,
  icon: Icon,
  badge
}: {
  href: string;
  title: string;
  description: string;
  icon: typeof Store;
  badge?: string;
}) {
  return (
    <Link href={href} className="group relative min-h-28 rounded-[22px] border border-[#E8DDCC] bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[#F36B4F] hover:shadow-[0_18px_48px_rgba(128,91,44,0.14)] dark:border-white/10 dark:bg-[#171720] dark:hover:border-[#FF785C]/70">
      {badge ? <span className="absolute right-3 top-3 rounded-full bg-[#F36B4F] px-2 py-0.5 text-[10px] font-bold text-white">{badge}</span> : null}
      <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#B88A3D]/10 text-[#B88A3D] dark:bg-[#D6AC63]/12 dark:text-[#D6AC63]">
        <Icon className="h-5 w-5" />
      </span>
      <p className="mt-3 text-sm font-bold text-[#1B1A17] dark:text-[#FFF8EA]">{title}</p>
      <p className="mt-1 text-xs leading-5 text-[#6F675C] dark:text-white/52">{description}</p>
    </Link>
  );
}

function AdminEmptyState({
  icon: Icon,
  title,
  description,
  actionHref,
  actionLabel,
  secondaryHref,
  secondaryLabel,
  compact
}: {
  icon: typeof Store;
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
  compact?: boolean;
}) {
  return (
    <div className={`mt-5 flex flex-col items-center justify-center rounded-[26px] border border-dashed border-[#D7BE86] bg-[#F7F1E8] p-6 text-center dark:border-[#D6AC63]/30 dark:bg-card ${compact ? "min-h-[190px]" : "min-h-[260px]"}`}>
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#B88A3D]/10 text-[#B88A3D] dark:bg-[#D6AC63]/12 dark:text-[#D6AC63]">
        <Icon className="h-6 w-6" />
      </span>
      <h3 className="mt-4 text-lg font-semibold tracking-[-0.03em] text-[#1B1A17] dark:text-[#FFF8EA]">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-6 text-[#6F675C] dark:text-white/56">{description}</p>
      {actionHref && actionLabel ? (
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <Link href={actionHref} className={buttonStyles("primary", "justify-center px-5 py-3 text-sm")}>
            {actionLabel}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
          {secondaryHref && secondaryLabel ? (
            <Link href={secondaryHref} className={buttonStyles("secondary", "justify-center px-5 py-3 text-sm")}>
              {secondaryLabel}
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function AdminLoadingState({ rows = 3, className = "" }: { rows?: number; className?: string }) {
  const spacingClass = className.includes("mt-") ? className : `mt-5 ${className}`;
  return (
    <div className={`grid gap-3 ${spacingClass}`}>
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="min-h-28 animate-pulse rounded-[24px] border border-[#E8DDCC] bg-[#F7F1E8] dark:border-white/10 dark:bg-[#1d1d27]" />
      ))}
    </div>
  );
}

function AdminReadinessRow({ label, value, complete }: { label: string; value: number; complete: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[20px] border border-[#E8DDCC] bg-white px-4 py-3 dark:border-white/10 dark:bg-[#171720]">
      <div className="flex min-w-0 items-center gap-3">
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${complete ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300" : "bg-[#B88A3D]/10 text-[#B88A3D] dark:text-[#D6AC63]"}`}>
          {complete ? <CheckCircle2 className="h-4 w-4" /> : <CalendarDays className="h-4 w-4" />}
        </span>
        <p className="truncate text-sm font-semibold text-[#1B1A17] dark:text-[#FFF8EA]">{label}</p>
      </div>
      <span className="text-sm font-bold text-[#6F675C] dark:text-white/58">{value}</span>
    </div>
  );
}

function AdminStatusPill({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  const tone = ["live", "active", "approved", "accepted", "paid"].includes(normalized)
    ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200"
    : ["pending", "scheduled", "available"].includes(normalized)
      ? "border-[#D6AC63]/35 bg-[#D6AC63]/10 text-[#8A5A24] dark:text-[#F4C879]"
      : ["rejected", "denied", "failed", "cancelled"].includes(normalized)
        ? "border-red-500/25 bg-red-500/10 text-red-700 dark:text-red-200"
        : "border-[#E8DDCC] bg-[#F7F1E8] text-[#6F675C] dark:border-white/10 dark:bg-[#1d1d27] dark:text-white/62";
  return (
    <span className={`inline-flex min-h-7 shrink-0 items-center rounded-full border px-3 text-[11px] font-bold uppercase tracking-[0.08em] ${tone}`}>
      {status}
    </span>
  );
}

function getActivityIcon(activity: AdminRecentActivity) {
  if (activity.type === "vendor_request") return UserPlus;
  if (activity.type === "order") return ShoppingBag;
  if (activity.type === "live_session") return Radio;
  return Activity;
}

function formatDateRange(start?: string | null, end?: string | null) {
  const startText = start ? new Date(start).toLocaleDateString() : "Start date pending";
  const endText = end ? new Date(end).toLocaleDateString() : "End date pending";
  return `${startText} - ${endText}`;
}

function formatDateTime(value?: string | null) {
  if (!value) return "No date recorded";
  return new Date(value).toLocaleString();
}

export function AdminExhibitionsPageContent() {
  const [exhibitions, setExhibitions] = useState<Exhibition[]>([]);
  const [stalls, setStalls] = useState<Stall[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [requests, setRequests] = useState<VendorExhibitionRequest[]>([]);
  const [selectedExhibitionId, setSelectedExhibitionId] = useState("");
  const [selectedStallId, setSelectedStallId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [stallCount, setStallCount] = useState("");
  const [mapTemplateId, setMapTemplateId] = useState(() => getTemplateForStallCount(20).id);
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [assignVendorId, setAssignVendorId] = useState("");
  const [formError, setFormError] = useState("");
  const [managementError, setManagementError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoadingExhibitions, setIsLoadingExhibitions] = useState(true);
  const [isLoadingManagement, setIsLoadingManagement] = useState(false);

  const loadExhibitions = async () => {
    setIsLoadingExhibitions(true);
    try {
      const response = await getAdminExhibitions();
      setExhibitions(response);
      setSelectedExhibitionId((current) => (response.some((exhibition) => exhibition.id === current) ? current : response[0]?.id || ""));
      setManagementError("");
    } catch (errorValue) {
      setManagementError(errorValue instanceof Error ? errorValue.message : "Could not load exhibitions.");
    } finally {
      setIsLoadingExhibitions(false);
    }
  };

  const loadManagement = async (exhibitionId: string) => {
    if (!exhibitionId) {
      setStalls([]);
      setRequests([]);
      setSelectedStallId("");
      setIsLoadingManagement(false);
      return;
    }
    setIsLoadingManagement(true);
    try {
      const [stallResponse, vendorResponse, requestResponse] = await Promise.all([
        getAdminExhibitionStalls(exhibitionId).catch(async (errorValue) => {
          if (!isApiNotFoundError(errorValue)) throw errorValue;
          const allStalls = await getAdminStalls();
          return allStalls.filter((stall) => stall.exhibitionId === exhibitionId);
        }),
        getAdminVendors(),
        getExhibitionVendorRequests(exhibitionId).catch((errorValue) => {
          if (!isApiNotFoundError(errorValue)) throw errorValue;
          return [] as VendorExhibitionRequest[];
        })
      ]);
      setStalls(stallResponse);
      setVendors(vendorResponse);
      setRequests(requestResponse);
      setSelectedStallId((current) => (stallResponse.some((stall) => stall.id === current) ? current : stallResponse[0]?.id || ""));
      setAssignVendorId("");
      setManagementError("");
    } catch (errorValue) {
      setStalls([]);
      setRequests([]);
      setSelectedStallId("");
      setManagementError(errorValue instanceof Error ? errorValue.message : "Could not load exhibition management data.");
    } finally {
      setIsLoadingManagement(false);
    }
  };

  useEffect(() => {
    loadExhibitions();
  }, []);

  useEffect(() => {
    loadManagement(selectedExhibitionId);
  }, [selectedExhibitionId]);

  const selectedExhibition = exhibitions.find((exhibition) => exhibition.id === selectedExhibitionId) ?? null;
  const selectedStall = stalls.find((stall) => stall.id === selectedStallId) ?? null;
  const approvedVendors = vendors.filter((vendor) => vendor.status === "approved");
  const acceptedVendorIds = new Set(requests.filter((request) => request.status === "accepted").map((request) => request.vendor_id));
  const assignableVendors = approvedVendors.filter((vendor) => acceptedVendorIds.has(vendor.id));
  const assignedStalls = stalls.filter((stall) => stall.assignedVendorId || stall.vendorId).length;
  const unassignedStalls = Math.max(0, stalls.length - assignedStalls);
  const pendingRequests = requests.filter((request) => request.status === "pending").length;
  const acceptedRequests = requests.filter((request) => request.status === "accepted").length;
  const selectedStallLabel = selectedStall?.stallCode ?? selectedStall?.number ?? selectedStall?.id ?? "No stall selected";
  const createStallCount = Number(stallCount || 0);
  const selectedMapTemplate = getMapTemplate(mapTemplateId);
  const mapTemplateCapacityOk = !createStallCount || validateMapTemplateCapacity(mapTemplateId, createStallCount);

  const reloadSelected = async () => {
    await loadExhibitions();
    await loadManagement(selectedExhibitionId);
  };

  const runLifecycleAction = async (action: "start" | "pause" | "resume" | "end" | "cancel") => {
    if (!selectedExhibition) return;
    setManagementError("");
    setSuccess("");
    try {
      const actions = {
        start: startExhibition,
        pause: pauseExhibition,
        resume: resumeExhibition,
        end: endExhibition,
        cancel: cancelExhibition
      };
      await actions[action](selectedExhibition.id);
      setSuccess(`Exhibition ${action} action completed.`);
      await reloadSelected();
    } catch (errorValue) {
      setManagementError(errorValue instanceof Error ? errorValue.message : `Could not ${action} exhibition.`);
    }
  };

  return (
    <RoleShell role="admin" title="Exhibitions">
      <section className="min-h-[calc(100vh-64px)] bg-[#FAF7F0] px-3 py-4 text-[#1B1A17] dark:bg-[#05040A] dark:text-[#FFF8EA] sm:px-5 xl:px-8">
        <AdminPanel className="overflow-hidden p-5 sm:p-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex min-h-8 items-center gap-2 rounded-full border border-[#D7BE86] bg-[#F7F1E8] px-3 text-xs font-bold uppercase tracking-[0.12em] text-[#8A5A24] dark:border-[#D6AC63]/30 dark:bg-[#D6AC63]/10 dark:text-[#F4C879]">
                  <Database className="h-3.5 w-3.5" />
                  Database records only
                </span>
                <span className="inline-flex min-h-8 items-center rounded-full border border-[#E8DDCC] bg-white px-3 text-xs font-bold text-[#6F675C] dark:border-white/10 dark:bg-[#222430] dark:text-white/70">
                  Exhibition operations
                </span>
              </div>
              <h1 className="mt-4 text-3xl font-semibold tracking-[-0.06em] text-[#1B1A17] dark:text-[#FFF8EA] sm:text-5xl">
                Exhibition Control Center
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#6F675C] dark:text-white/58 sm:text-base">
                Create exhibitions, generate PostgreSQL-backed stalls, review vendor requests, and assign accepted vendors from one focused workspace.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:min-w-[520px]">
              <AdminMiniStat label="Exhibitions" value={isLoadingExhibitions ? "Loading" : String(exhibitions.length)} />
              <AdminMiniStat label="Selected stalls" value={isLoadingManagement ? "Loading" : String(stalls.length)} />
              <AdminMiniStat label="Assigned" value={isLoadingManagement ? "Loading" : String(assignedStalls)} />
              <AdminMiniStat label="Pending requests" value={isLoadingManagement ? "Loading" : String(pendingRequests)} />
            </div>
          </div>
        </AdminPanel>

        <div className="mt-5 grid gap-5 2xl:grid-cols-[0.86fr_1.14fr]">
          <div className="grid gap-5 content-start">
            <AdminPanel className="p-5 sm:p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#B88A3D] dark:text-[#D6AC63]">Create exhibition</p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-[#1B1A17] dark:text-[#FFF8EA] sm:text-3xl">
                    Generate exhibition stalls
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-[#6F675C] dark:text-white/56">
                    The stall count creates real stall rows for the new exhibition. No frontend fallback stalls are used.
                  </p>
                </div>
                <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#B88A3D]/10 text-[#B88A3D] dark:bg-[#D6AC63]/12 dark:text-[#D6AC63]">
                  <PlusCircle className="h-5 w-5" />
                </span>
              </div>

              {formError ? <p className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-700 dark:text-red-200">{formError}</p> : null}
              {success ? <p className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-700 dark:text-emerald-200">{success}</p> : null}

              <form
                onSubmit={async (event) => {
                  event.preventDefault();
                  setFormError("");
                  setSuccess("");
                  const count = Number(stallCount);
                  if (!Number.isInteger(count) || count < 1) {
                    setFormError("Enter a stall count before creating an exhibition.");
                    return;
                  }
                  if (!validateMapTemplateCapacity(mapTemplateId, count)) {
                    setFormError(`${selectedMapTemplate.name} supports up to ${selectedMapTemplate.maxStalls} stalls.`);
                    return;
                  }
                  try {
                    const response = await createAdminExhibition({
                      title,
                      description,
                      category,
                      banner_image_url: bannerUrl || undefined,
                      stall_count: count,
                      mapTemplateId,
                      start_at: startAt || undefined,
                      end_at: endAt || undefined,
                      status: startAt && endAt ? "scheduled" : "draft"
                    });
                    setTitle("");
                    setDescription("");
                    setBannerUrl("");
                    setStallCount("");
                    setMapTemplateId(getTemplateForStallCount(20).id);
                    setStartAt("");
                    setEndAt("");
                    setSuccess(`Created ${response.exhibition.title} with exactly ${response.stalls_created} stalls.`);
                    await loadExhibitions();
                    setSelectedExhibitionId(response.exhibition.id);
                  } catch (errorValue) {
                    setFormError(errorValue instanceof Error ? errorValue.message : "Could not create exhibition.");
                  }
                }}
                className="mt-5 grid gap-4"
              >
                <label className="block text-sm font-semibold text-[#3B352C] dark:text-white/72">
                  Exhibition title
                  <input value={title} onChange={(event) => setTitle(event.target.value)} required className="mt-2 w-full rounded-2xl border border-[#E8DDCC] bg-white px-4 py-3 text-[#1B1A17] outline-none transition placeholder:text-[#8A8175] focus:border-[#F36B4F] focus:ring-4 focus:ring-[#F36B4F]/10 dark:border-white/10 dark:bg-[#1d1d27] dark:text-[#FFF8EA] dark:placeholder:text-white/36" />
                </label>
                <label className="block text-sm font-semibold text-[#3B352C] dark:text-white/72">
                  Description
                  <textarea value={description} onChange={(event) => setDescription(event.target.value)} className="mt-2 min-h-28 w-full rounded-2xl border border-[#E8DDCC] bg-white px-4 py-3 text-[#1B1A17] outline-none transition placeholder:text-[#8A8175] focus:border-[#F36B4F] focus:ring-4 focus:ring-[#F36B4F]/10 dark:border-white/10 dark:bg-[#1d1d27] dark:text-[#FFF8EA] dark:placeholder:text-white/36" />
                </label>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block text-sm font-semibold text-[#3B352C] dark:text-white/72">
                    Theme/category
                    <input value={category} onChange={(event) => setCategory(event.target.value)} placeholder="Exhibition category" className="mt-2 w-full rounded-2xl border border-[#E8DDCC] bg-white px-4 py-3 text-[#1B1A17] outline-none transition placeholder:text-[#8A8175] focus:border-[#F36B4F] focus:ring-4 focus:ring-[#F36B4F]/10 dark:border-white/10 dark:bg-[#1d1d27] dark:text-[#FFF8EA] dark:placeholder:text-white/36" />
                  </label>
                  <label className="block text-sm font-semibold text-[#3B352C] dark:text-white/72">
                    Stall count
                    <input value={stallCount} onChange={(event) => setStallCount(event.target.value.replace(/\D/g, ""))} required inputMode="numeric" pattern="[0-9]*" min="1" max={selectedMapTemplate.maxStalls} placeholder="Number of stalls" className="mt-2 w-full rounded-2xl border border-[#E8DDCC] bg-white px-4 py-3 text-[#1B1A17] outline-none transition placeholder:text-[#8A8175] focus:border-[#F36B4F] focus:ring-4 focus:ring-[#F36B4F]/10 dark:border-white/10 dark:bg-[#1d1d27] dark:text-[#FFF8EA] dark:placeholder:text-white/36" />
                  </label>
                </div>
                <label className="block text-sm font-semibold text-[#3B352C] dark:text-white/72">
                  Map template
                  <select
                    value={mapTemplateId}
                    onChange={(event) => setMapTemplateId(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-[#E8DDCC] bg-white px-4 py-3 text-[#1B1A17] outline-none transition focus:border-[#F36B4F] focus:ring-4 focus:ring-[#F36B4F]/10 dark:border-white/10 dark:bg-[#1B1D28] dark:text-[#FFF8EA]"
                  >
                    {MAP_TEMPLATE_OPTIONS.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.name} - up to {template.maxStalls} stalls
                      </option>
                    ))}
                  </select>
                  <span className={`mt-2 block text-xs leading-5 ${mapTemplateCapacityOk ? "text-[#6F675C] dark:text-white/50" : "text-red-700 dark:text-red-200"}`}>
                    {mapTemplateCapacityOk
                      ? selectedMapTemplate.description
                      : `${selectedMapTemplate.name} supports up to ${selectedMapTemplate.maxStalls} stalls. Reduce the stall count or choose another template.`}
                  </span>
                </label>
                <ImageCropUpload
                  uploadType="exhibition_banner"
                  preset="advertisement"
                  value={bannerUrl}
                  onUploaded={setBannerUrl}
                  label="Exhibition banner image"
                />
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block text-sm font-semibold text-[#3B352C] dark:text-white/72">
                    Start date/time
                    <input value={startAt} onChange={(event) => setStartAt(event.target.value)} type="datetime-local" className="mt-2 w-full rounded-2xl border border-[#E8DDCC] bg-white px-4 py-3 text-[#1B1A17] outline-none transition focus:border-[#F36B4F] focus:ring-4 focus:ring-[#F36B4F]/10 dark:border-white/10 dark:bg-[#1B1D28] dark:text-[#FFF8EA]" />
                  </label>
                  <label className="block text-sm font-semibold text-[#3B352C] dark:text-white/72">
                    End date/time
                    <input value={endAt} onChange={(event) => setEndAt(event.target.value)} type="datetime-local" className="mt-2 w-full rounded-2xl border border-[#E8DDCC] bg-white px-4 py-3 text-[#1B1A17] outline-none transition focus:border-[#F36B4F] focus:ring-4 focus:ring-[#F36B4F]/10 dark:border-white/10 dark:bg-[#1B1D28] dark:text-[#FFF8EA]" />
                  </label>
                </div>
                <p className="rounded-2xl border border-[#E8DDCC] bg-[#F7F1E8] px-4 py-3 text-sm font-semibold text-[#6F675C] dark:border-white/10 dark:bg-[#171720] dark:text-white/58">
                  {Number(stallCount || 0) > 0 ? `This will create exactly ${Number(stallCount)} database stall records for this exhibition.` : "Enter a stall count to generate database stall records automatically."}
                </p>
                <button disabled={!mapTemplateCapacityOk} className={buttonStyles("primary", "w-full justify-center px-8 py-4 text-base disabled:cursor-not-allowed disabled:opacity-50")}>
                  Create Exhibition
                </button>
              </form>
            </AdminPanel>

            <AdminPanel className="p-5 sm:p-6">
              <AdminSectionTitle title="Exhibitions" eyebrow="Database list" />
              <div className="mt-5 grid gap-3">
                {isLoadingExhibitions ? (
                  <AdminLoadingState rows={3} className="mt-0" />
                ) : exhibitions.length ? exhibitions.map((exhibition) => (
                  <button
                    key={exhibition.id}
                    type="button"
                    onClick={() => {
                      setSelectedExhibitionId(exhibition.id);
                      setSelectedStallId("");
                    }}
                    aria-pressed={exhibition.id === selectedExhibitionId}
                    className={`rounded-[24px] border p-4 text-left transition ${
                      exhibition.id === selectedExhibitionId
                        ? "border-[#F36B4F] bg-[#FFF1E9] shadow-[0_18px_44px_rgba(243,107,79,0.16)] dark:border-[#FF785C]/70 dark:bg-[#FF785C]/10"
                        : "border-[#E8DDCC] bg-white hover:border-[#D7BE86] dark:border-white/10 dark:bg-[#171720] dark:hover:border-[#D6AC63]/35"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-[#1B1A17] dark:text-[#FFF8EA]">{exhibition.title}</p>
                        <p className="mt-1 text-xs font-semibold text-[#6F675C] dark:text-white/50">
                          {formatDateRange(exhibition.startDate, exhibition.endDate)}
                        </p>
                      </div>
                      <AdminStatusPill status={exhibition.status} />
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-2">
                      <AdminMiniStat label="Stalls" value={String(exhibition.stallCount ?? exhibition.stall_count ?? 0)} />
                      <AdminMiniStat label="Assigned" value={String(exhibition.assignedStallsCount ?? 0)} />
                      <AdminMiniStat label="Requests" value={String(exhibition.pendingVendorRequests ?? 0)} />
                    </div>
                  </button>
                )) : (
                  <AdminEmptyState icon={CalendarDays} title="No exhibitions yet" description="Create your first digital exhibition to start managing stalls, vendors, and live shopping." compact />
                )}
              </div>
            </AdminPanel>
          </div>

          <div className="grid gap-5 content-start">
            <AdminPanel className="p-5 sm:p-6">
              <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                <div className="max-w-3xl">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#B88A3D] dark:text-[#D6AC63]">Manage selected exhibition</p>
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <h2 className="text-2xl font-semibold tracking-[-0.05em] text-[#1B1A17] dark:text-[#FFF8EA] sm:text-4xl">
                      {selectedExhibition?.title ?? "Select an exhibition"}
                    </h2>
                    {selectedExhibition ? <AdminStatusPill status={selectedExhibition.status} /> : null}
                  </div>
                  <p className="mt-3 text-sm leading-6 text-[#6F675C] dark:text-white/58">
                    {selectedExhibition?.description || "Create or select an exhibition to manage real stalls, requests, and assignments."}
                  </p>
                </div>
                <button type="button" onClick={reloadSelected} disabled={!selectedExhibitionId} className={buttonStyles("secondary", "justify-center px-4 py-3 text-sm disabled:opacity-50")}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh
                </button>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <AdminMiniStat label="Category" value={selectedExhibition?.category || "General"} />
                <AdminMiniStat label="Date range" value={selectedExhibition ? formatDateRange(selectedExhibition.startDate, selectedExhibition.endDate) : "Select exhibition"} />
                <AdminMiniStat label="Unassigned stalls" value={isLoadingManagement ? "Loading" : String(unassignedStalls)} />
                <AdminMiniStat label="Accepted vendors" value={isLoadingManagement ? "Loading" : String(acceptedRequests)} />
              </div>

              <div className="mt-5 grid gap-2 sm:grid-cols-5">
                <button type="button" disabled={!selectedExhibition || selectedExhibition.status === "live"} onClick={() => runLifecycleAction("start")} className={buttonStyles("secondary", "justify-center px-4 py-3 disabled:opacity-50")}>Start</button>
                <button type="button" disabled={!selectedExhibition || selectedExhibition.status !== "live"} onClick={() => runLifecycleAction("pause")} className={buttonStyles("secondary", "justify-center px-4 py-3 disabled:opacity-50")}>Pause</button>
                <button type="button" disabled={!selectedExhibition || selectedExhibition.status !== "paused"} onClick={() => runLifecycleAction("resume")} className={buttonStyles("secondary", "justify-center px-4 py-3 disabled:opacity-50")}>Resume</button>
                <button type="button" disabled={!selectedExhibition || ["ended", "cancelled"].includes(selectedExhibition.status)} onClick={() => runLifecycleAction("end")} className={buttonStyles("secondary", "justify-center px-4 py-3 disabled:opacity-50")}>End</button>
                <button type="button" disabled={!selectedExhibition || selectedExhibition.status === "ended"} onClick={() => runLifecycleAction("cancel")} className={buttonStyles("secondary", "justify-center px-4 py-3 disabled:opacity-50")}>Cancel</button>
              </div>
              {managementError ? (
                <p className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-700 dark:text-red-200">
                  {managementError}
                </p>
              ) : null}
            </AdminPanel>

            <div className="grid gap-5 xl:grid-cols-[1fr_0.82fr]">
              <AdminPanel data-tour-id="admin-stalls-list" className="p-5 sm:p-6">
                <div className="flex items-start justify-between gap-3">
                  <AdminSectionTitle title="Generated stalls" eyebrow="Real stall records" />
                  <span className="rounded-full border border-[#E8DDCC] bg-white px-3 py-1 text-xs font-bold text-[#6F675C] dark:border-white/10 dark:bg-[#171720] dark:text-white/58">{stalls.length} loaded</span>
                </div>
                <div className="mt-5 grid max-h-[560px] gap-3 overflow-y-auto pr-1">
                  {isLoadingManagement ? (
                    <AdminLoadingState rows={4} className="mt-0" />
                  ) : stalls.length ? stalls.map((stall) => {
                    const selected = stall.id === selectedStallId;
                    const assignedVendor = stall.assignedVendorName || stall.vendorName;
                    return (
                      <button
                        key={stall.id}
                        type="button"
                        onClick={() => {
                          setSelectedStallId(stall.id);
                          setAssignVendorId("");
                        }}
                        aria-pressed={selected}
                        className={`rounded-[22px] border p-4 text-left transition ${
                          selected
                            ? "border-[#F36B4F] bg-[#FFF1E9] shadow-[0_18px_44px_rgba(243,107,79,0.14)] dark:border-[#FF785C]/70 dark:bg-[#FF785C]/10"
                            : "border-[#E8DDCC] bg-white hover:border-[#D7BE86] dark:border-white/10 dark:bg-[#171720] dark:hover:border-[#D6AC63]/35"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#B88A3D] dark:text-[#D6AC63]">{stall.stallCode ?? stall.number ?? stall.id}</p>
                            <p className="mt-2 truncate text-base font-semibold text-[#1B1A17] dark:text-[#FFF8EA]">{stall.name}</p>
                            <p className="mt-1 text-sm text-[#6F675C] dark:text-white/54">
                              {assignedVendor ? `Assigned to ${assignedVendor}` : "Unassigned"}
                            </p>
                          </div>
                          <AdminStatusPill status={stall.status} />
                        </div>
                        <div className="mt-4 grid gap-2 sm:grid-cols-3">
                          <AdminMiniStat label="Category" value={stall.category || "General"} />
                          <AdminMiniStat label="Legacy X" value={String(stall.mapX ?? 0)} />
                          <AdminMiniStat label="Legacy Y" value={String(stall.mapY ?? 0)} />
                        </div>
                      </button>
                    );
                  }) : (
                    <AdminEmptyState icon={Boxes} title="No stalls generated yet" description="Create an exhibition with a stall count to generate database stall records before assigning vendors." compact />
                  )}
                </div>
              </AdminPanel>

              <div className="grid gap-5 content-start">
                <AdminPanel data-tour-id="admin-assign-vendor" className="p-5 sm:p-6">
                  <AdminSectionTitle title="Assign vendor" eyebrow="Stall assignment" />
                  {isLoadingManagement ? (
                    <AdminLoadingState rows={3} className="mt-5" />
                  ) : selectedStall ? (
                    <>
                      <div className="mt-5 rounded-[24px] border border-[#E8DDCC] bg-white p-4 dark:border-white/10 dark:bg-[#171720]">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#B88A3D] dark:text-[#D6AC63]">{selectedStallLabel}</p>
                            <h3 className="mt-2 truncate text-xl font-semibold text-[#1B1A17] dark:text-[#FFF8EA]">{selectedStall.name}</h3>
                            <p className="mt-1 text-sm text-[#6F675C] dark:text-white/54">
                              {selectedStall.assignedVendorName || selectedStall.vendorName ? `Assigned to ${selectedStall.assignedVendorName || selectedStall.vendorName}` : "No vendor assigned."}
                            </p>
                          </div>
                          <AdminStatusPill status={selectedStall.status} />
                        </div>
                      </div>
                      <select value={assignVendorId} onChange={(event) => setAssignVendorId(event.target.value)} className="mt-4 w-full rounded-2xl border border-[#E8DDCC] bg-white px-4 py-3 text-sm font-semibold text-[#1B1A17] outline-none transition focus:border-[#F36B4F] focus:ring-4 focus:ring-[#F36B4F]/10 dark:border-white/10 dark:bg-[#1B1D28] dark:text-[#FFF8EA]">
                        <option value="">Select accepted vendor</option>
                        {assignableVendors.map((vendor) => (
                          <option key={vendor.id} value={vendor.id}>{vendor.displayName}</option>
                        ))}
                      </select>
                      <div className="mt-4 grid gap-2 sm:grid-cols-2">
                        <button
                          type="button"
                          disabled={!selectedStall || !assignVendorId}
                          onClick={async () => {
                            if (!selectedStall || !assignVendorId) return;
                            try {
                              setManagementError("");
                              setSuccess("");
                              await assignVendorToStall(selectedStall.id, assignVendorId);
                              setSuccess("Vendor assigned to stall.");
                              await loadManagement(selectedExhibitionId);
                            } catch (errorValue) {
                              setManagementError(errorValue instanceof Error ? errorValue.message : "Could not assign vendor.");
                            }
                          }}
                          className={buttonStyles("primary", "justify-center px-4 py-3 disabled:opacity-50")}
                        >
                          Assign
                        </button>
                        <button
                          type="button"
                          disabled={!selectedStall || !selectedStall.assignedVendorId}
                          onClick={async () => {
                            if (!selectedStall) return;
                            try {
                              setManagementError("");
                              setSuccess("");
                              await removeVendorFromStall(selectedStall.id);
                              setSuccess("Vendor removed from stall.");
                              await loadManagement(selectedExhibitionId);
                            } catch (errorValue) {
                              setManagementError(errorValue instanceof Error ? errorValue.message : "Could not remove vendor.");
                            }
                          }}
                          className={buttonStyles("secondary", "justify-center px-4 py-3 disabled:opacity-50")}
                        >
                          Remove
                        </button>
                      </div>
                      {!assignableVendors.length ? <p className="mt-3 rounded-2xl border border-[#E8DDCC] bg-[#F7F1E8] px-4 py-3 text-sm font-semibold text-[#6F675C] dark:border-white/10 dark:bg-[#171720] dark:text-white/58">Only approved vendors with accepted requests for this exhibition can be assigned. None are available yet.</p> : null}
                    </>
                  ) : (
                    <AdminEmptyState icon={Users} title="Select a stall" description="Choose a generated stall to assign or remove an accepted vendor." compact />
                  )}
                </AdminPanel>

                <AdminPanel className="p-5 sm:p-6">
                  <div className="flex items-start justify-between gap-3">
                    <AdminSectionTitle title="Vendor requests" eyebrow="Participation" />
                    <span className="rounded-full border border-[#E8DDCC] bg-white px-3 py-1 text-xs font-bold text-[#6F675C] dark:border-white/10 dark:bg-[#171720] dark:text-white/58">{requests.length}</span>
                  </div>
                  <div className="mt-5 grid gap-3">
                    {isLoadingManagement ? (
                      <AdminLoadingState rows={3} className="mt-0" />
                    ) : requests.length ? requests.map((request) => (
                      <div key={request.id} className="rounded-[24px] border border-[#E8DDCC] bg-white p-4 dark:border-white/10 dark:bg-[#171720]">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-[#1B1A17] dark:text-[#FFF8EA]">{request.vendorName ?? request.vendor_id}</p>
                            <p className="mt-1 text-sm leading-5 text-[#6F675C] dark:text-white/54">{request.message || "No message provided."}</p>
                          </div>
                          <AdminStatusPill status={request.status} />
                        </div>
                        {request.status === "pending" ? (
                          <div className="mt-4 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  setManagementError("");
                                  await acceptVendorRequest(selectedExhibitionId, request.id);
                                  await loadManagement(selectedExhibitionId);
                                } catch (errorValue) {
                                  setManagementError(errorValue instanceof Error ? errorValue.message : "Could not accept vendor request.");
                                }
                              }}
                              className={buttonStyles("secondary", "px-4 py-2")}
                            >
                              Accept
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  setManagementError("");
                                  await denyVendorRequest(selectedExhibitionId, request.id, "Denied by admin.");
                                  await loadManagement(selectedExhibitionId);
                                } catch (errorValue) {
                                  setManagementError(errorValue instanceof Error ? errorValue.message : "Could not deny vendor request.");
                                }
                              }}
                              className={buttonStyles("secondary", "px-4 py-2")}
                            >
                              Deny
                            </button>
                          </div>
                        ) : null}
                      </div>
                    )) : (
                      <AdminEmptyState icon={UserPlus} title="No vendor requests" description="Vendor participation requests for the selected exhibition will appear here." compact />
                    )}
                  </div>
                </AdminPanel>
              </div>
            </div>
          </div>
        </div>
      </section>
    </RoleShell>
  );
}

export function AdminVendorsPageContent() {
  const [vendors, setVendors] = useState<Awaited<ReturnType<typeof getAdminVendors>>>([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const loadVendors = async () => {
    setIsLoading(true);
    try {
      const response = await getAdminVendors();
      setVendors(response);
      setError("");
    } catch (errorValue) {
      setError(errorValue instanceof Error ? errorValue.message : "Could not load vendors.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadVendors();
  }, []);

  const updateVendor = async (vendorId: string, status: "approved" | "rejected") => {
    try {
      setError("");
      await (status === "approved" ? approveAdminVendor(vendorId) : rejectAdminVendor(vendorId));
      await loadVendors();
    } catch (errorValue) {
      setError(errorValue instanceof Error ? errorValue.message : "Could not update vendor.");
    }
  };

  const pendingVendors = vendors.filter((vendor) => vendor.status === "pending").length;
  const approvedVendors = vendors.filter((vendor) => vendor.status === "approved").length;
  const rejectedVendors = vendors.filter((vendor) => vendor.status === "rejected").length;

  return (
    <RoleShell role="admin" title="Vendors">
      <section className="min-h-[calc(100vh-64px)] bg-[#FAF7F0] p-4 text-[#1B1A17] dark:bg-[#05040A] dark:text-[#FFF8EA] sm:p-5">
        <AdminPanel className="min-h-[calc(100vh-104px)] p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#B88A3D] dark:text-[#D6AC63]">Vendor approvals</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-[-0.06em] sm:text-4xl">Vendor Operations</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6F675C] dark:text-white/56">
                Review database vendor accounts. Approved vendors can be assigned only after their exhibition request is accepted.
              </p>
            </div>
            <button type="button" onClick={loadVendors} className={buttonStyles("primary", "justify-center px-4 py-3 text-sm")} disabled={isLoading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
          {error ? <p className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-700 dark:text-red-200">{error}</p> : null}
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <AdminMiniStat label="Pending" value={isLoading ? "Loading" : String(pendingVendors)} />
            <AdminMiniStat label="Approved" value={isLoading ? "Loading" : String(approvedVendors)} />
            <AdminMiniStat label="Rejected" value={isLoading ? "Loading" : String(rejectedVendors)} />
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="min-h-44 animate-pulse rounded-[26px] border border-[#E8DDCC] bg-[#F7F1E8] dark:border-white/10 dark:bg-[#1d1d27]" />
              ))
            ) : vendors.length ? vendors.map((vendor) => {
              const contactDetails = [vendor.ownerName, vendor.email].filter(Boolean).join(" | ");
              const hasProfileDetails = Boolean(contactDetails || vendor.businessCategory || vendor.phone);
              return (
                <div key={vendor.id} className="rounded-[26px] border border-[#E8DDCC] bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#171720]">
                  <div className="flex items-start justify-between gap-3">
                    <p className="min-w-0 truncate text-lg font-semibold text-[#1B1A17] dark:text-[#FFF8EA]">{vendor.displayName || vendor.businessName}</p>
                    <AdminStatusPill status={vendor.status} />
                  </div>
                  <p className="mt-1 text-sm text-[#6F675C] dark:text-white/56">{vendor.businessName || "Business name not submitted"}</p>
                  {contactDetails ? <p className="mt-1 text-sm text-[#6F675C] dark:text-white/56">{contactDetails}</p> : null}
                  {vendor.businessCategory ? <p className="mt-1 text-sm text-[#6F675C] dark:text-white/56">{vendor.businessCategory}</p> : null}
                  {vendor.phone ? <p className="mt-1 text-sm text-[#6F675C] dark:text-white/56">{vendor.phone}</p> : null}
                  {!hasProfileDetails ? (
                    <p className="mt-3 rounded-2xl border border-[#D6AC63]/25 bg-[#D6AC63]/10 px-4 py-3 text-sm text-[#8A5A24] dark:text-[#F4C879]">
                      Vendor profile details have not been submitted.
                    </p>
                  ) : null}
                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    <button type="button" onClick={() => updateVendor(vendor.id, "approved")} disabled={vendor.status === "approved"} className={buttonStyles("secondary", "justify-center px-4 py-2.5 text-sm disabled:opacity-50")}>Approve</button>
                    <button type="button" onClick={() => updateVendor(vendor.id, "rejected")} disabled={vendor.status === "rejected"} className={buttonStyles("secondary", "justify-center px-4 py-2.5 text-sm disabled:opacity-50")}>Reject</button>
                  </div>
                </div>
              );
            }) : (
              <div className="md:col-span-2 2xl:col-span-3">
                <AdminEmptyState icon={UserPlus} title="No vendors found" description="Vendor registrations will appear here after businesses sign up." />
              </div>
            )}
          </div>
        </AdminPanel>
      </section>
    </RoleShell>
  );
}

export function AdminStallsPageContent() {
  const [stalls, setStalls] = useState<Stall[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [exhibitions, setExhibitions] = useState<Exhibition[]>([]);
  const [selectedExhibitionId, setSelectedExhibitionId] = useState("");
  const [selectedStallId, setSelectedStallId] = useState("");
  const [vendorId, setVendorId] = useState("");
  const [requests, setRequests] = useState<VendorExhibitionRequest[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);

  const approvedVendors = vendors.filter((vendor) => vendor.status === "approved");
  const selectedExhibition = exhibitions.find((exhibition) => exhibition.id === selectedExhibitionId) ?? exhibitions[0];
  const selectedExhibitionStalls = selectedExhibitionId ? stalls.filter((stall) => stall.exhibitionId === selectedExhibitionId) : stalls;
  const selectedStall = stalls.find((stall) => stall.id === selectedStallId) ?? null;
  const assignedStalls = selectedExhibitionStalls.filter((stall) => stall.assignedVendorId || stall.vendorId).length;
  const unassignedStalls = Math.max(0, selectedExhibitionStalls.length - assignedStalls);
  const acceptedVendorIds = new Set(requests.filter((request) => request.status === "accepted").map((request) => request.vendor_id));
  const assignableVendors = approvedVendors.filter((vendor) => {
    if (!acceptedVendorIds.has(vendor.id)) return false;
    return !selectedExhibitionStalls.some((stall) => stall.id !== selectedStallId && (stall.assignedVendorId === vendor.id || stall.vendorId === vendor.id));
  });

  const loadStallData = async () => {
    setIsLoading(true);
    setError("");
    try {
      const [stallResponse, vendorResponse, exhibitionResponse] = await Promise.all([
        getAdminStalls(),
        getAdminVendors(),
        getAdminExhibitions()
      ]);
      setStalls(stallResponse);
      setVendors(vendorResponse);
      setExhibitions(exhibitionResponse);
      const nextExhibitionId = exhibitionResponse.some((exhibition) => exhibition.id === selectedExhibitionId)
        ? selectedExhibitionId
        : exhibitionResponse[0]?.id || "";
      setSelectedExhibitionId(nextExhibitionId);
      setSelectedStallId((current) => (stallResponse.some((stall) => stall.id === current) ? current : ""));
      setVendorId((current) => {
        const approved = vendorResponse.filter((vendor) => vendor.status === "approved");
        return approved.some((vendor) => vendor.id === current) ? current : "";
      });
    } catch (errorValue) {
      setError(errorValue instanceof Error ? errorValue.message : "Could not load stalls.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    Promise.all([getAdminStalls(), getAdminVendors(), getAdminExhibitions()])
      .then(([stallResponse, vendorResponse, exhibitionResponse]) => {
        if (!active) return;
        setStalls(stallResponse);
        setVendors(vendorResponse);
        setExhibitions(exhibitionResponse);
        setSelectedExhibitionId(exhibitionResponse[0]?.id ?? "");
        setSelectedStallId("");
        setVendorId("");
        setError("");
      })
      .catch((errorValue) => {
        if (active) setError(errorValue instanceof Error ? errorValue.message : "Could not load stalls.");
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedExhibitionId) {
      setRequests([]);
      setSelectedStallId("");
      return;
    }
    let active = true;
    setIsLoadingRequests(true);
    getExhibitionVendorRequests(selectedExhibitionId)
      .then((response) => {
        if (!active) return;
        setRequests(response);
        setVendorId("");
        setSelectedStallId((current) => {
          const currentBelongsToExhibition = stalls.some((stall) => stall.exhibitionId === selectedExhibitionId && stall.id === current);
          return currentBelongsToExhibition ? current : "";
        });
      })
      .catch((errorValue) => {
        if (!active) return;
        if (isApiNotFoundError(errorValue)) {
          setRequests([]);
          return;
        }
        setError(errorValue instanceof Error ? errorValue.message : "Could not load vendor requests for this exhibition.");
      })
      .finally(() => {
        if (active) setIsLoadingRequests(false);
      });
    return () => {
      active = false;
    };
  }, [selectedExhibitionId, stalls]);

  return (
    <RoleShell role="admin" title="Stalls">
      <section className="min-h-[calc(100vh-64px)] bg-[#FAF7F0] p-4 text-[#1B1A17] dark:bg-[#05040A] dark:text-[#FFF8EA] sm:p-5">
        <div className="mb-5 flex flex-col gap-4 rounded-[30px] border border-[#E8DDCC] bg-[#FFFDF8] p-5 shadow-[0_24px_70px_rgba(128,91,44,0.11)] dark:border-white/10 dark:bg-[#0F0E18] sm:p-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#B88A3D] dark:text-[#D6AC63]">Database stall inventory</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.06em] sm:text-4xl">Stall Operations</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6F675C] dark:text-white/56">
              Manage only stall records returned by PostgreSQL. Empty states appear when the database has no records.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/exhibitions" className={buttonStyles("secondary", "px-4 py-3 text-sm")}>Create Exhibition</Link>
            <button type="button" onClick={loadStallData} className={buttonStyles("primary", "px-4 py-3 text-sm")} disabled={isLoading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="space-y-5">
            {error ? (
              <div className="rounded-[24px] border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-700 dark:text-red-200">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <span>{error}</span>
                  <button type="button" onClick={loadStallData} className={buttonStyles("secondary", "justify-center px-4 py-2 text-sm")}>Retry</button>
                </div>
              </div>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-3">
              <AdminMiniStat label="Selected stalls" value={isLoading ? "Loading" : String(selectedExhibitionStalls.length)} />
              <AdminMiniStat label="Assigned" value={isLoading ? "Loading" : String(assignedStalls)} />
              <AdminMiniStat label="Unassigned" value={isLoading ? "Loading" : String(unassignedStalls)} />
            </div>

            <AdminPanel className="p-4 sm:p-5">
              <AdminSectionTitle title="Recent Stall Records" eyebrow="Real database rows" />
              {exhibitions.length ? (
                <label className="mt-5 block text-sm font-semibold text-[#1B1A17] dark:text-[#FFF8EA]">
                  Exhibition
                  <select
                    value={selectedExhibitionId}
                    onChange={(event) => {
                      setSelectedExhibitionId(event.target.value);
                      setSelectedStallId("");
                      setVendorId("");
                    }}
                    className="mt-2 min-h-12 w-full rounded-2xl border border-[#E8DDCC] bg-white px-4 py-3 text-sm text-[#1B1A17] outline-none transition focus:border-[#F36B4F] dark:border-white/10 dark:bg-[#1B1D28] dark:text-[#FFF8EA]"
                  >
                    {exhibitions.map((exhibition) => <option key={exhibition.id} value={exhibition.id}>{exhibition.title}</option>)}
                  </select>
                </label>
              ) : null}
              <div className="mt-5 grid gap-3">
                {isLoading ? (
                  Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className="h-32 animate-pulse rounded-[24px] border border-[#E8DDCC] bg-[#F7F1E8] dark:border-white/10 dark:bg-[#1d1d27]" />
                  ))
                ) : selectedExhibitionStalls.length ? (
                  selectedExhibitionStalls.map((stall) => {
                    const displayName = stall.stallCode || stall.number || stall.name || "Stall";
                    const vendorName = stall.assignedVendorName || stall.vendorName || "Unassigned";
                    const selected = stall.id === selectedStallId;
                    return (
                      <button
                        key={stall.id}
                        type="button"
                        onClick={() => {
                          setSelectedStallId(stall.id);
                          setVendorId("");
                        }}
                        className={`rounded-[24px] border p-4 text-left shadow-sm transition ${
                          selected
                            ? "border-[#F36B4F] bg-[#FFF1E9] dark:border-[#FF785C]/70 dark:bg-[#FF785C]/10"
                            : "border-[#E8DDCC] bg-white hover:border-[#D7BE86] dark:border-white/10 dark:bg-[#171720] dark:hover:border-[#D6AC63]/35"
                        }`}
                      >
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h2 className="text-lg font-semibold tracking-[-0.03em] text-[#1B1A17] dark:text-[#FFF8EA]">{displayName}</h2>
                              <AdminStatusPill status={stall.status} />
                              {stall.isFeatured ? <span className="rounded-full border border-[#D6AC63]/35 bg-[#D6AC63]/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-[#8A5A24] dark:text-[#F4C879]">Featured</span> : null}
                            </div>
                            {stall.name && stall.name !== displayName ? <p className="mt-1 text-sm font-semibold text-[#6F675C] dark:text-white/58">{stall.name}</p> : null}
                            <div className="mt-3 grid gap-2 text-sm text-[#6F675C] dark:text-white/56 sm:grid-cols-2">
                              <p><span className="font-semibold text-[#1B1A17] dark:text-[#FFF8EA]">Exhibition:</span> {stall.exhibitionTitle || stall.exhibitionId}</p>
                              <p><span className="font-semibold text-[#1B1A17] dark:text-[#FFF8EA]">Vendor:</span> {vendorName}</p>
                              <p><span className="font-semibold text-[#1B1A17] dark:text-[#FFF8EA]">Category:</span> {stall.category || "Uncategorized"}</p>
                              <p><span className="font-semibold text-[#1B1A17] dark:text-[#FFF8EA]">Map:</span> {stall.mapX}, {stall.mapY}</p>
                            </div>
                          </div>
                          <div className="flex shrink-0 flex-wrap gap-2">
                            <span className={buttonStyles("primary", "px-4 py-2 text-sm")}>{selected ? "Selected" : stall.assignedVendorId ? "Manage" : "Assign"}</span>
                          </div>
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <AdminEmptyState
                    icon={Boxes}
                    title="No stalls generated yet"
                    description="Create an exhibition and generate stalls before assigning vendors."
                    actionHref="/admin/exhibitions"
                    actionLabel="Generate Stalls"
                    secondaryHref="/admin/exhibitions"
                    secondaryLabel="Create Exhibition"
                  />
                )}
              </div>
            </AdminPanel>
          </div>

          <AdminPanel className="h-fit p-5 sm:p-6">
            <AdminSectionTitle title="Assign approved vendor" eyebrow="Existing stall only" />
            <p className="mt-2 text-sm leading-6 text-[#6F675C] dark:text-white/56">
              Admins can only assign vendors to generated database stalls. Vendors must be approved and have an accepted request for the selected exhibition.
            </p>
            {isLoading || isLoadingRequests ? (
              <div className="mt-5 space-y-3">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="h-12 animate-pulse rounded-2xl bg-[#F7F1E8] dark:bg-[#1d1d27]" />
                ))}
              </div>
            ) : !exhibitions.length ? (
              <AdminEmptyState
                icon={CalendarDays}
                title="No exhibitions available"
                description="Create an exhibition before assigning vendors to stalls."
                actionHref="/admin/exhibitions"
                actionLabel="Create Exhibition"
                compact
              />
            ) : !selectedExhibitionStalls.length ? (
              <AdminEmptyState
                icon={Boxes}
                title="No generated stalls"
                description="Generate stalls for the selected exhibition before assigning vendors."
                actionHref="/admin/exhibitions"
                actionLabel="Generate Stalls"
                compact
              />
            ) : !selectedStall ? (
              <AdminEmptyState
                icon={MousePointer2}
                title="Select a stall"
                description="Choose one generated stall record from the list to assign or remove a vendor."
                compact
              />
            ) : (
              <div className="mt-5 space-y-4">
                {success ? <p className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-200">{success}</p> : null}
                <div className="rounded-[26px] border border-[#E8DDCC] bg-[#FFFDF8] p-4 dark:border-white/10 dark:bg-card">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#B8892F] dark:text-[#F4C879]">{selectedStall.stallCode || selectedStall.number || selectedStall.id}</p>
                      <h3 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[#1B1A17] dark:text-[#FFF8EA]">{selectedStall.name || "Generated stall"}</h3>
                      <p className="mt-1 text-sm text-[#6F675C] dark:text-white/56">
                        {(selectedStall.assignedVendorName || selectedStall.vendorName) ? `Assigned to ${selectedStall.assignedVendorName || selectedStall.vendorName}` : "Currently unassigned"}
                      </p>
                    </div>
                    <AdminStatusPill status={selectedStall.status} />
                  </div>
                  <div className="mt-4 grid gap-2 text-sm text-[#6F675C] dark:text-white/56 sm:grid-cols-2">
                    <span>Category: <b className="text-[#1B1A17] dark:text-[#FFF8EA]">{selectedStall.category || "Uncategorized"}</b></span>
                    <span>Map: <b className="text-[#1B1A17] dark:text-[#FFF8EA]">{selectedStall.mapX}, {selectedStall.mapY}</b></span>
                    <span>Accepted requests: <b className="text-[#1B1A17] dark:text-[#FFF8EA]">{acceptedVendorIds.size}</b></span>
                    <span>Available vendors: <b className="text-[#1B1A17] dark:text-[#FFF8EA]">{assignableVendors.length}</b></span>
                  </div>
                </div>
                <label className="block text-sm font-semibold text-[#1B1A17] dark:text-[#FFF8EA]">
                  Accepted vendor
                  <select value={vendorId} onChange={(event) => setVendorId(event.target.value)} disabled={!assignableVendors.length} className="mt-2 min-h-12 w-full rounded-2xl border border-[#E8DDCC] bg-white px-4 py-3 text-sm text-[#1B1A17] outline-none transition focus:border-[#F36B4F] disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-[#1B1D28] dark:text-[#FFF8EA]">
                    <option value="">Select accepted vendor</option>
                    {assignableVendors.map((vendor) => <option key={vendor.id} value={vendor.id}>{vendor.displayName || vendor.businessName}</option>)}
                  </select>
                </label>
                {!assignableVendors.length ? (
                  <p className="rounded-2xl border border-[#D6AC63]/30 bg-[#D6AC63]/10 px-4 py-3 text-sm text-[#8A5A24] dark:text-[#F4C879]">
                    No approved vendors with accepted requests are available for this exhibition. Approve the vendor and accept their exhibition request first.
                  </p>
                ) : null}
                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    disabled={!vendorId}
                    onClick={async () => {
                      setError("");
                      setSuccess("");
                      try {
                        await assignVendorToStall(selectedStall.id, vendorId);
                        await loadStallData();
                        setVendorId("");
                        setSuccess("Vendor assigned to the selected generated stall.");
                      } catch (errorValue) {
                        setError(errorValue instanceof Error ? errorValue.message : "Could not assign vendor.");
                      }
                    }}
                    className={buttonStyles("primary", "justify-center px-5 py-3 disabled:cursor-not-allowed disabled:opacity-55")}
                  >
                    Assign Vendor
                  </button>
                  <button
                    type="button"
                    disabled={!(selectedStall.assignedVendorId || selectedStall.vendorId)}
                    onClick={async () => {
                      setError("");
                      setSuccess("");
                      try {
                        await removeVendorFromStall(selectedStall.id);
                        await loadStallData();
                        setVendorId("");
                        setSuccess("Vendor removed from the selected stall.");
                      } catch (errorValue) {
                        setError(errorValue instanceof Error ? errorValue.message : "Could not remove vendor.");
                      }
                    }}
                    className={buttonStyles("secondary", "justify-center px-5 py-3 disabled:cursor-not-allowed disabled:opacity-55")}
                  >
                    Remove Vendor
                  </button>
                </div>
              </div>
            )}
          </AdminPanel>
        </div>
      </section>
    </RoleShell>
  );
}

export function AdminOrdersPageContent() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const loadOrders = async () => {
    setIsLoading(true);
    try {
      const response = await getAdminOrders();
      setOrders(response);
      setError("");
    } catch (errorValue) {
      setError(errorValue instanceof Error ? errorValue.message : "Could not load orders.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const paidOrders = orders.filter((order) => order.paymentStatus === "paid").length;
  const openOrders = orders.filter((order) => !["delivered", "fulfilled", "cancelled"].includes(order.orderStatus)).length;
  const revenue = orders
    .filter((order) => order.paymentStatus === "paid")
    .reduce((sum, order) => sum + order.totalAmount, 0);

  return (
    <RoleShell role="admin" title="Orders">
      <section className="min-h-[calc(100vh-64px)] bg-[#FAF7F0] p-4 text-[#1B1A17] dark:bg-[#05040A] dark:text-[#FFF8EA] sm:p-5">
        <AdminPanel className="min-h-[calc(100vh-104px)] p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#B88A3D] dark:text-[#D6AC63]">Order database</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-[-0.06em] sm:text-4xl">Orders</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6F675C] dark:text-white/56">
                Track customer orders returned by the backend. No order rows are generated on the frontend.
              </p>
            </div>
            <button type="button" onClick={loadOrders} className={buttonStyles("primary", "justify-center px-4 py-3 text-sm")} disabled={isLoading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
          {error ? <p className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-700 dark:text-red-200">{error}</p> : null}
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <AdminKpiCard label="Total orders" value={String(orders.length)} helper="All database orders" icon={ClipboardList} loading={isLoading} />
            <AdminKpiCard label="Paid orders" value={String(paidOrders)} helper="Payment status paid" icon={CheckCircle2} loading={isLoading} />
            <AdminKpiCard label="Open fulfillment" value={String(openOrders)} helper="Not delivered or cancelled" icon={ShoppingBag} loading={isLoading} />
            <AdminKpiCard label="Paid revenue" value={formatPrice(revenue)} helper="Calculated from paid orders" icon={BarChart3} loading={isLoading} />
          </div>
          <div className="mt-6 grid gap-4">
            {isLoading ? (
              <AdminLoadingState rows={5} className="mt-0" />
            ) : orders.length ? orders.map((order) => (
              <article key={order.id} className="rounded-[26px] border border-[#E8DDCC] bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#171720]">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#B88A3D] dark:text-[#D6AC63]">{order.id}</p>
                    <h2 className="mt-2 text-xl font-semibold tracking-[-0.04em] text-[#1B1A17] dark:text-[#FFF8EA]">{order.items[0]?.title ?? "Order item"}</h2>
                    <p className="mt-1 text-sm text-[#6F675C] dark:text-white/56">Vendor: {order.vendorName || order.items[0]?.vendorName || "Vendor unavailable"}</p>
                    <p className="mt-1 text-sm text-[#6F675C] dark:text-white/56">Created: {formatDateTime(order.createdAt)}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <AdminStatusPill status={order.paymentStatus} />
                    <AdminStatusPill status={order.orderStatus} />
                    <span className="rounded-full border border-[#D6AC63]/35 bg-[#D6AC63]/10 px-4 py-2 text-sm font-bold text-[#8A5A24] dark:text-[#F4C879]">{formatPrice(order.totalAmount)}</span>
                  </div>
                </div>
                <div className="mt-4 grid gap-2 text-sm text-[#6F675C] dark:text-white/56 sm:grid-cols-2 xl:grid-cols-4">
                  <span>Items: <b className="text-[#1B1A17] dark:text-[#FFF8EA]">{order.items.length}</b></span>
                  <span>Exhibition: <b className="text-[#1B1A17] dark:text-[#FFF8EA]">{order.exhibitionId || "Unavailable"}</b></span>
                  <span>Stall: <b className="text-[#1B1A17] dark:text-[#FFF8EA]">{order.stallId || "Unavailable"}</b></span>
                  <span>Delivery: <b className="text-[#1B1A17] dark:text-[#FFF8EA]">{order.estimatedDelivery || "Unavailable"}</b></span>
                </div>
              </article>
            )) : (
              <AdminEmptyState
                icon={ClipboardList}
                title="No orders yet"
                description="Orders will appear here after visitors purchase products through checkout."
                actionHref="/admin/exhibitions"
                actionLabel="Manage Exhibitions"
              />
            )}
          </div>
        </AdminPanel>
      </section>
    </RoleShell>
  );
}

export function AdminAnalyticsPageContent() {
  const [analytics, setAnalytics] = useState<Awaited<ReturnType<typeof getAdminAnalytics>> | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const loadAnalytics = async () => {
    setIsLoading(true);
    try {
      const response = await getAdminAnalytics();
      setAnalytics(response);
      setError("");
    } catch (errorValue) {
      setError(errorValue instanceof Error ? errorValue.message : "Could not load analytics.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  const hasAnalytics = Boolean(
    analytics &&
      (analytics.totalVisitors > 0 ||
        analytics.activeStalls > 0 ||
        analytics.liveSessions > 0 ||
        analytics.orders > 0 ||
        analytics.revenue > 0)
  );

  return (
    <RoleShell role="admin" title="Analytics">
      <section className="min-h-[calc(100vh-64px)] bg-[#FAF7F0] p-4 text-[#1B1A17] dark:bg-[#05040A] dark:text-[#FFF8EA] sm:p-5">
        <div className="grid gap-5 2xl:grid-cols-[0.95fr_1.05fr]">
          <AdminPanel className="p-5 sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#B88A3D] dark:text-[#D6AC63]">Database analytics</p>
                <h1 className="mt-2 text-3xl font-semibold tracking-[-0.06em] sm:text-4xl">Analytics</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6F675C] dark:text-white/56">
                  Metrics are computed from live sessions, orders, and stall data returned by the backend.
                </p>
              </div>
              <button type="button" onClick={loadAnalytics} className={buttonStyles("primary", "justify-center px-4 py-3 text-sm")} disabled={isLoading}>
                <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                Refresh
              </button>
            </div>
            {error ? <p className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-700 dark:text-red-200">{error}</p> : null}
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <AdminKpiCard label="Visitors" value={String(analytics?.totalVisitors ?? 0)} helper="Persisted live visitors" icon={Users} loading={isLoading} />
              <AdminKpiCard label="Active stalls" value={String(analytics?.activeStalls ?? 0)} helper="Currently active stall records" icon={Boxes} loading={isLoading} />
              <AdminKpiCard label="Live sessions" value={String(analytics?.liveSessions ?? 0)} helper="Active live sessions" icon={Radio} loading={isLoading} />
              <AdminKpiCard label="Revenue" value={formatPrice(analytics?.revenue ?? 0)} helper="Order revenue from database" icon={BarChart3} loading={isLoading} />
            </div>
            {isLoading ? (
              <AdminLoadingState rows={2} />
            ) : hasAnalytics ? (
              <div className="mt-5 rounded-[26px] border border-[#E8DDCC] bg-white p-5 dark:border-white/10 dark:bg-[#171720]">
                <h2 className="text-lg font-semibold tracking-[-0.04em] text-[#1B1A17] dark:text-[#FFF8EA]">Signals</h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <AdminMiniStat label="Orders" value={String(analytics?.orders ?? 0)} />
                  <AdminMiniStat label="Conversion" value={analytics?.conversionRate ?? "0%"} />
                  <AdminMiniStat label="Top stall" value={analytics?.topStall ?? "Unavailable"} />
                </div>
              </div>
            ) : (
              <AdminEmptyState
                icon={Activity}
                title="Analytics will appear soon"
                description="Once visitors join exhibitions and orders are placed, metrics will populate automatically."
                actionHref="/admin/exhibitions"
                actionLabel="Manage Exhibitions"
                compact
              />
            )}
          </AdminPanel>

          <div className="grid gap-5">
            <AdminPanel className="p-5 sm:p-6">
              <AdminSectionTitle title="Recent Orders" eyebrow="Latest purchases" href="/admin/orders" action="View all" />
              <div className="mt-5 grid gap-3">
                {isLoading ? (
                  <AdminLoadingState rows={4} className="mt-0" />
                ) : (analytics?.recentOrders ?? []).length ? analytics?.recentOrders.map((order) => (
                  <div key={order.id} className="flex flex-col gap-3 rounded-[24px] border border-[#E8DDCC] bg-white p-4 dark:border-white/10 dark:bg-[#171720] sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[#1B1A17] dark:text-[#FFF8EA]">{order.id}</p>
                      <p className="mt-1 truncate text-xs text-[#6F675C] dark:text-white/56">{order.vendorName || "Vendor unavailable"} | {formatDateTime(order.createdAt)}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <AdminStatusPill status={order.paymentStatus} />
                      <span className="text-sm font-bold text-[#B88A3D] dark:text-[#D6AC63]">{formatPrice(order.totalAmount)}</span>
                    </div>
                  </div>
                )) : (
                  <AdminEmptyState icon={ClipboardList} title="No recent orders" description="Recent purchases will appear here after checkout creates orders." compact />
                )}
              </div>
            </AdminPanel>

            <AdminPanel className="p-5 sm:p-6">
              <AdminSectionTitle title="Vendor Performance" eyebrow="Sales ranking" />
              <div className="mt-5 grid gap-3">
                {isLoading ? (
                  <AdminLoadingState rows={3} className="mt-0" />
                ) : (analytics?.vendorPerformance ?? []).length ? analytics?.vendorPerformance.map((vendor) => (
                  <div key={vendor.vendorId ?? vendor.vendor} className="rounded-[24px] border border-[#E8DDCC] bg-white p-4 dark:border-white/10 dark:bg-[#171720]">
                    <div className="flex items-center justify-between gap-3">
                      <p className="min-w-0 truncate text-sm font-semibold text-[#1B1A17] dark:text-[#FFF8EA]">{vendor.vendor}</p>
                      <span className="text-sm font-bold text-[#B88A3D] dark:text-[#D6AC63]">{formatPrice(vendor.revenue)}</span>
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <AdminMiniStat label="Orders" value={String(vendor.orders ?? 0)} />
                      <AdminMiniStat label="Viewers" value={String(vendor.viewers)} />
                    </div>
                  </div>
                )) : (
                  <AdminEmptyState icon={Store} title="No vendor performance yet" description="Vendor performance will appear once vendors start selling." compact />
                )}
              </div>
            </AdminPanel>
          </div>
        </div>
      </section>
    </RoleShell>
  );
}

function ProductCard({ product, onChanged }: { product: Product; onChanged: () => Promise<void> }) {
  const discount = product.compareAtPrice > product.price ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100) : 0;

  return (
    <div className="overflow-hidden rounded-[28px] border border-[#E8DDCC] bg-[#F7F1E8] shadow-sm transition hover:-translate-y-0.5 hover:border-[#F36B4F]/60 hover:shadow-[0_18px_50px_rgba(128,91,44,0.14)] dark:border-white/10 dark:bg-[#171720]">
      <div className="relative">
        <AppImage src={product.images[0] ?? "/products/product-placeholder.png"} alt={product.title} className="h-44 w-full rounded-none" />
        {discount ? <span className="absolute left-3 top-3 rounded-full bg-[#EF3B37] px-3 py-1 text-xs font-black text-white">{discount}% off</span> : null}
      </div>
      <div className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold text-[#1B1A17] dark:text-[#FFF8EA]">{product.title}</p>
          <p className="mt-1 text-sm text-[#6F675C] dark:text-white/52">Stock {product.stock}</p>
        </div>
        <AdminStatusPill status={product.status} />
      </div>
      <div className="mt-4 flex flex-wrap items-end gap-2">
        <p className="text-2xl font-semibold tracking-[-0.04em] text-[#F36B4F]">{formatPrice(product.price)}</p>
        {discount ? <p className="pb-1 text-sm font-bold text-[#9A8F82] line-through dark:text-white/40">{formatPrice(product.compareAtPrice)}</p> : null}
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <button
          onClick={async () => {
            await patchVendorProduct(product.id, { status: product.status === "active" ? "inactive" : "active" });
            await onChanged();
          }}
          className={buttonStyles("secondary", "justify-center px-4 py-2")}
        >
          {product.status === "active" ? "Deactivate" : "Activate"}
        </button>
        <button
          onClick={async () => {
            await deleteVendorProductApi(product.id);
            await onChanged();
          }}
          className={buttonStyles("secondary", "justify-center px-4 py-2")}
        >
          Delete
        </button>
      </div>
      </div>
    </div>
  );
}

function VendorStreamStatus({ mode, note }: { mode: "camera" | "rtmp"; note: string }) {
  const isFallbackLive = note.includes("Stall is live");
  const title = isFallbackLive ? "Live selling mode active" : mode === "camera" ? "Camera stream not connected" : "RTMP streaming setup";
  const message =
    note ||
    (mode === "camera"
      ? "Click Go Live to request camera and microphone access."
      : "Click Go Live to generate RTMP details for streaming apps.");

  return (
    <div className="mt-4 flex aspect-video max-h-[56vh] w-full items-center justify-center rounded-[22px] border border-dashed border-[#D7BE86] bg-[#F7F1E8] p-5 text-center dark:border-[#D6AC63]/30 dark:bg-card sm:rounded-[28px] sm:p-8">
      <div className="max-w-md">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#B88A3D]/10 text-[#B88A3D] dark:bg-[#D6AC63]/12 dark:text-[#F4C879]">
          <Radio className="h-6 w-6" />
        </div>
        <h3 className="mt-5 text-2xl font-semibold tracking-[-0.04em] text-[#1B1A17] dark:text-[#FFF8EA]">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-[#6F675C] dark:text-white/56">{message}</p>
      </div>
    </div>
  );
}

function StatusGrid({ stalls, exhibitionStatus }: { stalls: Array<{ id: string; name: string; isFeatured?: boolean; vendorName?: string }>; exhibitionStatus: string }) {
  const featured = stalls.find((stall) => stall.isFeatured) ?? null;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <MetricCard label="Stalls" value={String(stalls.length)} />
      <MetricCard label="Featured" value={featured?.name ?? "None"} />
      <MetricCard label="Vendor" value={featured?.vendorName ?? "Unavailable"} />
      <MetricCard label="Status" value={exhibitionStatus} />
    </div>
  );
}

function MetricCard({ label, value, icon: Icon }: { label: string; value: string; icon?: typeof Users }) {
  return (
    <div className="rounded-[32px] border border-[#E9D9BE] bg-[#FFFDF8] p-5 shadow-luxury">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-[#7B7065]">{label}</p>
        {Icon ? <Icon className="h-5 w-5 text-[#8A5A24]" /> : null}
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#17120C]">{value}</p>
    </div>
  );
}

function OrdersSection({ title, orders, onAdvance, error }: { title: string; orders: Order[]; onAdvance?: (order: Order) => void; error?: string }) {
  return (
    <section className="min-h-[calc(100vh-64px)] p-5">
      <div className="screen-panel min-h-[calc(100vh-104px)] rounded-[40px] p-6">
        <h1 className="text-4xl font-semibold tracking-[-0.05em] text-slate-950">{title}</h1>
        {error ? <p className="mt-3 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p> : null}
        <div className="mt-6 grid gap-4">
          {orders.length ? orders.map((order) => (
            <div key={order.id} className="grid gap-4 rounded-[30px] border border-[#E9D9BE] bg-[#FFFDF8] p-4 lg:grid-cols-[1fr_auto]">
              <div>
                <p className="font-semibold text-[#17120C]">{order.id}</p>
                <p className="mt-1 text-sm text-[#7B7065]">{order.items[0]?.title ?? "Order item"} from {order.vendorName}</p>
                <p className="mt-3 text-sm text-[#7B7065]">Payment: {order.paymentStatus} | Status: {order.orderStatus}</p>
                {order.shippingAddress ? <p className="mt-2 text-sm text-[#7B7065]">Ship to: {order.shippingAddress}</p> : null}
                {order.shippingMapUrl ? (
                  <a href={order.shippingMapUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex text-sm font-semibold text-[#8A5A24]">
                    Verify delivery pin
                  </a>
                ) : null}
              </div>
              <div className="flex items-center gap-3">
                <p className="text-xl font-semibold text-[#FF7A59]">{formatPrice(order.totalAmount)}</p>
                {onAdvance ? <button onClick={() => onAdvance(order)} className={buttonStyles("secondary", "px-4 py-2")}>Update Status</button> : null}
              </div>
            </div>
          )) : (
            <EmptyStateCard title="No orders found" description="Orders created through checkout will appear here for verification and fulfillment." />
          )}
        </div>
      </div>
    </section>
  );
}

function AdminSimpleList({ title, rows }: { title: string; rows: string[] }) {
  return (
    <RoleShell role="admin" title={title}>
      <section className="min-h-[calc(100vh-64px)] p-5">
        <div className="screen-panel min-h-[calc(100vh-104px)] rounded-[40px] p-6">
          <h1 className="text-4xl font-semibold tracking-[-0.05em] text-slate-950">{title}</h1>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {rows.map((row) => (
              <div key={row} className="rounded-[28px] bg-[#F8FAFC] p-5 text-lg font-semibold text-slate-950">
                {row}
              </div>
            ))}
          </div>
        </div>
      </section>
    </RoleShell>
  );
}

function nextOrderStatus(status: Order["orderStatus"]): Order["orderStatus"] {
  if (status === "placed") return "accepted";
  if (status === "accepted") return "packing";
  if (status === "packing") return "shipped";
  return status;
}
