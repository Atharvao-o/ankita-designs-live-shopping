"use client";

import { FormEvent } from "react";
import { Send } from "lucide-react";
import { buttonStyles } from "@/components/ui/button";
import { LiveChatMessage } from "@/lib/types";
import { cn } from "@/lib/utils";

const namePalette = [
  "#8A5A24",
  "#B45309",
  "#047857",
  "#BE123C",
  "#9A3412",
  "#0F766E",
  "#C2410C",
  "rgb(146,64,14)"
];

function colorForName(name: string) {
  let hash = 0;
  for (let index = 0; index < name.length; index += 1) {
    hash = (hash * 31 + name.charCodeAt(index)) % 9973;
  }
  return namePalette[hash % namePalette.length];
}

export function LiveChatPanel({
  open,
  messages,
  message,
  setMessage,
  onSubmit,
  onClose,
  className,
  compact = false,
  disabled = false,
  helperText,
  errorText,
  isSending = false,
  tone = "light"
}: {
  open?: boolean;
  messages: LiveChatMessage[];
  message: string;
  setMessage: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onClose?: () => void;
  className?: string;
  compact?: boolean;
  disabled?: boolean;
  helperText?: string;
  errorText?: string;
  isSending?: boolean;
  tone?: "light" | "dark";
}) {
  const isDrawer = open !== undefined;
  const isDark = tone === "dark";

  return (
    <>
      {isDrawer && open ? (
        <button type="button" aria-label="Close chat" onClick={onClose} className="fixed inset-0 z-40 bg-slate-950/30 xl:hidden" />
      ) : null}
      <section
        data-tour-id="live-chat"
        className={cn(
          "flex min-h-0 flex-col overflow-hidden rounded-[28px]",
          isDark
            ? "border border-white/10 bg-[#11101A] text-white shadow-[0_24px_80px_rgba(0,0,0,0.34)]"
            : "border border-[#E8DDCC] bg-[#FFFDF8] text-[#17120C] shadow-[0_24px_70px_rgba(128,91,44,0.12)]",
          compact ? "p-4" : "p-5",
          isDrawer && !open ? "hidden xl:flex" : "flex",
          isDrawer && open ? "fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-50 max-h-[72dvh] xl:static xl:z-auto xl:max-h-none" : "",
          className
        )}
        aria-label="Live chat"
      >
        <div className={cn("flex items-center justify-between gap-3 border-b", compact ? "pb-2" : "pb-3", isDark ? "border-white/10" : "border-[#E8DDCC]")}>
          <div>
            {compact ? (
              <p className={cn("text-base font-black tracking-[-0.03em]", isDark ? "text-white" : "text-[#17120C]")}>Chat</p>
            ) : (
              <>
                <p className={cn("text-[10px] font-bold uppercase tracking-[0.2em]", isDark ? "text-[#D6AC63]" : "text-[#B88A3D]")}>Conversation</p>
                <h2 className={cn("mt-1 text-lg font-semibold tracking-[-0.04em]", isDark ? "text-white" : "text-[#17120C]")}>Live chat</h2>
                <p className={cn("mt-1 text-xs", isDark ? "text-slate-400" : "text-[#7B7065]")}>
                  {messages.length ? `${messages.length} database message${messages.length === 1 ? "" : "s"}` : "Messages will appear here from the backend"}
                </p>
              </>
            )}
          </div>
          {isDrawer ? (
            <button
              type="button"
              onClick={onClose}
              className={cn(
                "rounded-full border px-3 py-2 text-xs font-semibold xl:hidden",
                isDark ? "border-white/10 text-slate-300 hover:bg-[#1d1d27]" : "border-[#E9D9BE] text-[#7B7065] hover:bg-[#FFF7EB]"
              )}
            >
              Close
            </button>
          ) : null}
        </div>

        <div className={cn("grid min-h-0 flex-1 content-start overflow-y-auto pr-1", compact ? "mt-2 gap-1.5" : "mt-4 gap-3")}>
          {messages.length ? (
            messages.map((entry) => <ChatMessageRow key={entry.id} entry={entry} tone={tone} compact={compact} />)
          ) : (
            <div className={cn("flex min-h-36 flex-col items-center justify-center rounded-[24px] border border-dashed px-5 py-6 text-center text-sm", isDark ? "border-[#D6AC63]/25 bg-card text-slate-400" : "border-[#D7BE86] bg-[#F7F1E8] text-[#7B7065]")}>
              <span className={cn("grid h-11 w-11 place-items-center rounded-2xl text-lg", isDark ? "bg-[#D6AC63]/12 text-[#F4C879]" : "bg-[#B88A3D]/10 text-[#B88A3D]")}>?</span>
              <span className="mt-3 font-semibold">No live chat messages yet</span>
              <span className="mt-1 text-xs">Visitor messages from PostgreSQL will appear here.</span>
            </div>
          )}
        </div>

        <form onSubmit={onSubmit} className={cn("mt-4 flex gap-2 border-t pt-3", isDark ? "border-white/10" : "border-[#E8DDCC]")}>
          <label className="sr-only" htmlFor="live-chat-message">
            Send a live chat message
          </label>
          <input
            id="live-chat-message"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            disabled={disabled || isSending}
            placeholder={disabled ? "Login as customer to chat" : "Send a message"}
            className={cn(
              "min-h-12 min-w-0 flex-1 rounded-full border px-4 py-3 text-sm outline-none transition disabled:cursor-not-allowed",
              isDark
                ? "border-white/10 bg-card text-white placeholder:text-slate-500 focus:border-[#D6AC63] focus:bg-card disabled:bg-[#171720] disabled:text-slate-500"
                : "border-[#E8DDCC] bg-white text-[#17120C] placeholder:text-[#A79A8B] focus:border-[#B88A3D] focus:bg-[#FFFDF8] disabled:bg-[#F4E8D8] disabled:text-[#A79A8B]"
            )}
          />
          <button type="submit" disabled={disabled || isSending} className={buttonStyles("secondary", "min-h-12 rounded-full px-4 py-3 disabled:cursor-not-allowed disabled:opacity-50")} aria-label="Send chat message">
            <Send className="h-4 w-4" />
          </button>
        </form>
        {helperText || errorText ? (
          <p className={cn("mt-2 text-xs", errorText ? "text-[#DC2626]" : isDark ? "text-slate-400" : "text-[#7B7065]")}>{errorText || helperText}</p>
        ) : null}
      </section>
    </>
  );
}

function ChatMessageRow({ entry, tone, compact = false }: { entry: LiveChatMessage; tone: "light" | "dark"; compact?: boolean }) {
  const isVendor = entry.senderRole === "vendor";
  const isSystem = entry.senderRole === "admin";
  const isDark = tone === "dark";
  const timeLabel = new Date(entry.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const initials = entry.senderName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  if (compact) {
    const compactNameColor = isVendor ? "#F7D794" : isSystem ? "#FDBA74" : isDark ? "#93C5FD" : colorForName(entry.senderName);

    return (
      <div className={cn("flex items-start gap-2 rounded-xl px-1.5 py-1.5 text-sm transition", isDark ? "hover:bg-card" : "hover:bg-[#F7F1E8]")}>
        <span
          className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[10px] font-black text-white shadow-sm"
          style={{ background: isVendor ? "#C59A4A" : isSystem ? "#B45309" : colorForName(entry.senderName) }}
          aria-hidden="true"
        >
          {initials || "V"}
        </span>
        <p className="min-w-0 flex-1 break-words leading-5">
          <span className="mr-2 font-black" style={{ color: compactNameColor }}>
            {entry.senderName}
          </span>
          <span className={cn(isDark ? "text-slate-100" : "text-[#17120C]")}>{entry.message}</span>
        </p>
        <span className={cn("shrink-0 pt-0.5 text-[10px] font-semibold", isDark ? "text-slate-500" : "text-[#A79A8B]")}>{timeLabel}</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-[22px] px-4 py-3 text-sm leading-6",
        isDark
          ? isVendor
            ? "border border-[#C59A4A]/35 bg-[#C59A4A]/12"
            : isSystem
              ? "border border-[#E95F45]/30 bg-[#E95F45]/10"
              : "border border-white/10 bg-card"
          : isVendor
            ? "border border-[#C59A4A]/30 bg-[#FFF7EB]"
          : isSystem
              ? "bg-[#FFF7ED]"
              : "border border-[#E8DDCC] bg-white"
      )}
    >
      <div className="mb-1 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <span className="font-bold" style={{ color: isVendor ? "#C59A4A" : isSystem ? "#B45309" : colorForName(entry.senderName) }}>
            {entry.senderName}
          </span>
          <span className={cn("ml-2 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em]", isDark ? "bg-[#1d1d27] text-[#F7D794]" : "bg-[#F7F1E8] text-[#8A5A24]")}>
            {isVendor ? "Vendor" : isSystem ? "Admin" : "Visitor"}
          </span>
        </div>
        <span className={cn("shrink-0 text-[10px] font-semibold", isDark ? "text-slate-500" : "text-[#A79A8B]")}>{timeLabel}</span>
      </div>
      <p className={cn("break-words", isDark ? "text-slate-100" : "text-[#111827]")}>{entry.message}</p>
    </div>
  );
}
