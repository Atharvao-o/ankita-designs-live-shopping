"use client";

type ViewerPresence = {
  id: string;
  name: string;
  initials?: string;
  avatarUrl?: string;
};

function compactCount(value: number) {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return String(value);
}

function initialsFor(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function ViewerPresenceStrip({
  viewerCount,
  viewers = []
}: {
  viewerCount: number;
  viewers?: ViewerPresence[];
}) {
  const visibleBubbles = viewers.slice(0, 6);
  const remaining = Math.max(0, viewerCount - visibleBubbles.length);

  return (
    <div className="flex min-w-0 items-center gap-3" aria-label={`${compactCount(viewerCount)} viewers watching`}>
      {visibleBubbles.length ? (
        <div className="flex -space-x-2">
          {visibleBubbles.map((viewer) => (
            <span
              key={viewer.id}
              className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white/80 bg-gradient-to-br from-[#C59A4A] to-[#E95F45] text-[10px] font-bold text-white shadow-sm sm:h-8 sm:w-8"
              aria-label={`${viewer.name} is watching`}
            >
              {viewer.initials || initialsFor(viewer.name)}
            </span>
          ))}
          {remaining > 0 ? (
            <span className="flex h-7 min-w-7 items-center justify-center rounded-full border-2 border-white/80 bg-[#17120C] px-2 text-[10px] font-bold text-white shadow-sm sm:h-8">
              +{compactCount(remaining)}
            </span>
          ) : null}
        </div>
      ) : viewerCount > 0 ? (
        <div className="flex -space-x-2">
          <span className="flex h-7 min-w-7 items-center justify-center rounded-full border-2 border-white/80 bg-[#17120C] px-2 text-[10px] font-bold text-white shadow-sm sm:h-8">
            {compactCount(viewerCount)}
          </span>
        </div>
      ) : null}
      <p className="text-xs font-semibold text-[#CDBCA8]">
        {viewerCount > 0 ? `${compactCount(viewerCount)} watching` : "0 watching"}
      </p>
    </div>
  );
}
