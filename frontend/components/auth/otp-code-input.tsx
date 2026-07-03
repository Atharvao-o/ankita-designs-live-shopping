"use client";

import { cn } from "@/lib/utils";

export function OtpCodeInput({
  value,
  onChange,
  label = "6-digit OTP",
  className
}: {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  className?: string;
}) {
  const digits = value.replace(/\D/g, "").slice(0, 6);

  return (
    <label className={cn("grid gap-2 text-sm font-bold text-[var(--muted)]", className)}>
      {label}
      <div className="relative rounded-2xl border border-[color:var(--border)] bg-[var(--surface)] p-2 transition focus-within:border-[var(--gold)] focus-within:ring-2 focus-within:ring-[color:var(--gold)]/20">
        <input
          value={digits}
          onChange={(event) => onChange(event.target.value.replace(/\D/g, "").slice(0, 6))}
          inputMode="numeric"
          autoComplete="one-time-code"
          aria-label={label}
          className="absolute inset-0 z-10 h-full w-full cursor-text rounded-2xl bg-transparent text-base text-transparent caret-[var(--gold)] outline-none"
        />
        <div className="grid grid-cols-6 gap-1.5 sm:gap-2" aria-hidden="true">
          {Array.from({ length: 6 }).map((_, index) => (
            <span
              key={index}
              className={cn(
                "grid aspect-square min-h-9 min-w-0 place-items-center rounded-xl border border-[color:var(--border)] bg-[var(--surface-strong)] text-base font-black text-[var(--text)] sm:text-xl",
                digits[index] && "border-[color:var(--gold)] bg-[color:var(--gold)]/10"
              )}
            >
              {digits[index] ?? ""}
            </span>
          ))}
        </div>
      </div>
    </label>
  );
}
