"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { BrowserProfile } from "@/lib/browser-auth";

export type DirectoryBuyer = {
  id: string;
  full_name: string;
  email: string;
  role: "buyer";
};

export type InboxThread = {
  id: string;
  relationshipId: string;
  title: string;
  lastMessagePreview: string;
  lastMessageAt: string;
  counterpart: {
    id: string;
    fullName: string;
    email: string;
    role: "agent" | "buyer";
  } | null;
};

export type ThreadMessage = {
  id: string;
  body: string;
  createdAt: string;
  senderProfileId: string | null;
};

export type ThreadSnapshot = {
  id: string;
  relationshipId: string;
  title: string;
  lastMessageAt: string;
  counterpart: {
    id: string;
    fullName: string;
    email: string;
    role: "agent" | "buyer";
  } | null;
  messages: ThreadMessage[];
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
  title: string;
  last_message_preview: string | null;
  last_message_at: string;
  kind: "direct" | "property";
};

type DbProfile = {
  id: string;
  full_name: string;
  email: string;
  role: "agent" | "buyer";
};

type DbMessage = {
  id: string;
  body: string;
  created_at: string;
  sender_profile_id: string | null;
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

function counterpartIdForRelationship(profileId: string, relationship: DbRelationship) {
  return relationship.agent_profile_id === profileId
    ? relationship.buyer_profile_id
    : relationship.agent_profile_id;
}

export async function createOrOpenDirectThread(
  agent: BrowserProfile,
  buyer: DirectoryBuyer,
) {
  const supabase = createSupabaseBrowserClient();

  const { data: existingRelationships, error: relationshipLookupError } = await supabase
    .from("agent_relationships")
    .select("id, agent_profile_id, buyer_profile_id, status")
    .eq("agent_profile_id", agent.id)
    .eq("buyer_profile_id", buyer.id)
    .limit(1);

  if (relationshipLookupError) {
    throw new Error(getErrorMessage(relationshipLookupError, "Unable to check relationships."));
  }

  let relationship = (existingRelationships as DbRelationship[] | null)?.[0] ?? null;

  if (!relationship) {
    const { data: insertedRelationship, error: relationshipInsertError } = await supabase
      .from("agent_relationships")
      .insert({
        agent_profile_id: agent.id,
        buyer_profile_id: buyer.id,
        status: "active",
        activated_at: new Date().toISOString(),
      })
      .select("id, agent_profile_id, buyer_profile_id, status")
      .single<DbRelationship>();

    if (relationshipInsertError || !insertedRelationship) {
      throw new Error(
        getErrorMessage(relationshipInsertError, "Unable to create relationship."),
      );
    }

    relationship = insertedRelationship;
  } else if (relationship.status !== "active") {
    const { error: relationshipUpdateError } = await supabase
      .from("agent_relationships")
      .update({
        status: "active",
        activated_at: new Date().toISOString(),
      })
      .eq("id", relationship.id);

    if (relationshipUpdateError) {
      throw new Error(
        getErrorMessage(relationshipUpdateError, "Unable to activate relationship."),
      );
    }
  }

  const { data: existingThreads, error: threadLookupError } = await supabase
    .from("threads")
    .select("id, relationship_id, title, last_message_preview, last_message_at, kind")
    .eq("relationship_id", relationship.id)
    .eq("kind", "direct")
    .limit(1);

  if (threadLookupError) {
    throw new Error(getErrorMessage(threadLookupError, "Unable to check direct threads."));
  }

  let thread = (existingThreads as DbThread[] | null)?.[0] ?? null;

  if (!thread) {
    const { data: insertedThread, error: threadInsertError } = await supabase
      .from("threads")
      .insert({
        relationship_id: relationship.id,
        property_id: null,
        created_by_profile_id: agent.id,
        kind: "direct",
        title: buyer.full_name,
        summary: `Direct conversation between ${agent.full_name} and ${buyer.full_name}`,
      })
      .select("id, relationship_id, title, last_message_preview, last_message_at, kind")
      .single<DbThread>();

    if (threadInsertError || !insertedThread) {
      throw new Error(getErrorMessage(threadInsertError, "Unable to create thread."));
    }

    thread = insertedThread;
  }

  const { data: existingParticipants, error: participantsLookupError } = await supabase
    .from("thread_participants")
    .select("profile_id")
    .eq("thread_id", thread.id);

  if (participantsLookupError) {
    throw new Error(
      getErrorMessage(participantsLookupError, "Unable to load thread participants."),
    );
  }

  const existingParticipantIds = new Set(
    ((existingParticipants as { profile_id: string }[] | null) ?? []).map(
      (entry) => entry.profile_id,
    ),
  );

  const participantsToInsert = [
    { thread_id: thread.id, profile_id: agent.id },
    { thread_id: thread.id, profile_id: buyer.id },
  ].filter((entry) => !existingParticipantIds.has(entry.profile_id));

  if (participantsToInsert.length) {
    const { error: participantsInsertError } = await supabase
      .from("thread_participants")
      .insert(participantsToInsert);

    if (participantsInsertError) {
      throw new Error(
        getErrorMessage(participantsInsertError, "Unable to add participants to thread."),
      );
    }
  }

  return thread.id;
}

export async function listDirectThreadsForProfile(profile: BrowserProfile) {
  const supabase = createSupabaseBrowserClient();

  const { data: participantRows, error: participantError } = await supabase
    .from("thread_participants")
    .select("thread_id")
    .eq("profile_id", profile.id);

  if (participantError) {
    throw new Error(getErrorMessage(participantError, "Unable to load participant rows."));
  }

  const threadIds = ((participantRows as { thread_id: string }[] | null) ?? []).map(
    (entry) => entry.thread_id,
  );

  if (!threadIds.length) {
    return [] satisfies InboxThread[];
  }

  const { data: threads, error: threadsError } = await supabase
    .from("threads")
    .select("id, relationship_id, title, last_message_preview, last_message_at, kind")
    .in("id", threadIds)
    .eq("kind", "direct")
    .order("last_message_at", { ascending: false });

  if (threadsError) {
    throw new Error(getErrorMessage(threadsError, "Unable to load inbox threads."));
  }

  const directThreads = (threads as DbThread[] | null) ?? [];
  const relationshipIds = Array.from(new Set(directThreads.map((thread) => thread.relationship_id)));

  const { data: relationships, error: relationshipsError } = await supabase
    .from("agent_relationships")
    .select("id, agent_profile_id, buyer_profile_id, status")
    .in("id", relationshipIds);

  if (relationshipsError) {
    throw new Error(getErrorMessage(relationshipsError, "Unable to load relationships."));
  }

  const relationshipMap = new Map(
    ((relationships as DbRelationship[] | null) ?? []).map((relationship) => [relationship.id, relationship]),
  );

  const counterpartIds = Array.from(
    new Set(
      ((relationships as DbRelationship[] | null) ?? [])
        .map((relationship) => counterpartIdForRelationship(profile.id, relationship))
        .filter(Boolean),
    ),
  );

  const { data: counterpartProfiles, error: counterpartProfilesError } = counterpartIds.length
    ? await supabase
        .from("profiles")
        .select("id, full_name, email, role")
        .in("id", counterpartIds)
    : { data: [], error: null };

  if (counterpartProfilesError) {
    throw new Error(
      getErrorMessage(counterpartProfilesError, "Unable to load counterpart profiles."),
    );
  }

  const counterpartMap = new Map(
    ((counterpartProfiles as DbProfile[] | null) ?? []).map((entry) => [entry.id, entry]),
  );

  return directThreads.map((thread) => {
    const relationship = relationshipMap.get(thread.relationship_id) ?? null;
    const counterpartId = relationship
      ? counterpartIdForRelationship(profile.id, relationship)
      : null;
    const counterpart = counterpartId ? counterpartMap.get(counterpartId) ?? null : null;

    return {
      id: thread.id,
      relationshipId: thread.relationship_id,
      title: counterpart?.full_name ?? thread.title,
      lastMessagePreview: thread.last_message_preview ?? "No messages yet",
      lastMessageAt: thread.last_message_at,
      counterpart: counterpart
        ? {
            id: counterpart.id,
            fullName: counterpart.full_name,
            email: counterpart.email,
            role: counterpart.role,
          }
        : null,
    };
  });
}

export async function getThreadSnapshot(threadId: string, profile: BrowserProfile) {
  const supabase = createSupabaseBrowserClient();

  const { data: thread, error: threadError } = await supabase
    .from("threads")
    .select("id, relationship_id, title, last_message_at, kind")
    .eq("id", threadId)
    .eq("kind", "direct")
    .single<{
      id: string;
      relationship_id: string;
      title: string;
      last_message_at: string;
      kind: "direct" | "property";
    }>();

  if (threadError || !thread) {
    throw new Error(getErrorMessage(threadError, "Thread not found."));
  }

  const [{ data: relationship, error: relationshipError }, { data: messages, error: messagesError }] =
    await Promise.all([
      supabase
        .from("agent_relationships")
        .select("id, agent_profile_id, buyer_profile_id, status")
        .eq("id", thread.relationship_id)
        .single<DbRelationship>(),
      supabase
        .from("messages")
        .select("id, body, created_at, sender_profile_id")
        .eq("thread_id", thread.id)
        .order("created_at", { ascending: true }),
    ]);

  if (relationshipError || !relationship) {
    throw new Error(getErrorMessage(relationshipError, "Relationship not found."));
  }

  if (messagesError) {
    throw new Error(getErrorMessage(messagesError, "Unable to load messages."));
  }

  const counterpartId = counterpartIdForRelationship(profile.id, relationship);
  let counterpart: DbProfile | null = null;

  if (counterpartId) {
    const { data: counterpartProfile, error: counterpartError } = await supabase
      .from("profiles")
      .select("id, full_name, email, role")
      .eq("id", counterpartId)
      .single<DbProfile>();

    if (counterpartError) {
      throw new Error(getErrorMessage(counterpartError, "Unable to load counterpart."));
    }

    counterpart = counterpartProfile;
  }

  return {
    id: thread.id,
    relationshipId: thread.relationship_id,
    title: counterpart?.full_name ?? thread.title,
    lastMessageAt: thread.last_message_at,
    counterpart: counterpart
      ? {
          id: counterpart.id,
          fullName: counterpart.full_name,
          email: counterpart.email,
          role: counterpart.role,
        }
      : null,
    messages: ((messages as DbMessage[] | null) ?? []).map((message) => ({
      id: message.id,
      body: message.body,
      createdAt: message.created_at,
      senderProfileId: message.sender_profile_id,
    })),
  } satisfies ThreadSnapshot;
}

export async function sendThreadMessage(threadId: string, senderProfileId: string, body: string) {
  const supabase = createSupabaseBrowserClient();
  const trimmedBody = body.trim();

  if (!trimmedBody) {
    return;
  }

  const { error } = await supabase.from("messages").insert({
    thread_id: threadId,
    sender_profile_id: senderProfileId,
    kind: "user",
    body: trimmedBody,
  });

  if (error) {
    throw new Error(getErrorMessage(error, "Unable to send message."));
  }
}
