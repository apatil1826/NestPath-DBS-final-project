import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseEnv } from "@/lib/supabase/env";

export async function POST(request: NextRequest) {
  const env = getSupabaseEnv();
  const response = NextResponse.json({ ok: true }, { headers: { "cache-control": "no-store" } });
  const cookiesSet: string[] = [];

  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookieOptions: {
        path: "/",
        sameSite: "lax",
        secure: true,
      },
      auth: {
        // Ensure a stable cookie key name so client/server/middleware agree.
        storageKey: "sb-auth-token",
      },
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookiesSet.push(name);
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const body = (await request.json().catch(() => null)) as
    | { access_token?: string; refresh_token?: string }
    | null;

  if (!body?.access_token || !body?.refresh_token) {
    return NextResponse.json({ ok: false, error: "missing_tokens" }, { status: 400 });
  }

  const { error } = await supabase.auth.setSession({
    access_token: body.access_token,
    refresh_token: body.refresh_token,
  });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 401 });
  }

  // Force a read to ensure any auth state change flushes cookie storage.
  await supabase.auth.getUser();

  return NextResponse.json(
    { ok: true, cookies_set: cookiesSet },
    { headers: { "cache-control": "no-store" } },
  );
}
