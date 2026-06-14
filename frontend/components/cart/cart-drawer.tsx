"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useExpoStore } from "@/lib/cart-store";
import { deleteCartItem, getCart, updateCartItem } from "@/lib/api";
import { formatPrice } from "@/lib/utils";
import { AppImage } from "@/components/ui/app-image";
import { buttonStyles } from "@/components/ui/button";

export function CartDrawer() {
  const router = useRouter();
  const cart = useExpoStore((state) => state.cart);
  const isCartOpen = useExpoStore((state) => state.isCartOpen);
  const currentUser = useExpoStore((state) => state.currentUser);
  const closeCart = useExpoStore((state) => state.closeCart);
  const setCartItems = useExpoStore((state) => state.setCartItems);
  const [cartError, setCartError] = useState("");
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discount = subtotal > 0 ? Math.min(100, subtotal) : 0;
  const total = subtotal - discount + (subtotal > 0 ? 49 : 0);

  useEffect(() => {
    if (!isCartOpen) {
      return;
    }
    if (!currentUser) {
      setCartError("");
      return;
    }
    let active = true;
    getCart()
      .then((items) => {
        if (active) {
          setCartItems(items);
          setCartError("");
        }
      })
      .catch((error) => {
        if (active) {
          setCartError(error instanceof Error ? error.message : "Could not load cart.");
        }
      });
    return () => {
      active = false;
    };
  }, [currentUser, isCartOpen, setCartItems]);

  const handleQuantityChange = async (productId: string, quantity: number) => {
    if (!currentUser) {
      useExpoStore.getState().updateQuantity(productId, quantity);
      return;
    }
    try {
      const items = await updateCartItem(productId, quantity);
      setCartItems(items);
      setCartError("");
    } catch (error) {
      setCartError(error instanceof Error ? error.message : "Could not update cart.");
    }
  };

  const handleRemove = async (productId: string) => {
    if (!currentUser) {
      useExpoStore.getState().removeFromCart(productId);
      return;
    }
    try {
      const items = await deleteCartItem(productId);
      setCartItems(items);
      setCartError("");
    } catch (error) {
      setCartError(error instanceof Error ? error.message : "Could not remove item.");
    }
  };

  return (
    <AnimatePresence>
      {isCartOpen ? (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] bg-[#11111a]"
            onClick={closeCart}
          />
          <motion.aside
            data-tour-id="cart-button"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 260, damping: 28 }}
            className="fixed inset-y-0 right-0 z-[90] flex h-[100dvh] w-full max-w-[min(100vw,520px)] flex-col border-l border-[color:var(--border)] bg-[var(--bg-soft)] p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] text-[var(--text)] shadow-[var(--shadow-strong)] sm:p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--muted)]">Cart</p>
                <h3 className="mt-2 text-2xl font-semibold text-[var(--text)] sm:text-3xl">Ready to checkout</h3>
              </div>
              <button type="button" onClick={closeCart} className="flex h-11 w-11 items-center justify-center rounded-full border border-[color:var(--border)] bg-[var(--surface)] text-[var(--muted)]" aria-label="Close cart">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-6 min-h-0 flex-1 overflow-y-auto pr-1">
              {cartError ? <p className="mb-3 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">{cartError}</p> : null}
              {cart.length ? (
                <div className="grid gap-3">
                  {cart.map((product) => (
                    <div key={product.id} className="rounded-[28px] border border-[color:var(--border)] bg-[var(--surface)] p-4">
                      <div className="flex min-w-0 gap-3 sm:gap-4">
                        <AppImage src={product.image} alt={product.title} fallbackSrc="/products/product-placeholder.png" className="h-20 w-20 shrink-0 rounded-[18px] sm:h-24 sm:w-24 sm:rounded-[20px]" />
                        <div className="min-w-0 flex-1">
                          <div className="flex min-w-0 items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="line-clamp-2 font-semibold text-[var(--text)]">{product.title}</p>
                              <p className="mt-1 truncate text-sm text-[var(--muted)]">{product.vendorName}</p>
                              <p className="mt-2 text-sm font-medium text-[var(--coral)]">{formatPrice(product.price)}</p>
                            </div>
                            <button type="button" onClick={() => void handleRemove(product.id)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[color:var(--border)] bg-[var(--surface-strong)] text-[var(--muted)]" aria-label={`Remove ${product.title} from cart`}>
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                          <div className="mt-3 flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => void handleQuantityChange(product.id, product.quantity - 1)}
                              className="flex h-11 w-11 items-center justify-center rounded-full border border-[color:var(--border)] bg-[var(--surface-strong)] text-[var(--text)]"
                              aria-label={`Decrease quantity for ${product.title}`}
                            >
                              -
                            </button>
                            <span className="min-w-10 text-center text-[var(--text)]">{product.quantity}</span>
                            <button
                              type="button"
                              onClick={() => void handleQuantityChange(product.id, product.quantity + 1)}
                              className="flex h-11 w-11 items-center justify-center rounded-full border border-[color:var(--border)] bg-[var(--surface-strong)] text-[var(--text)]"
                              aria-label={`Increase quantity for ${product.title}`}
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-[28px] border border-dashed border-[color:var(--border)] bg-[var(--surface)] p-6 text-center text-sm text-[var(--muted)]">
                  Your cart is empty. Add products from any vendor stall.
                </div>
              )}
            </div>

            <div className="shrink-0 pt-4">
              <div className="rounded-[28px] border border-[color:var(--border)] bg-[var(--surface)] p-5 text-sm text-[var(--muted)]">
                <div className="flex justify-between gap-4">
                  <span>Subtotal</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                <div className="mt-2 flex justify-between gap-4">
                  <span>LIVE100</span>
                  <span>-{formatPrice(discount)}</span>
                </div>
                <div className="mt-2 flex justify-between gap-4">
                  <span>Delivery</span>
                  <span>{formatPrice(subtotal > 0 ? 49 : 0)}</span>
                </div>
                <div className="mt-3 flex justify-between gap-4 border-t border-[color:var(--border)] pt-3 text-base font-semibold text-[var(--text)]">
                  <span>Total</span>
                  <span>{formatPrice(total)}</span>
                </div>
              </div>

              <button
                data-tour-id="checkout-button"
                type="button"
                disabled={!cart.length}
                onClick={() => {
                  closeCart();
                  router.push("/checkout");
                }}
                className={buttonStyles("primary", "mt-3 flex min-h-12 w-full justify-center disabled:cursor-not-allowed disabled:opacity-55")}
              >
                Checkout
              </button>
            </div>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}
