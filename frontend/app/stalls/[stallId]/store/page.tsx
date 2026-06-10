import { VendorStoreScreen } from "@/components/exhibition/vendor-store-screen";

export default function VendorStorePage({ params }: { params: { stallId: string } }) {
  return <VendorStoreScreen stallId={params.stallId} />;
}
