"use client";

import { BrowserProfile } from "@/lib/browser-auth";
import { ThreadMessage } from "@/lib/browser-messaging";
import { ThreadFile, listThreadFiles } from "@/lib/browser-thread-files";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { PropertyStage } from "@/lib/nestpath-types";

export type RelationshipProperty = {
  id: string;
  title: string;
  addressLine1: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  stage: PropertyStage;
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
};

export type RelationshipThreadSummary = {
  id: string;
  relationshipId: string;
  propertyId: string | null;
  kind: "direct" | "property";
  title: string;
  lastMessagePreview: string;
  lastMessageAt: string;
  unreadCount: number;
  fileCount: number;
  openCommentCount: number;
  property: RelationshipProperty | null;
};

export type WorkspaceActionItem = {
  id: string;
  title: string;
  status: "open" | "in_progress" | "done";
  threadId: string | null;
  propertyId: string | null;
};

export type RelationshipWorkspace = {
  relationshipId: string;
  viewer: BrowserProfile;
  counterpart: {
    id: string;
    fullName: string;
    email: string;
    role: "agent" | "buyer";
  } | null;
  directThread: RelationshipThreadSummary | null;
  propertyThreads: RelationshipThreadSummary[];
  selectedThread: RelationshipThreadSummary;
  selectedMessages: ThreadMessage[];
  selectedFiles: ThreadFile[];
  selectedProperty: RelationshipProperty | null;
  actionItems: WorkspaceActionItem[];
};

type DbRelationship = {
  id: string;
  agent_profile_id: string;
  buyer_profile_id: string | null;
  status: "invited" | "active" | "archived";
};

type DbThread = {
  id: string;
  relationship_id: string;
  property_id: string | null;
  kind: "direct" | "property";
  title: string;
  last_message_preview: string | null;
  last_message_at: string;
};

type DbProperty = {
  id: string;
  title: string;
  address_line_1: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  stage: PropertyStage;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
};

type DbProfile = {
  id: string;
  full_name: string;
  email: string;
  role: "agent" | "buyer";
};

type DbMessage = {
  id: string;
  kind: "user" | "system";
  body: string;
  created_at: string;
  sender_profile_id: string | null;
  metadata: Record<string, unknown>;
};

type DbThreadRead = {
  thread_id: string;
  last_read_at: string;
};

type DbThreadFileRef = {
  id: string;
  thread_id: string;
};

type DbPdfAnnotationRef = {
  file_id: string;
};

type DbActionItem = {
  id: string;
  title: string;
  status: "open" | "in_progress" | "done";
  thread_id: string | null;
  property_id: string | null;
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

function mapProperty(property: DbProperty): RelationshipProperty {
  return {
    id: property.id,
    title: property.title,
    addressLine1: property.address_line_1,
    city: property.city,
    state: property.state,
    postalCode: property.postal_code,
    stage: property.stage,
    isPrimary: property.is_primary,
    createdAt: property.created_at,
    updatedAt: property.updated_at,
  };
}

export function formatPropertyAddress(property: RelationshipProperty | null) {
  if (!property) {
    return "";
  }

  return [property.addressLine1, property.city, property.state, property.postalCode]
    .filter(Boolean)
    .join(", ");
}

export async function getThreadContext(threadId: string) {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("threads")
    .select("id, relationship_id, property_id, kind")
    .eq("id", threadId)
    .single<{
      id: string;
      relationship_id: string;
      property_id: string | null;
      kind: "direct" | "property";
    }>();

  if (error || !data) {
    throw new Error(getErrorMessage(error, "Unable to locate this thread."));
  }

  return {
    id: data.id,
    relationshipId: data.relationship_id,
    propertyId: data.property_id,
    kind: data.kind,
  };
}

export async function createPropertyChannel(input: {
  relationshipId: string;
  title: string;
  addressLine1?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  stage?: PropertyStage;
  isPrimary?: boolean;
}) {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.rpc("create_property_thread", {
    target_relationship_id: input.relationshipId,
    property_title: input.title,
    property_address_line_1: input.addressLine1 ?? null,
    property_city: input.city ?? null,
    property_state: input.state ?? null,
    property_postal_code: input.postalCode ?? null,
    property_stage: input.stage ?? "considering",
    property_is_primary: input.isPrimary ?? false,
  });

  if (error) {
    throw new Error(getErrorMessage(error, "Unable to create property channel."));
  }

  if (!data || typeof data !== "string") {
    throw new Error("Property thread was not returned by the server.");
  }

  return data;
}

export async function getRelationshipWorkspace(
  relationshipId: string,
  profile: BrowserProfile,
  selectedThreadId?: string | null,
) {
  const supabase = createSupabaseBrowserClient();

  const [
    { data: relationship, error: relationshipError },
    { data: threads, error: threadsError },
    { data: properties, error: propertiesError },
    { data: actionItems, error: actionItemsError },
  ] = await Promise.all([
    supabase
      .from("agent_relationships")
      .select("id, agent_profile_id, buyer_profile_id, status")
      .eq("id", relationshipId)
      .single<DbRelationship>(),
    supabase
      .from("threads")
      .select("id, relationship_id, property_id, kind, title, last_message_preview, last_message_at")
      .eq("relationship_id", relationshipId)
      .order("last_message_at", { ascending: false }),
    supabase
      .from("properties")
      .select("id, title, address_line_1, city, state, postal_code, stage, is_primary, created_at, updated_at")
      .eq("relationship_id", relationshipId)
      .order("updated_at", { ascending: false }),
    supabase
      .from("action_items")
      .select("id, title, status, thread_id, property_id")
      .eq("relationship_id", relationshipId)
      .order("created_at", { ascending: false }),
  ]);

  if (relationshipError || !relationship) {
    throw new Error(getErrorMessage(relationshipError, "Unable to load this buyer relationship."));
  }

  if (threadsError) {
    throw new Error(getErrorMessage(threadsError, "Unable to load relationship channels."));
  }

  if (propertiesError) {
    throw new Error(getErrorMessage(propertiesError, "Unable to load properties."));
  }

  if (actionItemsError) {
    throw new Error(getErrorMessage(actionItemsError, "Unable to load action items."));
  }

  const counterpartId =
    relationship.agent_profile_id === profile.id
      ? relationship.buyer_profile_id
      : relationship.agent_profile_id;

  const counterpart = counterpartId
    ? await supabase
        .from("profiles")
        .select("id, full_name, email, role")
        .eq("id", counterpartId)
        .single<DbProfile>()
    : { data: null, error: null };

  if (counterpart.error) {
    throw new Error(getErrorMessage(counterpart.error, "Unable to load buyer relationship."));
  }

  const propertyMap = new Map(
    ((properties as DbProperty[] | null) ?? []).map((property) => [property.id, mapProperty(property)]),
  );

  const threadList = (threads as DbThread[] | null) ?? [];
  const threadIds = threadList.map((thread) => thread.id);

  const [{ data: threadReads, error: threadReadsError }, { data: threadFileRefs, error: threadFileRefsError }] =
    await Promise.all([
      threadIds.length
        ? supabase
            .from("thread_reads")
            .select("thread_id, last_read_at")
            .in("thread_id", threadIds)
            .eq("profile_id", profile.id)
        : { data: [], error: null },
      threadIds.length
        ? supabase.from("thread_files").select("id, thread_id").in("thread_id", threadIds)
        : { data: [], error: null },
    ]);

  if (threadReadsError) {
    throw new Error(getErrorMessage(threadReadsError, "Unable to load unread state."));
  }

  if (threadFileRefsError) {
    throw new Error(getErrorMessage(threadFileRefsError, "Unable to load file counts."));
  }

  const threadReadMap = new Map(
    ((threadReads as DbThreadRead[] | null) ?? []).map((entry) => [entry.thread_id, entry.last_read_at]),
  );

  const fileRefs = (threadFileRefs as DbThreadFileRef[] | null) ?? [];
  const fileCountMap = fileRefs.reduce<Record<string, number>>((accumulator, fileRef) => {
    accumulator[fileRef.thread_id] = (accumulator[fileRef.thread_id] ?? 0) + 1;
    return accumulator;
  }, {});

  const fileIdToThreadId = new Map(fileRefs.map((fileRef) => [fileRef.id, fileRef.thread_id]));
  const fileIds = fileRefs.map((fileRef) => fileRef.id);

  const { data: openAnnotationRefs, error: openAnnotationRefsError } = fileIds.length
    ? await supabase
        .from("pdf_annotations")
        .select("file_id")
        .in("file_id", fileIds)
        .is("resolved_at", null)
    : { data: [], error: null };

  if (openAnnotationRefsError) {
    throw new Error(
      getErrorMessage(openAnnotationRefsError, "Unable to load open PDF comment counts."),
    );
  }

  const openCommentCountMap = ((openAnnotationRefs as DbPdfAnnotationRef[] | null) ?? []).reduce<
    Record<string, number>
  >((accumulator, annotationRef) => {
    const threadId = fileIdToThreadId.get(annotationRef.file_id);

    if (threadId) {
      accumulator[threadId] = (accumulator[threadId] ?? 0) + 1;
    }

    return accumulator;
  }, {});

  const unreadCounts = new Map<string, number>();

  await Promise.all(
    threadList.map(async (thread) => {
      const lastReadAt = threadReadMap.get(thread.id);

      let query = supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("thread_id", thread.id)
        .neq("sender_profile_id", profile.id);

      if (lastReadAt) {
        query = query.gt("created_at", lastReadAt);
      }

      const { count, error } = await query;

      if (error) {
        throw new Error(getErrorMessage(error, "Unable to load unread channel counts."));
      }

      unreadCounts.set(thread.id, count ?? 0);
    }),
  );

  const threadSummaries: RelationshipThreadSummary[] = threadList.map((thread) => ({
    id: thread.id,
    relationshipId: thread.relationship_id,
    propertyId: thread.property_id,
    kind: thread.kind,
    title: thread.title,
    lastMessagePreview: thread.last_message_preview ?? "No messages yet",
    lastMessageAt: thread.last_message_at,
    unreadCount: unreadCounts.get(thread.id) ?? 0,
    fileCount: fileCountMap[thread.id] ?? 0,
    openCommentCount: openCommentCountMap[thread.id] ?? 0,
    property: thread.property_id ? propertyMap.get(thread.property_id) ?? null : null,
  }));

  const directThread = threadSummaries.find((thread) => thread.kind === "direct") ?? null;
  const propertyThreads = threadSummaries
    .filter((thread) => thread.kind === "property")
    .sort((firstThread, secondThread) =>
      secondThread.lastMessageAt.localeCompare(firstThread.lastMessageAt),
    );

  const selectedThread =
    threadSummaries.find((thread) => thread.id === selectedThreadId) ??
    directThread ??
    propertyThreads[0] ??
    null;

  if (!selectedThread) {
    throw new Error("No conversation channels are available for this relationship yet.");
  }

  const [{ data: selectedMessages, error: selectedMessagesError }, selectedFiles] =
    await Promise.all([
      supabase
        .from("messages")
        .select("id, kind, body, created_at, sender_profile_id, metadata")
        .eq("thread_id", selectedThread.id)
        .order("created_at", { ascending: true }),
      listThreadFiles(selectedThread.id),
    ]);

  if (selectedMessagesError) {
    throw new Error(getErrorMessage(selectedMessagesError, "Unable to load this channel."));
  }

  const selectedProperty =
    selectedThread.propertyId ? propertyMap.get(selectedThread.propertyId) ?? null : null;
  const scopedActionItems = ((actionItems as DbActionItem[] | null) ?? [])
    .filter((actionItem) => {
      if (selectedThread.kind === "direct") {
        return !actionItem.property_id;
      }

      return (
        actionItem.thread_id === selectedThread.id ||
        actionItem.property_id === selectedThread.propertyId
      );
    })
    .map((actionItem) => ({
      id: actionItem.id,
      title: actionItem.title,
      status: actionItem.status,
      threadId: actionItem.thread_id,
      propertyId: actionItem.property_id,
    }));

  return {
    relationshipId: relationship.id,
    viewer: profile,
    counterpart: counterpart.data
      ? {
          id: counterpart.data.id,
          fullName: counterpart.data.full_name,
          email: counterpart.data.email,
          role: counterpart.data.role,
        }
      : null,
    directThread,
    propertyThreads,
    selectedThread,
    selectedMessages: ((selectedMessages as DbMessage[] | null) ?? []).map((message) => ({
      id: message.id,
      kind: message.kind,
      body: message.body,
      createdAt: message.created_at,
      senderProfileId: message.sender_profile_id,
      metadata: message.metadata ?? {},
    })),
    selectedFiles,
    selectedProperty,
    actionItems: scopedActionItems,
  } satisfies RelationshipWorkspace;
}
