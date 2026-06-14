"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { ExternalLink, GalleryHorizontal, Link2, RefreshCw, Trash2 } from "lucide-react";
import { RoleShell } from "@/components/layout/role-shell";
import { ImageCropUpload } from "@/components/uploads/image-crop-upload";
import { AppImage } from "@/components/ui/app-image";
import { buttonStyles } from "@/components/ui/button";
import {
  createAdminAdvertisement,
  deleteAdminAdvertisement,
  getAdminAdvertisements,
  getAdminExhibitions,
  getAdminStalls,
  patchAdminAdvertisement
} from "@/lib/api";
import { AdvertisementBanner, Exhibition, Stall } from "@/lib/types";

function bannerStatus(banner: AdvertisementBanner) {
  if (!banner.isActive) return "Inactive";
  const now = Date.now();
  if (banner.startsAt && new Date(banner.startsAt).getTime() > now) return "Scheduled";
  if (banner.endsAt && new Date(banner.endsAt).getTime() <= now) return "Expired";
  return "Active";
}

function statusClass(status: string) {
  if (status === "Active") return "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200";
  if (status === "Scheduled") return "border-amber-500/25 bg-amber-500/10 text-amber-800 dark:text-amber-100";
  return "border-[#E8DDCC] bg-[#F7F1E8] text-[#6F675C] dark:border-white/10 dark:bg-[#1d1d27] dark:text-white/65";
}

function formatSchedule(value?: string | null) {
  if (!value) return "No limit";
  return new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

export function AdminAdvertisementsPageContent() {
  const [banners, setBanners] = useState<AdvertisementBanner[]>([]);
  const [exhibitions, setExhibitions] = useState<Exhibition[]>([]);
  const [stalls, setStalls] = useState<Stall[]>([]);
  const [title, setTitle] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [altText, setAltText] = useState("");
  const [destinationType, setDestinationType] = useState<AdvertisementBanner["destinationType"]>("exhibition");
  const [destinationId, setDestinationId] = useState("");
  const [displayOrder, setDisplayOrder] = useState("0");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [bannerResponse, exhibitionResponse, stallResponse] = await Promise.all([
        getAdminAdvertisements(),
        getAdminExhibitions(),
        getAdminStalls()
      ]);
      setBanners(bannerResponse);
      setExhibitions(exhibitionResponse);
      setStalls(stallResponse);
      setError("");
    } catch (errorValue) {
      setError(errorValue instanceof Error ? errorValue.message : "Could not load advertisement management data.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const destinationOptions = useMemo(() => {
    if (destinationType === "exhibition") {
      return exhibitions.map((exhibition) => ({ id: exhibition.id, label: exhibition.title }));
    }
    return stalls.map((stall) => ({
      id: stall.id,
      label: `${stall.name || stall.stallCode || "Stall"}${stall.exhibitionTitle ? ` - ${stall.exhibitionTitle}` : ""}`
    }));
  }, [destinationType, exhibitions, stalls]);

  useEffect(() => {
    if (!destinationOptions.some((option) => option.id === destinationId)) {
      setDestinationId(destinationOptions[0]?.id ?? "");
    }
  }, [destinationId, destinationOptions]);

  const resetForm = () => {
    setTitle("");
    setImageUrl("");
    setAltText("");
    setDisplayOrder("0");
    setStartsAt("");
    setEndsAt("");
    setIsActive(true);
  };

  const submitBanner = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    if (!imageUrl) {
      setError("Upload and crop a banner image before saving.");
      return;
    }
    if (!destinationId) {
      setError(`Create or select a ${destinationType} before saving this banner.`);
      return;
    }
    if (startsAt && endsAt && new Date(startsAt) >= new Date(endsAt)) {
      setError("Banner start time must be before its end time.");
      return;
    }

    setIsSaving(true);
    try {
      await createAdminAdvertisement({
        title: title.trim(),
        imageUrl,
        altText: altText.trim() || title.trim(),
        destinationType,
        destinationId,
        displayOrder: Number(displayOrder || 0),
        isActive,
        startsAt: startsAt || null,
        endsAt: endsAt || null
      });
      resetForm();
      setSuccess("Advertisement banner published.");
      await loadData();
    } catch (errorValue) {
      setError(errorValue instanceof Error ? errorValue.message : "Could not save advertisement banner.");
    } finally {
      setIsSaving(false);
    }
  };

  const toggleBanner = async (banner: AdvertisementBanner) => {
    setBusyId(banner.id);
    setError("");
    setSuccess("");
    try {
      await patchAdminAdvertisement(banner.id, { isActive: !banner.isActive });
      setSuccess(`${banner.title} ${banner.isActive ? "deactivated" : "activated"}.`);
      await loadData();
    } catch (errorValue) {
      setError(errorValue instanceof Error ? errorValue.message : "Could not update banner status.");
    } finally {
      setBusyId("");
    }
  };

  const removeBanner = async (banner: AdvertisementBanner) => {
    if (!window.confirm(`Delete advertisement "${banner.title}"?`)) return;
    setBusyId(banner.id);
    setError("");
    setSuccess("");
    try {
      await deleteAdminAdvertisement(banner.id);
      setSuccess(`${banner.title} deleted.`);
      await loadData();
    } catch (errorValue) {
      setError(errorValue instanceof Error ? errorValue.message : "Could not delete banner.");
    } finally {
      setBusyId("");
    }
  };

  return (
    <RoleShell role="admin" title="Advertisements">
      <section className="min-h-[calc(100vh-76px)] bg-[#FAF7F0] px-3 py-4 text-[#1B1A17] dark:bg-[#05040A] dark:text-[#FFF8EA] sm:px-5 xl:px-8">
        <div className="mx-auto max-w-[1500px]">
          <div className="rounded-[26px] border border-[#E8DDCC] bg-[#FFFDF8] p-5 shadow-[0_18px_55px_rgba(128,91,44,0.09)] dark:border-white/10 dark:bg-[#0F0E18] dark:shadow-none sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#B88A3D] dark:text-[#D6AC63]">Homepage promotions</p>
                <h1 className="mt-2 text-3xl font-semibold tracking-[-0.05em] sm:text-4xl">Advertisement banners</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6F675C] dark:text-white/58">
                  Upload rotating homepage banners and link each one to a real exhibition or vendor stall.
                </p>
              </div>
              <button type="button" onClick={loadData} disabled={isLoading} className={buttonStyles("secondary", "min-h-11 px-4")}>
                <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                Refresh
              </button>
            </div>
          </div>

          {error ? <p className="mt-4 rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-700 dark:text-red-200">{error}</p> : null}
          {success ? <p className="mt-4 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-700 dark:text-emerald-200">{success}</p> : null}

          <div className="mt-5 grid gap-5 2xl:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)]">
            <form onSubmit={submitBanner} className="rounded-[26px] border border-[#E8DDCC] bg-[#FFFDF8] p-5 shadow-sm dark:border-white/10 dark:bg-[#0F0E18] sm:p-6">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#B88A3D]/10 text-[#B88A3D] dark:bg-[#D6AC63]/12 dark:text-[#D6AC63]">
                  <GalleryHorizontal className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-xl font-semibold">Add banner</h2>
                  <p className="text-xs text-[#6F675C] dark:text-white/52">Exact homepage size: 1600 x 500 px (16:5), JPG/WebP, maximum 5 MB.</p>
                </div>
              </div>

              <div className="mt-5 grid gap-4">
                <label className="text-sm font-semibold text-[#3B352C] dark:text-white/72">
                  Banner title
                  <input value={title} onChange={(event) => setTitle(event.target.value)} required maxLength={255} placeholder="Summer exhibition promotion" className="mt-2 w-full rounded-2xl border border-[#E8DDCC] bg-white px-4 py-3 text-[#1B1A17] outline-none focus:border-[#F36B4F] focus:ring-4 focus:ring-[#F36B4F]/10 dark:border-white/10 dark:bg-[#1B1D28] dark:text-[#FFF8EA]" />
                </label>

                <ImageCropUpload uploadType="advertisement_banner" preset="advertisement" value={imageUrl} onUploaded={setImageUrl} label="Advertisement image" />

                <label className="text-sm font-semibold text-[#3B352C] dark:text-white/72">
                  Image description
                  <input value={altText} onChange={(event) => setAltText(event.target.value)} maxLength={255} placeholder="Describe the banner for screen readers" className="mt-2 w-full rounded-2xl border border-[#E8DDCC] bg-white px-4 py-3 text-[#1B1A17] outline-none focus:border-[#F36B4F] focus:ring-4 focus:ring-[#F36B4F]/10 dark:border-white/10 dark:bg-[#1B1D28] dark:text-[#FFF8EA]" />
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="text-sm font-semibold text-[#3B352C] dark:text-white/72">
                    Opens
                    <select value={destinationType} onChange={(event) => setDestinationType(event.target.value as AdvertisementBanner["destinationType"])} className="mt-2 w-full rounded-2xl border border-[#E8DDCC] bg-white px-4 py-3 text-[#1B1A17] outline-none dark:border-white/10 dark:bg-[#1B1D28] dark:text-[#FFF8EA]">
                      <option value="exhibition">Exhibition</option>
                      <option value="stall">Vendor stall</option>
                    </select>
                  </label>
                  <label className="text-sm font-semibold text-[#3B352C] dark:text-white/72">
                    Destination
                    <select value={destinationId} onChange={(event) => setDestinationId(event.target.value)} required className="mt-2 w-full rounded-2xl border border-[#E8DDCC] bg-white px-4 py-3 text-[#1B1A17] outline-none dark:border-white/10 dark:bg-[#1B1D28] dark:text-[#FFF8EA]">
                      {destinationOptions.length ? destinationOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>) : <option value="">No {destinationType}s available</option>}
                    </select>
                  </label>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <label className="text-sm font-semibold text-[#3B352C] dark:text-white/72">
                    Display order
                    <input value={displayOrder} onChange={(event) => setDisplayOrder(event.target.value.replace(/[^0-9-]/g, ""))} inputMode="numeric" className="mt-2 w-full rounded-2xl border border-[#E8DDCC] bg-white px-4 py-3 text-[#1B1A17] outline-none dark:border-white/10 dark:bg-[#1B1D28] dark:text-[#FFF8EA]" />
                  </label>
                  <label className="text-sm font-semibold text-[#3B352C] dark:text-white/72">
                    Start time
                    <input value={startsAt} onChange={(event) => setStartsAt(event.target.value)} type="datetime-local" className="mt-2 w-full rounded-2xl border border-[#E8DDCC] bg-white px-4 py-3 text-[#1B1A17] outline-none dark:border-white/10 dark:bg-[#1B1D28] dark:text-[#FFF8EA]" />
                  </label>
                  <label className="text-sm font-semibold text-[#3B352C] dark:text-white/72">
                    End time
                    <input value={endsAt} onChange={(event) => setEndsAt(event.target.value)} type="datetime-local" className="mt-2 w-full rounded-2xl border border-[#E8DDCC] bg-white px-4 py-3 text-[#1B1A17] outline-none dark:border-white/10 dark:bg-[#1B1D28] dark:text-[#FFF8EA]" />
                  </label>
                </div>

                <label className="flex min-h-12 items-center justify-between gap-4 rounded-2xl border border-[#E8DDCC] bg-[#F7F1E8] px-4 py-3 dark:border-white/10 dark:bg-[#171720]">
                  <span>
                    <span className="block text-sm font-semibold">Publish immediately</span>
                    <span className="block text-xs text-[#6F675C] dark:text-white/50">Schedule limits still apply when dates are set.</span>
                  </span>
                  <input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} className="h-5 w-5 accent-[#F36B4F]" />
                </label>

                <button type="submit" disabled={isSaving || !destinationOptions.length} className={buttonStyles("primary", "min-h-12 w-full justify-center px-6 disabled:cursor-not-allowed disabled:opacity-55")}>
                  {isSaving ? "Saving banner..." : "Publish banner"}
                </button>
              </div>
            </form>

            <div className="rounded-[26px] border border-[#E8DDCC] bg-[#FFFDF8] p-5 shadow-sm dark:border-white/10 dark:bg-[#0F0E18] sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#B88A3D] dark:text-[#D6AC63]">Carousel order</p>
                  <h2 className="mt-1 text-xl font-semibold">Published banners</h2>
                </div>
                <span className="rounded-full border border-[#E8DDCC] px-3 py-1 text-xs font-bold text-[#6F675C] dark:border-white/10 dark:text-white/60">{banners.length} total</span>
              </div>

              <div className="mt-5 grid gap-4">
                {isLoading ? Array.from({ length: 3 }).map((_, index) => <div key={index} className="h-48 animate-pulse rounded-2xl bg-[#F7F1E8] dark:bg-[#1d1d27]" />) : null}
                {!isLoading && !banners.length ? (
                  <div className="rounded-2xl border border-dashed border-[#D7BE86] bg-[#F7F1E8] p-8 text-center dark:border-[#D6AC63]/30 dark:bg-card">
                    <GalleryHorizontal className="mx-auto h-8 w-8 text-[#B88A3D] dark:text-[#D6AC63]" />
                    <p className="mt-3 font-semibold">No advertisement banners yet</p>
                    <p className="mt-1 text-sm text-[#6F675C] dark:text-white/52">The homepage will use its compact marketplace fallback until a banner is published.</p>
                  </div>
                ) : null}
                {!isLoading ? banners.map((banner) => {
                  const status = bannerStatus(banner);
                  return (
                    <article key={banner.id} className="overflow-hidden rounded-2xl border border-[#E8DDCC] bg-white dark:border-white/10 dark:bg-[#171722]">
                      <AppImage src={banner.imageUrl} alt={banner.altText || banner.title} className="aspect-[16/5] w-full rounded-none bg-[#F7F1E8] dark:bg-[#0B0B12]" fallbackSrc="/images/home/hero-expo-bg-light.webp" />
                      <div className="p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="truncate font-semibold">{banner.title}</h3>
                            <p className="mt-1 flex items-center gap-1 text-xs text-[#6F675C] dark:text-white/52"><Link2 className="h-3.5 w-3.5" /> {banner.destinationType} · order {banner.displayOrder}</p>
                          </div>
                          <span className={`rounded-full border px-3 py-1 text-xs font-bold ${statusClass(status)}`}>{status}</span>
                        </div>
                        <div className="mt-3 grid gap-2 text-xs text-[#6F675C] dark:text-white/55 sm:grid-cols-2">
                          <p>Starts: {formatSchedule(banner.startsAt)}</p>
                          <p>Ends: {formatSchedule(banner.endsAt)}</p>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <Link href={banner.destinationUrl} target="_blank" className={buttonStyles("secondary", "min-h-10 px-4 text-sm")}>
                            Preview <ExternalLink className="ml-2 h-4 w-4" />
                          </Link>
                          <button type="button" disabled={busyId === banner.id} onClick={() => toggleBanner(banner)} className={buttonStyles("secondary", "min-h-10 px-4 text-sm disabled:opacity-55")}>
                            {banner.isActive ? "Deactivate" : "Activate"}
                          </button>
                          <button type="button" disabled={busyId === banner.id} onClick={() => removeBanner(banner)} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl border border-red-500/25 bg-red-500/10 px-4 text-sm font-semibold text-red-700 transition hover:bg-red-500/15 disabled:opacity-55 dark:text-red-200">
                            <Trash2 className="h-4 w-4" /> Delete
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                }) : null}
              </div>
            </div>
          </div>
        </div>
      </section>
    </RoleShell>
  );
}
