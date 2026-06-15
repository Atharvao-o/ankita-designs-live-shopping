import { VendorProfileView } from "@/components/social/social-shopping";

export default function VendorPublicProfilePage({ params }: { params: { vendorSlug: string } }) {
  return <VendorProfileView vendorSlug={params.vendorSlug} />;
}
