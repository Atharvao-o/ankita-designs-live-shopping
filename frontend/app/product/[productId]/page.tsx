import { ProductDetailView } from "@/components/social/social-shopping";

export default function ProductPage({ params }: { params: { productId: string } }) {
  return <ProductDetailView productId={params.productId} />;
}
