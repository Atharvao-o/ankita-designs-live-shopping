"use client";

import { X } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import type { CSSProperties } from "react";
import type { TutorialStep } from "@/lib/tutorial/types";

type Rect = { top: number; left: number; width: number; height: number } | null;

export function TutorialOverlay({
  step,
  rect,
  current,
  total,
  canGoBack,
  onNext,
  onBack,
  onSkip
}: {
  step: TutorialStep;
  rect: Rect;
  current: number;
  total: number;
  canGoBack: boolean;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const padding = 14;
  const top = Math.max(0, (rect?.top ?? 0) - padding);
  const left = Math.max(0, (rect?.left ?? 0) - padding);
  const width = Math.max(0, (rect?.width ?? 0) + padding * 2);
  const height = Math.max(0, (rect?.height ?? 0) + padding * 2);
  const hasTarget = Boolean(rect);
  const tooltipStyle = getTooltipStyle(rect);
  const isFinal = current === total - 1;

  return (
    <div data-tour-ui="true" className="fixed inset-0 z-[9998]" role="dialog" aria-modal="true" aria-label="Ankita ExpoVerse quick guide">
      {hasTarget ? (
        <>
          <Block style={{ left: 0, top: 0, width: "100%", height: top }} />
          <Block style={{ left: 0, top, width: left, height }} />
          <Block style={{ left: left + width, top, width: `calc(100% - ${left + width}px)`, height }} />
          <Block style={{ left: 0, top: top + height, width: "100%", height: `calc(100% - ${top + height}px)` }} />
          <motion.div
            aria-hidden="true"
            className="pointer-events-none fixed rounded-[28px] border-[3px] border-[#F2CC74] bg-transparent shadow-[0_0_0_2px_rgba(255,255,255,0.85),0_0_0_9999px_rgba(2,2,11,0.78),0_0_58px_rgba(242,204,116,0.62)]"
            initial={reduceMotion ? false : { opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1, left, top, width, height }}
            transition={{ duration: 0.24 }}
          />
          <motion.div
            aria-hidden="true"
            className="pointer-events-none fixed h-5 w-5 rounded-full bg-[var(--coral)] shadow-[0_0_0_12px_rgba(244,111,80,0.2)]"
            style={{ left: left + width - 10, top: top - 10 }}
            animate={reduceMotion ? undefined : { scale: [1, 1.22, 1], opacity: [0.72, 1, 0.72] }}
            transition={{ duration: 1.4, repeat: Infinity }}
          />
        </>
      ) : (
        <Block style={{ inset: 0 }} />
      )}

      <motion.section
        className="tutorial-tooltip fixed z-[10002] rounded-[28px] border p-5 shadow-[0_32px_110px_rgba(0,0,0,0.55)] backdrop-blur-xl sm:p-6"
        style={tooltipStyle}
        initial={reduceMotion ? false : { opacity: 0, y: 14, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
      >
        <button
          type="button"
          onClick={onSkip}
          className="tutorial-tooltip-close absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full border transition"
          aria-label="Skip tutorial"
        >
          <X className="h-4 w-4" />
        </button>
        <p className="tutorial-tooltip-kicker text-xs font-black uppercase tracking-[0.2em]">Quick Guide</p>
        <h2 className="mt-3 pr-10 text-2xl font-black tracking-[-0.04em]">{step.title}</h2>
        <p className="tutorial-tooltip-description mt-2 text-sm leading-6">{step.description}</p>
        <p className="tutorial-tooltip-progress mt-4 text-xs font-bold">
          {current + 1} of {total}
          {step.action === "click" ? " - click the highlighted control" : null}
        </p>
        <div className="mt-5 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onBack}
            disabled={!canGoBack}
            className="tutorial-tooltip-back min-h-11 rounded-full border px-4 text-sm font-bold disabled:opacity-40"
          >
            Back
          </button>
          <div className="flex gap-2">
            <button type="button" onClick={onSkip} className="tutorial-tooltip-skip min-h-11 rounded-full px-4 text-sm font-bold">
              Skip
            </button>
            <button
              type="button"
              onClick={onNext}
              className="min-h-11 rounded-full bg-gradient-to-r from-[var(--coral)] to-[#ff986f] px-5 text-sm font-black text-white shadow-[0_18px_44px_rgba(244,111,80,0.28)]"
            >
              {isFinal ? "Got it" : "Next"}
            </button>
          </div>
        </div>
      </motion.section>
    </div>
  );
}

function Block({ style }: { style: CSSProperties }) {
  return <div className="fixed bg-[#02020B]/78" style={style} />;
}

function getTooltipStyle(rect: Rect): CSSProperties {
  const viewportWidth = Math.round(window.visualViewport?.width ?? window.innerWidth);
  const viewportHeight = Math.round(window.visualViewport?.height ?? window.innerHeight);
  if (!rect) {
    return { left: 12, right: 12, top: "50%", transform: "translateY(-50%)", width: "auto", maxWidth: "min(390px, calc(100dvw - 24px))" };
  }

  const width = Math.min(viewportWidth - 24, 390);
  const gap = 18;
  const below = rect.top + rect.height + gap;
  const above = rect.top - gap;
  const left = Math.min(Math.max(12, rect.left + rect.width / 2 - width / 2), viewportWidth - width - 12);

  if (viewportWidth < 640) {
    if (rect.top > viewportHeight * 0.46) {
      return { left: 12, right: 12, top: 14, width: "auto", maxWidth: "calc(100dvw - 24px)" };
    }
    return { left: 12, right: 12, bottom: 14, width: "auto", maxWidth: "calc(100dvw - 24px)" };
  }
  if (below + 280 < viewportHeight) {
    return { left, top: below, width };
  }
  return { left, top: Math.max(16, above - 280), width };
}
