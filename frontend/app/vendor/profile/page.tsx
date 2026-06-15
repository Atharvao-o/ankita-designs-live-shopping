"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ImageCropUpload } from "@/components/uploads/image-crop-upload";
import { RoleShell } from "@/components/layout/role-shell";
import { getVendorOwnProfile, updateVendorOwnProfile } from "@/lib/api";
import type { VendorPublicProfile } from "@/lib/types";

type ProfileForm = {
  displayName: string;
  slug: string;
  bio: string;
  category: string;
  profileImageUrl: string;
  bannerImageUrl: string;
  websiteUrl: string;
  instagramUrl: string;
  whatsapp: string;
  isPublic: boolean;
};

const emptyForm: ProfileForm = {
  displayName: "",
  slug: "",
  bio: "",
  category: "",
  profileImageUrl: "",
  bannerImageUrl: "",
  websiteUrl: "",
  instagramUrl: "",
  whatsapp: "",
  isPublic: true
};

function formFromProfile(profile: VendorPublicProfile): ProfileForm {
  return {
    displayName: profile.displayName || "",
    slug: profile.slug || "",
    bio: profile.bio || "",
    category: profile.category || "",
    profileImageUrl: profile.profileImageUrl || "",
    bannerImageUrl: profile.bannerImageUrl || "",
    websiteUrl: profile.websiteUrl || "",
    instagramUrl: profile.instagramUrl || "",
    whatsapp: profile.whatsapp || "",
    isPublic: profile.isPublic
  };
}

export default function VendorProfilePage() {
  const [profile, setProfile] = useState<VendorPublicProfile | null>(null);
  const [form, setForm] = useState<ProfileForm>(emptyForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    getVendorOwnProfile()
      .then((response) => {
        if (!active) return;
        setProfile(response);
        setForm(formFromProfile(response));
      })
      .catch((errorValue) => {
        if (active) setError(errorValue instanceof Error ? errorValue.message : "Could not load profile.");
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const updateField = <K extends keyof ProfileForm>(key: K, value: ProfileForm[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const saveProfile = async () => {
    setIsSaving(true);
    setMessage("");
    setError("");
    try {
      const updated = await updateVendorOwnProfile(form);
      setProfile(updated);
      setForm(formFromProfile(updated));
      setMessage("Public profile saved.");
    } catch (errorValue) {
      setError(errorValue instanceof Error ? errorValue.message : "Could not save profile.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <RoleShell role="vendor" title="Profile">
      <section className="p-4 sm:p-6 xl:p-8">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="rounded-[32px] border border-border bg-card p-5 text-card-foreground shadow-soft">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">Public business profile</p>
            <h1 className="mt-2 text-3xl font-black tracking-[-0.05em] text-foreground">Build your permanent vendor profile.</h1>
            <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-muted-foreground">
              This profile appears in the social feed and vendor pages after admin approval. Private payout, GST, PAN, and bank details are never shown here.
            </p>

            {isLoading ? <div className="mt-6 h-80 animate-pulse rounded-[28px] bg-muted" /> : null}
            {error ? <p className="mt-4 rounded-2xl border border-destructive bg-destructive/10 px-4 py-3 text-sm font-black text-destructive">{error}</p> : null}
            {message ? <p className="mt-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-black text-emerald-700 dark:text-emerald-200">{message}</p> : null}

            {!isLoading ? (
              <div className="mt-6 grid gap-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Display name" value={form.displayName} onChange={(value) => updateField("displayName", value)} />
                  <Field label="Profile slug" value={form.slug} onChange={(value) => updateField("slug", value)} />
                  <Field label="Category" value={form.category} onChange={(value) => updateField("category", value)} />
                  <Field label="WhatsApp" value={form.whatsapp} onChange={(value) => updateField("whatsapp", value)} />
                  <Field label="Website URL" value={form.websiteUrl} onChange={(value) => updateField("websiteUrl", value)} />
                  <Field label="Instagram URL" value={form.instagramUrl} onChange={(value) => updateField("instagramUrl", value)} />
                </div>
                <label className="grid gap-2">
                  <span className="text-sm font-black text-foreground">Bio</span>
                  <textarea
                    value={form.bio}
                    onChange={(event) => updateField("bio", event.target.value)}
                    rows={5}
                    className="rounded-2xl border border-border bg-background px-4 py-3 text-sm font-semibold text-foreground outline-none transition focus:border-primary"
                    placeholder="Describe your shop, products, and what customers can expect."
                  />
                </label>
                <ImageCropUpload
                  uploadType="profile_picture"
                  preset="profile"
                  label="Vendor profile photo"
                  value={form.profileImageUrl}
                  onUploaded={(url) => updateField("profileImageUrl", url)}
                />
                <ImageCropUpload
                  uploadType="stall_banner"
                  preset="banner"
                  label="Vendor profile banner"
                  value={form.bannerImageUrl}
                  onUploaded={(url) => updateField("bannerImageUrl", url)}
                />
                <label className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-background p-4">
                  <span>
                    <span className="block text-sm font-black text-foreground">Public profile</span>
                    <span className="block text-xs font-semibold text-muted-foreground">Visible only after admin vendor approval.</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={form.isPublic}
                    onChange={(event) => updateField("isPublic", event.target.checked)}
                    className="h-5 w-5 accent-primary"
                  />
                </label>
                <button
                  type="button"
                  onClick={saveProfile}
                  disabled={isSaving}
                  className="min-h-12 rounded-2xl bg-primary px-5 py-3 text-sm font-black text-primary-foreground transition hover:brightness-105 disabled:opacity-60"
                >
                  {isSaving ? "Saving..." : "Save public profile"}
                </button>
              </div>
            ) : null}
          </div>

          <aside className="h-fit rounded-[32px] border border-border bg-card p-5 text-card-foreground shadow-soft">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">Preview</p>
            <div className="mt-4 overflow-hidden rounded-[26px] border border-border bg-background">
              <div className="relative aspect-[16/7] bg-muted">
                {form.bannerImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={form.bannerImageUrl} alt="" className="h-full w-full object-cover" />
                ) : null}
              </div>
              <div className="p-4">
                <div className="flex items-center gap-3">
                  <span className="grid h-16 w-16 place-items-center overflow-hidden rounded-full border border-border bg-secondary text-xl font-black text-secondary-foreground">
                    {form.profileImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={form.profileImageUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      (form.displayName || "V").slice(0, 1).toUpperCase()
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-lg font-black text-foreground">{form.displayName || "Vendor name"}</span>
                    <span className="block truncate text-sm font-semibold text-muted-foreground">{form.category || "Category"}</span>
                  </span>
                </div>
                <p className="mt-4 line-clamp-4 text-sm font-semibold leading-6 text-foreground">{form.bio || "Your public profile bio will appear here."}</p>
                {profile?.slug ? (
                  <Link href={`/v/${profile.slug}`} className="mt-4 inline-flex rounded-2xl border border-border bg-secondary px-4 py-2 text-sm font-black text-secondary-foreground">
                    Open public page
                  </Link>
                ) : null}
              </div>
            </div>
          </aside>
        </div>
      </section>
    </RoleShell>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-black text-foreground">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 rounded-2xl border border-border bg-background px-4 text-sm font-semibold text-foreground outline-none transition focus:border-primary"
      />
    </label>
  );
}
