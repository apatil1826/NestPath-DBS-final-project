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
  // Agent portal is the only supported UI route right now.
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

  // We currently support an agent-only portal. Default everyone to agent.
  const role: ProfileRole = "agent";
  const fullName =
    user.user_metadata.full_name ||
    user.user_metadata.name ||
    user.email.split("@")[0] ||
    "NestPath User";

  const { data, error } = await supabase
    .from("profiles")
    .upsert(
      {
        id: user.id,
        role,
        full_name: fullName,
        email: user.email,
      },
      { onConflict: "id" },
    )
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
