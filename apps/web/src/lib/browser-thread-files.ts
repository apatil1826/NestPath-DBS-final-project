"use client";

import { BrowserProfile } from "@/lib/browser-auth";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { sendThreadMessage, ThreadFileAttachment } from "@/lib/browser-messaging";

export type ThreadFile = {
  id: string;
  threadId: string;
  uploadedByProfileId: string;
  fileName: string;
  storageBucket: string;
  storagePath: string;
  mimeType: string;
  fileSize: number;
  createdAt: string;
};

export type PdfHighlightArea = {
  height: number;
  left: number;
  pageIndex: number;
  top: number;
  width: number;
};

export type PdfAnnotation = {
  id: string;
  fileId: string;
  threadId: string;
  authorProfileId: string;
  pageIndex: number;
  quote: string;
  commentText: string;
  color: string;
  highlightAreas: PdfHighlightArea[];
  selectionData: Record<string, unknown>;
  resolvedAt: string | null;
  resolvedByProfileId: string | null;
  createdAt: string;
};

export type PdfAnnotationReply = {
  id: string;
  annotationId: string;
  fileId: string;
  threadId: string;
  authorProfileId: string;
  body: string;
  createdAt: string;
};

const THREAD_FILES_BUCKET = "thread-files";
const MAX_PDF_SIZE_BYTES = 20 * 1024 * 1024;

type DbThreadFile = {
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

type DbPdfAnnotation = {
  id: string;
  file_id: string;
  thread_id: string;
  author_profile_id: string;
  page_index: number;
  quote: string;
  comment_text: string;
  color: string;
  highlight_areas: PdfHighlightArea[];
  selection_data: Record<string, unknown>;
  resolved_at: string | null;
  resolved_by_profile_id: string | null;
  created_at: string;
};

type DbPdfAnnotationReply = {
  id: string;
  annotation_id: string;
  file_id: string;
  thread_id: string;
  author_profile_id: string;
  body: string;
  created_at: string;
};

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }

  return fallback;
}

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-");
}

function formatAttachment(file: ThreadFile): ThreadFileAttachment {
  return {
    fileId: file.id,
    fileName: file.fileName,
    mimeType: file.mimeType,
    fileSize: file.fileSize,
    storageBucket: file.storageBucket,
    storagePath: file.storagePath,
  };
}

function mapThreadFile(file: DbThreadFile): ThreadFile {
  return {
    id: file.id,
    threadId: file.thread_id,
    uploadedByProfileId: file.uploaded_by_profile_id,
    fileName: file.file_name,
    storageBucket: file.storage_bucket,
    storagePath: file.storage_path,
    mimeType: file.mime_type,
    fileSize: file.file_size,
    createdAt: file.created_at,
  };
}

function mapPdfAnnotation(annotation: DbPdfAnnotation): PdfAnnotation {
  return {
    id: annotation.id,
    fileId: annotation.file_id,
    threadId: annotation.thread_id,
    authorProfileId: annotation.author_profile_id,
    pageIndex: annotation.page_index,
    quote: annotation.quote,
    commentText: annotation.comment_text,
    color: annotation.color,
    highlightAreas: annotation.highlight_areas,
    selectionData: annotation.selection_data,
    resolvedAt: annotation.resolved_at,
    resolvedByProfileId: annotation.resolved_by_profile_id,
    createdAt: annotation.created_at,
  };
}

function mapPdfAnnotationReply(reply: DbPdfAnnotationReply): PdfAnnotationReply {
  return {
    id: reply.id,
    annotationId: reply.annotation_id,
    fileId: reply.file_id,
    threadId: reply.thread_id,
    authorProfileId: reply.author_profile_id,
    body: reply.body,
    createdAt: reply.created_at,
  };
}

export async function listThreadFiles(threadId: string) {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("thread_files")
    .select(
      "id, thread_id, uploaded_by_profile_id, file_name, storage_bucket, storage_path, mime_type, file_size, created_at",
    )
    .eq("thread_id", threadId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(getErrorMessage(error, "Unable to load shared files."));
  }

  return ((data as DbThreadFile[] | null) ?? []).map(mapThreadFile);
}

export async function getThreadFileWithSignedUrl(threadId: string, fileId: string) {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("thread_files")
    .select(
      "id, thread_id, uploaded_by_profile_id, file_name, storage_bucket, storage_path, mime_type, file_size, created_at",
    )
    .eq("thread_id", threadId)
    .eq("id", fileId)
    .single<DbThreadFile>();

  if (error || !data) {
    throw new Error(getErrorMessage(error, "Unable to load this PDF."));
  }

  const mappedFile = mapThreadFile(data);
  const { data: signedUrlData, error: signedUrlError } = await supabase.storage
    .from(mappedFile.storageBucket)
    .createSignedUrl(mappedFile.storagePath, 60 * 60);

  if (signedUrlError || !signedUrlData?.signedUrl) {
    throw new Error(getErrorMessage(signedUrlError, "Unable to open this PDF."));
  }

  return {
    file: mappedFile,
    signedUrl: signedUrlData.signedUrl,
  };
}

export async function uploadThreadPdf(threadId: string, profile: BrowserProfile, file: File) {
  if (file.type !== "application/pdf") {
    throw new Error("Please upload a PDF file.");
  }

  if (file.size > MAX_PDF_SIZE_BYTES) {
    throw new Error("Please upload a PDF smaller than 20 MB.");
  }

  const supabase = createSupabaseBrowserClient();
  const fileId = crypto.randomUUID();
  const storagePath = `${threadId}/${fileId}/${sanitizeFileName(file.name)}`;

  const { error: uploadError } = await supabase.storage
    .from(THREAD_FILES_BUCKET)
    .upload(storagePath, file, {
      cacheControl: "3600",
      contentType: "application/pdf",
      upsert: false,
    });

  if (uploadError) {
    throw new Error(
      getErrorMessage(
        uploadError,
        "Unable to upload this PDF. Make sure the thread-files storage bucket exists.",
      ),
    );
  }

  const { data: insertedFile, error: fileInsertError } = await supabase
    .from("thread_files")
    .insert({
      id: fileId,
      thread_id: threadId,
      uploaded_by_profile_id: profile.id,
      file_name: file.name,
      storage_bucket: THREAD_FILES_BUCKET,
      storage_path: storagePath,
      mime_type: "application/pdf",
      file_size: file.size,
    })
    .select(
      "id, thread_id, uploaded_by_profile_id, file_name, storage_bucket, storage_path, mime_type, file_size, created_at",
    )
    .single<DbThreadFile>();

  if (fileInsertError || !insertedFile) {
    throw new Error(getErrorMessage(fileInsertError, "Unable to save this PDF record."));
  }

  const mappedFile = mapThreadFile(insertedFile);
  await sendThreadMessage(threadId, profile.id, `Shared ${file.name}`, {
    file: formatAttachment(mappedFile),
  });

  return mappedFile;
}

export async function listPdfAnnotations(fileId: string) {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("pdf_annotations")
    .select(
      "id, file_id, thread_id, author_profile_id, page_index, quote, comment_text, color, highlight_areas, selection_data, resolved_at, resolved_by_profile_id, created_at",
    )
    .eq("file_id", fileId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(getErrorMessage(error, "Unable to load PDF comments."));
  }

  return ((data as DbPdfAnnotation[] | null) ?? []).map(mapPdfAnnotation);
}

export async function listPdfAnnotationReplies(fileId: string) {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("pdf_annotation_replies")
    .select("id, annotation_id, file_id, thread_id, author_profile_id, body, created_at")
    .eq("file_id", fileId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(getErrorMessage(error, "Unable to load PDF comment replies."));
  }

  return ((data as DbPdfAnnotationReply[] | null) ?? []).map(mapPdfAnnotationReply);
}

export async function createPdfAnnotation(input: {
  fileId: string;
  threadId: string;
  profileId: string;
  pageIndex: number;
  quote: string;
  commentText: string;
  color?: string;
  highlightAreas: PdfHighlightArea[];
  selectionData: Record<string, unknown>;
  fileName?: string;
}) {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("pdf_annotations")
    .insert({
      file_id: input.fileId,
      thread_id: input.threadId,
      author_profile_id: input.profileId,
      page_index: input.pageIndex,
      quote: input.quote,
      comment_text: input.commentText.trim(),
      color: input.color ?? "#fef08a",
      highlight_areas: input.highlightAreas,
      selection_data: input.selectionData,
    })
    .select(
      "id, file_id, thread_id, author_profile_id, page_index, quote, comment_text, color, highlight_areas, selection_data, resolved_at, resolved_by_profile_id, created_at",
    )
    .single<DbPdfAnnotation>();

  if (error || !data) {
    throw new Error(getErrorMessage(error, "Unable to save this comment."));
  }

  const createdAnnotation = mapPdfAnnotation(data);

  await sendThreadMessage(
    input.threadId,
    input.profileId,
    `Added a PDF comment${input.fileName ? ` on ${input.fileName}` : ""}.`,
    {
      pdfAnnotation: {
        annotationId: createdAnnotation.id,
        fileId: input.fileId,
        fileName: input.fileName ?? null,
        action: "created",
      },
    },
    "system",
  );

  return createdAnnotation;
}

export async function resolvePdfAnnotation(input: {
  annotationId: string;
  fileId: string;
  threadId: string;
  profileId: string;
  fileName?: string;
}) {
  const supabase = createSupabaseBrowserClient();
  const resolvedAt = new Date().toISOString();
  const { data, error } = await supabase
    .from("pdf_annotations")
    .update({
      resolved_at: resolvedAt,
      resolved_by_profile_id: input.profileId,
    })
    .eq("id", input.annotationId)
    .eq("file_id", input.fileId)
    .is("resolved_at", null)
    .select(
      "id, file_id, thread_id, author_profile_id, page_index, quote, comment_text, color, highlight_areas, selection_data, resolved_at, resolved_by_profile_id, created_at",
    )
    .single<DbPdfAnnotation>();

  if (error || !data) {
    throw new Error(getErrorMessage(error, "Unable to resolve this comment."));
  }

  const resolvedAnnotation = mapPdfAnnotation(data);

  await sendThreadMessage(
    input.threadId,
    input.profileId,
    `Resolved a PDF comment${input.fileName ? ` on ${input.fileName}` : ""}.`,
    {
      pdfAnnotation: {
        annotationId: resolvedAnnotation.id,
        fileId: input.fileId,
        fileName: input.fileName ?? null,
        action: "resolved",
      },
    },
    "system",
  );

  return resolvedAnnotation;
}

export async function createPdfAnnotationReply(input: {
  annotationId: string;
  fileId: string;
  threadId: string;
  profileId: string;
  body: string;
  fileName?: string;
}) {
  const trimmedBody = input.body.trim();

  if (!trimmedBody) {
    throw new Error("Write a reply before sending.");
  }

  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("pdf_annotation_replies")
    .insert({
      annotation_id: input.annotationId,
      file_id: input.fileId,
      thread_id: input.threadId,
      author_profile_id: input.profileId,
      body: trimmedBody,
    })
    .select("id, annotation_id, file_id, thread_id, author_profile_id, body, created_at")
    .single<DbPdfAnnotationReply>();

  if (error || !data) {
    throw new Error(getErrorMessage(error, "Unable to send this PDF reply."));
  }

  const createdReply = mapPdfAnnotationReply(data);

  await sendThreadMessage(
    input.threadId,
    input.profileId,
    `Added a reply to a PDF comment${input.fileName ? ` on ${input.fileName}` : ""}.`,
    {
      pdfAnnotation: {
        annotationId: input.annotationId,
        fileId: input.fileId,
        fileName: input.fileName ?? null,
        action: "replied",
        replyId: createdReply.id,
      },
    },
    "system",
  );

  return createdReply;
}
