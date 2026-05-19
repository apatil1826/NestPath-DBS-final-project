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
      <main className="np-page items-center justify-center">
        <div className="np-surface rounded-[28px] p-8">
          <p className="text-sm text-slate-500">Loading conversations...</p>
        </div>
      </main>
    );
  }

  if (!profile) {
    return null;
  }

  return (
    <main className="np-page">
      <header className="np-surface rounded-[28px] px-7 py-6 sm:px-8">
        <div>
          <p className="np-kicker">Messages</p>
          <h1 className="mt-3 text-[2rem] font-semibold tracking-tight text-slate-950 sm:text-[2.55rem]">
            Conversation inbox
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-500">
            Open any relationship to move between the general thread and its property channels in one place.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/agent"
            className="np-button-secondary"
          >
            Portal home
          </Link>
          {profile.role === "agent" ? (
            <Link
              href="/clients"
              className="np-button-secondary"
            >
              Client directory
            </Link>
          ) : null}
          <SignOutButton className="np-button-secondary" />
        </div>
      </header>

      {errorMessage ? (
        <section className="rounded-[20px] border border-rose-200 bg-rose-50/85 p-4">
          <p className="text-sm font-semibold text-rose-800">Something went wrong</p>
          <p className="mt-2 text-sm leading-6 text-rose-700">{errorMessage}</p>
        </section>
      ) : null}

      <section className="np-shell overflow-hidden">
        <div className="grid gap-0 lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="np-pane-muted border-b border-r border-[var(--line)] px-5 py-5 lg:border-b-0">
            <p className="np-kicker">Views</p>
            <h2 className="mt-3 text-[1.35rem] font-semibold tracking-tight text-slate-950">
              Inbox
            </h2>
            <p className="mt-2 text-sm leading-7 text-slate-500">
              Relationships with fresh activity surface here first.
            </p>

            <div className="mt-6 space-y-3">
              <div className="np-card p-4">
                <p className="text-2xl font-semibold tracking-tight text-slate-950">{threads.length}</p>
                <p className="mt-1 text-sm text-slate-500">
                  active conversation{threads.length === 1 ? "" : "s"}
                </p>
              </div>
              <div className="np-card-muted p-4">
                <p className="text-sm font-semibold text-slate-900">How this works</p>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Each relationship has one general thread plus optional property channels underneath it.
                </p>
              </div>
            </div>
          </aside>

          <div className="bg-white/72 px-6 py-5">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="np-kicker">Relationships</p>
            <h2 className="mt-2 text-[1.45rem] font-semibold tracking-tight text-slate-950">
              {threads.length} conversation{threads.length === 1 ? "" : "s"}
            </h2>
          </div>
        </div>

        {threads.length ? (
          <div className="mt-5 grid gap-3">
            {threads.map((thread) => (
              <Link
                key={thread.id}
                href={`/relationships/${thread.relationshipId}`}
                className="np-list-row block px-4 py-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-slate-900">
                        {thread.counterpart?.fullName ?? thread.title}
                      </p>
                      {thread.unreadCount > 0 ? (
                        <span className="np-pill-unread">
                          {thread.unreadCount} new
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                      {thread.counterpart?.email ?? "Conversation participant"}
                    </p>
                    <p
                      className={[
                        "mt-3 line-clamp-2 text-sm leading-6",
                        thread.unreadCount > 0 ? "font-semibold text-slate-900" : "text-slate-600",
                      ].join(" ")}
                    >
                      {thread.lastMessagePreview}
                    </p>
                  </div>

                  <div className="np-pill shrink-0">
                    {formatRelativeTimestamp(thread.lastMessageAt)}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="np-card-muted mt-8 p-6">
            <p className="text-sm font-semibold text-slate-900">No conversations yet</p>
            <p className="mt-2 text-sm leading-7 text-slate-500">
              {profile.role === "agent"
                ? "Start a conversation from the buyer directory to open the first direct thread."
                : "Once an agent starts a conversation with you, it will appear here."}
            </p>
          </div>
        )}
          </div>
        </div>
      </section>
    </main>
  );
}
