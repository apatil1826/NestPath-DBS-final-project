import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ProfileRole } from "@/lib/nestpath-types";

type DbProfile = {
  id: string;
  role: ProfileRole;
  full_name: string;
  email: string;
};

function getSafeRedirectPath(next: string | null | undefined, fallback: string) {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return fallback;
  }

  return next;
}

function getRoleHome() {
  return "/agent";
}

export async function syncProfileFromSession() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.email) {
    return null;
  }

  const fullName =
    user.user_metadata.full_name ||
    user.user_metadata.name ||
    user.email.split("@")[0] ||
    "NestPath User";

  const { data: existingProfiles, error: existingError } = await supabase
    .from("profiles")
    .select("id, role, full_name, email")
    .eq("id", user.id)
    .limit(1);

  if (existingError) {
    throw new Error(`Unable to load profile: ${existingError.message}`);
  }

  const existing = (existingProfiles as DbProfile[] | null)?.[0];

  if (existing) {
    // Keep role stable; let the user change it via settings (profiles table).
    if (existing.full_name !== fullName || existing.email !== user.email) {
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ full_name: fullName, email: user.email })
        .eq("id", user.id);

      if (updateError) {
        throw new Error(`Unable to sync profile: ${updateError.message}`);
      }
    }

    return existing;
  }

  const metadataRole = user.user_metadata.role;
  const role: ProfileRole = metadataRole === "buyer" ? "buyer" : "agent";

  const { data, error } = await supabase
    .from("profiles")
    .insert({
      id: user.id,
      role,
      full_name: fullName,
      email: user.email,
    })
    .select("id, role, full_name, email")
    .single<DbProfile>();

  if (error) {
    throw new Error(`Unable to sync profile: ${error.message}`);
  }

  return data;
}

export async function requireAuthenticatedProfile(expectedRole?: ProfileRole) {
  const profile = await syncProfileFromSession();

  if (!profile) {
    const fallback = expectedRole ? getRoleHome() : "/agent";
    redirect(`/login?next=${encodeURIComponent(fallback)}`);
  }

  if (expectedRole && profile.role !== expectedRole) {
    redirect(getRoleHome());
  }

  return profile;
}

export async function getCurrentUserRoleRedirect(next: string | null | undefined) {
  const profile = await syncProfileFromSession();
  const fallback = profile ? getRoleHome() : "/";

  return getSafeRedirectPath(next, fallback);
}

export function resolveNextPath(next: string | null | undefined) {
  return getSafeRedirectPath(next, getRoleHome());
}
