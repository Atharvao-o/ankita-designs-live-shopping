"use client";

import { LiveKitRoom, RoomAudioRenderer, VideoConference } from "@livekit/components-react";
import { LiveKitConnection } from "@/lib/types";

export function LiveKitStage({
  connection,
  publish,
  className
}: {
  connection: LiveKitConnection;
  publish: boolean;
  className?: string;
}) {
  if (connection.mode !== "real" || !connection.url || !connection.token) {
    return null;
  }

  return (
    <div className={className}>
      <LiveKitRoom
        token={connection.token}
        serverUrl={connection.url}
        connect
        video={publish}
        audio={publish}
        data-lk-theme="default"
        className="h-full w-full overflow-hidden rounded-[24px] bg-slate-950"
      >
        <VideoConference />
        <RoomAudioRenderer />
      </LiveKitRoom>
    </div>
  );
}
