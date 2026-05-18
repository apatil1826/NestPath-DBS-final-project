import dynamic from "next/dynamic";

const ThreadPdfReview = dynamic(
  () => import("@/components/pdf/thread-pdf-review").then((module) => module.ThreadPdfReview),
  {
    ssr: false,
    loading: () => (
      <main className="mx-auto flex min-h-screen w-full max-w-[1400px] items-center justify-center px-4 py-6 sm:px-6 lg:px-10">
        <div className="rounded-[30px] border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-sm text-slate-500">Loading PDF review...</p>
        </div>
      </main>
    ),
  },
);

export default async function ThreadPdfReviewPage({
  params,
}: {
  params: Promise<{ threadId: string; fileId: string }>;
}) {
  const resolvedParams = await params;

  return (
    <ThreadPdfReview threadId={resolvedParams.threadId} fileId={resolvedParams.fileId} />
  );
}
