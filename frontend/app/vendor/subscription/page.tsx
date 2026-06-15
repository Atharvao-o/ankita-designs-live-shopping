"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, IndianRupee } from "lucide-react";
import { RoleShell } from "@/components/layout/role-shell";
import { ImageCropUpload } from "@/components/uploads/image-crop-upload";
import { getVendorSubscription, requestVendorSubscription, submitVendorSubscriptionPaymentProof } from "@/lib/api";
import type { SubscriptionPlan, VendorSubscription, VendorSubscriptionState } from "@/lib/types";
import { formatPrice } from "@/lib/utils";

export default function VendorSubscriptionPage() {
  const [state, setState] = useState<VendorSubscriptionState | null>(null);
  const [selectedSubscriptionId, setSelectedSubscriptionId] = useState("");
  const [proofUrl, setProofUrl] = useState("");
  const [reference, setReference] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    setIsLoading(true);
    setError("");
    try {
      const response = await getVendorSubscription();
      setState(response);
      setSelectedSubscriptionId(response.latestSubscription?.id ?? "");
    } catch (errorValue) {
      setError(errorValue instanceof Error ? errorValue.message : "Could not load subscription details.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const selectableSubscriptions = useMemo(
    () => (state?.history ?? []).filter((item) => ["pending_payment", "rejected"].includes(item.status)),
    [state?.history]
  );

  const requestPlan = async (plan: SubscriptionPlan) => {
    setIsSubmitting(plan.id);
    setMessage("");
    setError("");
    try {
      const subscription = await requestVendorSubscription(plan.id);
      setMessage(`${plan.name} subscription requested. Submit payment proof for admin verification.`);
      setSelectedSubscriptionId(subscription.id);
      await load();
    } catch (errorValue) {
      setError(errorValue instanceof Error ? errorValue.message : "Could not request this plan.");
    } finally {
      setIsSubmitting("");
    }
  };

  const submitProof = async () => {
    if (!selectedSubscriptionId || !proofUrl) {
      setError("Choose a subscription request and upload payment proof.");
      return;
    }
    setIsSubmitting("proof");
    setMessage("");
    setError("");
    try {
      await submitVendorSubscriptionPaymentProof({
        subscriptionId: selectedSubscriptionId,
        paymentProofUrl: proofUrl,
        paymentReference: reference.trim() || undefined
      });
      setProofUrl("");
      setReference("");
      setMessage("Payment proof submitted. Admin approval is required before access activates.");
      await load();
    } catch (errorValue) {
      setError(errorValue instanceof Error ? errorValue.message : "Could not submit payment proof.");
    } finally {
      setIsSubmitting("");
    }
  };

  const current = state?.currentSubscription ?? null;

  return (
    <RoleShell role="vendor" title="Subscription">
      <section className="p-4 sm:p-6 xl:p-8">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="rounded-[32px] border border-border bg-card p-5 text-card-foreground shadow-soft">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">Vendor plan</p>
                <h1 className="mt-2 text-3xl font-black tracking-[-0.05em] text-foreground">Subscription access</h1>
                <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-muted-foreground">
                  Request a plan and submit manual payment proof. Access activates only after admin approval.
                </p>
              </div>
              <Link href="/vendor/live-slots" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-border bg-secondary px-4 py-2 text-sm font-black text-secondary-foreground">
                Live slots
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            {message ? <Notice tone="success">{message}</Notice> : null}
            {error ? <Notice tone="danger">{error}</Notice> : null}
            {isLoading ? <div className="mt-6 h-72 animate-pulse rounded-[28px] bg-muted" /> : null}
            {!isLoading ? (
              <>
                <div className="mt-6 rounded-[28px] border border-border bg-background p-5">
                  <p className="text-sm font-black text-muted-foreground">Current plan</p>
                  <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <h2 className="text-2xl font-black text-foreground">{current?.plan?.name ?? "No active subscription"}</h2>
                      <p className="mt-1 text-sm font-semibold text-muted-foreground">
                        {current ? `Active until ${formatDate(current.endsAt)}` : "Choose a plan below to start verification."}
                      </p>
                    </div>
                    <Badge label={current?.status ?? "inactive"} tone={current ? "success" : "warning"} />
                  </div>
                </div>
                <div className="mt-6 grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
                  {(state?.plans ?? []).map((plan) => (
                    <article key={plan.id} className="flex min-h-full flex-col rounded-[28px] border border-border bg-background p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h2 className="text-xl font-black text-foreground">{plan.name}</h2>
                          <p className="mt-1 text-sm font-semibold text-muted-foreground">{plan.description}</p>
                        </div>
                        <IndianRupee className="h-5 w-5 text-primary" />
                      </div>
                      <p className="mt-5 text-3xl font-black tracking-[-0.05em] text-foreground">{formatPrice(plan.price)}</p>
                      <ul className="mt-5 grid gap-2 text-sm font-semibold text-muted-foreground">
                        <li>{limitLabel(plan.productLimit)} products</li>
                        <li>{limitLabel(plan.postLimit)} posts</li>
                        <li>{limitLabel(plan.liveSlotLimit)} live slots</li>
                        <li>{plan.analyticsEnabled ? "Analytics included" : "Basic reporting"}</li>
                      </ul>
                      <button
                        type="button"
                        onClick={() => requestPlan(plan)}
                        disabled={Boolean(isSubmitting)}
                        className="mt-auto inline-flex min-h-11 items-center justify-center rounded-2xl bg-primary px-4 py-2 text-sm font-black text-primary-foreground disabled:opacity-60"
                      >
                        {isSubmitting === plan.id ? "Requesting..." : "Request plan"}
                      </button>
                    </article>
                  ))}
                </div>
              </>
            ) : null}
          </div>
          <aside className="h-fit rounded-[32px] border border-border bg-card p-5 text-card-foreground shadow-soft">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">Payment proof</p>
            <h2 className="mt-2 text-2xl font-black tracking-[-0.05em] text-foreground">Submit for verification</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-muted-foreground">
              Upload a screenshot or receipt. This does not activate your plan until admin verifies it.
            </p>
            <div className="mt-5 grid gap-4">
              <label className="grid gap-2">
                <span className="text-sm font-black text-foreground">Subscription request</span>
                <select value={selectedSubscriptionId} onChange={(event) => setSelectedSubscriptionId(event.target.value)} className="h-12 rounded-2xl border border-border bg-background px-4 text-sm font-black text-foreground">
                  <option value="">Choose request</option>
                  {selectableSubscriptions.map((item) => <option key={item.id} value={item.id}>{item.plan?.name ?? item.planId} - {item.status}</option>)}
                </select>
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-black text-foreground">Payment reference</span>
                <input value={reference} onChange={(event) => setReference(event.target.value)} className="h-12 rounded-2xl border border-border bg-background px-4 text-sm font-semibold text-foreground" placeholder="UPI / bank reference" />
              </label>
              <ImageCropUpload uploadType="subscription_payment_proof" preset="package" label="Subscription payment proof" value={proofUrl} onUploaded={setProofUrl} />
              <button type="button" onClick={submitProof} disabled={isSubmitting === "proof"} className="min-h-12 rounded-2xl bg-primary px-5 py-3 text-sm font-black text-primary-foreground disabled:opacity-60">
                {isSubmitting === "proof" ? "Submitting..." : "Submit proof"}
              </button>
            </div>
            <div className="mt-6 grid gap-3">
              {(state?.history ?? []).slice(0, 5).map((item) => <SubscriptionRow key={item.id} subscription={item} />)}
            </div>
          </aside>
        </div>
      </section>
    </RoleShell>
  );
}

function SubscriptionRow({ subscription }: { subscription: VendorSubscription }) {
  return (
    <div className="rounded-2xl border border-border bg-background p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-black text-foreground">{subscription.plan?.name ?? subscription.planId}</p>
        <Badge label={subscription.status} tone={subscription.status === "active" ? "success" : subscription.status === "rejected" ? "danger" : "warning"} />
      </div>
      <p className="mt-1 text-xs font-semibold text-muted-foreground">Payment: {subscription.paymentStatus}</p>
    </div>
  );
}

function Badge({ label, tone = "neutral" }: { label: string; tone?: "neutral" | "success" | "warning" | "danger" }) {
  const classes = {
    neutral: "border-border bg-secondary text-secondary-foreground",
    success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200",
    warning: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-200",
    danger: "border-destructive/30 bg-destructive/10 text-destructive"
  };
  return <span className={`rounded-full border px-3 py-1 text-[11px] font-black capitalize ${classes[tone]}`}>{label.replaceAll("_", " ")}</span>;
}

function Notice({ children, tone }: { children: string; tone: "success" | "danger" }) {
  return <p className={`mt-4 rounded-2xl border px-4 py-3 text-sm font-black ${tone === "success" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200" : "border-destructive bg-destructive/10 text-destructive"}`}>{children}</p>;
}

function limitLabel(value?: number | null) {
  if (value === null || value === undefined || value >= 9000) return "Unlimited";
  return String(value);
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}
