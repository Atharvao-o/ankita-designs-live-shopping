"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, ClipboardCheck, Mail, RefreshCw, Send, Store } from "lucide-react";
import { RoleShell } from "@/components/layout/role-shell";
import { AppStatusPill } from "@/components/ui/app-primitives";
import { buttonStyles } from "@/components/ui/button";
import { getVendorApplication, resubmitVendorApplication, type VendorApplicationUpdatePayload } from "@/lib/api";
import { useExpoStore } from "@/lib/cart-store";
import type { Vendor } from "@/lib/types";

type ApplicationForm = {
  ownerName: string;
  businessName: string;
  businessCategory: string;
  businessDescription: string;
  phone: string;
  instagram: string;
  website: string;
  whatsapp: string;
  gstNumber: string;
  fssaiNumber: string;
  panNumber: string;
  upiId: string;
  bankAccountNumber: string;
  ifsc: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  productCategories: string;
};

const emptyForm: ApplicationForm = {
  ownerName: "",
  businessName: "",
  businessCategory: "",
  businessDescription: "",
  phone: "",
  instagram: "",
  website: "",
  whatsapp: "",
  gstNumber: "",
  fssaiNumber: "",
  panNumber: "",
  upiId: "",
  bankAccountNumber: "",
  ifsc: "",
  address: "",
  city: "",
  state: "",
  pincode: "",
  productCategories: ""
};

const inputClassName =
  "mt-2 min-h-12 w-full rounded-lg border border-border bg-background px-4 py-3 text-sm font-semibold text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-65";

const textareaClassName =
  "mt-2 min-h-28 w-full resize-y rounded-lg border border-border bg-background px-4 py-3 text-sm font-semibold leading-6 text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/15";

function formFromApplication(vendor: Vendor): ApplicationForm {
  return {
    ownerName: vendor.ownerName || "",
    businessName: vendor.businessName || "",
    businessCategory: vendor.businessCategory || "",
    businessDescription: vendor.businessDescription || "",
    phone: vendor.phone || "",
    instagram: vendor.instagram || "",
    website: vendor.website || "",
    whatsapp: vendor.whatsapp || "",
    gstNumber: vendor.gstNumber || "",
    fssaiNumber: vendor.fssaiNumber || "",
    panNumber: vendor.panNumber || "",
    upiId: vendor.upiId || "",
    bankAccountNumber: vendor.bankAccountNumber || "",
    ifsc: vendor.ifsc || "",
    address: vendor.address || "",
    city: vendor.city || "",
    state: vendor.state || "",
    pincode: vendor.pincode || "",
    productCategories: vendor.productCategories?.join(", ") || vendor.businessCategory || ""
  };
}

export function VendorApplicationScreen() {
  const currentUser = useExpoStore((state) => state.currentUser);
  const authToken = useExpoStore((state) => state.authToken);
  const setCurrentUser = useExpoStore((state) => state.setCurrentUser);
  const [application, setApplication] = useState<Vendor | null>(null);
  const [form, setForm] = useState<ApplicationForm>(emptyForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    getVendorApplication()
      .then((response) => {
        if (!active) return;
        setApplication(response);
        setForm(formFromApplication(response));
      })
      .catch((errorValue) => {
        if (active) setError(errorValue instanceof Error ? errorValue.message : "Could not load the vendor application.");
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const updateField = <K extends keyof ApplicationForm>(key: K, value: ApplicationForm[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const resubmit = async () => {
    setError("");
    setMessage("");
    const required = [form.ownerName, form.businessName, form.businessCategory, form.businessDescription, form.phone];
    if (required.some((value) => !value.trim())) {
      setError("Complete the owner, business, category, description, and phone fields.");
      return;
    }
    if ([form.instagram, form.website].filter(Boolean).some((value) => !/^https?:\/\//i.test(value))) {
      setError("Instagram and website links must start with http:// or https://.");
      return;
    }

    const payload: VendorApplicationUpdatePayload = {
      ownerName: form.ownerName.trim(),
      businessName: form.businessName.trim(),
      businessCategory: form.businessCategory.trim(),
      businessDescription: form.businessDescription.trim(),
      phone: form.phone.trim(),
      instagram: form.instagram.trim(),
      website: form.website.trim(),
      whatsapp: form.whatsapp.trim(),
      gstNumber: form.gstNumber.trim(),
      fssaiNumber: form.fssaiNumber.trim(),
      panNumber: form.panNumber.trim(),
      upiId: form.upiId.trim(),
      bankAccountNumber: form.bankAccountNumber.trim(),
      ifsc: form.ifsc.trim(),
      address: form.address.trim(),
      city: form.city.trim(),
      state: form.state.trim(),
      pincode: form.pincode.trim(),
      productCategories: form.productCategories
        .split(",")
        .map((category) => category.trim())
        .filter(Boolean)
    };

    setIsSubmitting(true);
    try {
      const updated = await resubmitVendorApplication(payload);
      setApplication(updated);
      setForm(formFromApplication(updated));
      if (currentUser) setCurrentUser(currentUser, authToken, updated);
      setMessage(`Application revision ${updated.applicationRevision ?? 1} was resubmitted for admin review.`);
    } catch (errorValue) {
      setError(errorValue instanceof Error ? errorValue.message : "Could not resubmit the vendor application.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const canEdit = application?.status === "changes_requested";

  return (
    <RoleShell role="vendor" title="Vendor Application">
      <section className="min-h-[calc(100vh-64px)] bg-background px-3 py-4 text-foreground sm:px-6 sm:py-6 xl:px-8">
        <div className="mx-auto max-w-5xl">
          <header className="border-b border-border pb-5">
            <p className="text-xs font-black uppercase text-primary">Vendor review</p>
            <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h1 className="text-3xl font-black sm:text-4xl">Your vendor application</h1>
                <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-muted-foreground">
                  Correct the returned information and send the same application back to the admin review queue.
                </p>
              </div>
              {application ? <AppStatusPill status={application.status.replaceAll("_", " ")} /> : null}
            </div>
          </header>

          {isLoading ? (
            <div className="mt-6 grid gap-4">
              <div className="app-skeleton h-32 rounded-lg" />
              <div className="app-skeleton h-[560px] rounded-lg" />
            </div>
          ) : null}

          {error ? <p role="alert" className="mt-5 rounded-lg border border-destructive/25 bg-destructive/10 px-4 py-3 text-sm font-bold text-destructive">{error}</p> : null}
          {message ? (
            <div className="mt-5 flex items-start gap-3 rounded-lg border border-emerald-500/25 bg-emerald-500/10 p-4 text-emerald-800 dark:text-emerald-200">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="text-sm font-black">{message}</p>
                <Link href="/vendor" className="mt-2 inline-flex text-sm font-black underline underline-offset-4">Return to dashboard</Link>
              </div>
            </div>
          ) : null}

          {!isLoading && application ? (
            <>
              {canEdit ? (
                <section className="mt-6 border-y border-amber-500/30 bg-amber-500/10 px-4 py-5 text-amber-950 dark:text-amber-100 sm:px-5">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-black">Admin requested corrections</p>
                      <p className="mt-2 whitespace-pre-wrap break-words text-sm font-semibold leading-6">
                        {application.correctionReason || "Review the application details and correct the information requested by the admin."}
                      </p>
                      <p className="mt-3 text-xs font-bold opacity-75">
                        Requested {application.correctionRequestedAt ? new Date(application.correctionRequestedAt).toLocaleString() : "recently"} · Revision {application.applicationRevision ?? 1}
                      </p>
                    </div>
                  </div>
                </section>
              ) : (
                <section className="mt-6 border-y border-border py-5">
                  <div className="flex items-start gap-3">
                    <ClipboardCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                    <div>
                      <p className="text-sm font-black">
                        {application.status === "pending" ? "Application is awaiting admin review" : application.status === "approved" ? "Application is approved" : "Application is not open for corrections"}
                      </p>
                      <p className="mt-1 text-sm font-semibold leading-6 text-muted-foreground">
                        Editing becomes available here only when the admin returns the application with a correction request.
                      </p>
                    </div>
                  </div>
                </section>
              )}

              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  void resubmit();
                }}
                className="mt-2"
              >
                <ApplicationSection icon={Store} title="Business identity" description="Correct the ownership and business information requested by the admin.">
                  <ApplicationField label="Owner name" required>
                    <input value={form.ownerName} onChange={(event) => updateField("ownerName", event.target.value)} disabled={!canEdit} className={inputClassName} />
                  </ApplicationField>
                  <ApplicationField label="Business name" required>
                    <input value={form.businessName} onChange={(event) => updateField("businessName", event.target.value)} disabled={!canEdit} className={inputClassName} />
                  </ApplicationField>
                  <ApplicationField label="Business category" required>
                    <input value={form.businessCategory} onChange={(event) => updateField("businessCategory", event.target.value)} disabled={!canEdit} className={inputClassName} />
                  </ApplicationField>
                  <ApplicationField label="Product categories">
                    <input value={form.productCategories} onChange={(event) => updateField("productCategories", event.target.value)} disabled={!canEdit} className={inputClassName} placeholder="Sarees, jewellery, decor" />
                  </ApplicationField>
                  <ApplicationField label="Business description" required wide>
                    <textarea value={form.businessDescription} onChange={(event) => updateField("businessDescription", event.target.value)} disabled={!canEdit} className={textareaClassName} />
                  </ApplicationField>
                </ApplicationSection>

                <ApplicationSection icon={Mail} title="Contact and online presence" description="The verified email remains locked; other contact details can be corrected.">
                  <ApplicationField label="Verified email">
                    <input value={application.email || ""} disabled className={inputClassName} />
                  </ApplicationField>
                  <ApplicationField label="Phone number" required>
                    <input value={form.phone} onChange={(event) => updateField("phone", event.target.value.replace(/\D/g, "").slice(0, 15))} disabled={!canEdit} inputMode="numeric" className={inputClassName} />
                  </ApplicationField>
                  <ApplicationField label="WhatsApp">
                    <input value={form.whatsapp} onChange={(event) => updateField("whatsapp", event.target.value)} disabled={!canEdit} className={inputClassName} />
                  </ApplicationField>
                  <ApplicationField label="Instagram URL">
                    <input value={form.instagram} onChange={(event) => updateField("instagram", event.target.value)} disabled={!canEdit} className={inputClassName} placeholder="https://instagram.com/..." />
                  </ApplicationField>
                  <ApplicationField label="Website URL" wide>
                    <input value={form.website} onChange={(event) => updateField("website", event.target.value)} disabled={!canEdit} className={inputClassName} placeholder="https://..." />
                  </ApplicationField>
                </ApplicationSection>

                <ApplicationSection icon={RefreshCw} title="Address and compliance" description="Update the registered location, identifiers, and settlement details.">
                  <ApplicationField label="Business address" wide>
                    <textarea value={form.address} onChange={(event) => updateField("address", event.target.value)} disabled={!canEdit} className={textareaClassName} />
                  </ApplicationField>
                  <ApplicationField label="City">
                    <input value={form.city} onChange={(event) => updateField("city", event.target.value)} disabled={!canEdit} className={inputClassName} />
                  </ApplicationField>
                  <ApplicationField label="State">
                    <input value={form.state} onChange={(event) => updateField("state", event.target.value)} disabled={!canEdit} className={inputClassName} />
                  </ApplicationField>
                  <ApplicationField label="Pincode">
                    <input value={form.pincode} onChange={(event) => updateField("pincode", event.target.value.replace(/\D/g, "").slice(0, 6))} disabled={!canEdit} inputMode="numeric" className={inputClassName} />
                  </ApplicationField>
                  <ApplicationField label="GST number">
                    <input value={form.gstNumber} onChange={(event) => updateField("gstNumber", event.target.value.toUpperCase())} disabled={!canEdit} className={inputClassName} />
                  </ApplicationField>
                  <ApplicationField label="PAN number">
                    <input value={form.panNumber} onChange={(event) => updateField("panNumber", event.target.value.toUpperCase())} disabled={!canEdit} className={inputClassName} />
                  </ApplicationField>
                  <ApplicationField label="FSSAI number">
                    <input value={form.fssaiNumber} onChange={(event) => updateField("fssaiNumber", event.target.value)} disabled={!canEdit} className={inputClassName} />
                  </ApplicationField>
                  <ApplicationField label="UPI ID">
                    <input value={form.upiId} onChange={(event) => updateField("upiId", event.target.value)} disabled={!canEdit} className={inputClassName} />
                  </ApplicationField>
                  <ApplicationField label="Bank account">
                    <input value={form.bankAccountNumber} onChange={(event) => updateField("bankAccountNumber", event.target.value.replace(/\D/g, ""))} disabled={!canEdit} inputMode="numeric" className={inputClassName} />
                  </ApplicationField>
                  <ApplicationField label="IFSC">
                    <input value={form.ifsc} onChange={(event) => updateField("ifsc", event.target.value.toUpperCase())} disabled={!canEdit} className={inputClassName} />
                  </ApplicationField>
                </ApplicationSection>

                {canEdit ? (
                  <div className="sticky bottom-3 z-20 mt-6 flex flex-col gap-3 rounded-lg border border-border bg-card/95 p-3 shadow-soft backdrop-blur sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs font-semibold leading-5 text-muted-foreground">Resubmitting sends the corrected application back to admin review.</p>
                    <button type="submit" disabled={isSubmitting} className={buttonStyles("primary", "min-h-12 shrink-0 justify-center px-5 py-3 text-sm disabled:opacity-60")}>
                      <Send className="mr-2 h-4 w-4" />
                      {isSubmitting ? "Resubmitting..." : "Resubmit corrected application"}
                    </button>
                  </div>
                ) : null}
              </form>
            </>
          ) : null}
        </div>
      </section>
    </RoleShell>
  );
}

function ApplicationSection({
  icon: Icon,
  title,
  description,
  children
}: {
  icon: typeof Store;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="border-b border-border py-6">
      <legend className="sr-only">{title}</legend>
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-secondary text-secondary-foreground">
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-lg font-black">{title}</h2>
          <p className="mt-1 text-xs font-semibold leading-5 text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

function ApplicationField({
  label,
  required,
  wide = false,
  children
}: {
  label: string;
  required?: boolean;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className={wide ? "sm:col-span-2" : ""}>
      <span className="text-sm font-black text-foreground">
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </span>
      {children}
    </label>
  );
}
