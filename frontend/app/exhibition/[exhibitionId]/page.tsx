"use client";

import { ExhibitionDetailScreen } from "@/components/marketplace/exhibition-detail-screen";

export default function ExhibitionDetailPage({ params }: { params: { exhibitionId: string } }) {
  return <ExhibitionDetailScreen exhibitionId={params.exhibitionId} />;
}
