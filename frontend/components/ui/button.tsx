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
    "app-press inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-black transition duration-200 ease-out focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background disabled:pointer-events-none disabled:opacity-55",
    variant === "primary" &&
      "bg-primary text-primary-foreground shadow-[var(--shadow-card)] hover:-translate-y-0.5 hover:shadow-[var(--shadow-hover)]",
    variant === "secondary" &&
      "border border-[color:var(--border)] bg-[var(--surface)] text-[var(--text)] shadow-sm hover:border-[color:var(--gold)] hover:bg-[var(--surface-strong)]",
    variant === "ghost" && "text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--text)]",
    className
  );
}

export function Button({ variant = "primary", className, ...props }: Props) {
  return <button {...props} className={buttonStyles(variant, className)} />;
}
