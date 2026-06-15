"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Check, Megaphone, Star, X } from "lucide-react";
import { RoleShell } from "@/components/layout/role-shell";
import { approveAdminPost, featureAdminPost, getAdminFeedPosts, promoteAdminPost, rejectAdminPost } from "@/lib/api";
import type { VendorPost } from "@/lib/types";

export default function AdminFeedPage() {
  const [posts, setPosts] = useState<VendorPost[]>([]);
  const [moderationStatus, setModerationStatus] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadPosts = async () => {
    setIsLoading(true);
    setError("");
    try {
      const response = await getAdminFeedPosts({ moderationStatus });
      setPosts(response);
    } catch (errorValue) {
      setError(errorValue instanceof Error ? errorValue.message : "Could not load feed posts.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadPosts();
  }, [moderationStatus]);

  const updatePost = (updated: VendorPost) => {
    setPosts((current) => current.map((post) => (post.id === updated.id ? updated : post)));
  };

  const runAction = async (label: string, action: () => Promise<VendorPost>) => {
    setMessage("");
    setError("");
    try {
      updatePost(await action());
      setMessage(label);
    } catch (errorValue) {
      setError(errorValue instanceof Error ? errorValue.message : "Could not update post.");
    }
  };

  const rejectPost = (postId: string) => {
    const reason = window.prompt("Reason for rejecting this post:");
    if (reason === null) return;
    const normalizedReason = reason.trim();
    if (!normalizedReason) {
      setError("Add a rejection reason before rejecting the post.");
      return;
    }
    void runAction("Post rejected.", () => rejectAdminPost(postId, normalizedReason));
  };

  return (
    <RoleShell role="admin" title="Feed">
      <section className="p-4 sm:p-6 xl:p-8">
        <div className="rounded-[32px] border border-border bg-card p-5 text-card-foreground shadow-soft">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">Feed moderation</p>
              <h1 className="mt-2 text-3xl font-black tracking-[-0.05em] text-foreground">Review vendor social posts.</h1>
              <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-muted-foreground">
                Only approved posts from approved vendors appear publicly. Feature and promote controls change feed ordering.
              </p>
            </div>
            <label className="grid gap-2">
              <span className="text-sm font-black text-foreground">Moderation status</span>
              <select value={moderationStatus} onChange={(event) => setModerationStatus(event.target.value)} className="h-12 rounded-2xl border border-border bg-background px-4 text-sm font-black text-foreground">
                <option value="all">All</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </label>
          </div>
          {message ? <p className="mt-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-black text-emerald-700 dark:text-emerald-200">{message}</p> : null}
          {error ? <p className="mt-4 rounded-2xl border border-destructive bg-destructive/10 px-4 py-3 text-sm font-black text-destructive">{error}</p> : null}
          {isLoading ? <div className="mt-6 h-80 animate-pulse rounded-[28px] bg-muted" /> : null}
          {!isLoading && !posts.length ? <p className="mt-6 rounded-2xl border border-border bg-background p-5 text-sm font-semibold text-muted-foreground">No posts found for this filter.</p> : null}
          <div className="mt-6 grid gap-4">
            {posts.map((post) => (
              <article key={post.id} className="grid gap-4 rounded-[26px] border border-border bg-background p-4 xl:grid-cols-[140px_minmax(0,1fr)_260px]">
                <div className="relative aspect-square overflow-hidden rounded-2xl bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={post.thumbnailUrl || post.mediaUrls[0] || post.product?.images?.[0] || "/products/product-placeholder.png"} alt="" className="h-full w-full object-cover" />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap gap-2">
                    <Badge label={post.status} />
                    <Badge label={post.moderationStatus} tone={post.moderationStatus === "approved" ? "success" : post.moderationStatus === "rejected" ? "danger" : "warning"} />
                    {post.isFeatured ? <Badge label="Featured" tone="success" /> : null}
                    {post.isPromoted ? <Badge label="Promoted" tone="warning" /> : null}
                  </div>
                  <h2 className="mt-3 text-lg font-black text-foreground">{post.vendor?.displayName || "Vendor"}</h2>
                  <p className="mt-1 line-clamp-3 text-sm font-semibold leading-6 text-muted-foreground">{post.caption}</p>
                  {post.product ? <p className="mt-2 text-sm font-black text-primary">{post.product.title}</p> : null}
                  <div className="mt-4 flex flex-wrap gap-2">
                    {post.moderationStatus === "approved" ? <Link href={`/p/${post.id}`} className="rounded-2xl border border-border bg-card px-4 py-2 text-sm font-black text-card-foreground">Open post</Link> : null}
                    {post.vendor ? <Link href={`/v/${post.vendor.slug}`} className="rounded-2xl border border-border bg-card px-4 py-2 text-sm font-black text-card-foreground">Vendor</Link> : null}
                  </div>
                </div>
                <div className="grid gap-2 self-start">
                  <button type="button" onClick={() => runAction("Post approved.", () => approveAdminPost(post.id))} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-2 text-sm font-black text-primary-foreground">
                    <Check className="h-4 w-4" />
                    Approve
                  </button>
                  <button type="button" onClick={() => rejectPost(post.id)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-destructive bg-destructive/10 px-4 py-2 text-sm font-black text-destructive">
                    <X className="h-4 w-4" />
                    Reject
                  </button>
                  <button type="button" onClick={() => runAction("Featured state updated.", () => featureAdminPost(post.id, !post.isFeatured))} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-border bg-card px-4 py-2 text-sm font-black text-card-foreground">
                    <Star className="h-4 w-4" />
                    {post.isFeatured ? "Unfeature" : "Feature"}
                  </button>
                  <button type="button" onClick={() => runAction("Promoted state updated.", () => promoteAdminPost(post.id, !post.isPromoted))} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-border bg-card px-4 py-2 text-sm font-black text-card-foreground">
                    <Megaphone className="h-4 w-4" />
                    {post.isPromoted ? "Unpromote" : "Promote"}
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
    neutral: "border-border bg-card text-muted-foreground",
    success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200",
    warning: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-200",
    danger: "border-destructive/30 bg-destructive/10 text-destructive"
  };
  return <span className={`rounded-full border px-3 py-1 text-[11px] font-black capitalize ${classes[tone]}`}>{label}</span>;
}
