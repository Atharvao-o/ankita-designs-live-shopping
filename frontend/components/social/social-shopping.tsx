"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bookmark,
  BookmarkCheck,
  Compass,
  Heart,
  Home,
  MessageCircle,
  MoreHorizontal,
  PackageOpen,
  ReceiptText,
  Send,
  Settings,
  ShoppingBag,
  Store,
  UserRound
} from "lucide-react";
import { CartDrawer } from "@/components/cart/cart-drawer";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { AppImage } from "@/components/ui/app-image";
import {
  addCartItem,
  followVendor,
  getExhibitions,
  getFeed,
  getPostById,
  getProduct,
  getProducts,
  getPublicStalls,
  getStallProducts,
  getUserSocial,
  getVendorBySlug,
  getVendorOwnProfile,
  getVendorPostsBySlug,
  getVendorProductsBySlug,
  getVendorStallsBySlug,
  likePost,
  savePost,
  saveProduct,
  unfollowVendor,
  unlikePost,
  unsavePost,
  unsaveProduct
} from "@/lib/api";
import { useExpoStore } from "@/lib/cart-store";
import type { Exhibition, Product, SocialProfile, Stall, VendorPost, VendorPublicProfile } from "@/lib/types";
import { cn, formatPrice } from "@/lib/utils";

type SocialPost = {
  id: string;
  realPostId?: string;
  product?: Product | null;
  vendorName: string;
  vendorSlug: string;
  vendorId?: string;
  stallId?: string | null;
  stall?: Stall | null;
  caption: string;
  mediaUrl: string;
  postType?: string;
  likeCount: number;
  saveCount: number;
  likedByMe: boolean;
  savedByMe: boolean;
  followingVendor: boolean;
  isRealPost: boolean;
};

type SocialData = {
  products: Product[];
  stalls: Stall[];
  exhibitions: Exhibition[];
  posts: SocialPost[];
  realPosts: VendorPost[];
};

const categoryLinks = ["Saree", "Kurti", "Jewellery", "White Metal", "Pooja Material", "Home Decor", "Food Products", "Cosmetics"];

function shuffleList<T>(items: T[]): T[] {
  return [...items].sort(() => Math.random() - 0.5);
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function vendorNameForProduct(product: Product, stalls: Stall[]) {
  const stall = stalls.find((item) => item.id === product.stallId);
  return stall?.vendorName || stall?.assignedVendorName || stall?.name || "Vendor";
}

function postFromProduct(product: Product, stalls: Stall[]): SocialPost {
  const stall = stalls.find((item) => item.id === product.stallId);
  const vendorName = vendorNameForProduct(product, stalls);
  return {
    id: product.id,
    product,
    vendorName,
    vendorSlug: slugify(stall?.assignedVendorId || stall?.vendorId || vendorName || product.vendorId || product.stallId),
    vendorId: product.vendorId,
    stallId: product.stallId,
    stall,
    caption: product.description,
    mediaUrl: product.images[0] || "/products/product-placeholder.png",
    postType: "product",
    likeCount: 0,
    saveCount: 0,
    likedByMe: false,
    savedByMe: false,
    followingVendor: false,
    isRealPost: false
  };
}

function postFromVendorPost(post: VendorPost): SocialPost {
  const product = post.product ?? null;
  const mediaUrl = post.thumbnailUrl || post.mediaUrls[0] || product?.images?.[0] || "/products/product-placeholder.png";
  return {
    id: post.id,
    realPostId: post.id,
    product,
    vendorName: post.vendor?.displayName || "Vendor",
    vendorSlug: post.vendor?.slug || slugify(post.vendorId),
    vendorId: post.vendorId,
    stallId: post.stallId || product?.stallId || null,
    caption: post.caption,
    mediaUrl,
    postType: post.postType,
    likeCount: post.likeCount,
    saveCount: post.saveCount,
    likedByMe: post.likedByMe,
    savedByMe: post.savedByMe,
    followingVendor: post.followingVendor,
    isRealPost: true
  };
}

export function useSocialShoppingData(limitProducts = 30) {
  const [data, setData] = useState<SocialData>({ products: [], stalls: [], exhibitions: [], posts: [], realPosts: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    Promise.allSettled([getFeed({ limit: limitProducts }), getProducts(), getPublicStalls(), getExhibitions()])
      .then(([feedResult, productResult, stallResult, exhibitionResult]) => {
        if (!active) return;
        const realPosts = feedResult.status === "fulfilled" ? feedResult.value.posts : [];
        const activeProducts = productResult.status === "fulfilled" ? productResult.value.filter((product) => product.status === "active") : [];
        const products = shuffleList(activeProducts).slice(0, limitProducts);
        const stalls = stallResult.status === "fulfilled" ? stallResult.value : [];
        const exhibitions = exhibitionResult.status === "fulfilled" ? exhibitionResult.value.filter((item) => item.status !== "draft" && item.status !== "cancelled") : [];
        const linkedProductIds = new Set(realPosts.map((post) => post.productId).filter(Boolean));
        const cataloguePosts = shuffleList(activeProducts)
          .filter((product) => !linkedProductIds.has(product.id))
          .map((product) => postFromProduct(product, stalls));
        const posts = shuffleList([...realPosts.map(postFromVendorPost), ...cataloguePosts]);
        setData({ products, stalls, exhibitions, posts, realPosts });
        setNextCursor(feedResult.status === "fulfilled" ? feedResult.value.nextCursor ?? null : null);
        setError(
          feedResult.status === "rejected" && productResult.status === "rejected" && stallResult.status === "rejected" && exhibitionResult.status === "rejected"
            ? "Social shopping data is unavailable. Start the backend to load vendors, products, and events."
            : ""
        );
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [limitProducts]);

  const loadMore = useCallback(async () => {
    if (!nextCursor || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const response = await getFeed({ cursor: nextCursor, limit: limitProducts });
      setData((current) => {
        const knownPostIds = new Set(current.realPosts.map((post) => post.id));
        const newRealPosts = response.posts.filter((post) => !knownPostIds.has(post.id));
        return {
          ...current,
          realPosts: [...current.realPosts, ...newRealPosts],
          posts: [...current.posts, ...newRealPosts.map(postFromVendorPost)]
        };
      });
      setNextCursor(response.nextCursor ?? null);
    } catch (errorValue) {
      setError(errorValue instanceof Error ? errorValue.message : "Could not load more posts.");
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, limitProducts, nextCursor]);

  return { ...data, isLoading, isLoadingMore, hasMore: Boolean(nextCursor), loadMore, error };
}

export function SocialShell({ children, rightRail }: { children: React.ReactNode; rightRail?: React.ReactNode }) {
  return (
    <main className="min-h-screen overflow-x-hidden bg-card pb-[calc(3.5rem+env(safe-area-inset-bottom))] text-foreground sm:bg-background md:pb-0">
      <SocialTopBar />
      <div className="mx-auto grid w-full max-w-[1180px] gap-0 px-0 py-0 sm:gap-6 sm:px-5 sm:py-4 lg:grid-cols-[220px_minmax(0,620px)_280px] lg:py-6">
        <SocialSidebar />
        <section className="min-w-0">{children}</section>
        <aside className="hidden min-w-0 lg:block">{rightRail ?? <SocialSuggestions />}</aside>
      </div>
      <SocialBottomNav />
      <CartDrawer />
    </main>
  );
}

function SocialTopBar() {
  const openCart = useExpoStore((state) => state.openCart);
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card text-card-foreground sm:shadow-soft">
      <div className="mx-auto flex h-[52px] max-w-[1180px] items-center gap-2.5 px-3 sm:h-auto sm:px-5 sm:py-3">
        <Link href="/" className="flex items-center gap-2" aria-label="Ankita Social Shopping home">
          <span className="hidden h-10 w-10 place-items-center rounded-2xl bg-primary text-sm font-black text-primary-foreground sm:grid">AD</span>
          <span className="leading-tight">
            <span className="block text-lg font-black tracking-[-0.03em] sm:hidden">Ankita</span>
            <span className="hidden text-sm font-black sm:block">Ankita Designs</span>
            <span className="hidden text-[11px] font-black uppercase tracking-[0.14em] text-primary sm:block">Social Shopping</span>
          </span>
        </Link>
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle className="h-8 w-8 rounded-full border-0 bg-transparent shadow-none hover:bg-secondary sm:h-10 sm:w-10 sm:rounded-2xl sm:border sm:bg-card sm:shadow-sm" />
          <button type="button" onClick={openCart} className="grid h-8 w-8 place-items-center rounded-full bg-transparent text-foreground transition hover:bg-secondary sm:h-10 sm:w-10 sm:rounded-2xl sm:border sm:border-border sm:bg-background" aria-label="Open cart">
            <ShoppingBag className="h-5 w-5 sm:h-[22px] sm:w-[22px]" />
          </button>
          <Link href="/profile" className="hidden h-10 w-10 place-items-center rounded-2xl border border-border bg-background text-foreground transition hover:border-primary hover:bg-secondary sm:grid" aria-label="Profile">
            <UserRound className="h-5 w-5" />
          </Link>
        </div>
      </div>
    </header>
  );
}

function SocialSidebar() {
  const pathname = usePathname();
  const items = [
    { label: "Home", href: "/", icon: Home },
    { label: "Explore", href: "/explore", icon: Compass },
    { label: "Events", href: "/exhibitions", icon: Store },
    { label: "Orders", href: "/orders", icon: ReceiptText },
    { label: "Profile", href: "/profile", icon: UserRound },
    { label: "Settings", href: "/profile/settings", icon: Settings }
  ];

  return (
    <aside className="sticky top-[86px] hidden h-fit rounded-[28px] border border-border bg-card p-3 text-card-foreground shadow-soft lg:block">
      <div className="mb-3 rounded-3xl bg-secondary p-4 text-secondary-foreground">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">Shop socially</p>
        <p className="mt-2 text-lg font-black leading-5">Follow vendors, discover drops, buy from live sellers.</p>
      </div>
      <nav className="grid gap-1" aria-label="Social shopping navigation">
        {items.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-h-12 items-center gap-3 rounded-2xl px-3 text-sm font-black transition",
                active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-secondary-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

function SocialBottomNav() {
  const pathname = usePathname();
  const openCart = useExpoStore((state) => state.openCart);
  const items = [
    { label: "Home", href: "/", icon: Home },
    { label: "Explore", href: "/explore", icon: Compass },
    { label: "Orders", href: "/orders", icon: ReceiptText },
    { label: "Profile", href: "/profile", icon: UserRound }
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card px-2 pb-[env(safe-area-inset-bottom)] text-card-foreground md:hidden" aria-label="Mobile social navigation">
      <div className="grid grid-cols-5 gap-1">
        {items.slice(0, 2).map((item) => <SocialBottomLink key={item.href} item={item} active={pathname === item.href} />)}
        <button type="button" onClick={openCart} className="flex min-h-12 items-center justify-center text-muted-foreground transition active:scale-90 active:text-foreground" aria-label="Open cart">
          <ShoppingBag className="h-5 w-5" />
          <span className="sr-only">Cart</span>
        </button>
        {items.slice(2).map((item) => <SocialBottomLink key={item.href} item={item} active={pathname === item.href || pathname.startsWith(`${item.href}/`)} />)}
      </div>
    </nav>
  );
}

function SocialBottomLink({ item, active }: { item: { label: string; href: string; icon: typeof Home }; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link href={item.href} className={cn("flex min-h-12 items-center justify-center transition active:scale-90", active ? "text-foreground" : "text-muted-foreground")}>
      <Icon className={cn("h-5 w-5", active && item.href === "/" && "fill-current")} />
      <span className="sr-only">{item.label}</span>
    </Link>
  );
}

export function StoriesRow({ stalls, exhibitions }: { stalls: Stall[]; exhibitions: Exhibition[] }) {
  const stories = useMemo(() => {
    const vendorStories = stalls.map((stall) => ({
      id: stall.id,
      href: `/stalls/${stall.id}/store`,
      title: stall.vendorName || stall.assignedVendorName || stall.name,
      image: stall.vendorLogo || stall.bannerImage || stall.image || "/stalls/stall-placeholder.png",
      live: stall.liveStatus === "live" || stall.status === "live",
      type: "vendor"
    }));
    const eventStories = exhibitions
      .filter((exhibition) => exhibition.status !== "draft" && exhibition.status !== "cancelled")
      .map((exhibition) => ({
        id: exhibition.id,
        href: `/exhibition/${exhibition.id}`,
        title: exhibition.title,
        image: exhibition.bannerImage || "/stalls/stall-placeholder.png",
        live: exhibition.status === "live",
        type: "event"
      }));
    const liveStories = vendorStories.filter((story) => story.live);
    const otherStories = shuffleList([...vendorStories.filter((story) => !story.live), ...eventStories]);
    return [...shuffleList(liveStories), ...otherStories].slice(0, 24);
  }, [exhibitions, stalls]);

  if (!stories.length) return null;

  return (
    <section className="border-b border-border bg-card px-2.5 py-2.5 sm:rounded-[28px] sm:border sm:p-3 sm:shadow-soft">
      <div className="flex touch-pan-x snap-x gap-2.5 overflow-x-auto overscroll-x-contain scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {stories.map((story) => (
          <Link key={`${story.type}-${story.id}`} href={story.href} className="w-[58px] shrink-0 snap-start text-center sm:w-[74px]">
            <span className={cn("mx-auto grid h-14 w-14 place-items-center rounded-full p-[2.5px] sm:h-16 sm:w-16 sm:p-[3px]", story.live ? "bg-gradient-to-tr from-primary via-accent to-emerald-400" : "bg-gradient-to-tr from-primary via-accent to-orange-500")}>
              <span className="relative h-full w-full overflow-hidden rounded-full border-2 border-card bg-muted">
                <AppImage src={story.image} alt={story.title} fallbackSrc="/stalls/stall-placeholder.png" className="h-full w-full object-cover" />
              </span>
            </span>
            <span className="mt-1 block truncate text-[9px] font-semibold text-foreground sm:mt-2 sm:text-[11px] sm:font-black">{story.title}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function FeedCard({ post }: { post: SocialPost }) {
  const currentUser = useExpoStore((state) => state.currentUser);
  const setCartItems = useExpoStore((state) => state.setCartItems);
  const openCart = useExpoStore((state) => state.openCart);
  const [viewPost, setViewPost] = useState(post);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState("");
  const product = viewPost.product;
  const discount = product && product.compareAtPrice > product.price ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100) : 0;

  useEffect(() => {
    setViewPost(post);
  }, [post]);

  const requireLogin = (next: string) => {
    window.location.href = `/login?next=${encodeURIComponent(next)}`;
  };

  const addToCart = async () => {
    if (!product) return;
    if (!currentUser) {
      requireLogin(`/product/${product.id}`);
      return;
    }
    setBusy("cart");
    setMessage("");
    try {
      const items = await addCartItem(product.id, 1);
      setCartItems(items);
      openCart();
      setMessage("Added to cart.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not add product.");
    } finally {
      setBusy("");
    }
  };

  const toggleLike = async () => {
    if (!currentUser) {
      requireLogin(viewPost.realPostId ? `/p/${viewPost.realPostId}` : product ? `/product/${product.id}` : `/v/${viewPost.vendorSlug}`);
      return;
    }
    if (!viewPost.realPostId) {
      setViewPost((current) => ({
        ...current,
        likedByMe: !current.likedByMe,
        likeCount: Math.max(0, current.likeCount + (current.likedByMe ? -1 : 1))
      }));
      setMessage("");
      return;
    }
    setBusy("like");
    try {
      const updated = viewPost.likedByMe ? await unlikePost(viewPost.realPostId) : await likePost(viewPost.realPostId);
      setViewPost(postFromVendorPost(updated));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update like.");
    } finally {
      setBusy("");
    }
  };

  const sharePost = async () => {
    const path = viewPost.realPostId ? `/p/${viewPost.realPostId}` : product ? `/product/${product.id}` : `/v/${viewPost.vendorSlug}`;
    const url = typeof window !== "undefined" ? new URL(path, window.location.origin).toString() : path;
    setMessage("");
    try {
      if (navigator.share) {
        await navigator.share({
          title: product?.title || viewPost.vendorName,
          text: viewPost.caption || "See this vendor on Ankita Designs.",
          url
        });
        return;
      }
      await navigator.clipboard.writeText(url);
      setMessage("Link copied.");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setMessage("Could not share this post.");
    }
  };

  const toggleSave = async () => {
    if (!currentUser) {
      requireLogin(viewPost.realPostId ? `/p/${viewPost.realPostId}` : product ? `/product/${product.id}` : "/");
      return;
    }
    setBusy("save");
    try {
      if (viewPost.realPostId) {
        const updated = viewPost.savedByMe ? await unsavePost(viewPost.realPostId) : await savePost(viewPost.realPostId);
        setViewPost(postFromVendorPost(updated));
      } else if (product) {
        await (viewPost.savedByMe ? unsaveProduct(product.id) : saveProduct(product.id));
        setViewPost((current) => ({ ...current, savedByMe: !current.savedByMe }));
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save item.");
    } finally {
      setBusy("");
    }
  };

  const toggleFollow = async () => {
    if (!viewPost.vendorId) return;
    if (!currentUser) {
      requireLogin(`/v/${viewPost.vendorSlug}`);
      return;
    }
    setBusy("follow");
    try {
      await (viewPost.followingVendor ? unfollowVendor(viewPost.vendorId) : followVendor(viewPost.vendorId));
      setViewPost((current) => ({ ...current, followingVendor: !current.followingVendor }));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update follow state.");
    } finally {
      setBusy("");
    }
  };

  return (
    <article className="overflow-hidden border-b border-border bg-card text-card-foreground sm:rounded-[30px] sm:border sm:shadow-soft">
      <div className="flex min-h-12 items-center gap-2.5 px-3 py-2 sm:min-h-14 sm:gap-3 sm:p-4">
        <Link href={`/v/${viewPost.vendorSlug}`} className="grid h-8 w-8 place-items-center overflow-hidden rounded-full border border-border bg-secondary text-[11px] font-black text-secondary-foreground sm:h-11 sm:w-11 sm:text-sm">
          {viewPost.stall?.vendorLogo ? <AppImage src={viewPost.stall.vendorLogo} alt={viewPost.vendorName} className="h-full w-full object-cover" /> : viewPost.vendorName.slice(0, 1).toUpperCase()}
        </Link>
        <div className="min-w-0 flex-1">
          <Link href={`/v/${viewPost.vendorSlug}`} className="block truncate text-[13px] font-black text-foreground hover:text-primary sm:text-sm">{viewPost.vendorName}</Link>
          <p className="truncate text-[11px] font-medium text-muted-foreground sm:text-xs sm:font-semibold">{viewPost.postType || viewPost.stall?.category || "Small business"} · Verified seller</p>
        </div>
        {viewPost.vendorId ? (
          <button type="button" onClick={toggleFollow} disabled={busy === "follow"} className="px-1.5 py-1 text-xs font-black text-primary transition hover:opacity-70 sm:rounded-full sm:border sm:border-border sm:bg-background sm:px-3 sm:text-foreground sm:hover:border-primary sm:hover:text-primary">
            {viewPost.followingVendor ? "Following" : "Follow"}
          </button>
        ) : null}
        {(viewPost.stall?.liveStatus === "live" || viewPost.stall?.status === "live") && viewPost.stallId ? (
          <Link href={`/live/${viewPost.stallId}`} className="rounded-full bg-destructive px-3 py-1 text-xs font-black text-destructive-foreground">Live</Link>
        ) : null}
        <MoreHorizontal className="h-5 w-5 shrink-0 text-foreground sm:hidden" aria-hidden="true" />
      </div>
      <Link href={viewPost.realPostId ? `/p/${viewPost.realPostId}` : product ? `/product/${product.id}` : `/v/${viewPost.vendorSlug}`} className="block bg-muted">
        <div className="relative aspect-square">
          <AppImage src={viewPost.mediaUrl} alt={product?.title || viewPost.caption || viewPost.vendorName} fallbackSrc="/products/product-placeholder.png" className="absolute inset-0 h-full w-full rounded-none object-cover" />
          {discount ? <span className="absolute left-3 top-3 rounded-full bg-primary px-3 py-1 text-xs font-black text-primary-foreground">{discount}% off</span> : null}
        </div>
      </Link>
      <div className="px-3 pb-3 pt-2.5 sm:p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3.5 text-foreground sm:gap-4">
            <button type="button" onClick={toggleLike} disabled={busy === "like"} className={cn("transition active:scale-90 hover:text-primary", viewPost.likedByMe && "text-primary")} aria-label="Like post">
              <Heart className={cn("h-[22px] w-[22px] sm:h-[25px] sm:w-[25px]", viewPost.likedByMe && "fill-current")} />
            </button>
            <Link href={viewPost.realPostId ? `/p/${viewPost.realPostId}` : product ? `/product/${product.id}` : `/v/${viewPost.vendorSlug}`} className="transition active:scale-90 hover:text-primary" aria-label="Open post">
              <MessageCircle className="h-[22px] w-[22px] sm:h-[25px] sm:w-[25px]" />
            </Link>
            <button type="button" onClick={sharePost} className="transition active:scale-90 hover:text-primary" aria-label="Share post">
              <Send className="h-[21px] w-[21px] sm:h-[24px] sm:w-[24px]" />
            </button>
            {viewPost.stallId ? <Link href={`/stalls/${viewPost.stallId}/store`} className="hidden transition hover:text-primary sm:block" aria-label="Open vendor stall"><Store className="h-6 w-6" /></Link> : null}
          </div>
          <button type="button" onClick={toggleSave} disabled={busy === "save"} className={cn("text-foreground transition active:scale-90 hover:text-primary", viewPost.savedByMe && "text-primary")} aria-label="Save post">
            {viewPost.savedByMe ? <BookmarkCheck className="h-[22px] w-[22px] sm:h-[25px] sm:w-[25px]" /> : <Bookmark className="h-[22px] w-[22px] sm:h-[25px] sm:w-[25px]" />}
          </button>
        </div>
        <p className="mt-2 text-xs font-black text-foreground sm:mt-3 sm:text-sm">{viewPost.likeCount ? `${viewPost.likeCount} likes` : "Be the first to like this"}</p>
        <div className="mt-2 flex items-start justify-between gap-4 sm:mt-3">
          <div className="min-w-0">
            <p className="line-clamp-2 text-[13px] leading-5 text-foreground">
              <Link href={`/v/${viewPost.vendorSlug}`} className="mr-1.5 font-black hover:text-primary">{viewPost.vendorName}</Link>
              <span className="font-medium">{viewPost.caption}</span>
            </p>
            {product ? <Link href={`/product/${product.id}`} className="mt-2 block line-clamp-1 text-sm font-black leading-5 text-foreground hover:text-primary sm:text-lg sm:leading-6">{product.title}</Link> : null}
            {product ? (
              <div className="mt-1.5 flex flex-wrap items-center gap-2 sm:mt-2">
                <span className="text-base font-black text-foreground sm:text-xl">{formatPrice(product.price)}</span>
                {discount ? <span className="text-sm font-bold text-muted-foreground line-through">{formatPrice(product.compareAtPrice)}</span> : null}
                <span className="hidden rounded-full bg-secondary px-2.5 py-1 text-[11px] font-black text-secondary-foreground sm:inline-flex">{product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}</span>
              </div>
            ) : null}
          </div>
          {product ? (
            <button type="button" onClick={addToCart} disabled={busy === "cart" || product.stock <= 0} className="shrink-0 rounded-lg bg-primary px-3 py-2 text-xs font-black text-primary-foreground transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-55 sm:rounded-2xl sm:px-4 sm:py-3 sm:text-sm">
              {busy === "cart" ? "Adding" : "Add to cart"}
            </button>
          ) : null}
        </div>
        {message ? <p className="mt-3 rounded-2xl border border-border bg-secondary px-3 py-2 text-xs font-black text-secondary-foreground">{message}</p> : null}
      </div>
    </article>
  );
}

export function ExploreGrid({ posts }: { posts: SocialPost[] }) {
  if (!posts.length) return <SocialEmptyState title="No posts to explore yet" description="Approved vendor posts and products will appear here when available." />;
  return (
    <div className="grid grid-cols-3 gap-1.5 sm:gap-3">
      {posts.map((post, index) => (
        <Link key={post.id} href={post.realPostId ? `/p/${post.realPostId}` : post.product ? `/product/${post.product.id}` : `/v/${post.vendorSlug}`} className={cn("group relative overflow-hidden rounded-2xl bg-muted", index % 7 === 0 && "row-span-2")}>
          <div className={cn("relative", index % 7 === 0 ? "aspect-[3/4]" : "aspect-square")}>
            <AppImage src={post.mediaUrl} alt={post.product?.title || post.caption || post.vendorName} fallbackSrc="/products/product-placeholder.png" className="absolute inset-0 h-full w-full rounded-none object-cover transition group-hover:scale-105" />
            <div className="absolute inset-x-0 bottom-0 bg-black/80 p-2 text-white opacity-0 transition group-hover:opacity-100">
              <p className="line-clamp-1 text-xs font-black">{post.product?.title || post.vendorName}</p>
              {post.product ? <p className="text-[11px] font-bold">{formatPrice(post.product.price)}</p> : null}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

export function SocialSuggestions() {
  const { stalls, exhibitions, isLoading } = useSocialShoppingData(8);
  return (
    <div className="sticky top-[86px] grid gap-4">
      <section className="rounded-[28px] border border-border bg-card p-4 shadow-soft">
        <h2 className="text-sm font-black text-foreground">Live sellers</h2>
        <div className="mt-3 grid gap-3">
          {isLoading ? <p className="text-sm font-semibold text-muted-foreground">Loading suggestions...</p> : null}
          {stalls.slice(0, 4).map((stall) => (
            <Link key={stall.id} href={`/stalls/${stall.id}/store`} className="flex items-center gap-3 rounded-2xl p-2 transition hover:bg-secondary">
              <span className="grid h-11 w-11 place-items-center overflow-hidden rounded-full bg-muted">
                <AppImage src={stall.vendorLogo || stall.bannerImage || stall.image || "/stalls/stall-placeholder.png"} alt={stall.name} fallbackSrc="/stalls/stall-placeholder.png" className="h-full w-full object-cover" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-black text-foreground">{stall.vendorName || stall.assignedVendorName || stall.name}</span>
                <span className="block truncate text-xs font-semibold text-muted-foreground">{stall.category || "Vendor"}</span>
              </span>
              {stall.liveStatus === "live" || stall.status === "live" ? <span className="rounded-full bg-destructive px-2 py-1 text-[10px] font-black text-destructive-foreground">Live</span> : null}
            </Link>
          ))}
        </div>
      </section>
      <section className="rounded-[28px] border border-border bg-card p-4 shadow-soft">
        <h2 className="text-sm font-black text-foreground">Shopping events</h2>
        <div className="mt-3 grid gap-2">
          {exhibitions.slice(0, 3).map((event) => (
            <Link key={event.id} href={`/exhibition/${event.id}`} className="rounded-2xl border border-border bg-background p-3 transition hover:border-primary">
              <p className="line-clamp-1 text-sm font-black text-foreground">{event.title}</p>
              <p className="mt-1 text-xs font-bold capitalize text-muted-foreground">{event.status}</p>
            </Link>
          ))}
          {!isLoading && !exhibitions.length ? <p className="text-sm font-semibold text-muted-foreground">No active events yet.</p> : null}
        </div>
      </section>
    </div>
  );
}

export function SocialEmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-[30px] border border-dashed border-border bg-card p-8 text-center shadow-soft">
      <PackageOpen className="mx-auto h-10 w-10 text-primary" />
      <h2 className="mt-4 text-xl font-black text-foreground">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm font-semibold leading-6 text-muted-foreground">{description}</p>
    </div>
  );
}

export function CategoryRail() {
  return (
    <div className="hidden gap-2 overflow-x-auto py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:flex">
      {categoryLinks.map((category) => (
        <Link key={category} href={`/explore?category=${encodeURIComponent(category)}`} className="shrink-0 rounded-full border border-border bg-card px-3 py-2 text-xs font-black text-muted-foreground transition hover:border-primary hover:bg-secondary hover:text-secondary-foreground">
          {category}
        </Link>
      ))}
    </div>
  );
}

export function PostDetailView({ postId }: { postId: string }) {
  const [post, setPost] = useState<VendorPost | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    getPostById(postId)
      .then((response) => {
        if (active) setPost(response);
      })
      .catch((errorValue) => {
        if (active) setError(errorValue instanceof Error ? errorValue.message : "Post could not be loaded.");
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [postId]);

  if (isLoading) return <SocialShell><SocialEmptyState title="Loading post" description="Fetching this post from the social feed." /></SocialShell>;
  if (error || !post) return <SocialShell><SocialEmptyState title="Post unavailable" description={error || "This post could not be found."} /></SocialShell>;

  return (
    <SocialShell>
      <FeedCard post={postFromVendorPost(post)} />
    </SocialShell>
  );
}

export function ProductDetailView({ productId }: { productId: string }) {
  const currentUser = useExpoStore((state) => state.currentUser);
  const [product, setProduct] = useState<Product | null>(null);
  const [stall, setStall] = useState<Stall | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all([
      getProduct(productId),
      currentUser ? getUserSocial().catch(() => null) : Promise.resolve(null)
    ])
      .then(([productResponse, socialResponse]) => {
        if (!active) return null;
        setSaved(Boolean(socialResponse?.savedProducts.some((item) => item.id === productId)));
        return productResponse;
      })
      .then(async (productResponse) => {
        if (!active || !productResponse) return;
        setProduct(productResponse);
        const [stallResponse, relatedResponse] = await Promise.all([
          getPublicStalls().then((stalls) => stalls.find((item) => item.id === productResponse.stallId) ?? null).catch(() => null),
          getStallProducts(productResponse.stallId).catch(() => [])
        ]);
        if (!active) return;
        setStall(stallResponse);
        setRelated(relatedResponse.filter((item) => item.id !== productResponse.id).slice(0, 6));
      })
      .catch((errorValue) => {
        if (active) setError(errorValue instanceof Error ? errorValue.message : "Product could not be loaded.");
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [currentUser, productId]);

  const toggleProductSave = async () => {
    if (!product) return;
    if (!currentUser) {
      window.location.href = `/login?next=${encodeURIComponent(`/product/${product.id}`)}`;
      return;
    }
    setSaveMessage("");
    try {
      await (saved ? unsaveProduct(product.id) : saveProduct(product.id));
      setSaved(!saved);
      setSaveMessage(saved ? "Removed from saved products." : "Saved product.");
    } catch (errorValue) {
      setSaveMessage(errorValue instanceof Error ? errorValue.message : "Could not update saved product.");
    }
  };

  if (isLoading) return <SocialEmptyState title="Loading product" description="Fetching product details from the marketplace." />;
  if (error || !product) return <SocialEmptyState title="Product unavailable" description={error || "This product could not be found."} />;

  const post = postFromProduct(product, stall ? [stall] : []);
  return (
    <SocialShell>
      <FeedCard post={{ ...post, savedByMe: saved }} />
      <div className="mt-4 rounded-[24px] border border-border bg-card p-4 shadow-soft">
        <button type="button" onClick={toggleProductSave} className="w-full rounded-2xl border border-border bg-secondary px-5 py-3 text-sm font-black text-secondary-foreground transition hover:border-primary">
          {saved ? "Remove saved product" : "Save product"}
        </button>
        {saveMessage ? <p className="mt-3 text-sm font-semibold text-muted-foreground">{saveMessage}</p> : null}
      </div>
      {related.length ? (
        <section className="mt-5 rounded-[30px] border border-border bg-card p-4 shadow-soft">
          <h2 className="text-lg font-black text-foreground">More from this vendor</h2>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {related.map((item) => (
              <Link key={item.id} href={`/product/${item.id}`} className="overflow-hidden rounded-2xl border border-border bg-background">
                <div className="relative aspect-square bg-muted">
                  <AppImage src={item.images[0] || "/products/product-placeholder.png"} alt={item.title} fallbackSrc="/products/product-placeholder.png" className="absolute inset-0 h-full w-full rounded-none object-cover" />
                </div>
                <div className="p-3">
                  <p className="line-clamp-2 text-sm font-black text-foreground">{item.title}</p>
                  <p className="mt-1 text-sm font-black text-primary">{formatPrice(item.price)}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </SocialShell>
  );
}

export function VendorProfileView({ vendorSlug }: { vendorSlug: string }) {
  const [profile, setProfile] = useState<VendorPublicProfile | null>(null);
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [stalls, setStalls] = useState<Stall[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [followMessage, setFollowMessage] = useState("");
  const currentUser = useExpoStore((state) => state.currentUser);
  const currentVendor = useExpoStore((state) => state.currentVendor);
  const fallback = useSocialShoppingData(80);

  useEffect(() => {
    let active = true;
    Promise.all([getVendorBySlug(vendorSlug), getVendorPostsBySlug(vendorSlug), getVendorProductsBySlug(vendorSlug), getVendorStallsBySlug(vendorSlug)])
      .then(([profileResponse, postResponse, productResponse, stallResponse]) => {
        if (!active) return;
        setProfile(profileResponse);
        setPosts(postResponse.map(postFromVendorPost));
        setProducts(productResponse);
        setStalls(stallResponse);
      })
      .catch((errorValue) => {
        if (active) setError(errorValue instanceof Error ? errorValue.message : "Vendor could not be loaded.");
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [vendorSlug]);

  const fallbackPosts = useMemo(() => fallback.posts.filter((post) => post.vendorSlug === vendorSlug), [fallback.posts, vendorSlug]);
  const fallbackStall = useMemo(() => fallback.stalls.find((stall) => slugify(stall.assignedVendorId || stall.vendorId || stall.vendorName || stall.assignedVendorName || stall.name) === vendorSlug), [fallback.stalls, vendorSlug]);
  const visiblePosts = posts.length ? posts : fallbackPosts;
  const vendorName = profile?.displayName || visiblePosts[0]?.vendorName || fallbackStall?.vendorName || fallbackStall?.assignedVendorName || fallbackStall?.name || "Vendor profile";
  const category = profile?.category || fallbackStall?.category || "Verified small business";
  const liveStall = stalls.find((stall) => stall.liveStatus === "live" || stall.status === "live");
  const storeStall = stalls[0] || fallbackStall;
  const isOwnVendorProfile = Boolean(currentVendor?.id && profile?.vendorId === currentVendor.id);

  const toggleFollow = async () => {
    if (!profile) return;
    if (!currentUser) {
      window.location.href = `/login?next=${encodeURIComponent(`/v/${vendorSlug}`)}`;
      return;
    }
    setFollowMessage("");
    try {
      const result = profile.followingByMe ? await unfollowVendor(profile.vendorId) : await followVendor(profile.vendorId);
      setProfile({ ...profile, followingByMe: result.following, followerCount: result.followerCount });
    } catch (errorValue) {
      setFollowMessage(errorValue instanceof Error ? errorValue.message : "Could not update follow state.");
    }
  };

  return (
    <SocialShell>
      <section className="overflow-hidden rounded-[32px] border border-border bg-card shadow-soft">
        {profile?.bannerImageUrl ? (
          <div className="relative aspect-[16/6] bg-muted">
            <AppImage src={profile.bannerImageUrl} alt={vendorName} fallbackSrc="/stalls/stall-placeholder.png" className="absolute inset-0 h-full w-full rounded-none object-cover" />
          </div>
        ) : null}
        <div className="p-4 sm:p-5">
          <div className="grid grid-cols-[86px_minmax(0,1fr)] gap-4 sm:grid-cols-[112px_minmax(0,1fr)]">
            <span className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-full border border-border bg-secondary text-2xl font-black text-secondary-foreground sm:h-24 sm:w-24">
              {profile?.profileImageUrl || fallbackStall?.vendorLogo ? <AppImage src={profile?.profileImageUrl || fallbackStall?.vendorLogo || ""} alt={vendorName} className="h-full w-full object-cover" /> : vendorName.slice(0, 1).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-start justify-between gap-3">
                <div className="min-w-0">
                  <h1 className="truncate text-xl font-black tracking-[-0.03em] text-foreground sm:text-2xl">{vendorName}</h1>
                  <p className="mt-1 truncate text-xs font-black uppercase tracking-[0.12em] text-primary">{category}</p>
                </div>
                {liveStall ? <Link href={`/live/${liveStall.id}`} className="shrink-0 rounded-full bg-destructive px-3 py-1 text-xs font-black text-destructive-foreground">Live</Link> : null}
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <ProfileMetric label="posts" value={profile?.postCount ?? visiblePosts.length} flat />
                <ProfileMetric label="products" value={profile?.productCount ?? products.length} flat />
                <ProfileMetric label="followers" value={profile?.followerCount ?? 0} flat />
              </div>
            </div>
          </div>
          <div className="mt-4">
            <p className="text-sm font-black text-foreground">{vendorName}</p>
            {profile?.bio ? <p className="mt-1 text-sm font-semibold leading-6 text-foreground">{profile.bio}</p> : null}
          </div>
          <div className="mt-5 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            {isOwnVendorProfile ? (
              <>
                <Link href="/vendor" className="rounded-2xl bg-primary px-5 py-3 text-center text-sm font-black text-primary-foreground">Dashboard</Link>
                <Link href="/vendor/profile" className="rounded-2xl border border-border bg-secondary px-5 py-3 text-center text-sm font-black text-secondary-foreground">Edit profile</Link>
                <Link href="/vendor/posts" className="rounded-2xl border border-border bg-background px-5 py-3 text-center text-sm font-black text-foreground">New post</Link>
              </>
            ) : profile ? (
              <button type="button" onClick={toggleFollow} className="rounded-2xl bg-primary px-5 py-3 text-sm font-black text-primary-foreground">{profile.followingByMe ? "Following" : "Follow"}</button>
            ) : null}
            {storeStall ? <Link href={`/stalls/${storeStall.id}/store`} className="rounded-2xl border border-border bg-secondary px-5 py-3 text-center text-sm font-black text-secondary-foreground">Visit store</Link> : null}
            {liveStall ? <Link href={`/live/${liveStall.id}`} className="rounded-2xl border border-border bg-secondary px-5 py-3 text-center text-sm font-black text-secondary-foreground">Watch live</Link> : null}
          </div>
          {followMessage ? <p className="mt-3 text-sm font-semibold text-muted-foreground">{followMessage}</p> : null}
        </div>
      </section>

      <section className="mt-5">
        {isLoading || fallback.isLoading ? <SocialEmptyState title="Loading vendor" description="Fetching this vendor profile from social marketplace data." /> : null}
        {error && !visiblePosts.length ? <SocialEmptyState title="Vendor data unavailable" description={error} /> : null}
        {!isLoading && !fallback.isLoading && !visiblePosts.length ? <SocialEmptyState title="No public posts yet" description="This vendor has no approved posts available." /> : <ExploreGrid posts={visiblePosts} />}
      </section>
    </SocialShell>
  );
}

function ProfileMetric({ label, value, flat = false }: { label: string; value: string | number; flat?: boolean }) {
  if (flat) {
    return (
      <div>
        <p className="text-base font-black text-foreground sm:text-lg">{value}</p>
        <p className="text-[11px] font-bold text-muted-foreground">{label}</p>
      </div>
    );
  }
  return (
    <div className="rounded-2xl border border-border bg-background p-3">
      <p className="text-lg font-black text-foreground">{value}</p>
      <p className="text-[11px] font-bold text-muted-foreground">{label}</p>
    </div>
  );
}

export function CustomerProfileView({ settings = false }: { settings?: boolean }) {
  const currentUser = useExpoStore((state) => state.currentUser);
  const currentVendor = useExpoStore((state) => state.currentVendor);
  const logout = useExpoStore((state) => state.logout);
  const [social, setSocial] = useState<SocialProfile | null>(null);
  const [vendorProfile, setVendorProfile] = useState<VendorPublicProfile | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!currentUser) return;
    if (currentUser.role === "vendor") {
      let active = true;
      getVendorOwnProfile()
        .then((response) => {
          if (active) setVendorProfile(response);
        })
        .catch((errorValue) => {
          if (active) setError(errorValue instanceof Error ? errorValue.message : "Could not load vendor profile.");
        });
      return () => {
        active = false;
      };
    }
    let active = true;
    getUserSocial()
      .then((response) => {
        if (active) setSocial(response);
      })
      .catch((errorValue) => {
        if (active) setError(errorValue instanceof Error ? errorValue.message : "Could not load social profile.");
      });
    return () => {
      active = false;
    };
  }, [currentUser]);

  if (currentUser?.role === "vendor") {
    const vendorName = vendorProfile?.displayName || currentVendor?.displayName || currentVendor?.businessName || currentUser.name;
    const logoutVendor = () => {
      logout();
      window.location.href = "/";
    };
    return (
      <SocialShell>
        <section className="rounded-[32px] border border-border bg-card p-5 shadow-soft">
          <div className="mb-4 flex justify-end">
            <Link href="/profile/settings" className="rounded-full border border-border bg-background px-4 py-2 text-xs font-black text-foreground transition hover:border-primary hover:text-primary">
              Settings
            </Link>
          </div>
          <div className="grid grid-cols-[84px_minmax(0,1fr)] gap-4">
            <span className="grid h-20 w-20 place-items-center overflow-hidden rounded-full border border-border bg-secondary text-2xl font-black text-secondary-foreground">
              {vendorProfile?.profileImageUrl ? <AppImage src={vendorProfile.profileImageUrl} alt={vendorName} className="h-full w-full object-cover" /> : vendorName.slice(0, 1).toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">{settings ? "Vendor settings" : "Vendor profile"}</p>
              <h1 className="mt-1 truncate text-2xl font-black text-foreground">{vendorName}</h1>
              <p className="truncate text-sm font-semibold text-muted-foreground">{currentVendor?.businessCategory || vendorProfile?.category || "Vendor account"}</p>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <ProfileMetric label="posts" value={vendorProfile?.postCount ?? 0} flat />
                <ProfileMetric label="products" value={vendorProfile?.productCount ?? 0} flat />
                <ProfileMetric label="followers" value={vendorProfile?.followerCount ?? 0} flat />
              </div>
            </div>
          </div>
          {vendorProfile?.bio || currentVendor?.businessDescription ? <p className="mt-4 text-sm font-semibold leading-6 text-foreground">{vendorProfile?.bio || currentVendor?.businessDescription}</p> : null}
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Link href="/vendor" className="rounded-2xl bg-primary p-4 text-center text-sm font-black text-primary-foreground">Dashboard</Link>
            <Link href="/vendor/profile" className="rounded-2xl border border-border bg-background p-4 text-center text-sm font-black text-foreground transition hover:border-primary">Edit profile</Link>
            <Link href="/vendor/posts" className="rounded-2xl border border-border bg-background p-4 text-center text-sm font-black text-foreground transition hover:border-primary">Posts</Link>
            <Link href="/vendor/products" className="rounded-2xl border border-border bg-background p-4 text-center text-sm font-black text-foreground transition hover:border-primary">Products</Link>
            <Link href="/vendor/live" className="rounded-2xl border border-border bg-background p-4 text-center text-sm font-black text-foreground transition hover:border-primary">Live console</Link>
            {vendorProfile ? <Link href={`/v/${vendorProfile.slug}`} className="rounded-2xl border border-border bg-background p-4 text-center text-sm font-black text-foreground transition hover:border-primary">Public view</Link> : null}
          </div>
          {!settings ? (
            <button type="button" onClick={logoutVendor} className="mt-4 w-full rounded-2xl border border-destructive bg-destructive px-5 py-3 text-sm font-black text-destructive-foreground">
              Log out
            </button>
          ) : null}
          {settings ? (
            <div className="mt-5 rounded-2xl border border-border bg-background p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-black text-foreground">Appearance</p>
                  <p className="text-sm font-semibold text-muted-foreground">Switch between light and dark mode.</p>
                </div>
                <ThemeToggle />
              </div>
              <button type="button" onClick={logout} className="mt-4 w-full rounded-2xl border border-destructive bg-destructive px-5 py-3 text-sm font-black text-destructive-foreground">
                Log out
              </button>
            </div>
          ) : null}
          {error ? <p className="mt-4 rounded-2xl border border-destructive bg-destructive/10 px-4 py-3 text-sm font-bold text-destructive">{error}</p> : null}
        </section>
      </SocialShell>
    );
  }

  return (
    <SocialShell>
      <section className="rounded-[32px] border border-border bg-card p-5 shadow-soft">
        <div className="flex items-center gap-4">
          <span className="grid h-20 w-20 place-items-center overflow-hidden rounded-full border border-border bg-secondary text-2xl font-black text-secondary-foreground">
            {currentUser?.avatar ? <AppImage src={currentUser.avatar} alt={currentUser.name} className="h-full w-full object-cover" /> : (currentUser?.name || "G").slice(0, 1).toUpperCase()}
          </span>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">{settings ? "Settings" : "Profile"}</p>
            <h1 className="mt-1 text-2xl font-black text-foreground">{currentUser?.name || "Guest customer"}</h1>
            <p className="text-sm font-semibold text-muted-foreground">{currentUser?.email || "Login to manage orders, profile, and saved vendors."}</p>
          </div>
        </div>
        {!currentUser ? (
          <Link href="/login" className="mt-5 inline-flex rounded-2xl bg-primary px-5 py-3 text-sm font-black text-primary-foreground">Login to view profile</Link>
        ) : (
          <>
            <div className="mt-5 grid grid-cols-3 gap-2 text-center">
              <ProfileMetric label="Following" value={social?.counts.followedVendors ?? 0} />
              <ProfileMetric label="Saved posts" value={social?.counts.savedPosts ?? 0} />
              <ProfileMetric label="Saved products" value={social?.counts.savedProducts ?? 0} />
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Link href="/orders" className="rounded-2xl border border-border bg-background p-4 font-black text-foreground transition hover:border-primary">Orders</Link>
              <Link href="/settings" className="rounded-2xl border border-border bg-background p-4 font-black text-foreground transition hover:border-primary">Account settings</Link>
              <Link href="/explore" className="rounded-2xl border border-border bg-background p-4 font-black text-foreground transition hover:border-primary">Explore products</Link>
              <Link href="/exhibitions" className="rounded-2xl border border-border bg-background p-4 font-black text-foreground transition hover:border-primary">Shopping events</Link>
            </div>
          </>
        )}
        {settings ? (
          <div className="mt-5 rounded-2xl border border-border bg-background p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-black text-foreground">Appearance</p>
                <p className="text-sm font-semibold text-muted-foreground">Switch between light and dark mode.</p>
              </div>
              <ThemeToggle />
            </div>
            {currentUser ? (
              <button type="button" onClick={logout} className="mt-4 w-full rounded-2xl border border-destructive bg-destructive px-5 py-3 text-sm font-black text-destructive-foreground">
                Log out
              </button>
            ) : null}
          </div>
        ) : null}
        {error ? <p className="mt-4 rounded-2xl border border-destructive bg-destructive/10 px-4 py-3 text-sm font-bold text-destructive">{error}</p> : null}
      </section>

      {social && !settings ? (
        <section className="mt-5 grid gap-5">
          <ProfileList title="Followed vendors" empty="No followed vendors yet.">
            {social.followedVendors.map((vendor) => (
              <Link key={vendor.id} href={`/v/${vendor.slug}`} className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-3">
                <span className="min-w-0">
                  <span className="block truncate text-sm font-black text-foreground">{vendor.displayName}</span>
                  <span className="block truncate text-xs font-semibold text-muted-foreground">{vendor.category || "Vendor"}</span>
                </span>
                <span className="text-xs font-black text-primary">Open</span>
              </Link>
            ))}
          </ProfileList>
          <ProfileList title="Saved products" empty="No saved products yet.">
            {social.savedProducts.map((product) => (
              <Link key={product.id} href={`/product/${product.id}`} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
                <span className="relative h-14 w-14 overflow-hidden rounded-xl bg-muted">
                  <AppImage src={product.images[0] || "/products/product-placeholder.png"} alt={product.title} className="absolute inset-0 h-full w-full rounded-none object-cover" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-black text-foreground">{product.title}</span>
                  <span className="block text-xs font-black text-primary">{formatPrice(product.price)}</span>
                </span>
              </Link>
            ))}
          </ProfileList>
          <ProfileList title="Saved posts" empty="No saved posts yet.">
            {social.savedPosts.map((post) => (
              <Link key={post.id} href={`/p/${post.id}`} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
                <span className="relative h-14 w-14 overflow-hidden rounded-xl bg-muted">
                  <AppImage
                    src={post.thumbnailUrl || post.mediaUrls[0] || post.product?.images?.[0] || "/products/product-placeholder.png"}
                    alt={post.product?.title || post.caption}
                    className="absolute inset-0 h-full w-full rounded-none object-cover"
                  />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-black text-foreground">{post.vendor?.displayName || "Vendor post"}</span>
                  <span className="block truncate text-xs font-semibold text-muted-foreground">{post.caption}</span>
                </span>
              </Link>
            ))}
          </ProfileList>
        </section>
      ) : null}
    </SocialShell>
  );
}

function ProfileList({ title, empty, children }: { title: string; empty: string; children: React.ReactNode }) {
  const hasChildren = Array.isArray(children) ? children.length > 0 : Boolean(children);
  return (
    <section className="rounded-[28px] border border-border bg-card p-4 shadow-soft">
      <h2 className="text-lg font-black text-foreground">{title}</h2>
      <div className="mt-3 grid gap-2">{hasChildren ? children : <p className="text-sm font-semibold text-muted-foreground">{empty}</p>}</div>
    </section>
  );
}
