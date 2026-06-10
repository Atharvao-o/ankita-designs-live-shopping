import { LiveRoom } from "@/components/live/live-room";

export default function LiveRoomPage({ params }: { params: { stallId: string } }) {
  return <LiveRoom stallId={params.stallId} />;
}
