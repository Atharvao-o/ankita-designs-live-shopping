"use client";

import { useEffect, useState } from "react";
import { Check, X } from "lucide-react";
import { RoleShell } from "@/components/layout/role-shell";
import { approveAdminSubscription, cancelAdminSubscription, getAdminSubscriptions, rejectAdminSubscription } from "@/lib/api";
import type { VendorSubscription } from "@/lib/types";
import { formatPrice } from "@/lib/utils";

export default function AdminSubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<VendorSubscription[]>([]);
  const [status, setStatus] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    setIsLoading(true);
    setError("");
    try {
      setSubscriptions(await getAdminSubscriptions({ status }));
    } catch (errorValue) {
      setError(errorValue instanceof Error ? errorValue.message : "Could not load subscriptions.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [status]);

  const replace = (item: VendorSubscription) => {
    setSubscriptions((current) => current.map((subscription) => (subscription.id === item.id ? item : subscription)));
  };

  const runAction = async (label: string, action: () => Promise<VendorSubscription>) => {
    setMessage("");
    setError("");
    try {
      replace(await action());
      setMessage(label);
    } catch (errorValue) {
      setError(errorValue instanceof Error ? errorValue.message : "Could not update subscription.");
    }
  };

  const reject = (subscriptionId: string) => {
    const reason = window.prompt("Reason for rejecting this subscription:");
    if (reason === null) return;
    if (!reason.trim()) {
      setError("Rejection reason is required.");
      return;
    }
    void runAction("Subscription rejected.", () => rejectAdminSubscription(subscriptionId, reason.trim()));
  };

  return (
    <RoleShell role="admin" title="Subscriptions">
      <section className="p-4 sm:p-6 xl:p-8">
        <div className="rounded-[32px] border border-border bg-card p-5 text-card-foreground shadow-soft">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">Vendor payments</p>
              <h1 className="mt-2 text-3xl font-black tracking-[-0.05em] text-foreground">Subscription approvals</h1>
              <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-muted-foreground">
                Manual payment proof must be reviewed before vendor subscription access activates.
              </p>
            </div>
            <select value={status} onChange={(event) => setStatus(event.target.value)} className="h-12 rounded-2xl border border-border bg-background px-4 text-sm font-black text-foreground">
              <option value="all">All statuses</option>
              <option value="pending_payment">Pending payment</option>
              <option value="active">Active</option>
              <option value="rejected">Rejected</option>
              <option value="cancelled">Cancelled</option>
              <option value="expired">Expired</option>
            </select>
          </div>
          {message ? <Notice tone="success">{message}</Notice> : null}
          {error ? <Notice tone="danger">{error}</Notice> : null}
          {isLoading ? <div className="mt-6 h-80 animate-pulse rounded-[28px] bg-muted" /> : null}
          {!isLoading && !subscriptions.length ? <p className="mt-6 rounded-2xl border border-border bg-background p-5 text-sm font-semibold text-muted-foreground">No subscription requests found.</p> : null}
          <div className="mt-6 grid gap-4">
            {subscriptions.map((subscription) => (
              <article key={subscription.id} className="grid gap-4 rounded-[26px] border border-border bg-background p-4 xl:grid-cols-[minmax(0,1fr)_280px]">
                <div>
                  <div className="flex flex-wrap gap-2">
                    <Badge label={subscription.status} tone={subscription.status === "active" ? "success" : subscription.status === "rejected" ? "danger" : "warning"} />
                    <Badge label={subscription.paymentStatus} />
                  </div>
                  <h2 className="mt-3 text-xl font-black text-foreground">{subscription.vendorName ?? subscription.vendorId}</h2>
                  <p className="mt-1 text-sm font-semibold text-muted-foreground">{subscription.plan?.name ?? subscription.planId} - {formatPrice(subscription.plan?.price ?? 0)}</p>
                  <p className="mt-1 text-sm font-semibold text-muted-foreground">Reference: {subscription.paymentReference || "Not submitted"}</p>
                  {subscription.paymentProofUrl ? <a href={subscription.paymentProofUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex rounded-2xl border border-border bg-card px-4 py-2 text-sm font-black text-card-foreground">Open proof</a> : null}
                  {subscription.rejectionReason ? <p className="mt-2 text-sm font-bold text-destructive">{subscription.rejectionReason}</p> : null}
                </div>
                <div className="grid gap-2 self-start">
                  <button onClick={() => runAction("Subscription approved.", () => approveAdminSubscription(subscription.id))} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-2 text-sm font-black text-primary-foreground">
                    <Check className="h-4 w-4" /> Approve
                  </button>
                  <button onClick={() => reject(subscription.id)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-destructive bg-destructive/10 px-4 py-2 text-sm font-black text-destructive">
                    <X className="h-4 w-4" /> Reject
                  </button>
                  <button onClick={() => runAction("Subscription cancelled.", () => cancelAdminSubscription(subscription.id))} className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-border bg-card px-4 py-2 text-sm font-black text-card-foreground">
                    Cancel
                  </button>
                </div>
              </article>
            ))}
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
