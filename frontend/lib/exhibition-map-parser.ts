import type { Stall } from "@/lib/types";

export type TiledStallZone = Stall & { stallId?: string };

export type MapTemplateDefinition = {
  id: string;
  name: string;
  capacity: number;
};

export function parseExhibitionMap() {
  return {
    stalls: [],
    proximityZones: [],
    deprecatedZones: []
  };
}
