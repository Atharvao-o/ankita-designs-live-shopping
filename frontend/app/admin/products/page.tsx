"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { RoleShell } from "@/components/layout/role-shell";
import { AppImage } from "@/components/ui/app-image";
import { getAdminProducts, updateAdminProductModeration } from "@/lib/api";
import type { AdminProductModerationItem } from "@/lib/types";
import { formatPrice } from "@/lib/utils";

export default function AdminProductsPage() {
  const [products, setProducts] = useState<AdminProductModerationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadProducts = async () => {
    setIsLoading(true);
    setError("");
    try {
      setProducts(await getAdminProducts());
    } catch (errorValue) {
      setError(errorValue instanceof Error ? errorValue.message : "Could not load products.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadProducts();
  }, []);

  const setStatus = async (product: AdminProductModerationItem, status: "active" | "inactive") => {
    setMessage("");
    setError("");
    try {
      const updated = await updateAdminProductModeration(product.id, { status });
      setProducts((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setMessage(`Product marked ${status}.`);
    } catch (errorValue) {
      setError(errorValue instanceof Error ? errorValue.message : "Could not update product.");
    }
  };

  return (
    <RoleShell role="admin" title="Products">
      <section className="p-4 sm:p-6 xl:p-8">
        <div className="rounded-[32px] border border-border bg-card p-5 text-card-foreground shadow-soft">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">Product moderation</p>
              <h1 className="mt-2 text-3xl font-black tracking-[-0.05em] text-foreground">Products powering social shopping</h1>
              <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-muted-foreground">
                Admin moderation is intentionally limited to existing product visibility status. Price, stock, vendor ownership, cart, and order references are not changed here.
              </p>
            </div>
            <Link href="/admin/feed" className="rounded-2xl border border-border bg-secondary px-4 py-3 text-sm font-black text-secondary-foreground">Moderate feed posts</Link>
          </div>
          {message ? <p className="mt-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-black text-emerald-700 dark:text-emerald-200">{message}</p> : null}
          {error ? <p className="mt-4 rounded-2xl border border-destructive bg-destructive/10 px-4 py-3 text-sm font-black text-destructive">{error}</p> : null}
          {isLoading ? <div className="mt-6 h-80 animate-pulse rounded-[28px] bg-muted" /> : null}
          {!isLoading && !products.length ? <p className="mt-6 rounded-2xl border border-border bg-background p-5 text-sm font-semibold text-muted-foreground">No products available.</p> : null}
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {products.map((product) => (
              <article key={product.id} className="overflow-hidden rounded-[24px] border border-border bg-background">
                <div className="relative aspect-square bg-muted">
                  <AppImage src={product.images[0] || "/products/product-placeholder.png"} alt={product.title} fallbackSrc="/products/product-placeholder.png" className="absolute inset-0 h-full w-full rounded-none object-cover" />
                  <span className={`absolute left-3 top-3 rounded-full px-3 py-1 text-xs font-black ${product.status === "active" ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground"}`}>
                    {product.status}
                  </span>
                </div>
                <div className="p-4">
                  <p className="line-clamp-2 text-sm font-black text-foreground">{product.title}</p>
                  <p className="mt-1 text-xs font-bold text-muted-foreground">{product.vendorName || "Vendor unavailable"}</p>
                  <p className="mt-2 text-lg font-black text-primary">{formatPrice(product.price)}</p>
                  <p className="mt-1 text-xs font-bold capitalize text-muted-foreground">stock {product.stock}</p>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => setStatus(product, "active")} disabled={product.status === "active"} className="min-h-10 rounded-2xl bg-primary px-3 py-2 text-xs font-black text-primary-foreground disabled:opacity-50">
                      Show
                    </button>
                    <button type="button" onClick={() => setStatus(product, "inactive")} disabled={product.status === "inactive"} className="min-h-10 rounded-2xl border border-border bg-card px-3 py-2 text-xs font-black text-card-foreground disabled:opacity-50">
                      Hide
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </RoleShell>
  );
}
