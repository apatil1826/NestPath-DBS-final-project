"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAuthenticatedProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function cleanValue(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

export async function createClientAction(formData: FormData) {
  const profile = await requireAuthenticatedProfile();
  const supabase = await createSupabaseServerClient();

  if (profile.role !== "agent") {
    redirect("/settings");
  }

  const fullName = cleanValue(formData.get("fullName"));
  const email = cleanValue(formData.get("email")).toLowerCase();
  const phone = cleanValue(formData.get("phone"));
  const notes = cleanValue(formData.get("notes"));

  if (!fullName) {
    redirect("/clients?error=missing-name");
  }

  const { error } = await supabase.from("clients").insert({
    agent_profile_id: profile.id,
    buyer_profile_id: null,
    full_name: fullName,
    email: email || null,
    phone: phone || null,
    notes: notes || null,
  });

  if (error) {
    throw new Error(`Unable to create client: ${error.message}`);
  }

  revalidatePath("/clients");
  redirect("/clients");
}

export async function archiveClientAction(formData: FormData) {
  const profile = await requireAuthenticatedProfile();
  const supabase = await createSupabaseServerClient();

  if (profile.role !== "agent") {
    redirect("/settings");
  }

  const clientId = cleanValue(formData.get("clientId"));
  const nextStatus = cleanValue(formData.get("status")) === "archived" ? "archived" : "active";

  if (!clientId) {
    redirect("/clients");
  }

  const { error } = await supabase
    .from("clients")
    .update({ status: nextStatus })
    .eq("id", clientId)
    .eq("agent_profile_id", profile.id);

  if (error) {
    throw new Error(`Unable to update client: ${error.message}`);
  }

  revalidatePath("/clients");
  redirect("/clients");
}

