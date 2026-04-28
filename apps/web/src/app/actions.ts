"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAuthenticatedProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function cleanValue(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function getBaseUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
}

export async function createRelationshipInviteAction(formData: FormData) {
  const profile = await requireAuthenticatedProfile("agent");
  const supabase = await createSupabaseServerClient();

  const buyerEmail = cleanValue(formData.get("buyerEmail")).toLowerCase();
  const buyerFullName = cleanValue(formData.get("buyerFullName"));
  const channelValue = cleanValue(formData.get("channel"));
  const channel = channelValue === "link" ? "link" : "email";

  if (channel === "email" && !buyerEmail) {
    redirect("/agent?error=buyer-email-required");
  }

  const { data: relationship, error: relationshipError } = await supabase
    .from("agent_relationships")
    .insert({
      agent_profile_id: profile.id,
      buyer_profile_id: null,
      status: "invited",
    })
    .select("id")
    .single<{ id: string }>();

  if (relationshipError || !relationship) {
    throw new Error(`Unable to create relationship: ${relationshipError?.message}`);
  }

  const directThreadTitle = buyerFullName || buyerEmail || "New buyer relationship";

  const { data: directThread, error: directThreadError } = await supabase
    .from("threads")
    .insert({
      relationship_id: relationship.id,
      property_id: null,
      created_by_profile_id: profile.id,
      kind: "direct",
      title: directThreadTitle,
      summary: "Shared relationship conversation",
    })
    .select("id")
    .single<{ id: string }>();

  if (directThreadError || !directThread) {
    throw new Error(`Unable to create direct thread: ${directThreadError?.message}`);
  }

  const { error: participantError } = await supabase.from("thread_participants").insert({
    thread_id: directThread.id,
    profile_id: profile.id,
  });

  if (participantError) {
    throw new Error(`Unable to add agent to thread: ${participantError.message}`);
  }

  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { error: inviteError } = await supabase.from("invites").insert({
    relationship_id: relationship.id,
    property_id: null,
    created_by_profile_id: profile.id,
    buyer_email: channel === "email" ? buyerEmail : null,
    buyer_full_name: buyerFullName || null,
    token,
    channel,
    expires_at: expiresAt,
  });

  if (inviteError) {
    throw new Error(`Unable to create invite: ${inviteError.message}`);
  }

  revalidatePath("/agent");
  redirect(
    `/agent?invite=${encodeURIComponent(`${getBaseUrl()}/invite/${token}`)}`,
  );
}

export async function sendMessageAction(formData: FormData) {
  const profile = await requireAuthenticatedProfile();
  const supabase = await createSupabaseServerClient();
  const threadId = cleanValue(formData.get("threadId"));
  const body = cleanValue(formData.get("body"));
  const redirectTo = cleanValue(formData.get("redirectTo")) || "/";

  if (!threadId || !body) {
    redirect(redirectTo);
  }

  const { error } = await supabase.from("messages").insert({
    thread_id: threadId,
    sender_profile_id: profile.id,
    kind: "user",
    body,
  });

  if (error) {
    throw new Error(`Unable to send message: ${error.message}`);
  }

  revalidatePath(redirectTo);
  redirect(redirectTo);
}

export async function acceptInviteAction(formData: FormData) {
  await requireAuthenticatedProfile("buyer");
  const supabase = await createSupabaseServerClient();
  const token = cleanValue(formData.get("token"));

  const { error } = await supabase.rpc("accept_invite", {
    target_token: token,
  });

  if (error) {
    throw new Error(`Unable to accept invite: ${error.message}`);
  }

  revalidatePath("/buyer");
  redirect("/buyer");
}
