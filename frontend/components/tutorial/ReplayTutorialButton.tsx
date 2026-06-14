"use client";

import { RotateCcw, ToggleLeft, ToggleRight } from "lucide-react";
import { useState } from "react";
import { useTutorial } from "@/hooks/useTutorial";
import { useExpoStore } from "@/lib/cart-store";

export function ReplayTutorialButton({ className = "" }: { className?: string }) {
  const currentUser = useExpoStore((state) => state.currentUser);
  const { startTutorial } = useTutorial();
  if (!currentUser) return null;
  return (
    <button
      type="button"
      onClick={() => startTutorial(currentUser.role, { manual: true })}
      className={className || "inline-flex min-h-10 items-center gap-2 rounded-full border border-[color:var(--border)] bg-[var(--surface)] px-4 text-sm font-bold text-[var(--text)]"}
    >
      <RotateCcw className="h-4 w-4" />
      Replay guide
    </button>
  );
}

export function TutorialAdminControls() {
  const currentUser = useExpoStore((state) => state.currentUser);
  const { enabled, setEnabled, startTutorial, resetDeviceState, forceNextRefresh } = useTutorial();
  const [busy, setBusy] = useState(false);
  if (currentUser?.role !== "admin") return null;

  const toggle = async () => {
    setBusy(true);
    try {
      await setEnabled(!enabled);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div data-tour-id="admin-tutorial-toggle" className="hidden items-center gap-2 rounded-2xl border border-[#E8DDCC] bg-white px-2 py-2 shadow-sm dark:border-white/10 dark:bg-[#1d1d27] xl:flex">
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        className="inline-flex min-h-9 items-center gap-2 rounded-full px-3 text-xs font-black text-[#1B1A17] transition hover:bg-[#F7F1E8] disabled:opacity-50 dark:text-[#FFF8EA] dark:hover:bg-[#1d1d27]"
        title="Enable or disable automatic first-time tutorials"
      >
        {enabled ? <ToggleRight className="h-4 w-4 text-[#22c55e]" /> : <ToggleLeft className="h-4 w-4 text-[#b9b3a5]" />}
        Tutorial {enabled ? "On" : "Off"}
      </button>
      <button
        type="button"
        onClick={() => startTutorial("admin", { manual: true })}
        className="min-h-9 rounded-full px-3 text-xs font-black text-[#B88A3D] transition hover:bg-[#F7F1E8] dark:text-[#D6AC63] dark:hover:bg-[#1d1d27]"
      >
        Replay
      </button>
      <button
        type="button"
        onClick={resetDeviceState}
        className="min-h-9 rounded-full px-3 text-xs font-black text-[#6F675C] transition hover:bg-[#F7F1E8] dark:text-[#CDBCA8] dark:hover:bg-[#1d1d27]"
      >
        Reset device
      </button>
      <button
        type="button"
        onClick={forceNextRefresh}
        className="min-h-9 rounded-full px-3 text-xs font-black text-[#6F675C] transition hover:bg-[#F7F1E8] dark:text-[#CDBCA8] dark:hover:bg-[#1d1d27]"
      >
        Force next
      </button>
    </div>
  );
}
