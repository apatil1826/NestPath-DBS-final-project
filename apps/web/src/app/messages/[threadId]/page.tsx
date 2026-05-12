"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { BrowserProfile, getOrCreateBrowserProfile } from "@/lib/browser-auth";
import {
  getThreadSnapshot,
  sendThreadMessage,
  ThreadMessage,
  ThreadSnapshot,
} from "@/lib/browser-messaging";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { SignOutButton } from "@/components/auth/sign-out-button";

function formatMessageTimestamp(timestamp: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

export default function MessageThreadPage() {
  const params = useParams<{ threadId: string }>();
  const router = useRouter();
  const threadId = params.threadId;
  const [profile, setProfile] = useState<BrowserProfile | null>(null);
  const [thread, setThread] = useState<ThreadSnapshot | null>(null);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const resolvedProfile = await getOrCreateBrowserProfile();

        if (!resolvedProfile) {
          router.replace("/login");
          return;
        }

        const snapshot = await getThreadSnapshot(threadId, resolvedProfile);

        if (!cancelled) {
          setProfile(resolvedProfile);
          setThread(snapshot);
        }
      } catch (loadError) {
        if (!cancelled) {
          setErrorMessage(
            loadError instanceof Error ? loadError.message : "Unable to load conversation.",
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
  }, [router, threadId]);

  useEffect(() => {
    if (!thread) {
      return;
    }

    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel(`thread:${thread.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `thread_id=eq.${thread.id}`,
        },
        (payload) => {
          const nextMessage = payload.new as {
            id: string;
            body: string;
            created_at: string;
            sender_profile_id: string | null;
          };

          setThread((currentThread) => {
            if (!currentThread) {
              return currentThread;
            }

            if (currentThread.messages.some((message) => message.id === nextMessage.id)) {
              return currentThread;
            }

            const appendedMessage: ThreadMessage = {
              id: nextMessage.id,
              body: nextMessage.body,
              createdAt: nextMessage.created_at,
              senderProfileId: nextMessage.sender_profile_id,
            };

            return {
              ...currentThread,
              lastMessageAt: appendedMessage.createdAt,
              messages: [...currentThread.messages, appendedMessage],
            };
          });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [thread]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [thread?.messages.length]);

  async function handleSendMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!profile || !thread || !draft.trim()) {
      return;
    }

    setSending(true);
    setErrorMessage(null);

    try {
      await sendThreadMessage(thread.id, profile.id, draft);
      setDraft("");
    } catch (sendError) {
      setErrorMessage(
        sendError instanceof Error ? sendError.message : "Unable to send message.",
      );
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-[1200px] items-center justify-center px-4 py-6 sm:px-6 lg:px-10">
        <div className="rounded-[30px] border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-sm text-slate-500">Loading conversation...</p>
        </div>
      </main>
    );
  }

  if (!profile || !thread) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-[1200px] items-center justify-center px-4 py-6 sm:px-6 lg:px-10">
        <div className="rounded-[30px] border border-rose-200 bg-white p-8 shadow-sm">
          <p className="text-sm font-semibold text-rose-800">Unable to load this thread</p>
          <p className="mt-2 text-sm text-rose-700">{errorMessage ?? "Please try again."}</p>
          <Link
            href="/messages"
            className="mt-5 inline-flex rounded-full border border-slate-200 px-5 py-3 text-sm text-slate-700 transition hover:bg-slate-50"
          >
            Back to inbox
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1200px] flex-col gap-8 px-4 py-6 sm:px-6 lg:px-10">
      <header className="flex flex-wrap items-end justify-between gap-4 rounded-[30px] border border-slate-200 bg-white p-8 shadow-sm">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Direct conversation</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
            {thread.counterpart?.fullName ?? thread.title}
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-8 text-slate-500">
            {thread.counterpart?.email ?? "Conversation participant"}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/messages"
            className="rounded-full border border-slate-200 px-5 py-3 text-sm text-slate-700 transition hover:bg-slate-50"
          >
            Inbox
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
        <div className="space-y-3">
          {thread.messages.length ? (
            thread.messages.map((message) => {
              const isOwnMessage = message.senderProfileId === profile.id;

              return (
                <div
                  key={message.id}
                  className={[
                    "flex",
                    isOwnMessage ? "justify-end" : "justify-start",
                  ].join(" ")}
                >
                  <div
                    className={[
                      "max-w-[75%] rounded-[24px] px-4 py-3",
                      isOwnMessage
                        ? "bg-slate-900 text-white"
                        : "border border-slate-200 bg-slate-50 text-slate-900",
                    ].join(" ")}
                  >
                    <p className="text-sm leading-6">{message.body}</p>
                    <p
                      className={[
                        "mt-2 text-xs",
                        isOwnMessage ? "text-slate-300" : "text-slate-500",
                      ].join(" ")}
                    >
                      {formatMessageTimestamp(message.createdAt)}
                    </p>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-6">
              <p className="text-sm font-semibold text-slate-900">No messages yet</p>
              <p className="mt-2 text-sm leading-7 text-slate-500">
                Send the first message to start this conversation.
              </p>
            </div>
          )}
          <div ref={endRef} />
        </div>

        <form onSubmit={handleSendMessage} className="mt-6 flex flex-col gap-3 border-t border-slate-100 pt-6">
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            rows={4}
            className="w-full resize-none rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
            placeholder="Send a message..."
          />
          <div className="flex justify-end">
            <button className="rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-70">
              {sending ? "Sending..." : "Send message"}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}

