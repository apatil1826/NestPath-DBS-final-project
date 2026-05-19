"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BrowserProfile, getOrCreateBrowserProfile } from "@/lib/browser-auth";
import { InboxThread, listDirectThreadsForProfile } from "@/lib/browser-messaging";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

function formatRelativeTimestamp(timestamp: string) {
  const date = new Date(timestamp);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export default function MessagesInboxPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<BrowserProfile | null>(null);
  const [threads, setThreads] = useState<InboxThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const resolvedProfile = await getOrCreateBrowserProfile();

        if (!resolvedProfile) {
          router.replace("/login");
          return;
        }

        const resolvedThreads = await listDirectThreadsForProfile(resolvedProfile);

        if (!cancelled) {
          setProfile(resolvedProfile);
          setThreads(resolvedThreads);
        }
      } catch (loadError) {
        if (!cancelled) {
          setErrorMessage(
            loadError instanceof Error ? loadError.message : "Unable to load messages.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    if (!profile) {
      return;
    }

    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel(`messages-inbox:${profile.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        () => {
          void listDirectThreadsForProfile(profile)
            .then((nextThreads) => setThreads(nextThreads))
            .catch(() => {
              // Keep the current list visible if a background refresh fails.
            });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [profile]);

  if (loading) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-[1200px] items-center justify-center px-4 py-6 sm:px-6 lg:px-10">
        <div className="rounded-[30px] border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-sm text-slate-500">Loading conversations...</p>
        </div>
      </main>
    );
  }

  if (!profile) {
    return null;
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1200px] flex-col gap-8 px-4 py-6 sm:px-6 lg:px-10">
      <header className="flex flex-wrap items-end justify-between gap-4 rounded-[30px] border border-slate-200 bg-white p-8 shadow-sm">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Messages</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
            Conversation inbox
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-8 text-slate-500">
            Direct agent-buyer threads live here. Start from the client directory, then return here
            to keep conversations organized.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/agent"
            className="rounded-full border border-slate-200 px-5 py-3 text-sm text-slate-700 transition hover:bg-slate-50"
          >
            Portal home
          </Link>
          {profile.role === "agent" ? (
            <Link
              href="/clients"
              className="rounded-full border border-slate-200 px-5 py-3 text-sm text-slate-700 transition hover:bg-slate-50"
            >
              Client directory
            </Link>
          ) : null}
          <SignOutButton className="rounded-full border border-slate-200 px-5 py-3 text-sm text-slate-700 transition hover:bg-slate-50" />
        </div>
      </header>

      {errorMessage ? (
        <section className="rounded-[24px] border border-rose-200 bg-rose-50 p-5">
          <p className="text-sm font-semibold text-rose-800">Something went wrong</p>
          <p className="mt-2 text-sm leading-6 text-rose-700">{errorMessage}</p>
        </section>
      ) : null}

      <section className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Direct threads</p>
            <h2 className="mt-3 text-2xl font-semibold text-slate-900">
              {threads.length} conversation{threads.length === 1 ? "" : "s"}
            </h2>
          </div>
        </div>

        {threads.length ? (
          <div className="mt-6 grid gap-3">
            {threads.map((thread) => (
              <Link
                key={thread.id}
                href={`/relationships/${thread.relationshipId}`}
                className="rounded-[22px] border border-slate-200 bg-slate-50 p-4 transition hover:border-slate-300 hover:bg-white"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-slate-900">
                        {thread.counterpart?.fullName ?? thread.title}
                      </p>
                      {thread.unreadCount > 0 ? (
                        <span className="rounded-full bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-white">
                          {thread.unreadCount} new
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                      {thread.counterpart?.email ?? "Conversation participant"}
                    </p>
                    <p
                      className={[
                        "mt-3 text-sm leading-6",
                        thread.unreadCount > 0 ? "font-semibold text-slate-900" : "text-slate-600",
                      ].join(" ")}
                    >
                      {thread.lastMessagePreview}
                    </p>
                  </div>

                  <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                    {formatRelativeTimestamp(thread.lastMessageAt)}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="mt-8 rounded-[24px] border border-slate-200 bg-slate-50 p-6">
            <p className="text-sm font-semibold text-slate-900">No conversations yet</p>
            <p className="mt-2 text-sm leading-7 text-slate-500">
              {profile.role === "agent"
                ? "Start a conversation from the buyer directory to open the first direct thread."
                : "Once an agent starts a conversation with you, it will appear here."}
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
