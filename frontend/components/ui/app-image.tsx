"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export function AppImage({
  src,
  alt,
  className,
  priority,
  fallbackSrc = "/products/product-placeholder.png"
}: {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
  fallbackSrc?: string;
}) {
  const [currentSrc, setCurrentSrc] = useState(src || fallbackSrc);

  return (
    <div className={cn("relative overflow-hidden rounded-[24px]", className)}>
      <img
        src={currentSrc || fallbackSrc}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        onError={() => {
          if (currentSrc !== fallbackSrc) {
            setCurrentSrc(fallbackSrc);
          }
        }}
        className="absolute inset-0 h-full w-full object-cover"
      />
    </div>
  );
}
