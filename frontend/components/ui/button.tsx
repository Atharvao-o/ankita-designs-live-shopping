"use client";

import { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
};

export function buttonStyles(
  variant: "primary" | "secondary" | "ghost" = "primary",
  className?: string
) {
  return cn(
    "inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-semibold transition duration-200 ease-out",
    variant === "primary" &&
      "bg-gradient-to-r from-[var(--coral)] to-[#F58B5B] text-white shadow-lg shadow-[#E95F45]/25 hover:-translate-y-0.5 hover:shadow-[#E95F45]/35",
    variant === "secondary" &&
      "border border-[color:var(--border)] bg-[var(--surface)] text-[var(--text)] shadow-sm hover:border-[color:var(--gold)] hover:bg-[var(--surface-strong)]",
    variant === "ghost" && "text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--text)]",
    className
  );
}

export function Button({ variant = "primary", className, ...props }: Props) {
  return <button {...props} className={buttonStyles(variant, className)} />;
}
