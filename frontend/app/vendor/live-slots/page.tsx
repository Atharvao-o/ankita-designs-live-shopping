"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarClock, XCircle } from "lucide-react";
import { RoleShell } from "@/components/layout/role-shell";
import { ImageCropUpload } from "@/components/uploads/image-crop-upload";
import {
  cancelVendorLiveSlot,
  getExhibitions,
  getVendorLiveSlots,
  getVendorStall,
  requestVendorLiveSlot,
  submitVendorLiveSlotPaymentProof
} from "@/lib/api";
import type { Exhibition, LiveSlot, Stall } from "@/lib/types";
import { formatPrice } from "@/lib/utils";

export default function VendorLiveSlotsPage() {
  const [slots, setSlots] = useState<LiveSlot[]>([]);
  const [stall, setStall] = useState<Stall | null>(null);
  const [exhibitions, setExhibitions] = useState<Exhibition[]>([]);
  const [form, setForm] = useState({
    title: "",
    startTime: "",
    endTime: "",
    slotType: "subscription",
    exhibitionId: "",
    price: "0"
  });
  const [selectedSlotId, setSelectedSlotId] = useState("");
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
      const [slotResponse, stallResponse, exhibitionResponse] = await Promise.all([
        getVendorLiveSlots(),
        getVendorStall().catch(() => null),
        getExhibitions()
      ]);
      setSlots(slotResponse);
      setStall(stallResponse);
      setExhibitions(exhibitionResponse.filter((item) => item.status !== "ended" && item.status !== "cancelled"));
      setSelectedSlotId(slotResponse.find((item) => item.status === "requested")?.id ?? "");
    } catch (errorValue) {
      setError(errorValue instanceof Error ? errorValue.message : "Could not load live slots.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const createSlot = async () => {
    if (!form.startTime || !form.endTime) {
      setError("Choose start and end time.");
      return;
    }
    setIsSubmitting("request");
    setMessage("");
    setError("");
    try {
      await requestVendorLiveSlot({
        title: form.title.trim() || undefined,
        startTime: new Date(form.startTime).toISOString(),
        endTime: new Date(form.endTime).toISOString(),
        slotType: form.slotType as "subscription" | "exhibition" | "paid_extra" | "admin_assigned",
        exhibitionId: form.exhibitionId || undefined,
        stallId: stall?.id,
        price: Number(form.price || 0)
      });
      setForm((current) => ({ ...current, title: "", startTime: "", endTime: "", price: "0" }));
      setMessage("Live slot requested. Admin approval is required before it can be used.");
      await load();
    } catch (errorValue) {
      setError(errorValue instanceof Error ? errorValue.message : "Could not request live slot.");
    } finally {
      setIsSubmitting("");
    }
  };

  const submitProof = async () => {
    if (!selectedSlotId || !proofUrl) {
      setError("Choose a slot and upload payment proof.");
      return;
    }
    setIsSubmitting("proof");
    setMessage("");
    setError("");
    try {
      await submitVendorLiveSlotPaymentProof(selectedSlotId, { paymentProofUrl: proofUrl, paymentReference: reference.trim() || undefined });
      setProofUrl("");
      setReference("");
      setMessage("Live slot payment proof submitted for admin review.");
      await load();
    } catch (errorValue) {
      setError(errorValue instanceof Error ? errorValue.message : "Could not submit proof.");
    } finally {
      setIsSubmitting("");
    }
  };

  const cancelSlot = async (slotId: string) => {
    setIsSubmitting(slotId);
    setMessage("");
    setError("");
    try {
      await cancelVendorLiveSlot(slotId);
      setMessage("Live slot cancelled.");
      await load();
    } catch (errorValue) {
      setError(errorValue instanceof Error ? errorValue.message : "Could not cancel live slot.");
    } finally {
      setIsSubmitting("");
    }
  };

  const proofSlots = slots.filter((item) => item.status === "requested" && item.paymentStatus !== "not_required");

  return (
    <RoleShell role="vendor" title="Live Slots">
      <section className="p-4 sm:p-6 xl:p-8">
        <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
          <aside className="h-fit rounded-[32px] border border-border bg-card p-5 text-card-foreground shadow-soft">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">Book live time</p>
            <h1 className="mt-2 text-3xl font-black tracking-[-0.05em] text-foreground">Request a live slot</h1>
            <p className="mt-2 text-sm font-semibold leading-6 text-muted-foreground">
              You can go live only during an approved slot when live slot enforcement is enabled.
            </p>
            {message ? <Notice tone="success">{message}</Notice> : null}
            {error ? <Notice tone="danger">{error}</Notice> : null}
            <div className="mt-5 grid gap-4">
              <label className="grid gap-2">
                <span className="text-sm font-black text-foreground">Title</span>
                <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} className="h-12 rounded-2xl border border-border bg-background px-4 text-sm font-semibold text-foreground" placeholder="Weekend collection live" />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2">
                  <span className="text-sm font-black text-foreground">Start</span>
                  <input type="datetime-local" value={form.startTime} onChange={(event) => setForm({ ...form, startTime: event.target.value })} className="h-12 rounded-2xl border border-border bg-background px-4 text-sm font-semibold text-foreground" />
                </label>
                <label className="grid gap-2">
                  <span className="text-sm font-black text-foreground">End</span>
                  <input type="datetime-local" value={form.endTime} onChange={(event) => setForm({ ...form, endTime: event.target.value })} className="h-12 rounded-2xl border border-border bg-background px-4 text-sm font-semibold text-foreground" />
                </label>
              </div>
              <label className="grid gap-2">
                <span className="text-sm font-black text-foreground">Slot type</span>
                <select value={form.slotType} onChange={(event) => setForm({ ...form, slotType: event.target.value })} className="h-12 rounded-2xl border border-border bg-background px-4 text-sm font-black text-foreground">
                  <option value="subscription">Subscription</option>
                  <option value="exhibition">Exhibition</option>
                  <option value="paid_extra">Paid extra</option>
                </select>
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-black text-foreground">Linked exhibition</span>
                <select value={form.exhibitionId} onChange={(event) => setForm({ ...form, exhibitionId: event.target.value })} className="h-12 rounded-2xl border border-border bg-background px-4 text-sm font-black text-foreground">
                  <option value="">No exhibition link</option>
                  {exhibitions.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
                </select>
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-black text-foreground">Slot price</span>
                <input type="number" min="0" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} className="h-12 rounded-2xl border border-border bg-background px-4 text-sm font-semibold text-foreground" />
              </label>
              <button type="button" onClick={createSlot} disabled={isSubmitting === "request"} className="min-h-12 rounded-2xl bg-primary px-5 py-3 text-sm font-black text-primary-foreground disabled:opacity-60">
                {isSubmitting === "request" ? "Requesting..." : "Request live slot"}
              </button>
            </div>
          </aside>
          <div className="grid gap-6">
            <div className="rounded-[32px] border border-border bg-card p-5 text-card-foreground shadow-soft">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">Your slots</p>
                  <h2 className="mt-2 text-3xl font-black tracking-[-0.05em] text-foreground">Live schedule requests</h2>
                </div>
                <Link href="/vendor/live" className="rounded-2xl border border-border bg-secondary px-4 py-3 text-sm font-black text-secondary-foreground">Live console</Link>
              </div>
              {isLoading ? <div className="mt-6 h-72 animate-pulse rounded-[28px] bg-muted" /> : null}
              {!isLoading && !slots.length ? <p className="mt-6 rounded-2xl border border-border bg-background p-5 text-sm font-semibold text-muted-foreground">No live slot requests yet.</p> : null}
              <div className="mt-6 grid gap-4">
                {slots.map((slot) => (
                  <article key={slot.id} className="rounded-[26px] border border-border bg-background p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex flex-wrap gap-2">
                          <Badge label={slot.status} tone={slot.status === "approved" ? "success" : slot.status === "rejected" ? "danger" : "warning"} />
                          <Badge label={slot.paymentStatus} />
                          <Badge label={slot.slotType} />
                        </div>
                        <h3 className="mt-3 text-xl font-black text-foreground">{slot.title || slot.stallName || "Live slot"}</h3>
                        <p className="mt-1 text-sm font-semibold text-muted-foreground">{formatDate(slot.startTime)} - {formatDate(slot.endTime)}</p>
                        <p className="mt-1 text-sm font-bold text-primary">{formatPrice(slot.price)}</p>
                        {slot.rejectionReason ? <p className="mt-2 text-sm font-bold text-destructive">{slot.rejectionReason}</p> : null}
                      </div>
                      {["requested", "rejected"].includes(slot.status) ? (
                        <button type="button" onClick={() => cancelSlot(slot.id)} disabled={isSubmitting === slot.id} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl border border-destructive bg-destructive/10 px-4 py-2 text-sm font-black text-destructive disabled:opacity-60">
                          <XCircle className="h-4 w-4" />
                          Cancel
                        </button>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            </div>
            <div className="rounded-[32px] border border-border bg-card p-5 text-card-foreground shadow-soft">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">Paid slot proof</p>
              <h2 className="mt-2 text-2xl font-black tracking-[-0.05em] text-foreground">Submit payment proof</h2>
              <div className="mt-5 grid gap-4">
                <select value={selectedSlotId} onChange={(event) => setSelectedSlotId(event.target.value)} className="h-12 rounded-2xl border border-border bg-background px-4 text-sm font-black text-foreground">
                  <option value="">Choose paid slot</option>
                  {proofSlots.map((slot) => <option key={slot.id} value={slot.id}>{slot.title || slot.id} - {slot.paymentStatus}</option>)}
                </select>
                <input value={reference} onChange={(event) => setReference(event.target.value)} className="h-12 rounded-2xl border border-border bg-background px-4 text-sm font-semibold text-foreground" placeholder="Payment reference" />
                <ImageCropUpload uploadType="live_slot_payment_proof" preset="package" label="Live slot payment proof" value={proofUrl} onUploaded={setProofUrl} />
                <button type="button" onClick={submitProof} disabled={isSubmitting === "proof"} className="min-h-12 rounded-2xl bg-primary px-5 py-3 text-sm font-black text-primary-foreground disabled:opacity-60">
                  {isSubmitting === "proof" ? "Submitting..." : "Submit proof"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </RoleShell>
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

function formatDate(value: string) {
  return new Date(value).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}
