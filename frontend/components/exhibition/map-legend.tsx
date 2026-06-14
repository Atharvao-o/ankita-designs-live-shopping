import type { ExhibitionStall } from "@/lib/exhibition-map-data";

export function MapLegend({ stalls }: { stalls: ExhibitionStall[] }) {
  const liveCount = stalls.filter((stall) => stall.liveStatus === "live").length;
  const startingSoonCount = stalls.filter((stall) => stall.liveStatus === "starting-soon").length;
  const offlineCount = stalls.filter((stall) => stall.liveStatus === "offline").length;

  return (
    <div className="absolute left-3 top-24 z-20 hidden w-[min(82vw,260px)] rounded-[26px] border border-[#E4C88C]/80 bg-[#FFFDF8]/92 p-4 shadow-[0_18px_60px_rgba(80,52,20,0.14)] sm:left-6 sm:top-24 sm:block">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-[#8A5A24]">Expo overview</p>
      <p className="mt-1 text-sm font-bold text-[#17120C]">{stalls.length} stalls loaded</p>
      <div className="mt-3 grid gap-2 text-xs font-medium text-[#7B7065]">
        <LegendRow color="bg-[#16A34A]" label="Live" value={liveCount} />
        <LegendRow color="bg-[#F59E0B]" label="Starting soon" value={startingSoonCount} />
        <LegendRow color="bg-slate-400" label="Offline" value={offlineCount} />
      </div>
    </div>
  );
}

function LegendRow({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-card px-3 py-2 shadow-[inset_0_0_0_1px_rgba(217,190,131,0.22)]">
      <span className="flex items-center gap-2">
        <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
        {label}
      </span>
      <span className="font-semibold text-[#17120C]">{value}</span>
    </div>
  );
}
