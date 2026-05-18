"use client";

import { useParams } from "next/navigation";
import { ThreadPdfReview } from "@/components/pdf/thread-pdf-review";

export default function ThreadPdfReviewPage() {
  const params = useParams<{ threadId: string; fileId: string }>();

  return <ThreadPdfReview threadId={params.threadId} fileId={params.fileId} />;
}
