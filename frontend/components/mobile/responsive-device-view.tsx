"use client";

import { ReactNode, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type DeviceExperience = "mobile" | "desktop";

const MOBILE_WIDTH_QUERY = "(max-width: 767px)";
const COARSE_POINTER_QUERY = "(pointer: coarse)";
const PHONE_USER_AGENT =
  /Android.*Mobile|iPhone|iPod|BlackBerry|IEMobile|Opera Mini|Windows Phone/i;

function detectDeviceExperience(): DeviceExperience {
  if (typeof window === "undefined") {
    return "desktop";
  }

  const isNarrow = window.matchMedia(MOBILE_WIDTH_QUERY).matches;
  const isCoarsePointer = window.matchMedia(COARSE_POINTER_QUERY).matches;
  const isPhoneUserAgent = PHONE_USER_AGENT.test(window.navigator.userAgent);

  return isNarrow || (isPhoneUserAgent && isCoarsePointer) ? "mobile" : "desktop";
}

export function useDeviceExperience() {
  const [experience, setExperience] = useState<DeviceExperience | null>(null);

  useEffect(() => {
    const widthQuery = window.matchMedia(MOBILE_WIDTH_QUERY);
    const pointerQuery = window.matchMedia(COARSE_POINTER_QUERY);

    const updateExperience = () => {
      setExperience(detectDeviceExperience());
    };

    updateExperience();
    widthQuery.addEventListener("change", updateExperience);
    pointerQuery.addEventListener("change", updateExperience);
    window.addEventListener("resize", updateExperience);

    return () => {
      widthQuery.removeEventListener("change", updateExperience);
      pointerQuery.removeEventListener("change", updateExperience);
      window.removeEventListener("resize", updateExperience);
    };
  }, []);

  return experience;
}

export function ResponsiveDeviceView({
  mobile,
  desktop,
  className,
  mobileClassName,
  desktopClassName
}: {
  mobile?: ReactNode;
  desktop?: ReactNode;
  className?: string;
  mobileClassName?: string;
  desktopClassName?: string;
}) {
  const experience = useDeviceExperience();

  if (experience === "mobile") {
    return mobile ? (
      <div className={cn(className, mobileClassName)} data-device-view="mobile">
        {mobile}
      </div>
    ) : null;
  }

  if (experience === "desktop") {
    return desktop ? (
      <div className={cn(className, desktopClassName)} data-device-view="desktop">
        {desktop}
      </div>
    ) : null;
  }

  // First paint fallback avoids hydration mismatch and still works in browser devtools.
  return (
    <>
      {mobile ? (
        <div className={cn("block md:hidden", className, mobileClassName)} data-device-view="mobile">
          {mobile}
        </div>
      ) : null}
      {desktop ? (
        <div className={cn("hidden md:block", className, desktopClassName)} data-device-view="desktop">
          {desktop}
        </div>
      ) : null}
    </>
  );
}
