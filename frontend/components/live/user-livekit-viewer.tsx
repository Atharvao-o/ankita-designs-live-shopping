"use client";

import { LiveKitRoom, RoomAudioRenderer, VideoTrack, useTracks } from "@livekit/components-react";
import { Track } from "livekit-client";
import { MonitorPlay } from "lucide-react";
import { LiveKitConnection } from "@/lib/types";

export function UserLiveKitViewer({
  connection,
  className
}: {
  connection: LiveKitConnection;
  className?: string;
}) {
  if (connection.mode !== "real" || !connection.url || !connection.token) {
    return null;
  }

  return (
    <LiveKitRoom
      token={connection.token}
      serverUrl={connection.url}
      connect
      video={false}
      audio={false}
      data-lk-theme="default"
      className={className}
    >
      <VendorOnlyVideo />
      <RoomAudioRenderer />
    </LiveKitRoom>
  );
}

function VendorOnlyVideo() {
  const mediaTracks = useTracks([Track.Source.ScreenShare, Track.Source.Camera], { onlySubscribed: true });
  const screenShareTrack =
    mediaTracks.find((trackRef) => !trackRef.participant.isLocal && trackRef.participant.identity.startsWith("vendor_") && trackRef.source === Track.Source.ScreenShare) ??
    mediaTracks.find((trackRef) => !trackRef.participant.isLocal && trackRef.source === Track.Source.ScreenShare);
  const cameraTrack =
    mediaTracks.find((trackRef) => !trackRef.participant.isLocal && trackRef.participant.identity.startsWith("vendor_") && trackRef.source === Track.Source.Camera) ??
    mediaTracks.find((trackRef) => !trackRef.participant.isLocal && trackRef.source === Track.Source.Camera);
  const vendorTrack =
    screenShareTrack ??
    cameraTrack;
  const isScreenShare = vendorTrack?.source === Track.Source.ScreenShare;

  if (!vendorTrack) {
    return (
      <div className="flex h-full min-h-[260px] w-full items-center justify-center rounded-[24px] bg-slate-950 p-6 text-center text-white">
        <div className="max-w-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#1d1d27]">
            <MonitorPlay className="h-7 w-7 text-white" />
          </div>
          <h3 className="mt-5 text-xl font-semibold">Vendor is preparing the stream</h3>
          <p className="mt-2 text-sm leading-6 text-slate-300">You are connected. Video or screen share will appear as soon as the vendor starts presenting.</p>
        </div>
      </div>
    );
  }

  return (
    <VideoTrack
      trackRef={vendorTrack}
      className={`h-full min-h-[260px] w-full rounded-[24px] bg-slate-950 ${isScreenShare ? "object-contain" : "object-cover"}`}
      playsInline
    />
  );
}
