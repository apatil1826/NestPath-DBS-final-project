"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SpecialZoomLevel, Viewer, Worker } from "@react-pdf-viewer/core";
import { defaultLayoutPlugin } from "@react-pdf-viewer/default-layout";
import type {
  HighlightArea,
  RenderHighlightContentProps,
  RenderHighlightTargetProps,
  RenderHighlightsProps,
} from "@react-pdf-viewer/highlight";
import { highlightPlugin } from "@react-pdf-viewer/highlight";
import { BrowserProfile, getOrCreateBrowserProfile } from "@/lib/browser-auth";
import {
  createPdfAnnotation,
  getThreadFileWithSignedUrl,
  listPdfAnnotations,
  PdfAnnotation,
} from "@/lib/browser-thread-files";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type ThreadPdfReviewProps = {
  fileId: string;
  threadId: string;
};

type SelectedFile = {
  id: string;
  fileName: string;
  fileSize: number;
  createdAt: string;
  uploadedByProfileId: string;
};

function formatTimestamp(timestamp: string) {
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

export function ThreadPdfReview({ fileId, threadId }: ThreadPdfReviewProps) {
  const router = useRouter();
  const [profile, setProfile] = useState<BrowserProfile | null>(null);
  const [file, setFile] = useState<SelectedFile | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [annotations, setAnnotations] = useState<PdfAnnotation[]>([]);
  const [draftComment, setDraftComment] = useState("");
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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

        const [{ file: loadedFile, signedUrl: loadedSignedUrl }, loadedAnnotations] =
          await Promise.all([
            getThreadFileWithSignedUrl(threadId, fileId),
            listPdfAnnotations(fileId),
          ]);

        if (!cancelled) {
          setProfile(resolvedProfile);
          setFile({
            id: loadedFile.id,
            fileName: loadedFile.fileName,
            fileSize: loadedFile.fileSize,
            createdAt: loadedFile.createdAt,
            uploadedByProfileId: loadedFile.uploadedByProfileId,
          });
          setSignedUrl(loadedSignedUrl);
          setAnnotations(loadedAnnotations);
        }
      } catch (loadError) {
        if (!cancelled) {
          setErrorMessage(
            loadError instanceof Error ? loadError.message : "Unable to load this PDF.",
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
  }, [fileId, router, threadId]);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel(`pdf-annotations:${fileId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "pdf_annotations",
          filter: `file_id=eq.${fileId}`,
        },
        (payload) => {
          const nextAnnotation = payload.new as {
            id: string;
            file_id: string;
            thread_id: string;
            author_profile_id: string;
            page_index: number;
            quote: string;
            comment_text: string;
            color: string;
            highlight_areas: HighlightArea[];
            selection_data: Record<string, unknown>;
            created_at: string;
          };

          setAnnotations((currentAnnotations) => {
            if (currentAnnotations.some((annotation) => annotation.id === nextAnnotation.id)) {
              return currentAnnotations;
            }

            return [
              ...currentAnnotations,
              {
                id: nextAnnotation.id,
                fileId: nextAnnotation.file_id,
                threadId: nextAnnotation.thread_id,
                authorProfileId: nextAnnotation.author_profile_id,
                pageIndex: nextAnnotation.page_index,
                quote: nextAnnotation.quote,
                commentText: nextAnnotation.comment_text,
                color: nextAnnotation.color,
                highlightAreas: nextAnnotation.highlight_areas,
                selectionData: nextAnnotation.selection_data,
                createdAt: nextAnnotation.created_at,
              },
            ];
          });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [fileId]);

  async function saveAnnotationFromSelection(props: RenderHighlightContentProps) {
    if (!profile) {
      return;
    }

    const trimmedComment = draftComment.trim();

    if (!trimmedComment) {
      setErrorMessage("Add a short comment before saving a highlight.");
      return;
    }

    setSaving(true);
    setErrorMessage(null);

    try {
      const createdAnnotation = await createPdfAnnotation({
        fileId,
        threadId,
        profileId: profile.id,
        pageIndex: props.highlightAreas[0]?.pageIndex ?? 0,
        quote: props.selectedText,
        commentText: trimmedComment,
        highlightAreas: props.highlightAreas,
        selectionData: (props.selectionData as Record<string, unknown> | undefined) ?? {},
      });

      setAnnotations((currentAnnotations) => {
        if (currentAnnotations.some((annotation) => annotation.id === createdAnnotation.id)) {
          return currentAnnotations;
        }

        return [...currentAnnotations, createdAnnotation];
      });
      setSelectedAnnotationId(createdAnnotation.id);
      setDraftComment("");
      props.cancel();
    } catch (saveError) {
      setErrorMessage(
        saveError instanceof Error ? saveError.message : "Unable to save this comment.",
      );
    } finally {
      setSaving(false);
    }
  }

  function renderHighlightTarget(props: RenderHighlightTargetProps) {
    return (
      <button
        type="button"
        style={{
          left: `${props.selectionRegion.left}%`,
          top: `${props.selectionRegion.top + props.selectionRegion.height}%`,
          transform: "translateY(8px)",
        }}
        className="absolute z-20 rounded-full bg-slate-900 px-3 py-2 text-xs font-semibold text-white shadow-lg transition hover:bg-slate-700"
        onClick={() => {
          setDraftComment("");
          setErrorMessage(null);
          props.toggle();
        }}
      >
        Add comment
      </button>
    );
  }

  function renderHighlightContent(props: RenderHighlightContentProps) {
    return (
      <div
        style={{
          left: `${props.selectionRegion.left}%`,
          top: `${props.selectionRegion.top + props.selectionRegion.height}%`,
          transform: "translateY(12px)",
        }}
        className="absolute z-30 w-72 rounded-[20px] border border-slate-200 bg-white p-4 shadow-2xl"
      >
        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">New note</p>
        <p className="mt-3 line-clamp-3 text-sm font-semibold leading-6 text-slate-900">
          {props.selectedText}
        </p>
        <textarea
          value={draftComment}
          onChange={(event) => setDraftComment(event.target.value)}
          rows={4}
          className="mt-3 w-full resize-none rounded-[16px] border border-slate-200 px-3 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
          placeholder="What should the other person notice here?"
        />
        <div className="mt-3 flex items-center justify-end gap-2">
          <button
            type="button"
            className="rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
            onClick={() => {
              setDraftComment("");
              props.cancel();
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            className="rounded-full bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-700 disabled:opacity-60"
            disabled={saving}
            onClick={() => void saveAnnotationFromSelection(props)}
          >
            {saving ? "Saving..." : "Save note"}
          </button>
        </div>
      </div>
    );
  }

  function renderHighlights(props: RenderHighlightsProps) {
    return (
      <div>
        {annotations
          .flatMap((annotation) =>
            annotation.highlightAreas
              .filter((area) => area.pageIndex === props.pageIndex)
              .map((area, areaIndex) => ({ annotation, area, areaIndex })),
          )
          .map(({ annotation, area, areaIndex }) => (
            <button
              type="button"
              key={`${annotation.id}-${areaIndex}`}
              className="absolute cursor-pointer rounded-sm transition"
              style={{
                ...props.getCssProperties(area, props.rotation),
                background: annotation.color,
                opacity: selectedAnnotationId === annotation.id ? 0.6 : 0.35,
              }}
              onClick={() => setSelectedAnnotationId(annotation.id)}
              title={annotation.commentText}
            />
          ))}
      </div>
    );
  }

  const highlightPluginInstance = highlightPlugin({
    renderHighlightTarget,
    renderHighlightContent,
    renderHighlights,
  });
  const defaultLayoutPluginInstance = defaultLayoutPlugin();

  if (loading) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-[1400px] items-center justify-center px-4 py-6 sm:px-6 lg:px-10">
        <div className="rounded-[30px] border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-sm text-slate-500">Loading PDF review...</p>
        </div>
      </main>
    );
  }

  if (!profile || !file || !signedUrl) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-[1400px] items-center justify-center px-4 py-6 sm:px-6 lg:px-10">
        <div className="rounded-[30px] border border-rose-200 bg-white p-8 shadow-sm">
          <p className="text-sm font-semibold text-rose-800">Unable to load this PDF</p>
          <p className="mt-2 text-sm text-rose-700">{errorMessage ?? "Please try again."}</p>
          <Link
            href={`/messages/${threadId}`}
            className="mt-5 inline-flex rounded-full border border-slate-200 px-5 py-3 text-sm text-slate-700 transition hover:bg-slate-50"
          >
            Back to conversation
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1400px] flex-col gap-6 px-4 py-6 sm:px-6 lg:px-10">
      <header className="flex flex-wrap items-end justify-between gap-4 rounded-[30px] border border-slate-200 bg-white p-8 shadow-sm">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-slate-400">PDF review</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
            {file.fileName}
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-8 text-slate-500">
            {formatFileSize(file.fileSize)} · Shared {formatTimestamp(file.createdAt)}. Highlight
            any passage to leave a comment directly on the document.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href={`/messages/${threadId}`}
            className="rounded-full border border-slate-200 px-5 py-3 text-sm text-slate-700 transition hover:bg-slate-50"
          >
            Back to conversation
          </Link>
        </div>
      </header>

      {errorMessage ? (
        <section className="rounded-[24px] border border-rose-200 bg-rose-50 p-5">
          <p className="text-sm font-semibold text-rose-800">Something went wrong</p>
          <p className="mt-2 text-sm leading-6 text-rose-700">{errorMessage}</p>
        </section>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="min-h-[780px] rounded-[30px] border border-slate-200 bg-white p-4 shadow-sm">
          <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.4.120/build/pdf.worker.min.js">
            <div className="h-[760px] overflow-hidden rounded-[22px] border border-slate-200">
              <Viewer
                fileUrl={signedUrl}
                defaultScale={SpecialZoomLevel.PageFit}
                plugins={[defaultLayoutPluginInstance, highlightPluginInstance]}
              />
            </div>
          </Worker>
        </section>

        <aside className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Notes</p>
          <h2 className="mt-4 text-2xl font-semibold tracking-tight text-slate-900">
            Highlight comments
          </h2>
          <p className="mt-3 text-sm leading-7 text-slate-500">
            Every saved note stays attached to the exact text range you highlighted.
          </p>

          <div className="mt-6 space-y-3">
            {annotations.length ? (
              annotations.map((annotation) => {
                const isSelected = selectedAnnotationId === annotation.id;

                return (
                  <button
                    type="button"
                    key={annotation.id}
                    className={[
                      "block w-full rounded-[22px] border px-4 py-4 text-left transition",
                      isSelected
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 bg-slate-50 text-slate-900 hover:border-slate-300 hover:bg-white",
                    ].join(" ")}
                    onClick={() => {
                      setSelectedAnnotationId(annotation.id);
                      if (annotation.highlightAreas[0]) {
                        highlightPluginInstance.jumpToHighlightArea(annotation.highlightAreas[0]);
                      }
                    }}
                  >
                    <p
                      className={[
                        "text-xs uppercase tracking-[0.18em]",
                        isSelected ? "text-slate-300" : "text-slate-400",
                      ].join(" ")}
                    >
                      Page {annotation.pageIndex + 1}
                    </p>
                    <p className="mt-2 text-sm font-semibold leading-6">
                      “{annotation.quote || "Highlighted text"}”
                    </p>
                    <p
                      className={[
                        "mt-3 text-sm leading-6",
                        isSelected ? "text-slate-100" : "text-slate-600",
                      ].join(" ")}
                    >
                      {annotation.commentText}
                    </p>
                    <p
                      className={[
                        "mt-3 text-xs",
                        isSelected ? "text-slate-300" : "text-slate-400",
                      ].join(" ")}
                    >
                      {formatTimestamp(annotation.createdAt)}
                    </p>
                  </button>
                );
              })
            ) : (
              <div className="rounded-[22px] border border-dashed border-slate-200 bg-slate-50 px-4 py-6">
                <p className="text-sm font-semibold text-slate-900">No highlights yet</p>
                <p className="mt-2 text-sm leading-7 text-slate-500">
                  Select text inside the PDF, then add a note to pin a comment to that passage.
                </p>
              </div>
            )}
          </div>
        </aside>
      </div>
    </main>
  );
}
