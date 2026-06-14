"use client";
import { cn } from "@/lib/utils";
import React, { ReactNode } from "react";

interface AuroraBackgroundProps extends React.HTMLProps<HTMLDivElement> {
  children: ReactNode;
  showRadialGradient?: boolean;
}

export const AuroraBackground = ({
  className,
  children,
  showRadialGradient = true,
  ...props
}: AuroraBackgroundProps) => {
  return (
    <main>
      <div
        className={cn(
          "transition-bg relative flex h-[100vh] flex-col items-center justify-center bg-zinc-50 text-slate-950 dark:bg-zinc-900",
          className,
        )}
        {...props}
      >
        <div
          className="absolute inset-0 bg-[linear-gradient(135deg,var(--background)_0%,var(--bg-soft)_54%,var(--background)_100%)]"
        >
          <div
            className={cn(
              "pointer-events-none absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,var(--primary),var(--accent),var(--coral))]",
              showRadialGradient &&
                "opacity-90",
            )}
          ></div>
        </div>
        {children}
      </div>
    </main>
  );
};
