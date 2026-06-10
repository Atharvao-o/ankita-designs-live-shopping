import type { Stall } from "@/lib/types";

export type StallCardPosition = { x: number; y: number; placement?: "above" | "below" | "left" | "right" } | null;

export type TiledStallZone = Stall & {
  stallId?: string;
  label?: string;
  placement?: "above" | "below" | "left" | "right";
  liveStatus?: "live" | "offline" | "starting-soon" | "break" | "busy" | string;
};

type Props = {
  stalls: Stall[];
  mapTemplate?: unknown;
  onActiveZoneChange?: (zone: TiledStallZone | null) => void;
  onFeaturedProximityChange?: (nearFeatured: boolean) => void;
  onActiveZonePositionChange?: (position: StallCardPosition) => void;
};

export function PhaserMap({ stalls, onActiveZoneChange, onFeaturedProximityChange, onActiveZonePositionChange }: Props) {
  onFeaturedProximityChange?.(false);
  onActiveZonePositionChange?.(null);
  onActiveZoneChange?.(stalls[0] ? { ...stalls[0], stallId: stalls[0].id, label: stalls[0].name } : null);
  return null;
}
