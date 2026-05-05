"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { ProfileRole } from "@/lib/nestpath-types";

export type BrowserProfile = {
  id: string;
  role: ProfileRole;
  full_name: string;
  email: string;
};

function deriveFullName(email: string, metadataName?: string | null) {
  return metadataName || email.split("@")[0] || "NestPath User";
}

export async function getOrCreateBrowserProfile() {
  const supabase = createSupabaseBrowserClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw userError;
  }

  if (!user || !user.email) {
    return null;
  }

  const { data: existingProfiles, error: profileLookupError } = await supabase
    .from("profiles")
    .select("id, role, full_name, email")
    .eq("id", user.id)
    .limit(1);

  if (profileLookupError) {
    throw profileLookupError;
  }

  const existing = (existingProfiles as BrowserProfile[] | null)?.[0];
  const fullName = deriveFullName(
    user.email,
    (user.user_metadata.full_name as string | undefined) ||
      (user.user_metadata.name as string | undefined),
  );

  if (existing) {
    if (existing.full_name !== fullName || existing.email !== user.email) {
      const { error: syncError } = await supabase
        .from("profiles")
        .update({ full_name: fullName, email: user.email })
        .eq("id", user.id);

      if (syncError) {
        throw syncError;
      }
    }

    return existing;
  }

  const role: ProfileRole = user.user_metadata.role === "buyer" ? "buyer" : "agent";

  const { data: insertedProfile, error: insertError } = await supabase
    .from("profiles")
    .insert({
      id: user.id,
      role,
      full_name: fullName,
      email: user.email,
    })
    .select("id, role, full_name, email")
    .single<BrowserProfile>();

  if (insertError) {
    throw insertError;
  }

  return insertedProfile;
}

