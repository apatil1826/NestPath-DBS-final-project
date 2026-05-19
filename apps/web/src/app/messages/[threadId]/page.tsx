"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { getOrCreateBrowserProfile } from "@/lib/browser-auth";
import { getThreadContext } from "@/lib/browser-workspaces";

export default function LegacyMessageThreadRedirectPage() {
  const params = useParams<{ threadId: string }>();
  const router = useRouter();
  const threadId = params.threadId;
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function redirectToWorkspace() {
      try {
        const profile = await getOrCreateBrowserProfile();

        if (!profile) {
          router.replace("/login");
          return;
        }

        const threadContext = await getThreadContext(threadId);
        const nextPath =
          threadContext.kind === "direct"
            ? `/relationships/${threadContext.relationshipId}`
            : `/relationships/${threadContext.relationshipId}?thread=${threadContext.id}`;

        if (!cancelled) {
          router.replace(nextPath);
        }
      } catch (redirectError) {
        if (!cancelled) {
          setErrorMessage(
            redirectError instanceof Error
              ? redirectError.message
              : "Unable to open this conversation.",
          );
        }
      }
    }

    void redirectToWorkspace();

    return () => {
      cancelled = true;
    };
  }, [router, threadId]);

  if (!errorMessage) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-[1200px] items-center justify-center px-4 py-6 sm:px-6 lg:px-10">
        <div className="rounded-[30px] border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-sm text-slate-500">Opening relationship workspace...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1200px] items-center justify-center px-4 py-6 sm:px-6 lg:px-10">
      <div className="rounded-[30px] border border-rose-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold text-rose-800">Unable to open this conversation</p>
        <p className="mt-2 text-sm leading-6 text-rose-700">{errorMessage}</p>
        <Link
          href="/messages"
          className="mt-5 inline-flex rounded-full border border-slate-200 px-5 py-3 text-sm text-slate-700 transition hover:bg-slate-50"
        >
          Back to messages
        </Link>
      </div>
    </main>
  );
}
