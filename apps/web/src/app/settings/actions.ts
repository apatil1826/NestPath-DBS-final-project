"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAuthenticatedProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ProfileRole } from "@/lib/nestpath-types";

function cleanValue(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

export async function updateProfileSettingsAction(formData: FormData) {
  const profile = await requireAuthenticatedProfile();
  const supabase = await createSupabaseServerClient();

  const roleValue = cleanValue(formData.get("role"));
  const role: ProfileRole = roleValue === "buyer" ? "buyer" : "agent";

  const fullName = cleanValue(formData.get("fullName")) || profile.full_name;

  const { error } = await supabase
    .from("profiles")
    .update({ role, full_name: fullName })
    .eq("id", profile.id);

  if (error) {
    throw new Error(`Unable to update profile: ${error.message}`);
  }

  revalidatePath("/agent");
  revalidatePath("/clients");
  revalidatePath("/settings");
  redirect("/agent");
}

