"use client";

import Link from "next/link";
import { Download, Truck } from "lucide-react";
import { useExpoStore } from "@/lib/cart-store";
import { Screen } from "@/components/layout/screen";
import { AppImage } from "@/components/ui/app-image";
import { buttonStyles } from "@/components/ui/button";
import { formatPrice } from "@/lib/utils";

export function SuccessScreen() {
  const order = useExpoStore((state) => state.lastOrder);

  if (!order) {
    return (
      <Screen>
        <section className="grid min-h-screen place-items-center p-4">
          <div className="screen-panel max-w-xl rounded-[36px] p-6 text-center">
            <h1 className="text-3xl font-semibold text-[#17120C]">No confirmed order found</h1>
            <p className="mt-3 text-[#7B7065]">Complete checkout to see an order confirmation.</p>
            <Link href="/exhibitions" className={buttonStyles("primary", "mt-6 justify-center px-8 py-4")}>
              Continue Shopping
            </Link>
          </div>
        </section>
      </Screen>
    );
  }

  return (
    <Screen>
      <section className="grid min-h-screen w-full gap-4 p-3 sm:p-4 xl:grid-cols-[0.94fr_1.06fr]">
        <div className="screen-panel relative overflow-hidden rounded-[30px] p-4 sm:rounded-[40px] sm:p-6">
          <AppImage src="/assets/order-success.svg" alt="Order success" className="h-72 w-full rounded-[26px] sm:h-[520px] sm:rounded-[34px] xl:h-full xl:min-h-[720px]" priority />
        </div>

        <div className="screen-panel flex min-h-[auto] flex-col rounded-[30px] p-4 sm:rounded-[40px] sm:p-7 xl:min-h-[760px]">
          <div className="inline-flex w-fit rounded-full bg-[#DCFCE7] px-4 py-2 text-sm font-medium text-[#16A34A]">
            Order placed successfully
          </div>

          <h2 className="mt-5 text-3xl font-semibold tracking-[-0.06em] text-[#17120C] sm:text-[clamp(2.3rem,4vw,3.8rem)]">
            {order.items[0]?.title ?? "Your order"} is confirmed.
          </h2>
          <p className="mt-3 text-base leading-7 text-[#7B7065]">
            Your order is confirmed and the vendor has received it.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <InfoCard label="Order ID" value={order.id} />
            <InfoCard label="Vendor" value={order.vendorName} />
            <InfoCard label="Amount" value={formatPrice(order.totalAmount)} />
            <InfoCard label="Delivery" value={order.estimatedDelivery} />
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Link href="/exhibitions" className={buttonStyles("secondary", "justify-center px-6 py-4")}>
              <Truck className="mr-2 h-4 w-4" />
              Continue Shopping
            </Link>
            <button type="button" className={buttonStyles("secondary", "justify-center px-6 py-4")}>
              <Download className="mr-2 h-4 w-4" />
              Download Invoice
            </button>
          </div>

          <div className="mt-6 pt-2 xl:mt-auto xl:pt-6">
            <Link href="/exhibitions" className={buttonStyles("primary", "flex justify-center px-8 py-4 text-base")}>
              Continue Shopping
            </Link>
          </div>
        </div>
      </section>
    </Screen>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[26px] border border-[#E9D9BE] bg-[#FFF7EB] p-5">
      <p className="text-sm text-[#7B7065]">{label}</p>
      <p className="mt-2 text-xl font-semibold text-[#17120C]">{value}</p>
    </div>
  );
}
