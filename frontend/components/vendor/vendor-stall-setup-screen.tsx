"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Boxes, ExternalLink, PackagePlus, Save, Store, TimerReset } from "lucide-react";
import { getVendorDashboard, getVendorProducts, getVendorStall, updateVendorStall } from "@/lib/api";
import { Product, Stall, VendorDashboard } from "@/lib/types";
import { buttonStyles } from "@/components/ui/button";
import { AppImage } from "@/components/ui/app-image";
import { RoleShell } from "@/components/layout/role-shell";
import { ImageCropUpload } from "@/components/uploads/image-crop-upload";

export function VendorStallSetupScreen() {
  const [dashboard, setDashboard] = useState<VendorDashboard | null>(null);
  const [stall, setStall] = useState<Stall | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [bannerImage, setBannerImage] = useState("");
  const [vendorLogo, setVendorLogo] = useState("");
  const [deliveryArea, setDeliveryArea] = useState("");
  const [breakMessage, setBreakMessage] = useState("Vendor is currently on break. Please leave a message.");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const vendorApproved = dashboard?.vendor.status === "approved";
  const activeProducts = products.filter((product) => product.status === "active").length;
  const hasStallBanner = hasUploadedBrandAsset(bannerImage || stall?.bannerImage);
  const hasVendorLogo = hasUploadedBrandAsset(vendorLogo || stall?.vendorLogo);
  const canOpenLive = Boolean(stall && vendorApproved && activeProducts >= 2 && hasStallBanner && hasVendorLogo);

  const applyStall = (value: Stall) => {
    setStall(value);
    setName(value.name || "");
    setCategory(value.category || "");
    setDescription(value.description || "");
    setBannerImage(value.bannerImage || "");
    setVendorLogo(value.vendorLogo || "");
    setDeliveryArea(value.deliveryArea || "");
    setBreakMessage(value.breakMessage || "Vendor is currently on break. Please leave a message.");
  };

  const load = async () => {
    setLoading(true);
    try {
      const [dashboardResponse, stallResponse, productResponse] = await Promise.all([
        getVendorDashboard(),
        getVendorStall().catch(() => null),
        getVendorProducts().catch(() => [])
      ]);
      setDashboard(dashboardResponse);
      if (stallResponse) applyStall(stallResponse);
      setProducts(productResponse);
      setError("");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not load vendor stall.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const saveStall = async (liveStatus?: "break" | "offline" | "busy") => {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const response = await updateVendorStall({
        name,
        category,
        description,
        bannerImage,
        vendorLogo,
        deliveryArea,
        breakMessage,
        ...(liveStatus ? { liveStatus } : {})
      });
      applyStall(response);
      setMessage(liveStatus === "break" ? "Break mode enabled." : liveStatus === "offline" ? "Stall set offline." : "Stall updated successfully.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not save stall.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <RoleShell role="vendor" title="Stall">
      <main className="min-h-screen bg-[#FAF7F0] px-4 py-5 pb-28 text-[#1B1A17] dark:bg-[#05040A] dark:text-[#FFF8EA] sm:px-6 md:pb-8 lg:px-10">
        <section className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[#B88A3D] dark:text-[#F4C879]">Vendor stall</p>
              <h1 className="mt-2 text-3xl font-black tracking-[-0.05em] sm:text-5xl">Customize your assigned stall</h1>
              <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-[#6F675C] dark:text-white/60">
                Request an exhibition first. After admin assigns your stall, customize the storefront and add at least 2 active products before opening the live console.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/vendor/exhibitions" className={buttonStyles("secondary", "min-h-11 justify-center px-5 py-2")}>
                Browse Exhibitions
              </Link>
              <Link href="/vendor/products" className={buttonStyles("secondary", "min-h-11 justify-center px-5 py-2")}>
                <PackagePlus className="mr-2 h-4 w-4" />
                Manage Products
              </Link>
            </div>
          </div>

          {error ? <p className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700 dark:border-red-400/30 dark:bg-red-500/10 dark:text-red-200">{error}</p> : null}
          {message ? <p className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-500/10 dark:text-emerald-200">{message}</p> : null}

          {loading ? (
            <div className="mt-8 grid gap-5 lg:grid-cols-[1fr_0.42fr]">
              <div className="h-[34rem] animate-pulse rounded-[30px] bg-white dark:bg-[#11101A]" />
              <div className="h-[34rem] animate-pulse rounded-[30px] bg-white dark:bg-[#11101A]" />
            </div>
          ) : !vendorApproved ? (
            <Panel className="mt-8">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-700 dark:text-amber-200">Approval pending</p>
              <h2 className="mt-3 text-3xl font-black">Admin approval is required before stall setup.</h2>
              <p className="mt-3 text-sm leading-6 text-[#6F675C] dark:text-white/60">Once approved, you can request exhibition participation and receive a stall assignment.</p>
            </Panel>
          ) : !stall ? (
            <Panel className="mt-8">
              <Store className="h-10 w-10 text-[#B88A3D] dark:text-[#F4C879]" />
              <h2 className="mt-4 text-3xl font-black">No stall assigned yet</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#6F675C] dark:text-white/60">
                Browse exhibitions, request the exhibition you want, and wait for admin to assign a stall. This page unlocks after assignment.
              </p>
              <Link href="/vendor/exhibitions" className={buttonStyles("primary", "mt-5 justify-center px-6 py-3")}>
                Browse Exhibitions
              </Link>
            </Panel>
          ) : (
            <div className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,1fr)_390px]">
              <Panel>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-[#B88A3D] dark:text-[#F4C879]">Stall details</p>
                    <h2 className="mt-2 text-2xl font-black">{stall.name}</h2>
                    <p className="mt-2 text-sm font-semibold text-[#6F675C] dark:text-white/60">
                      {stall.exhibitionTitle || "Assigned exhibition"} | {stall.category || "General"}
                    </p>
                  </div>
                  <span className="w-fit rounded-full border border-[#E8DDCC] bg-[#F7F1E8] px-4 py-2 text-xs font-black uppercase tracking-[0.1em] text-[#8A5A24] dark:border-white/10 dark:bg-[#1d1d27] dark:text-[#F4C879]">
                    {stall.liveStatus || "offline"}
                  </span>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <Field label="Stall name" value={name} onChange={setName} />
                  <Field label="Category" value={category} onChange={setCategory} />
                  <div className="sm:col-span-2">
                    <ImageCropUpload
                      uploadType="stall_banner"
                      preset="banner"
                      value={bannerImage}
                      label="Stall banner image"
                      onUploaded={setBannerImage}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <ImageCropUpload
                      uploadType="vendor_logo"
                      preset="logo"
                      value={vendorLogo}
                      label="Vendor logo"
                      onUploaded={setVendorLogo}
                    />
                  </div>
                  <label className="grid gap-2 text-sm font-bold text-[#6F675C] dark:text-white/60 sm:col-span-2">
                    Description
                    <textarea value={description} onChange={(event) => setDescription(event.target.value)} className={inputClass("min-h-32")} placeholder="Describe your stall, products, offers, and shopping support." />
                  </label>
                  <Field label="Delivery area" value={deliveryArea} onChange={setDeliveryArea} />
                  <Field label="Break-time message" value={breakMessage} onChange={setBreakMessage} />
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  <button type="button" disabled={saving} onClick={() => void saveStall()} className={buttonStyles("primary", "min-h-11 justify-center px-5 py-2 disabled:opacity-60")}>
                    <Save className="mr-2 h-4 w-4" />
                    Save Stall
                  </button>
                  <button type="button" disabled={saving} onClick={() => void saveStall("break")} className={buttonStyles("secondary", "min-h-11 justify-center px-5 py-2 disabled:opacity-60")}>
                    <TimerReset className="mr-2 h-4 w-4" />
                    Take Break
                  </button>
                  <button type="button" disabled={saving} onClick={() => void saveStall("offline")} className={buttonStyles("secondary", "min-h-11 justify-center px-5 py-2 disabled:opacity-60")}>
                    <Store className="mr-2 h-4 w-4" />
                    Go Offline
                  </button>
                </div>
              </Panel>

              <div className="grid gap-5">
                <Panel className="overflow-hidden p-0">
                  <div className="relative">
                    <AppImage src={bannerImage || stall.bannerImage || stall.image || "/stalls/stall-placeholder.png"} alt={stall.name} fallbackSrc="/stalls/stall-placeholder.png" className="h-56 w-full rounded-none" />
                    {vendorLogo ? (
                      <AppImage
                        src={vendorLogo}
                        alt={`${stall.name} logo`}
                        fallbackSrc="/stalls/stall-placeholder.png"
                        className="absolute bottom-4 left-4 h-16 w-16 rounded-2xl border-2 border-white bg-white shadow-lg dark:border-[#11101A] dark:bg-[#11101A]"
                      />
                    ) : null}
                  </div>
                  <div className="p-5">
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-[#B88A3D] dark:text-[#F4C879]">Public preview</p>
                    <h3 className="mt-2 text-xl font-black">{name || stall.name}</h3>
                    <p className="mt-2 line-clamp-3 text-sm leading-6 text-[#6F675C] dark:text-white/60">{description || "Add a stall description so customers understand your catalogue and service."}</p>
                  </div>
                </Panel>
                <Panel>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-[#B88A3D] dark:text-[#F4C879]">Live readiness</p>
                  <div className="mt-4 grid gap-3">
                    <ReadinessRow label="Admin approved vendor" done={vendorApproved} />
                    <ReadinessRow label="Stall assigned by admin" done={Boolean(stall)} />
                    <ReadinessRow label="Stall banner uploaded" done={hasStallBanner} helper="Required for marketplace promotion" />
                    <ReadinessRow label="Vendor logo uploaded" done={hasVendorLogo} helper="Required for stall identity" />
                    <ReadinessRow label="At least 2 active products" done={activeProducts >= 2} helper={`${activeProducts} active products`} />
                  </div>
                  {canOpenLive ? (
                    <Link href="/vendor/live" className={buttonStyles("primary", "mt-5 w-full justify-center px-5 py-3")}>
                      Open Live Console
                      <ExternalLink className="ml-2 h-4 w-4" />
                    </Link>
                  ) : (
                    <Link href={activeProducts >= 2 ? "/vendor/stall" : "/vendor/products"} className={buttonStyles("secondary", "mt-5 w-full justify-center px-5 py-3")}>
                      <Boxes className="mr-2 h-4 w-4" />
                      {activeProducts >= 2 ? "Complete Branding to Unlock Live" : "Add Products to Unlock Live"}
                    </Link>
                  )}
                </Panel>
              </div>
            </div>
          )}
        </section>
      </main>
    </RoleShell>
  );
}

function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-[30px] border border-[#E8DDCC] bg-[#FFFDF8] p-5 shadow-[0_24px_80px_rgba(128,91,44,0.10)] dark:border-white/10 dark:bg-[#11101A] dark:shadow-[0_24px_90px_rgba(0,0,0,0.30)] sm:p-7 ${className}`}>
      {children}
    </section>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-2 text-sm font-bold text-[#6F675C] dark:text-white/60">
      {label}
      <input value={value} onChange={(event) => onChange(event.target.value)} className={inputClass()} />
    </label>
  );
}

function inputClass(extra = "") {
  return `min-h-12 rounded-[18px] border border-[#E8DDCC] bg-white px-4 py-3 text-sm text-[#1B1A17] outline-none transition placeholder:text-[#8A8176] focus:border-[#B88A3D] dark:border-white/10 dark:bg-[#1d1d27] dark:text-[#FFF8EA] dark:placeholder:text-white/38 dark:focus:border-[#D6AC63]/70 ${extra}`;
}

function hasUploadedBrandAsset(value?: string | null) {
  const normalized = value?.trim() ?? "";
  return Boolean(normalized) && !normalized.includes("stall-placeholder");
}

function ReadinessRow({ label, done, helper }: { label: string; done: boolean; helper?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[18px] border border-[#E8DDCC] bg-[#F7F1E8] px-4 py-3 dark:border-white/10 dark:bg-[#171720]">
      <div>
        <p className="text-sm font-black text-[#1B1A17] dark:text-[#FFF8EA]">{label}</p>
        {helper ? <p className="mt-1 text-xs font-semibold text-[#6F675C] dark:text-white/56">{helper}</p> : null}
      </div>
      <span className={`rounded-full px-3 py-1 text-xs font-black ${done ? "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300" : "bg-amber-500/12 text-amber-700 dark:text-amber-200"}`}>
        {done ? "Done" : "Pending"}
      </span>
    </div>
  );
}
