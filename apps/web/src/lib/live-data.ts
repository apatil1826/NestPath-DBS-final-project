import { PortalSnapshot, ProfileRole } from "@/lib/nestpath-types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type DbProfile = {
  id: string;
  role: ProfileRole;
  full_name: string;
  email: string;
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
  summary: string | null;
  last_message_preview: string | null;
  last_message_at: string;
};

type DbProperty = {
  id: string;
  relationship_id: string;
  title: string;
  address_line_1: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  stage: PortalSnapshot["properties"][number]["stage"];
  is_primary: boolean;
};

type DbInvite = {
  id: string;
  relationship_id: string;
  property_id: string | null;
  buyer_email: string | null;
  buyer_full_name: string | null;
  channel: "email" | "link";
  status: "pending" | "accepted" | "revoked" | "expired";
  token: string;
  expires_at: string;
};

type DbActionItem = {
  id: string;
  relationship_id: string;
  thread_id: string | null;
  property_id: string | null;
  title: string;
  status: "open" | "in_progress" | "done";
  assignee_profile_id: string | null;
};

type DbMessage = {
  id: string;
  thread_id: string;
  sender_profile_id: string | null;
  kind: "user" | "system";
  body: string;
  created_at: string;
};

function mapProfile(profile: DbProfile) {
  return {
    id: profile.id,
    role: profile.role,
    fullName: profile.full_name,
    email: profile.email,
  };
}

function mapAddress(property: DbProperty) {
  return [
    property.address_line_1,
    property.city,
    property.state,
    property.postal_code,
  ]
    .filter(Boolean)
    .join(", ");
}

export async function getWorkspaceSnapshotForProfile(
  viewer: DbProfile,
): Promise<PortalSnapshot | null> {
  const supabase = await createSupabaseServerClient();
  const relationshipColumn =
    viewer.role === "agent" ? "agent_profile_id" : "buyer_profile_id";

  const { data: relationships, error: relationshipsError } = await supabase
    .from("agent_relationships")
    .select("id, agent_profile_id, buyer_profile_id, status")
    .eq(relationshipColumn, viewer.id)
    .order("created_at", { ascending: false });

  if (relationshipsError) {
    throw new Error(`Unable to load relationships: ${relationshipsError.message}`);
  }

  const relationship = (relationships as DbRelationship[] | null)?.[0];

  if (!relationship) {
    return null;
  }

  const { data: invites, error: invitesError } = await supabase
    .from("invites")
    .select(
      "id, relationship_id, property_id, buyer_email, buyer_full_name, channel, status, token, expires_at",
    )
    .eq("relationship_id", relationship.id)
    .order("created_at", { ascending: false });

  if (invitesError) {
    throw new Error(`Unable to load invites: ${invitesError.message}`);
  }

  const counterpartIds = [relationship.agent_profile_id, relationship.buyer_profile_id]
    .filter(Boolean)
    .filter((id) => id !== viewer.id);

  const { data: counterpartProfiles, error: counterpartProfilesError } = counterpartIds.length
    ? await supabase
        .from("profiles")
        .select("id, role, full_name, email")
        .in("id", counterpartIds)
    : { data: [], error: null };

  if (counterpartProfilesError) {
    throw new Error(
      `Unable to load relationship members: ${counterpartProfilesError.message}`,
    );
  }

  const { data: properties, error: propertiesError } = await supabase
    .from("properties")
    .select(
      "id, relationship_id, title, address_line_1, city, state, postal_code, stage, is_primary",
    )
    .eq("relationship_id", relationship.id)
    .order("created_at", { ascending: true });

  if (propertiesError) {
    throw new Error(`Unable to load properties: ${propertiesError.message}`);
  }

  const { data: threads, error: threadsError } = await supabase
    .from("threads")
    .select(
      "id, relationship_id, property_id, kind, title, summary, last_message_preview, last_message_at",
    )
    .eq("relationship_id", relationship.id)
    .order("last_message_at", { ascending: false });

  if (threadsError) {
    throw new Error(`Unable to load threads: ${threadsError.message}`);
  }

  const threadRows = (threads as DbThread[] | null) ?? [];
  const activeThread =
    threadRows.find((thread) => thread.kind === "direct") ?? threadRows[0] ?? null;

  if (!activeThread) {
    return null;
  }

  const { data: messages, error: messagesError } = await supabase
    .from("messages")
    .select("id, thread_id, sender_profile_id, kind, body, created_at")
    .eq("thread_id", activeThread.id)
    .order("created_at", { ascending: true });

  if (messagesError) {
    throw new Error(`Unable to load messages: ${messagesError.message}`);
  }

  const { data: participants, error: participantsError } = await supabase
    .from("thread_participants")
    .select("profile_id")
    .eq("thread_id", activeThread.id);

  if (participantsError) {
    throw new Error(`Unable to load thread participants: ${participantsError.message}`);
  }

  const participantIds = ((participants as { profile_id: string }[] | null) ?? []).map(
    (entry) => entry.profile_id,
  );

  const { data: participantProfiles, error: participantProfilesError } = participantIds.length
    ? await supabase
        .from("profiles")
        .select("id, role, full_name, email")
        .in("id", participantIds)
    : { data: [], error: null };

  if (participantProfilesError) {
    throw new Error(
      `Unable to load participant profiles: ${participantProfilesError.message}`,
    );
  }

  const { data: actionItems, error: actionItemsError } = await supabase
    .from("action_items")
    .select("id, relationship_id, thread_id, property_id, title, status, assignee_profile_id")
    .eq("relationship_id", relationship.id)
    .order("created_at", { ascending: false });

  if (actionItemsError) {
    throw new Error(`Unable to load action items: ${actionItemsError.message}`);
  }

  const propertyMap = new Map(
    ((properties as DbProperty[] | null) ?? []).map((property) => [
      property.id,
      {
        id: property.id,
        relationshipId: property.relationship_id,
        title: property.title,
        address: mapAddress(property),
        stage: property.stage,
        isPrimary: property.is_primary,
      },
    ]),
  );

  const mappedThreads = threadRows.map((thread) => ({
    id: thread.id,
    relationshipId: thread.relationship_id,
    propertyId: thread.property_id,
    kind: thread.kind,
    title: thread.title,
    summary: thread.summary ?? "",
    lastMessagePreview: thread.last_message_preview ?? "No messages yet",
    lastMessageAt: thread.last_message_at,
    unreadCount: 0,
  }));

  const mappedInvites = ((invites as DbInvite[] | null) ?? []).map((invite) => ({
    id: invite.id,
    relationshipId: invite.relationship_id,
    propertyId: invite.property_id,
    buyerEmail: invite.buyer_email,
    buyerFullName: invite.buyer_full_name,
    channel: invite.channel,
    status: invite.status,
    token: invite.token,
    expiresAt: invite.expires_at,
  }));

  const relationshipLabel =
    (counterpartProfiles as DbProfile[] | null)?.[0]?.full_name ||
    mappedInvites[0]?.buyerFullName ||
    mappedInvites[0]?.buyerEmail ||
    "Pending relationship";

  return {
    viewer: mapProfile(viewer),
    counterparts: ((counterpartProfiles as DbProfile[] | null) ?? []).map(mapProfile),
    relationship: {
      id: relationship.id,
      agentProfileId: relationship.agent_profile_id,
      buyerProfileId: relationship.buyer_profile_id,
      status: relationship.status,
    },
    relationshipLabel,
    activeThread: {
      ...mappedThreads.find((thread) => thread.id === activeThread.id)!,
      property: activeThread.property_id ? propertyMap.get(activeThread.property_id) ?? null : null,
      participants: ((participantProfiles as DbProfile[] | null) ?? []).map(mapProfile),
      messages: ((messages as DbMessage[] | null) ?? []).map((message) => ({
        id: message.id,
        threadId: message.thread_id,
        senderProfileId: message.sender_profile_id,
        kind: message.kind,
        body: message.body,
        createdAt: message.created_at,
      })),
    },
    threads: mappedThreads,
    properties: Array.from(propertyMap.values()),
    invites: mappedInvites,
    actionItems: ((actionItems as DbActionItem[] | null) ?? []).map((item) => ({
      id: item.id,
      relationshipId: item.relationship_id,
      threadId: item.thread_id,
      propertyId: item.property_id,
      title: item.title,
      status: item.status,
      assigneeProfileId: item.assignee_profile_id,
    })),
  };
}

export async function getInvitePreview(token: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("get_invite_preview", {
    target_token: token,
  });

  if (error) {
    throw new Error(`Unable to load invite preview: ${error.message}`);
  }

  return (data as
    | {
        invite_id: string;
        relationship_id: string;
        channel: "email" | "link";
        status: "pending" | "accepted" | "revoked" | "expired";
        buyer_email: string | null;
        buyer_full_name: string | null;
        property_title: string | null;
        property_address: string | null;
        thread_title: string | null;
        agent_name: string | null;
        expires_at: string;
      }[]
    | null)?.[0] ?? null;
}
