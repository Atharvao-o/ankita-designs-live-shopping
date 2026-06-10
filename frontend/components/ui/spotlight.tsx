"use client";

import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

type SpotlightProps = {
  className?: string;
  fill?: string;
};

export function Spotlight({ className, fill = "rgba(216, 183, 106, 0.28)" }: SpotlightProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute rounded-full blur-3xl will-change-transform",
        "[mask-image:radial-gradient(circle,black_0%,black_34%,transparent_72%)]",
        className
      )}
      style={{
        background: `radial-gradient(circle, ${fill} 0%, ${fill} 18%, rgba(124, 58, 237, 0.16) 36%, transparent 70%)`
      }}
      initial={reduceMotion ? false : { scale: 0.94, x: 0, y: 0 }}
      animate={reduceMotion ? undefined : { scale: [0.94, 1.04, 0.98], x: [0, 16, 0], y: [0, -10, 0] }}
      transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}
