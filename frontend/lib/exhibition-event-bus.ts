import type { TiledStallZone } from "@/lib/exhibition-map-parser";

type ExhibitionMapEvents = {
  "map:zone-change": TiledStallZone | null;
  "map:featured-proximity-change": boolean;
  "map:template-loaded": {
    templateId: string;
    mapUrl: string;
  };
  "map:error": {
    templateId?: string;
    mapUrl?: string;
    message: string;
  };
};

type EventName = keyof ExhibitionMapEvents;
type Listener<T extends EventName> = (payload: ExhibitionMapEvents[T]) => void;

const target = typeof window !== "undefined" ? new EventTarget() : null;

export const exhibitionEventBus = {
  emit<T extends EventName>(eventName: T, payload: ExhibitionMapEvents[T]) {
    target?.dispatchEvent(new CustomEvent(eventName, { detail: payload }));
  },

  on<T extends EventName>(eventName: T, listener: Listener<T>) {
    if (!target) {
      return () => undefined;
    }
    const wrapped = (event: Event) => listener((event as CustomEvent<ExhibitionMapEvents[T]>).detail);
    target.addEventListener(eventName, wrapped);
    return () => target.removeEventListener(eventName, wrapped);
  },
};
