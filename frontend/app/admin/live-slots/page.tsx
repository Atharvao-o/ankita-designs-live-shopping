"use client";

import { useEffect, useState } from "react";
import { Check, Plus, X } from "lucide-react";
import { RoleShell } from "@/components/layout/role-shell";
import { approveAdminLiveSlot, cancelAdminLiveSlot, createAdminLiveSlot, getAdminLiveSlots, getAdminVendors, rejectAdminLiveSlot } from "@/lib/api";
import type { LiveSlot, Vendor } from "@/lib/types";
import { formatPrice } from "@/lib/utils";

export default function AdminLiveSlotsPage() {
  const [slots, setSlots] = useState<LiveSlot[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [status, setStatus] = useState("all");
  const [form, setForm] = useState({ vendorId: "", title: "", startTime: "", endTime: "" });
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    setIsLoading(true);
    setError("");
    try {
      const [slotResponse, vendorResponse] = await Promise.all([getAdminLiveSlots({ status }), getAdminVendors()]);
      setSlots(slotResponse);
      setVendors(vendorResponse.filter((vendor) => vendor.status === "approved"));
    } catch (errorValue) {
      setError(errorValue instanceof Error ? errorValue.message : "Could not load live slots.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [status]);

  const replace = (slot: LiveSlot) => {
    setSlots((current) => current.map((item) => (item.id === slot.id ? slot : item)));
  };

  const runAction = async (label: string, action: () => Promise<LiveSlot>) => {
    setMessage("");
    setError("");
    try {
      replace(await action());
      setMessage(label);
    } catch (errorValue) {
      setError(errorValue instanceof Error ? errorValue.message : "Could not update live slot.");
    }
  };

  const reject = (slotId: string) => {
    const reason = window.prompt("Reason for rejecting this live slot:");
    if (reason === null) return;
    if (!reason.trim()) {
      setError("Rejection reason is required.");
      return;
    }
    void runAction("Live slot rejected.", () => rejectAdminLiveSlot(slotId, reason.trim()));
  };

  const createAssignedSlot = async () => {
    if (!form.vendorId || !form.startTime || !form.endTime) {
      setError("Choose vendor, start, and end time.");
      return;
    }
    setIsSubmitting("create");
    setMessage("");
    setError("");
    try {
      const slot = await createAdminLiveSlot({
        vendorId: form.vendorId,
        title: form.title || "Admin assigned live slot",
        startTime: new Date(form.startTime).toISOString(),
        endTime: new Date(form.endTime).toISOString(),
        slotType: "admin_assigned",
        price: 0
      });
      setSlots((current) => [slot, ...current]);
      setForm({ vendorId: "", title: "", startTime: "", endTime: "" });
      setMessage("Admin live slot assigned.");
    } catch (errorValue) {
      setError(errorValue instanceof Error ? errorValue.message : "Could not create live slot.");
    } finally {
      setIsSubmitting("");
    }
  };

  return (
    <RoleShell role="admin" title="Live Slots">
      <section className="p-4 sm:p-6 xl:p-8">
        <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
          <aside className="h-fit rounded-[32px] border border-border bg-card p-5 text-card-foreground shadow-soft">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">Admin assignment</p>
            <h1 className="mt-2 text-3xl font-black tracking-[-0.05em] text-foreground">Create live slot</h1>
            <div className="mt-5 grid gap-4">
              <select value={form.vendorId} onChange={(event) => setForm({ ...form, vendorId: event.target.value })} className="h-12 rounded-2xl border border-border bg-background px-4 text-sm font-black text-foreground">
                <option value="">Choose vendor</option>
                {vendors.map((vendor) => <option key={vendor.id} value={vendor.id}>{vendor.displayName}</option>)}
              </select>
              <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} className="h-12 rounded-2xl border border-border bg-background px-4 text-sm font-semibold text-foreground" placeholder="Slot title" />
              <input type="datetime-local" value={form.startTime} onChange={(event) => setForm({ ...form, startTime: event.target.value })} className="h-12 rounded-2xl border border-border bg-background px-4 text-sm font-semibold text-foreground" />
              <input type="datetime-local" value={form.endTime} onChange={(event) => setForm({ ...form, endTime: event.target.value })} className="h-12 rounded-2xl border border-border bg-background px-4 text-sm font-semibold text-foreground" />
              <button type="button" onClick={createAssignedSlot} disabled={isSubmitting === "create"} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-black text-primary-foreground disabled:opacity-60">
                <Plus className="h-4 w-4" />
                {isSubmitting === "create" ? "Creating..." : "Create admin slot"}
              </button>
            </div>
          </aside>
          <div className="rounded-[32px] border border-border bg-card p-5 text-card-foreground shadow-soft">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">Live schedule control</p>
                <h2 className="mt-2 text-3xl font-black tracking-[-0.05em] text-foreground">Live slot approvals</h2>
                <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-muted-foreground">
                  Approve requested slots or assign admin-managed live windows.
                </p>
              </div>
              <select value={status} onChange={(event) => setStatus(event.target.value)} className="h-12 rounded-2xl border border-border bg-background px-4 text-sm font-black text-foreground">
                <option value="all">All statuses</option>
                <option value="requested">Requested</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="cancelled">Cancelled</option>
                <option value="expired">Expired</option>
              </select>
            </div>
            {message ? <Notice tone="success">{message}</Notice> : null}
            {error ? <Notice tone="danger">{error}</Notice> : null}
            {isLoading ? <div className="mt-6 h-80 animate-pulse rounded-[28px] bg-muted" /> : null}
            {!isLoading && !slots.length ? <p className="mt-6 rounded-2xl border border-border bg-background p-5 text-sm font-semibold text-muted-foreground">No live slots found.</p> : null}
            <div className="mt-6 grid gap-4">
              {slots.map((slot) => (
                <article key={slot.id} className="grid gap-4 rounded-[26px] border border-border bg-background p-4 xl:grid-cols-[minmax(0,1fr)_260px]">
                  <div>
                    <div className="flex flex-wrap gap-2">
                      <Badge label={slot.status} tone={slot.status === "approved" ? "success" : slot.status === "rejected" ? "danger" : "warning"} />
                      <Badge label={slot.paymentStatus} />
                      <Badge label={slot.slotType} />
                    </div>
                    <h3 className="mt-3 text-xl font-black text-foreground">{slot.vendorName ?? slot.vendorId}</h3>
                    <p className="mt-1 text-sm font-semibold text-muted-foreground">{slot.title || "Live slot"}</p>
                    <p className="mt-1 text-sm font-semibold text-muted-foreground">{formatDate(slot.startTime)} - {formatDate(slot.endTime)}</p>
                    <p className="mt-1 text-sm font-black text-primary">{formatPrice(slot.price)}</p>
                    {slot.paymentProofUrl ? <a href={slot.paymentProofUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex rounded-2xl border border-border bg-card px-4 py-2 text-sm font-black text-card-foreground">Open proof</a> : null}
                    {slot.rejectionReason ? <p className="mt-2 text-sm font-bold text-destructive">{slot.rejectionReason}</p> : null}
                  </div>
                  <div className="grid gap-2 self-start">
                    <button onClick={() => runAction("Live slot approved.", () => approveAdminLiveSlot(slot.id))} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-2 text-sm font-black text-primary-foreground">
                      <Check className="h-4 w-4" /> Approve
                    </button>
                    <button onClick={() => reject(slot.id)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-destructive bg-destructive/10 px-4 py-2 text-sm font-black text-destructive">
                      <X className="h-4 w-4" /> Reject
                    </button>
                    <button onClick={() => runAction("Live slot cancelled.", () => cancelAdminLiveSlot(slot.id))} className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-border bg-card px-4 py-2 text-sm font-black text-card-foreground">
                      Cancel
                    </button>
                  </div>
                </article>
              ))}
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
