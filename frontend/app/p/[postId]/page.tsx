import { PostDetailView } from "@/components/social/social-shopping";

export default function PostPage({ params }: { params: { postId: string } }) {
  return <PostDetailView postId={params.postId} />;
}
