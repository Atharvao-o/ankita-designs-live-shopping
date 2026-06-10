"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme/theme-provider";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted ? theme === "dark" : true;
  const label = isDark ? "Switch to light mode" : "Switch to dark mode";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={cn(
        "grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[#D9C39D] bg-white text-[#172554] shadow-sm transition hover:border-[#B58118] hover:bg-[#FFF7DE] focus:outline-none focus:ring-2 focus:ring-[#B58118]/35 dark:border-white/15 dark:bg-[#121826] dark:text-[#FFF8EA] dark:shadow-none dark:hover:border-[#F5D878]/60 dark:hover:bg-[#1A2232] dark:focus:ring-[#F5D878]/35",
        className
      )}
      aria-label={label}
      title={label}
    >
      {isDark ? <Sun className="h-5 w-5" aria-hidden="true" /> : <Moon className="h-5 w-5" aria-hidden="true" />}
    </button>
  );
}
