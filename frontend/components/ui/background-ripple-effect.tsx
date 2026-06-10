"use client";

import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

type BackgroundRippleEffectProps = {
  className?: string;
  mode?: "absolute" | "fixed";
  ringClassName?: string;
};

const rings = [0, 1, 2, 3, 4, 5];

export function BackgroundRippleEffect({ className, mode = "absolute", ringClassName }: BackgroundRippleEffectProps) {
  const reduceMotion = useReducedMotion();

  return (
    <div aria-hidden="true" className={cn("pointer-events-none inset-0 overflow-hidden", mode === "fixed" ? "fixed" : "absolute", className)}>
      <div className="absolute left-1/2 top-1/2 h-[44rem] w-[44rem] -translate-x-1/2 -translate-y-1/2 sm:h-[58rem] sm:w-[58rem]">
        {rings.map((ring) => {
          const baseScale = 0.24 + ring * 0.13;
          const baseOpacity = Math.max(0.04, 0.2 - ring * 0.025);

          return (
            <motion.div
              key={ring}
              className={cn(
                "absolute inset-0 rounded-full border border-[rgba(216,183,106,0.20)] shadow-[0_0_42px_rgba(244,111,80,0.12)]",
                ringClassName
              )}
              initial={{ scale: baseScale, opacity: reduceMotion ? baseOpacity : 0 }}
              animate={
                reduceMotion
                  ? { scale: baseScale, opacity: baseOpacity }
                  : { scale: [baseScale, baseScale + 0.18], opacity: [0, baseOpacity, 0] }
              }
              transition={{
                duration: 6.5,
                delay: ring * 0.45,
                repeat: reduceMotion ? 0 : Infinity,
                ease: "easeOut"
              }}
            />
          );
        })}
      </div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(216,183,106,0.12),transparent_42%)]" />
    </div>
  );
}
