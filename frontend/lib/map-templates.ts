export const DEFAULT_MAP_TEMPLATE_ID = "deprecated-direct-marketplace";

export const MAP_TEMPLATE_OPTIONS = [
  {
    id: DEFAULT_MAP_TEMPLATE_ID,
    name: "Direct Marketplace",
    description: "Map templates are deprecated. Stalls are shown as direct marketplace cards.",
    capacity: 999,
    maxStalls: 999
  }
];

export function getTemplateForStallCount(_stallCount?: number) {
  return MAP_TEMPLATE_OPTIONS[0];
}

export function getMapTemplate(_templateId?: string | null) {
  return MAP_TEMPLATE_OPTIONS[0];
}

export function validateMapTemplateCapacity(_templateId?: string | null, _stallCount?: number) {
  return true;
}
