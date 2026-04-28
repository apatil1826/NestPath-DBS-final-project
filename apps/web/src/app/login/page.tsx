import Link from "next/link";
import { redirect } from "next/navigation";
import { SignInCard } from "@/components/auth/sign-in-card";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUserRoleRedirect, resolveNextPath } from "@/lib/auth";
import { ProfileRole } from "@/lib/nestpath-types";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; role?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect(await getCurrentUserRoleRedirect(params.next));
  }

  const defaultRole: ProfileRole = params.role === "agent" ? "agent" : "buyer";
  const nextPath = resolveNextPath(params.next, defaultRole);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1300px] flex-col gap-8 px-4 py-6 sm:px-6 lg:px-10">
      <section className="overflow-hidden rounded-[36px] border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
        <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_460px]">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-slate-400">NestPath access</p>
            <h1 className="mt-4 max-w-3xl text-5xl font-semibold tracking-tight text-slate-900 sm:text-6xl">
              Sign in with a magic link and land in the right portal.
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-9 text-slate-500">
              This is the first live step of the NestPath stack. Supabase Auth now handles identity,
              while the shared inbox, property threads, and invite flow can build on top of that
              real session state.
            </p>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              <div className="rounded-[26px] border border-slate-200 bg-slate-50 p-5">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Agent</p>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  Multi-thread inbox, summary rail, and buyer coordination.
                </p>
              </div>
              <div className="rounded-[26px] border border-slate-200 bg-slate-50 p-5">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Buyer</p>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  A calmer search hub with property-specific conversations.
                </p>
              </div>
              <div className="rounded-[26px] border border-slate-200 bg-slate-50 p-5">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Default flow</p>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  After auth, we’ll wire realtime messages and live thread records.
                </p>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/agent"
                className="rounded-full border border-slate-200 px-5 py-3 text-sm text-slate-700 transition hover:bg-slate-50"
              >
                Agent preview
              </Link>
              <Link
                href="/buyer"
                className="rounded-full border border-slate-200 px-5 py-3 text-sm text-slate-700 transition hover:bg-slate-50"
              >
                Buyer preview
              </Link>
            </div>
          </div>

          <SignInCard defaultRole={defaultRole} nextPath={nextPath} />
        </div>
      </section>
    </main>
  );
}
