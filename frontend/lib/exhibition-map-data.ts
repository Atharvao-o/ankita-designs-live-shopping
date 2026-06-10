import type { Stall } from "@/lib/types";

export type ExhibitionStall = Stall & {
  number: string;
  vendorName: string;
  description: string;
  liveStatus: "live" | "offline" | "starting-soon";
  productCount: number;
  proximityRadius: number;
  route: string;
  bannerImage?: string;
  vendorLogo?: string;
  featuredImage?: string;
  socialLinks: {
    instagram?: string;
    website?: string;
    whatsapp?: string;
  };
};
