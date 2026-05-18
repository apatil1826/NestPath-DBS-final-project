"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { BrowserProfile, getOrCreateBrowserProfile } from "@/lib/browser-auth";
import {
  getThreadSnapshot,
  markThreadAsRead,
  sendThreadMessage,
  ThreadFileAttachment,
  ThreadMessage,
  ThreadSnapshot,
} from "@/lib/browser-messaging";
import {
  listThreadFiles,
  ThreadFile,
  uploadThreadPdf,
} from "@/lib/browser-thread-files";
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

function formatFileSize(fileSize: number) {
  if (fileSize >= 1024 * 1024) {
    return `${(fileSize / (1024 * 1024)).toFixed(1)} MB`;
  }

  return `${Math.max(1, Math.round(fileSize / 1024))} KB`;
}

function getMessageAttachment(message: ThreadMessage) {
  const candidate =
    typeof message.metadata.file === "object" && message.metadata.file !== null
      ? (message.metadata.file as Partial<ThreadFileAttachment>)
      : null;

  if (
    !candidate?.fileId ||
    !candidate.fileName ||
    !candidate.mimeType ||
    typeof candidate.fileSize !== "number"
  ) {
    return null;
  }

  return candidate as ThreadFileAttachment;
}

export default function MessageThreadPage() {
  const params = useParams<{ threadId: string }>();
  const router = useRouter();
  const threadId = params.threadId;
  const [profile, setProfile] = useState<BrowserProfile | null>(null);
  const [thread, setThread] = useState<ThreadSnapshot | null>(null);
  const [threadFiles, setThreadFiles] = useState<ThreadFile[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const resolvedProfile = await getOrCreateBrowserProfile();

        if (!resolvedProfile) {
          router.replace("/login");
          return;
        }

        const [snapshot, files] = await Promise.all([
          getThreadSnapshot(threadId, resolvedProfile),
          listThreadFiles(threadId),
        ]);

        if (!cancelled) {
          setProfile(resolvedProfile);
          setThread(snapshot);
          setThreadFiles(files);
          void markThreadAsRead(threadId, resolvedProfile.id);
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
            kind: "user" | "system";
            body: string;
            created_at: string;
            sender_profile_id: string | null;
            metadata: Record<string, unknown>;
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
              kind: nextMessage.kind,
              body: nextMessage.body,
              createdAt: nextMessage.created_at,
              senderProfileId: nextMessage.sender_profile_id,
              metadata: nextMessage.metadata ?? {},
            };

            return {
              ...currentThread,
              lastMessageAt: appendedMessage.createdAt,
              messages: [...currentThread.messages, appendedMessage],
            };
          });

          if (profile && nextMessage.sender_profile_id !== profile.id) {
            void markThreadAsRead(thread.id, profile.id);
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "thread_files",
          filter: `thread_id=eq.${thread.id}`,
        },
        (payload) => {
          const nextFile = payload.new as {
            id: string;
            thread_id: string;
            uploaded_by_profile_id: string;
            file_name: string;
            storage_bucket: string;
            storage_path: string;
            mime_type: string;
            file_size: number;
            created_at: string;
          };

          setThreadFiles((currentFiles) => {
            if (currentFiles.some((file) => file.id === nextFile.id)) {
              return currentFiles;
            }

            return [
              {
                id: nextFile.id,
                threadId: nextFile.thread_id,
                uploadedByProfileId: nextFile.uploaded_by_profile_id,
                fileName: nextFile.file_name,
                storageBucket: nextFile.storage_bucket,
                storagePath: nextFile.storage_path,
                mimeType: nextFile.mime_type,
                fileSize: nextFile.file_size,
                createdAt: nextFile.created_at,
              },
              ...currentFiles,
            ];
          });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [profile, thread]);

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

  async function handleUploadPdf(event: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0];
    event.target.value = "";

    if (!profile || !thread || !selectedFile) {
      return;
    }

    setUploadingPdf(true);
    setErrorMessage(null);

    try {
      const uploadedFile = await uploadThreadPdf(thread.id, profile, selectedFile);
      setThreadFiles((currentFiles) => {
        if (currentFiles.some((file) => file.id === uploadedFile.id)) {
          return currentFiles;
        }

        return [uploadedFile, ...currentFiles];
      });
    } catch (uploadError) {
      setErrorMessage(
        uploadError instanceof Error ? uploadError.message : "Unable to upload this PDF.",
      );
    } finally {
      setUploadingPdf(false);
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

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="space-y-3">
            {thread.messages.length ? (
              thread.messages.map((message) => {
                const isOwnMessage = message.senderProfileId === profile.id;
                const attachment = getMessageAttachment(message);

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
                      {attachment ? (
                        <Link
                          href={`/messages/${thread.id}/files/${attachment.fileId}`}
                          className={[
                            "block rounded-[18px] border px-4 py-3 transition",
                            isOwnMessage
                              ? "border-slate-700 bg-slate-800 hover:bg-slate-700"
                              : "border-slate-200 bg-white hover:bg-slate-100",
                          ].join(" ")}
                        >
                          <p className="text-xs uppercase tracking-[0.18em] text-amber-300">
                            PDF review
                          </p>
                          <p className="mt-2 text-sm font-semibold">{attachment.fileName}</p>
                          <p
                            className={[
                              "mt-1 text-xs",
                              isOwnMessage ? "text-slate-300" : "text-slate-500",
                            ].join(" ")}
                          >
                            {formatFileSize(attachment.fileSize)} · Open to highlight and comment
                          </p>
                        </Link>
                      ) : null}
                      <p className={attachment ? "mt-3 text-sm leading-6" : "text-sm leading-6"}>
                        {message.body}
                      </p>
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
                  Send the first message or share a PDF to start this conversation.
                </p>
              </div>
            )}
            <div ref={endRef} />
          </div>

          <form
            onSubmit={handleSendMessage}
            className="mt-6 flex flex-col gap-3 border-t border-slate-100 pt-6"
          >
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              rows={4}
              className="w-full resize-none rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
              placeholder="Send a message..."
            />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf,.pdf"
                  className="hidden"
                  onChange={handleUploadPdf}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                  disabled={uploadingPdf}
                >
                  {uploadingPdf ? "Uploading PDF..." : "Upload PDF"}
                </button>
              </div>
              <button className="rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-70">
                {sending ? "Sending..." : "Send message"}
              </button>
            </div>
          </form>
        </section>

        <aside className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Files gallery</p>
          <h2 className="mt-4 text-2xl font-semibold tracking-tight text-slate-900">
            Shared PDFs
          </h2>
          <p className="mt-3 text-sm leading-7 text-slate-500">
            Upload a PDF here, then open it to highlight sections and leave comments.
          </p>

          <div className="mt-6 space-y-3">
            {threadFiles.length ? (
              threadFiles.map((file) => (
                <Link
                  key={file.id}
                  href={`/messages/${thread.id}/files/${file.id}`}
                  className="block rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4 transition hover:border-slate-300 hover:bg-white"
                >
                  <p className="text-sm font-semibold text-slate-900">{file.fileName}</p>
                  <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-400">
                    {formatFileSize(file.fileSize)}
                  </p>
                  <p className="mt-2 text-sm text-slate-500">
                    Added {formatMessageTimestamp(file.createdAt)}
                  </p>
                </Link>
              ))
            ) : (
              <div className="rounded-[22px] border border-dashed border-slate-200 bg-slate-50 px-4 py-6">
                <p className="text-sm font-semibold text-slate-900">No PDFs yet</p>
                <p className="mt-2 text-sm leading-7 text-slate-500">
                  Use the upload button below the conversation to add the first document.
                </p>
              </div>
            )}
          </div>
        </aside>
      </div>
    </main>
  );
}
