import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { syncProfileFromSession } from "@/lib/auth";

function safeNextPath(next: string | null) {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return "/";
  }

  return next;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = safeNextPath(url.searchParams.get("next"));

  if (code) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.exchangeCodeForSession(code);
    const profile = await syncProfileFromSession();

    if (profile) {
      return NextResponse.redirect(new URL(profile.role === "agent" ? next : next, url.origin));
    }
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
