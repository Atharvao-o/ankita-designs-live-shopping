"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { LogOut, Menu, MessageCircleMore, ShoppingBag, Store, UserRound, X } from "lucide-react";
import { buttonStyles } from "@/components/ui/button";
import { useExpoStore } from "@/lib/cart-store";

export function MobileLiveActionsMenu({
  vendorName,
  stallName,
  onShowChat,
  onLeave
}: {
  vendorName: string;
  stallName: string;
  onShowChat: () => void;
  onLeave: () => void;
}) {
  const [open, setOpen] = useState(false);
  const currentUser = useExpoStore((state) => state.currentUser);
  const logout = useExpoStore((state) => state.logout);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/8 text-white shadow-sm xl:hidden"
        aria-label="Open live room menu"
        aria-expanded={open}
      >
        <Menu className="h-5 w-5" />
      </button>

      <AnimatePresence>
        {open ? (
          <>
            <motion.button
              type="button"
              aria-label="Close live room menu"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-[90] bg-slate-950/35 backdrop-blur-sm"
            />
            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 260, damping: 30 }}
              className="fixed inset-y-0 right-0 z-[100] flex h-[100dvh] w-[min(92vw,380px)] flex-col overflow-y-auto bg-[#F8F1E6] p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-[-24px_0_70px_rgba(80,52,20,0.24)]"
              role="dialog"
              aria-modal="true"
              aria-label="Live room actions"
            >
              <div className="rounded-[28px] border border-[#E9D9BE] bg-[#FFFDF8] p-4 shadow-luxury">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-[#8A5A24]">Live room</p>
                    <p className="mt-2 text-lg font-semibold text-[#17120C]">{vendorName}</p>
                    <p className="mt-1 text-sm text-[#7B7065]">{stallName}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="rounded-full border border-[#E9D9BE] bg-white p-2 text-[#7B7065]"
                    aria-label="Close menu"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="mt-4 rounded-[28px] border border-[#E9D9BE] bg-[#FFFDF8] p-3 shadow-luxury">
                <p className="px-2 py-2 text-xs uppercase tracking-[0.16em] text-[#8A5A24]">Navigation</p>
                <MenuLink href="/exhibitions" icon={Store} label="Exhibitions" onClick={() => setOpen(false)} />
                <MenuLink href="/cart" icon={ShoppingBag} label="Cart" onClick={() => setOpen(false)} />
                <MenuLink href="/orders" icon={UserRound} label="Orders" onClick={() => setOpen(false)} />
              </div>

              <div className="mt-4 rounded-[28px] border border-[#E9D9BE] bg-[#FFFDF8] p-3 shadow-luxury">
                <p className="px-2 py-2 text-xs uppercase tracking-[0.16em] text-[#8A5A24]">Live actions</p>
                <button
                  type="button"
                  onClick={() => {
                    onShowChat();
                    setOpen(false);
                  }}
                  className="flex min-h-11 w-full items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold text-[#17120C] hover:bg-[#FFF7EB]"
                >
                  <MessageCircleMore className="h-4 w-4" />
                  Show Chat
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onLeave();
                    setOpen(false);
                  }}
                  className="mt-2 flex min-h-11 w-full items-center justify-center rounded-2xl border border-[#FCA5A5] px-4 py-3 text-sm font-semibold text-[#DC2626]"
                >
                  Leave Live
                </button>
              </div>

              <div className="mt-auto rounded-[28px] border border-[#E9D9BE] bg-[#FFFDF8] p-4 shadow-luxury">
                <p className="text-sm font-semibold text-[#17120C]">{currentUser?.name ?? "Guest viewer"}</p>
                <p className="mt-1 text-xs capitalize text-[#7B7065]">{currentUser?.role ?? "user"}</p>
                {currentUser ? (
                  <button
                    type="button"
                    onClick={() => {
                      logout();
                      setOpen(false);
                    }}
                    className={buttonStyles("secondary", "mt-4 w-full justify-center px-4 py-3")}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </button>
                ) : null}
              </div>
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>
    </>
  );
}

function MenuLink({
  href,
  label,
  icon: Icon,
  onClick
}: {
  href: string;
  label: string;
  icon: typeof Store;
  onClick: () => void;
}) {
  return (
    <Link href={href} onClick={onClick} className="flex min-h-11 items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold text-[#17120C] hover:bg-[#FFF7EB]">
      <Icon className="h-4 w-4" />
      {label}
    </Link>
  );
}
