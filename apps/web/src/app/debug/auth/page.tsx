import { cookies } from "next/headers";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function AuthDebugPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  const cookieStore = await cookies();
  const cookieNames = cookieStore.getAll().map((cookie) => cookie.name).sort();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1100px] flex-col gap-6 px-4 py-6 sm:px-6 lg:px-10">
      <header className="rounded-[30px] border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Debug</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
          Auth visibility
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-8 text-slate-500">
          This page is safe to share as text; it only shows cookie names, not values.
        </p>
      </header>

      <section className="rounded-[30px] border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold text-slate-900">Server sees user</p>
        <p className="mt-2 font-mono text-sm text-slate-700">
          {user ? user.id : "null"}
        </p>
        {error ? (
          <p className="mt-3 text-sm text-rose-700">Error: {error.message}</p>
        ) : null}

        <div className="mt-8">
          <p className="text-sm font-semibold text-slate-900">Cookie names</p>
          <div className="mt-3 rounded-[22px] border border-slate-200 bg-slate-50 p-4">
            <pre className="whitespace-pre-wrap break-words text-xs text-slate-700">
{cookieNames.length ? cookieNames.join("\n") : "(no cookies)"}
            </pre>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/agent"
            className="rounded-full border border-slate-200 px-5 py-3 text-sm text-slate-700 transition hover:bg-slate-50"
          >
            Portal
          </Link>
          <Link
            href="/login"
            className="rounded-full border border-slate-200 px-5 py-3 text-sm text-slate-700 transition hover:bg-slate-50"
          >
            Login
          </Link>
        </div>
      </section>
    </main>
  );
}

