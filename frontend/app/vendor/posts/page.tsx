"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Archive, Plus, Send, Trash2 } from "lucide-react";
import { RoleShell } from "@/components/layout/role-shell";
import { ImageCropUpload } from "@/components/uploads/image-crop-upload";
import { archiveVendorPost, createVendorPost, getVendorOwnPosts, getVendorProducts, publishVendorPost } from "@/lib/api";
import type { Product, VendorPost, VendorPostType } from "@/lib/types";
import { formatPrice } from "@/lib/utils";

const postTypes: VendorPostType[] = ["product", "offer", "announcement", "live", "event"];

export default function VendorPostsPage() {
  const [posts, setPosts] = useState<VendorPost[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [postType, setPostType] = useState<VendorPostType>("product");
  const [caption, setCaption] = useState("");
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [productId, setProductId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadData = async () => {
    setIsLoading(true);
    setError("");
    try {
      const [postResponse, productResponse] = await Promise.all([getVendorOwnPosts(), getVendorProducts()]);
      setPosts(postResponse);
      setProducts(productResponse);
    } catch (errorValue) {
      setError(errorValue instanceof Error ? errorValue.message : "Could not load posts.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const createDraft = async () => {
    setIsSaving(true);
    setMessage("");
    setError("");
    try {
      const post = await createVendorPost({
        postType,
        caption,
        mediaUrls,
        thumbnailUrl: mediaUrls[0] || null,
        productId: productId || null,
        status: "draft"
      });
      setPosts((current) => [post, ...current]);
      setCaption("");
      setMediaUrls([]);
      setProductId("");
      setMessage("Draft post created.");
    } catch (errorValue) {
      setError(errorValue instanceof Error ? errorValue.message : "Could not create post.");
    } finally {
      setIsSaving(false);
    }
  };

  const confirmArchivePost = async (postId: string) => {
    if (!window.confirm("Delete this post from your active feed?")) return;
    await archivePost(postId);
  };

  const publishPost = async (postId: string) => {
    setMessage("");
    setError("");
    try {
      const updated = await publishVendorPost(postId);
      setPosts((current) => current.map((post) => (post.id === updated.id ? updated : post)));
      setMessage("Post submitted for admin moderation.");
    } catch (errorValue) {
      setError(errorValue instanceof Error ? errorValue.message : "Could not publish post.");
    }
  };

  const archivePost = async (postId: string) => {
    setMessage("");
    setError("");
    try {
      const updated = await archiveVendorPost(postId);
      setPosts((current) => current.map((post) => (post.id === updated.id ? updated : post)));
      setMessage("Post archived.");
    } catch (errorValue) {
      setError(errorValue instanceof Error ? errorValue.message : "Could not archive post.");
    }
  };

  return (
    <RoleShell role="vendor" title="Posts">
      <section className="px-3 py-4 sm:p-6 xl:p-8">
        <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
          <aside id="create-post" className="h-fit rounded-[24px] border border-border bg-card p-4 text-card-foreground shadow-soft sm:rounded-[32px] sm:p-5">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">Create post</p>
            <h1 className="mt-2 text-2xl font-black tracking-[-0.05em] text-foreground sm:text-3xl">Share a product drop.</h1>
            <p className="mt-2 text-sm font-semibold leading-6 text-muted-foreground">
              Drafts are private. Publishing sends the post to admin moderation before it appears in the public feed.
            </p>
            <div className="mt-5 grid gap-4">
              <label className="grid gap-2">
                <span className="text-sm font-black text-foreground">Post type</span>
                <select value={postType} onChange={(event) => setPostType(event.target.value as VendorPostType)} className="h-12 rounded-2xl border border-border bg-background px-4 text-sm font-black text-foreground">
                  {postTypes.map((type) => <option key={type} value={type}>{type}</option>)}
                </select>
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-black text-foreground">Linked product</span>
                <select value={productId} onChange={(event) => setProductId(event.target.value)} className="h-12 rounded-2xl border border-border bg-background px-4 text-sm font-black text-foreground">
                  <option value="">No product link</option>
                  {products.map((product) => <option key={product.id} value={product.id}>{product.title}</option>)}
                </select>
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-black text-foreground">Caption</span>
                <textarea
                  value={caption}
                  onChange={(event) => setCaption(event.target.value)}
                  rows={5}
                  className="rounded-2xl border border-border bg-background px-4 py-3 text-sm font-semibold text-foreground outline-none transition focus:border-primary"
                  placeholder="Tell customers what is new, why it is special, and how to buy."
                />
              </label>
              <ImageCropUpload
                uploadType="product_image"
                preset="product"
                label="Post image"
                value={mediaUrls[0]}
                onUploaded={(url) => setMediaUrls([url])}
              />
              <button
                type="button"
                onClick={createDraft}
                disabled={isSaving || !caption.trim()}
                className="min-h-12 rounded-2xl bg-primary px-5 py-3 text-sm font-black text-primary-foreground transition hover:brightness-105 disabled:opacity-60"
              >
                <Plus className="mr-2 inline h-4 w-4" />
                {isSaving ? "Creating..." : "Create draft"}
              </button>
            </div>
          </aside>

          <div className="rounded-[24px] border border-border bg-card p-4 text-card-foreground shadow-soft sm:rounded-[32px] sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">Your posts</p>
                <h2 className="mt-2 text-3xl font-black tracking-[-0.05em] text-foreground">Social feed manager</h2>
              </div>
              <Link href="/explore" className="rounded-2xl border border-border bg-secondary px-4 py-3 text-sm font-black text-secondary-foreground">View public feed</Link>
            </div>
            {message ? <p className="mt-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-black text-emerald-700 dark:text-emerald-200">{message}</p> : null}
            {error ? <p className="mt-4 rounded-2xl border border-destructive bg-destructive/10 px-4 py-3 text-sm font-black text-destructive">{error}</p> : null}
            {isLoading ? <div className="mt-6 h-72 animate-pulse rounded-[28px] bg-muted" /> : null}
            {!isLoading && !posts.length ? <p className="mt-6 rounded-2xl border border-border bg-background p-5 text-sm font-semibold text-muted-foreground">No posts yet. Create your first draft from the left panel.</p> : null}
            <div className="mt-6 grid gap-4">
              {posts.map((post) => (
                <article key={post.id} className="grid grid-cols-[88px_minmax(0,1fr)] gap-3 rounded-[20px] border border-border bg-background p-3 sm:grid-cols-[120px_minmax(0,1fr)] sm:gap-4 sm:rounded-[24px] sm:p-4">
                  <div className="relative aspect-square overflow-hidden rounded-xl bg-muted sm:rounded-2xl">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={post.thumbnailUrl || post.mediaUrls[0] || post.product?.images?.[0] || "/products/product-placeholder.png"} alt="" className="h-full w-full object-cover" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap gap-2">
                      <Badge label={post.status} />
                      <Badge label={post.moderationStatus} tone={post.moderationStatus === "approved" ? "success" : post.moderationStatus === "rejected" ? "danger" : "warning"} />
                      <Badge label={post.postType} />
                    </div>
                    <p className="mt-3 line-clamp-2 text-sm font-semibold leading-5 text-foreground sm:line-clamp-3 sm:leading-6">{post.caption}</p>
                    {post.product ? <p className="mt-2 text-sm font-black text-primary">{post.product.title} - {formatPrice(post.product.price)}</p> : null}
                    {post.rejectionReason ? <p className="mt-2 text-xs font-bold text-destructive">{post.rejectionReason}</p> : null}
                    <div className="mt-4 flex flex-wrap gap-2">
                      {post.status !== "published" || post.moderationStatus === "rejected" ? (
                        <button type="button" onClick={() => publishPost(post.id)} className="inline-flex min-h-10 items-center gap-2 rounded-2xl bg-primary px-4 py-2 text-sm font-black text-primary-foreground">
                          <Send className="h-4 w-4" />
                          Submit
                        </button>
                      ) : null}
                      {post.status !== "archived" ? (
                        <button type="button" onClick={() => void confirmArchivePost(post.id)} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-xs font-black text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200 sm:rounded-2xl sm:px-4 sm:text-sm">
                          <Trash2 className="h-4 w-4 sm:hidden" />
                          <Archive className="hidden h-4 w-4 sm:block" />
                          <span className="sm:hidden">Delete</span>
                          <span className="hidden sm:inline">Archive</span>
                        </button>
                      ) : null}
                      {post.status === "published" && post.moderationStatus === "approved" ? (
                        <Link href={`/p/${post.id}`} className="rounded-2xl border border-border bg-secondary px-4 py-2 text-sm font-black text-secondary-foreground">Open post</Link>
                      ) : null}
                    </div>
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
    neutral: "border-border bg-card text-muted-foreground",
    success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200",
    warning: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-200",
    danger: "border-destructive/30 bg-destructive/10 text-destructive"
  };
  return <span className={`rounded-full border px-3 py-1 text-[11px] font-black capitalize ${classes[tone]}`}>{label}</span>;
}
