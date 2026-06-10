"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CreditCard, MapPinHouse, ShieldCheck, UserRound } from "lucide-react";
import { useExpoStore } from "@/lib/cart-store";
import { Screen } from "@/components/layout/screen";
import { AppImage } from "@/components/ui/app-image";
import { buttonStyles } from "@/components/ui/button";
import { formatPrice } from "@/lib/utils";
import { createOrder, getCart } from "@/lib/api";

export function CheckoutScreen() {
  const router = useRouter();
  const [paymentMethod, setPaymentMethod] = useState("UPI");
  const [shippingAddress, setShippingAddress] = useState("");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const cart = useExpoStore((state) => state.cart);
  const currentUser = useExpoStore((state) => state.currentUser);
  const clearCart = useExpoStore((state) => state.clearCart);
  const setCartItems = useExpoStore((state) => state.setCartItems);
  const setLastOrder = useExpoStore((state) => state.setLastOrder);
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discount = subtotal > 0 ? Math.min(100, subtotal) : 0;
  const delivery = subtotal > 0 ? 49 : 0;
  const total = subtotal - discount + delivery;

  useEffect(() => {
    if (!currentUser) {
      return;
    }
    let active = true;
    getCart()
      .then((items) => {
        if (active) {
          setCartItems(items);
          setError("");
        }
      })
      .catch((requestError) => {
        if (active) {
          setError(requestError instanceof Error ? requestError.message : "Could not load cart.");
        }
      });
    return () => {
      active = false;
    };
  }, [currentUser, setCartItems]);

  return (
    <Screen>
      <section className="grid min-h-screen w-full gap-4 p-3 pb-[calc(7.5rem+env(safe-area-inset-bottom))] sm:p-4 sm:pb-4 xl:grid-cols-[1fr_0.95fr]">
        <div className="grid gap-4">
          <InfoPanel icon={UserRound} title="Customer" value={currentUser?.name ?? "Login required"} note={currentUser?.email ?? "Sign in before payment"} />
          <div className="screen-panel rounded-[30px] p-4 sm:rounded-[38px] sm:p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-[#8A5A24]/10 p-3 text-[#8A5A24]">
                <MapPinHouse className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-[#8A5A24]">Delivery address</p>
                <p className="text-xl font-semibold tracking-[-0.04em] text-[#17120C] sm:text-2xl">Enter delivery address</p>
              </div>
            </div>
            {!currentUser ? (
              <div className="mt-5 rounded-[24px] border border-[#E9D9BE] bg-[#FFF7EB] p-4">
                <p className="text-sm font-bold text-[#17120C]">Login required at checkout</p>
                <p className="mt-1 text-sm leading-6 text-[#7B7065]">
                  You can browse and add products without login. Please sign in or create an account before placing the order.
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Link href="/login?next=/checkout" className={buttonStyles("primary", "min-h-11 justify-center px-5 py-2")}>
                    Customer Login
                  </Link>
                  <Link href="/register?role=user&next=/checkout" className={buttonStyles("secondary", "min-h-11 justify-center px-5 py-2")}>
                    Register
                  </Link>
                </div>
              </div>
            ) : null}
            <label className="mt-5 block text-sm font-semibold text-[#6B645E]">
              Full address
              <textarea
                value={shippingAddress}
                onChange={(event) => setShippingAddress(event.target.value)}
                placeholder="House / flat, street, area, city, state, pincode"
                className="mt-2 min-h-28 w-full rounded-[24px] border border-[#E9D9BE] bg-white px-4 py-3 text-[#17120C] outline-none focus:border-[#C59A4A]"
              />
            </label>
            <p className="mt-3 text-sm leading-6 text-[#7B7065]">
              We store this address with the order for vendor and admin fulfillment.
            </p>
          </div>
          <div className="screen-panel rounded-[30px] p-4 sm:rounded-[38px] sm:p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-[#8A5A24]/10 p-3 text-[#8A5A24]">
                <CreditCard className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-[#8A5A24]">Payment</p>
                <p className="text-xl font-semibold tracking-[-0.04em] text-[#17120C] sm:text-2xl">Payment integration pending</p>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              {["UPI", "Card", "Net Banking", "COD"].map((method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => setPaymentMethod(method)}
                  className={`min-h-11 rounded-full border px-4 py-2 text-sm font-medium ${
                    paymentMethod === method
                      ? "border-[#C59A4A] bg-[#FFF7EB] text-[#8A5A24]"
                      : "border-[#E9D9BE] bg-white text-[#6B645E]"
                  }`}
                >
                  {method}
                </button>
              ))}
            </div>
            <div className="mt-6 rounded-[28px] border border-[#E9D9BE] bg-[#FFF7EB] p-4">
              <div className="flex items-center gap-3 text-sm text-[#7B7065]">
                <ShieldCheck className="h-4 w-4 text-[#16A34A]" />
                Order will be created with pending payment until a gateway is connected.
              </div>
            </div>
          </div>
        </div>

        <div className="screen-panel flex min-h-[auto] flex-col rounded-[30px] p-4 sm:rounded-[38px] sm:p-6 xl:min-h-[760px]">
          <div className="rounded-[32px] border border-[#E9D9BE] bg-[#FFF7EB] p-4">
            <p className="text-sm font-medium text-[#8A5A24]">Order summary</p>
            {cart.length ? (
              <div className="mt-4 grid gap-3">
                {cart.map((product) => (
                  <div key={product.id} className="flex flex-col gap-4 rounded-[24px] border border-[#E9D9BE] bg-white p-4 sm:flex-row sm:rounded-[28px]">
                    <AppImage src={product.image} alt={product.title} fallbackSrc="/products/product-placeholder.png" className="h-48 w-full rounded-[22px] sm:h-32 sm:w-32 sm:rounded-[24px]" />
                    <div className="flex min-w-0 flex-1 flex-col justify-between">
                      <div className="min-w-0">
                        <p className="line-clamp-2 text-xl font-semibold text-[#17120C]">{product.title}</p>
                        <p className="mt-1 text-sm text-[#7B7065]">Qty {product.quantity}</p>
                        <p className="mt-3 truncate text-sm text-[#7B7065]">Vendor: {product.vendorName}</p>
                      </div>
                      <p className="mt-3 text-lg font-semibold text-[#E95F45] sm:mt-0">
                        {formatPrice(product.price * product.quantity)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-4 rounded-[24px] border border-dashed border-[#D8BE82] bg-white p-6 text-center text-sm text-[#7B7065]">
                Your cart is empty. Add products before checkout.
              </div>
            )}
          </div>

          <div className="mt-5 rounded-[32px] border border-[#E9D9BE] bg-[#FFF7EB] p-5 text-[#6B645E]">
            <div className="flex justify-between text-sm">
              <span>Subtotal</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            <div className="mt-3 flex justify-between text-sm">
              <span>LIVE100</span>
              <span>-{formatPrice(discount)}</span>
            </div>
            <div className="mt-3 flex justify-between text-sm">
              <span>Delivery</span>
              <span>{formatPrice(delivery)}</span>
            </div>
            <div className="mt-4 flex justify-between border-t border-[#E9D9BE] pt-4 text-lg font-semibold text-[#17120C]">
              <span>Total</span>
              <span>{formatPrice(total)}</span>
            </div>
          </div>

          <div className="sticky bottom-[calc(5.75rem+env(safe-area-inset-bottom))] z-[65] mt-5 rounded-[28px] border border-[color:var(--border)] bg-[var(--card)] p-3 shadow-[var(--shadow-soft)] sm:static sm:mt-6 sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none sm:dark:bg-transparent xl:mt-auto">
            <button
              type="button"
              disabled={processing || !cart.length || !currentUser || !shippingAddress.trim()}
              onClick={async () => {
                setProcessing(true);
                setError("");
                try {
                  const order = await createOrder({
                    items: cart,
                    payment_method: paymentMethod,
                    total_amount: total,
                    shipping_address: shippingAddress.trim()
                  });
                  setLastOrder(order);
                  clearCart();
                  router.push("/success");
                } catch (requestError) {
                  setError(requestError instanceof Error ? requestError.message : "Could not create order.");
                } finally {
                  setProcessing(false);
                }
              }}
              className={buttonStyles("primary", "w-full justify-center px-8 py-4 text-base disabled:cursor-not-allowed disabled:opacity-50")}
            >
              {processing ? "Processing..." : paymentMethod === "COD" ? "Place Order" : "Make Payment"}
            </button>
            {!shippingAddress.trim() ? <p className="mt-3 text-sm font-semibold text-[#8A5A24] dark:text-[#F4C879]">Enter a delivery address before placing the order.</p> : null}
            {error ? <p className="mt-3 rounded-2xl bg-[#FEF2F2] px-4 py-3 text-sm font-semibold text-[#DC2626] dark:bg-red-500/10 dark:text-red-200">{error}</p> : null}
          </div>
        </div>
      </section>
    </Screen>
  );
}

function InfoPanel({
  icon: Icon,
  title,
  value,
  note
}: {
  icon: typeof UserRound;
  title: string;
  value: string;
  note: string;
}) {
  return (
    <div className="screen-panel rounded-[30px] p-4 sm:rounded-[38px] sm:p-6">
      <div className="flex items-center gap-3">
        <div className="rounded-2xl bg-[#8A5A24]/10 p-3 text-[#8A5A24]">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-medium text-[#8A5A24]">{title}</p>
          <p className="text-xl font-semibold tracking-[-0.04em] text-[#17120C] sm:text-2xl">{value}</p>
        </div>
      </div>
      <p className="mt-4 text-sm text-[#7B7065]">{note}</p>
    </div>
  );
}
