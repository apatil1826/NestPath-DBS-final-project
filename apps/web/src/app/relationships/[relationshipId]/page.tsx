"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { BrowserProfile, getOrCreateBrowserProfile } from "@/lib/browser-auth";
import {
  formatPropertyAddress,
  getRelationshipWorkspace,
  RelationshipThreadSummary,
  RelationshipWorkspace,
  WorkspaceActionItem,
  createPropertyChannel,
} from "@/lib/browser-workspaces";
import { ThreadFile, uploadThreadPdf } from "@/lib/browser-thread-files";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { ThreadFileAttachment, ThreadMessage, sendThreadMessage } from "@/lib/browser-messaging";
import { PropertyStage } from "@/lib/nestpath-types";

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

const propertyStageOptions: PropertyStage[] = [
  "considering",
  "touring",
  "offer",
  "under_contract",
  "closed",
  "paused",
];

export default function RelationshipWorkspacePage() {
  const params = useParams<{ relationshipId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const relationshipId = params.relationshipId;
  const selectedThreadId = searchParams.get("thread");

  const [profile, setProfile] = useState<BrowserProfile | null>(null);
  const [workspace, setWorkspace] = useState<RelationshipWorkspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [showCreateProperty, setShowCreateProperty] = useState(false);
  const [creatingProperty, setCreatingProperty] = useState(false);
  const [updatingPropertyStage, setUpdatingPropertyStage] = useState(false);
  const [draft, setDraft] = useState("");
  const [propertyTitle, setPropertyTitle] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [stage, setStage] = useState<PropertyStage>("considering");
  const [contextTab, setContextTab] = useState<"details" | "files" | "tasks">("details");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const loadWorkspace = useCallback(async (
    viewer: BrowserProfile,
    { showRefreshing = false }: { showRefreshing?: boolean } = {},
  ) => {
    if (showRefreshing) {
      setRefreshing(true);
    }

    try {
      const nextWorkspace = await getRelationshipWorkspace(
        relationshipId,
        viewer,
        selectedThreadId,
      );

      setWorkspace(nextWorkspace);
      setErrorMessage(null);

      if (!selectedThreadId || selectedThreadId !== nextWorkspace.selectedThread.id) {
        const nextPath =
          nextWorkspace.selectedThread.kind === "direct"
            ? `/relationships/${relationshipId}`
            : `/relationships/${relationshipId}?thread=${nextWorkspace.selectedThread.id}`;

        router.replace(nextPath);
      }
    } catch (loadError) {
      setErrorMessage(
        loadError instanceof Error ? loadError.message : "Unable to load this workspace.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [relationshipId, router, selectedThreadId]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const resolvedProfile = await getOrCreateBrowserProfile();

        if (!resolvedProfile) {
          router.replace("/login");
          return;
        }

        if (!cancelled) {
          setProfile(resolvedProfile);
          await loadWorkspace(resolvedProfile);
        }
      } catch (loadError) {
        if (!cancelled) {
          setErrorMessage(
            loadError instanceof Error ? loadError.message : "Unable to load this workspace.",
          );
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [loadWorkspace, router]);

  useEffect(() => {
    if (!profile || !workspace) {
      return;
    }

    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel(`relationship-workspace:${relationshipId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => {
        void loadWorkspace(profile, { showRefreshing: true });
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "thread_files" }, () => {
        void loadWorkspace(profile, { showRefreshing: true });
      })
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "pdf_annotations" },
        () => {
          void loadWorkspace(profile, { showRefreshing: true });
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "pdf_annotations" },
        () => {
          void loadWorkspace(profile, { showRefreshing: true });
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "pdf_annotation_replies" },
        () => {
          void loadWorkspace(profile, { showRefreshing: true });
        },
      )
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "properties" }, () => {
        void loadWorkspace(profile, { showRefreshing: true });
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "properties" }, () => {
        void loadWorkspace(profile, { showRefreshing: true });
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [loadWorkspace, profile, relationshipId, workspace]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [workspace?.selectedMessages.length]);

  const selectedThread = workspace?.selectedThread ?? null;
  const selectedProperty = workspace?.selectedProperty ?? null;
  const activeContextTab = selectedProperty
    ? contextTab
    : contextTab === "details"
      ? "files"
      : contextTab;

  const rightRailPropertyStats = useMemo(() => {
    if (!workspace || !selectedProperty) {
      return null;
    }

    const activePropertyThread =
      workspace.propertyThreads.find((thread) => thread.propertyId === selectedProperty.id) ?? null;

    return {
      fileCount: activePropertyThread?.fileCount ?? 0,
      openCommentCount: activePropertyThread?.openCommentCount ?? 0,
    };
  }, [selectedProperty, workspace]);

  function openThread(thread: RelationshipThreadSummary) {
    const nextPath =
      thread.kind === "direct"
        ? `/relationships/${relationshipId}`
        : `/relationships/${relationshipId}?thread=${thread.id}`;

    router.push(nextPath);
  }

  async function handleSendMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!profile || !selectedThread || !draft.trim()) {
      return;
    }

    setSending(true);
    setErrorMessage(null);

    try {
      await sendThreadMessage(selectedThread.id, profile.id, draft);
      setDraft("");
      await loadWorkspace(profile, { showRefreshing: true });
    } catch (sendError) {
      setErrorMessage(sendError instanceof Error ? sendError.message : "Unable to send message.");
    } finally {
      setSending(false);
    }
  }

  async function handleUploadPdf(event: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0];
    event.target.value = "";

    if (!profile || !selectedThread || !selectedFile) {
      return;
    }

    setUploadingPdf(true);
    setErrorMessage(null);

    try {
      await uploadThreadPdf(selectedThread.id, profile, selectedFile);
      await loadWorkspace(profile, { showRefreshing: true });
    } catch (uploadError) {
      setErrorMessage(
        uploadError instanceof Error ? uploadError.message : "Unable to upload this PDF.",
      );
    } finally {
      setUploadingPdf(false);
    }
  }

  async function handleCreateProperty(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!profile || profile.role !== "agent") {
      return;
    }

    if (!propertyTitle.trim()) {
      setErrorMessage("Property title is required.");
      return;
    }

    setCreatingProperty(true);
    setErrorMessage(null);

    try {
      const threadId = await createPropertyChannel({
        relationshipId,
        title: propertyTitle,
        addressLine1,
        city,
        state,
        postalCode,
        stage,
      });

      setPropertyTitle("");
      setAddressLine1("");
      setCity("");
      setState("");
      setPostalCode("");
      setStage("considering");
      setShowCreateProperty(false);

      router.push(`/relationships/${relationshipId}?thread=${threadId}`);
    } catch (createError) {
      setErrorMessage(
        createError instanceof Error ? createError.message : "Unable to create property channel.",
      );
    } finally {
      setCreatingProperty(false);
    }
  }

  async function handleUpdatePropertyStage(nextStage: PropertyStage) {
    if (!profile || profile.role !== "agent" || !selectedProperty) {
      return;
    }

    setUpdatingPropertyStage(true);
    setErrorMessage(null);

    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase
        .from("properties")
        .update({ stage: nextStage })
        .eq("id", selectedProperty.id)
        .eq("relationship_id", relationshipId);

      if (error) {
        throw error;
      }

      await loadWorkspace(profile, { showRefreshing: true });
    } catch (updateError) {
      setErrorMessage(
        updateError instanceof Error
          ? updateError.message
          : "Unable to update property stage.",
      );
    } finally {
      setUpdatingPropertyStage(false);
    }
  }

  if (loading) {
    return (
      <main className="np-page items-center justify-center">
        <div className="np-surface rounded-[28px] p-8">
          <p className="text-sm text-slate-500">Loading workspace...</p>
        </div>
      </main>
    );
  }

  if (!profile || !workspace || !selectedThread) {
    return (
      <main className="np-page items-center justify-center">
        <div className="np-surface rounded-[28px] border-rose-200 p-8">
          <p className="text-sm font-semibold text-rose-800">Unable to load this workspace</p>
          <p className="mt-2 text-sm text-rose-700">{errorMessage ?? "Please try again."}</p>
          <Link
            href={profile?.role === "agent" ? "/clients" : "/messages"}
            className="np-button-secondary mt-5"
          >
            Back
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="np-page">
      <header className="np-surface rounded-[28px] px-7 py-5 sm:px-8">
        <div>
          <p className="np-kicker">
            {selectedThread.kind === "direct" ? "Buyer relationship" : "Property channel"}
          </p>
          <h1 className="mt-3 text-[2rem] font-semibold tracking-tight text-slate-950 sm:text-[2.5rem]">
            {workspace.counterpart?.fullName ?? "Relationship workspace"}
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-500">
            {selectedProperty
              ? `${selectedProperty.title}${formatPropertyAddress(selectedProperty) ? ` · ${formatPropertyAddress(selectedProperty)}` : ""}`
              : "General conversation and property planning with your counterpart live here."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {refreshing ? (
            <div className="np-pill">
              Refreshing...
            </div>
          ) : null}
          <Link
            href={profile.role === "agent" ? "/clients" : "/messages"}
            className="np-button-secondary"
          >
            {profile.role === "agent" ? "Client directory" : "Messages"}
          </Link>
          <Link
            href="/settings"
            className="np-button-secondary"
          >
            Settings
          </Link>
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
        <div className="grid min-h-[78vh] gap-0 lg:grid-cols-[300px_minmax(0,1fr)_330px]">
          <aside className="np-pane-muted border-b border-r border-[var(--line)] px-5 py-5 lg:border-b-0">
            <p className="np-kicker">Relationship</p>
            <h2 className="mt-3 text-[1.35rem] font-semibold tracking-tight text-slate-950">
            {workspace.counterpart?.fullName ?? "Conversation"}
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">
            {workspace.counterpart?.email ?? "Buyer-agent workspace"}
            </p>

            <div className="mt-6 space-y-2.5">
              {workspace.directThread ? (
                <button
                  type="button"
                  onClick={() => openThread(workspace.directThread!)}
                  className={[
                    "w-full rounded-[18px] px-4 py-3 text-left transition",
                    selectedThread.id === workspace.directThread.id
                      ? "bg-slate-950 text-white shadow-[0_14px_28px_rgba(15,23,42,0.18)]"
                      : "np-list-row text-slate-900",
                  ].join(" ")}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">General conversation</p>
                      <p
                        className={[
                          "mt-1 line-clamp-2 text-sm leading-6",
                          selectedThread.id === workspace.directThread.id
                            ? "text-slate-300"
                            : "text-slate-500",
                        ].join(" ")}
                      >
                        {workspace.directThread.lastMessagePreview}
                      </p>
                    </div>
                    {workspace.directThread.unreadCount > 0 ? (
                      <span className={selectedThread.id === workspace.directThread.id ? "np-pill bg-white text-slate-950" : "np-pill-unread"}>
                        {workspace.directThread.unreadCount} new
                      </span>
                    ) : null}
                  </div>
                </button>
              ) : null}
            </div>

            <div className="mt-7 flex items-center justify-between gap-3">
              <div>
                <p className="np-kicker">Properties</p>
                <p className="mt-1 text-sm text-slate-500">
                  {workspace.propertyThreads.length} channel
                  {workspace.propertyThreads.length === 1 ? "" : "s"}
                </p>
              </div>
              {profile.role === "agent" ? (
                <button
                  type="button"
                  onClick={() => setShowCreateProperty((currentValue) => !currentValue)}
                  className="np-button-secondary !px-3 !py-2 text-xs"
                >
                  {showCreateProperty ? "Close" : "Create"}
                </button>
              ) : null}
            </div>

            {showCreateProperty && profile.role === "agent" ? (
              <form onSubmit={handleCreateProperty} className="np-card mt-4 space-y-3 p-4">
                <input
                  value={propertyTitle}
                  onChange={(event) => setPropertyTitle(event.target.value)}
                  className="np-field"
                  placeholder="Property title or address"
                />
                <input
                  value={addressLine1}
                  onChange={(event) => setAddressLine1(event.target.value)}
                  className="np-field"
                  placeholder="Street address"
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    value={city}
                    onChange={(event) => setCity(event.target.value)}
                    className="np-field"
                    placeholder="City"
                  />
                  <input
                    value={state}
                    onChange={(event) => setState(event.target.value)}
                    className="np-field"
                    placeholder="State"
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
                  <input
                    value={postalCode}
                    onChange={(event) => setPostalCode(event.target.value)}
                    className="np-field"
                    placeholder="Postal code"
                  />
                  <select
                    value={stage}
                    onChange={(event) => setStage(event.target.value as PropertyStage)}
                    className="np-select"
                  >
                    {propertyStageOptions.map((option) => (
                      <option key={option} value={option}>
                        {option.replaceAll("_", " ")}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={creatingProperty}
                  className="np-button-primary w-full disabled:opacity-60"
                >
                  {creatingProperty ? "Creating..." : "Create property channel"}
                </button>
              </form>
            ) : null}

            <div className="mt-4 space-y-2.5">
              {workspace.propertyThreads.length ? (
                workspace.propertyThreads.map((thread) => (
                  <button
                    key={thread.id}
                    type="button"
                    onClick={() => openThread(thread)}
                    className={[
                      "w-full rounded-[18px] px-4 py-3 text-left transition",
                      selectedThread.id === thread.id
                        ? "bg-slate-950 text-white shadow-[0_14px_28px_rgba(15,23,42,0.18)]"
                        : "np-list-row text-slate-900",
                    ].join(" ")}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-semibold">
                            {thread.property?.title ?? thread.title}
                          </p>
                          {thread.unreadCount > 0 ? (
                            <span className={selectedThread.id === thread.id ? "np-pill bg-white text-slate-950" : "np-pill-unread"}>
                              {thread.unreadCount}
                            </span>
                          ) : null}
                        </div>
                        <p
                          className={[
                            "mt-1 text-[11px] font-semibold uppercase tracking-[0.16em]",
                            selectedThread.id === thread.id ? "text-slate-300" : "text-slate-400",
                          ].join(" ")}
                        >
                          {(thread.property?.stage ?? "considering").replaceAll("_", " ")}
                        </p>
                        {thread.property ? (
                          <p
                            className={[
                              "mt-2 line-clamp-1 text-sm",
                              selectedThread.id === thread.id ? "text-slate-200" : "text-slate-500",
                            ].join(" ")}
                          >
                            {formatPropertyAddress(thread.property)}
                          </p>
                        ) : null}
                        <p
                          className={[
                            "mt-2 line-clamp-2 text-sm leading-6",
                            selectedThread.id === thread.id ? "text-slate-100" : "text-slate-600",
                          ].join(" ")}
                        >
                          {thread.lastMessagePreview}
                        </p>
                      </div>
                      <div className="text-right">
                        <p
                          className={[
                            "text-[11px] font-medium",
                            selectedThread.id === thread.id ? "text-slate-300" : "text-slate-400",
                          ].join(" ")}
                        >
                          {thread.fileCount} files
                        </p>
                        <p
                          className={[
                            "mt-1 text-[11px] font-medium",
                            selectedThread.id === thread.id ? "text-slate-300" : "text-slate-400",
                          ].join(" ")}
                        >
                          {thread.openCommentCount} open
                        </p>
                      </div>
                    </div>
                  </button>
                ))
              ) : (
                <div className="np-card-muted px-4 py-5">
                  <p className="text-sm font-semibold text-slate-900">No property channels yet</p>
                  <p className="mt-2 text-sm leading-7 text-slate-500">
                    {profile.role === "agent"
                      ? "Create the first property to give this buyer a focused collaboration channel."
                      : "Once your agent adds a property, it will appear here."}
                  </p>
                </div>
              )}
            </div>
          </aside>

          <section className="bg-white/72 px-6 py-5">
            <div className="border-b border-[var(--line)] pb-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="np-kicker">
                {selectedThread.kind === "direct" ? "Conversation" : "Property channel"}
                  </p>
                  <h2 className="mt-2 text-[1.65rem] font-semibold tracking-tight text-slate-950">
                {selectedThread.kind === "direct"
                  ? "General conversation"
                  : selectedThread.property?.title ?? selectedThread.title}
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-500">
                {selectedThread.kind === "direct"
                  ? "Use this channel for broad updates, coordination, and planning across the relationship."
                  : formatPropertyAddress(selectedThread.property)}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {selectedThread.kind === "direct" ? (
                    <span className="np-pill">Conversation</span>
                  ) : (
                    <>
                      <span className="np-pill">{selectedThread.fileCount} files</span>
                      <span className="np-pill-accent">{selectedThread.openCommentCount} open comments</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-5 space-y-3">
            {workspace.selectedMessages.length ? (
              workspace.selectedMessages.map((message) => {
                const isOwnMessage = message.senderProfileId === profile.id;
                const attachment = getMessageAttachment(message);

                return (
                  <div
                    key={message.id}
                    className={["flex", isOwnMessage ? "justify-end" : "justify-start"].join(" ")}
                  >
                    <div
                      className={[
                        "max-w-[76%] rounded-[20px] px-4 py-3.5 shadow-[0_10px_20px_rgba(15,23,42,0.04)]",
                        isOwnMessage
                          ? "bg-slate-950 text-white"
                          : "border border-[var(--line)] bg-white/90 text-slate-900",
                      ].join(" ")}
                    >
                      {attachment ? (
                        <Link
                          href={`/messages/${selectedThread.id}/files/${attachment.fileId}?relationshipId=${relationshipId}&thread=${selectedThread.id}`}
                          className={[
                            "block rounded-[16px] border px-4 py-3 transition",
                            isOwnMessage
                              ? "border-slate-700 bg-slate-900/70 hover:bg-slate-800"
                              : "border-[var(--line)] bg-slate-50/90 hover:bg-white",
                          ].join(" ")}
                        >
                          <p className={["text-[11px] font-semibold uppercase tracking-[0.18em]", isOwnMessage ? "text-amber-300" : "text-[var(--accent)]"].join(" ")}>
                            PDF review
                          </p>
                          <p className="mt-2 text-sm font-semibold">{attachment.fileName}</p>
                          <p
                            className={[
                              "mt-1 text-xs",
                              isOwnMessage ? "text-slate-300" : "text-slate-500",
                            ].join(" ")}
                          >
                            {formatFileSize(attachment.fileSize)} · Open to review
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
              <div className="np-card-muted p-6">
                <p className="text-sm font-semibold text-slate-900">No messages yet</p>
                <p className="mt-2 text-sm leading-7 text-slate-500">
                  Send the first message or share a PDF to start this channel.
                </p>
              </div>
            )}
            <div ref={endRef} />
            </div>

            <form onSubmit={handleSendMessage} className="mt-5 border-t border-[var(--line)] pt-5">
              <div className="np-card overflow-hidden p-3">
                <textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  rows={4}
                  className="min-h-[106px] w-full resize-none border-0 bg-transparent px-2 py-2 text-sm leading-7 text-slate-900 outline-none placeholder:text-slate-400"
                  placeholder={
                    selectedThread.kind === "direct"
                      ? "Send a general update, timeline note, or next step..."
                      : "Message about this property, attach a disclosure, or ask for feedback..."
                  }
                />
                <div className="mt-2 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] px-1 pt-3">
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
                      className="np-button-secondary disabled:opacity-60"
                      disabled={uploadingPdf}
                    >
                      {uploadingPdf ? "Uploading PDF..." : "Upload PDF"}
                    </button>
                  </div>
                  <button className="np-button-primary disabled:opacity-70">
                    {sending ? "Sending..." : "Send message"}
                  </button>
                </div>
              </div>
            </form>
          </section>

          <aside className="np-pane-warm border-l border-t border-[var(--line)] px-5 py-5 lg:border-t-0">
            <p className="np-kicker">
            {selectedProperty ? "Property details" : "Workspace details"}
            </p>
            <h2 className="mt-3 text-[1.35rem] font-semibold tracking-tight text-slate-950">
            {selectedProperty ? selectedProperty.title : "General relationship"}
            </h2>
            <p className="mt-2 text-sm leading-7 text-slate-500">
            {selectedProperty
              ? formatPropertyAddress(selectedProperty) || "Property details live here."
              : "This is the general buyer-agent channel for updates across every property."}
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-2 rounded-full bg-white/65 p-1">
              <button
                type="button"
                onClick={() => setContextTab("details")}
                className={["np-tab", contextTab === "details" ? "np-tab-active" : ""].join(" ")}
              >
                Details
              </button>
              <button
                type="button"
                onClick={() => setContextTab("files")}
                className={["np-tab", contextTab === "files" ? "np-tab-active" : ""].join(" ")}
              >
                Files
              </button>
              <button
                type="button"
                onClick={() => setContextTab("tasks")}
                className={["np-tab", contextTab === "tasks" ? "np-tab-active" : ""].join(" ")}
              >
                Action items
              </button>
            </div>

            {activeContextTab === "details" ? (
              selectedProperty ? (
                <div className="mt-5 space-y-4">
                  <div className="np-card p-4">
                    <p className="np-kicker">Stage</p>
                    {profile.role === "agent" ? (
                      <div className="mt-3 flex items-center gap-3">
                        <select
                          value={selectedProperty.stage}
                          disabled={updatingPropertyStage}
                          onChange={(event) =>
                            void handleUpdatePropertyStage(event.target.value as PropertyStage)
                          }
                          className="np-select !w-auto min-w-[180px] rounded-full px-4 py-2"
                        >
                          {propertyStageOptions.map((option) => (
                            <option key={option} value={option}>
                              {option.replaceAll("_", " ")}
                            </option>
                          ))}
                        </select>
                        {updatingPropertyStage ? (
                          <span className="text-xs font-semibold text-slate-500">Saving...</span>
                        ) : null}
                      </div>
                    ) : (
                      <p className="mt-2 text-sm font-semibold text-slate-900">
                        {selectedProperty.stage.replaceAll("_", " ")}
                      </p>
                    )}
                    <p className="mt-3 text-xs text-slate-500">
                      {selectedProperty.isPrimary ? "Primary property" : "Secondary property"}
                    </p>
                  </div>

                  <div className="np-card p-4">
                    <p className="np-kicker">Overview</p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {rightRailPropertyStats?.fileCount ?? 0} file
                          {(rightRailPropertyStats?.fileCount ?? 0) === 1 ? "" : "s"}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">Uploaded to this property channel</p>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {rightRailPropertyStats?.openCommentCount ?? 0} open comment
                          {(rightRailPropertyStats?.openCommentCount ?? 0) === 1 ? "" : "s"}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">Active PDF review items</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="np-card mt-5 p-4">
                  <p className="text-sm font-semibold text-slate-900">
                    {workspace.propertyThreads.length} property channel
                    {workspace.propertyThreads.length === 1 ? "" : "s"}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Use the left rail to move from the general thread into a focused property workspace.
                  </p>
                </div>
              )
            ) : null}

            {activeContextTab === "files" ? (
              <div className="mt-5 space-y-3">
                {workspace.selectedFiles.length ? (
                  workspace.selectedFiles.map((file: ThreadFile) => (
                    <Link
                      key={file.id}
                      href={`/messages/${selectedThread.id}/files/${file.id}?relationshipId=${relationshipId}&thread=${selectedThread.id}`}
                      className="np-list-row block px-4 py-3"
                    >
                      <p className="text-sm font-semibold text-slate-900">{file.fileName}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {formatFileSize(file.fileSize)} · {formatMessageTimestamp(file.createdAt)}
                      </p>
                    </Link>
                  ))
                ) : (
                  <div className="np-card-muted p-4">
                    <p className="text-sm leading-6 text-slate-500">No PDFs uploaded for this channel yet.</p>
                  </div>
                )}
              </div>
            ) : null}

            {activeContextTab === "tasks" ? (
              <div className="mt-5 space-y-3">
                {workspace.actionItems.length ? (
                  workspace.actionItems.map((actionItem: WorkspaceActionItem) => (
                    <div key={actionItem.id} className="np-list-row px-4 py-3">
                      <p className="text-sm font-semibold text-slate-900">{actionItem.title}</p>
                      <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                        {actionItem.status.replaceAll("_", " ")}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="np-card-muted p-4">
                    <p className="text-sm leading-6 text-slate-500">No action items yet for this view.</p>
                  </div>
                )}
              </div>
            ) : null}
          </aside>
        </div>
      </section>
    </main>
  );
}
