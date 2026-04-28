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
      <section className="overflow-hidden rounded-[40px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(214,165,79,0.22),_transparent_36%),linear-gradient(145deg,_rgba(255,255,255,0.05),_rgba(255,255,255,0.02))] p-8 shadow-[0_28px_90px_rgba(0,0,0,0.3)] sm:p-10">
        <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_460px]">
          <div>
            <p className="text-xs uppercase tracking-[0.34em] text-stone-400">NestPath access</p>
            <h1 className="mt-4 max-w-3xl text-5xl font-semibold tracking-tight text-stone-50 sm:text-6xl">
              Sign in with a magic link and land in the right portal.
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-9 text-stone-300">
              This is the first live step of the NestPath stack. Supabase Auth now handles identity,
              while the shared inbox, property threads, and invite flow can build on top of that
              real session state.
            </p>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              <div className="rounded-[28px] border border-white/10 bg-white/4 p-5">
                <p className="text-xs uppercase tracking-[0.24em] text-stone-500">Agent</p>
                <p className="mt-3 text-sm leading-7 text-stone-300">
                  Multi-thread inbox, summary rail, and buyer coordination.
                </p>
              </div>
              <div className="rounded-[28px] border border-white/10 bg-white/4 p-5">
                <p className="text-xs uppercase tracking-[0.24em] text-stone-500">Buyer</p>
                <p className="mt-3 text-sm leading-7 text-stone-300">
                  A calmer search hub with property-specific conversations.
                </p>
              </div>
              <div className="rounded-[28px] border border-white/10 bg-white/4 p-5">
                <p className="text-xs uppercase tracking-[0.24em] text-stone-500">Next</p>
                <p className="mt-3 text-sm leading-7 text-stone-300">
                  After auth, we’ll wire realtime messages and live thread records.
                </p>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/agent"
                className="rounded-full border border-white/12 px-5 py-3 text-sm text-stone-200 transition hover:border-white/20 hover:text-stone-50"
              >
                Agent preview
              </Link>
              <Link
                href="/buyer"
                className="rounded-full border border-white/12 px-5 py-3 text-sm text-stone-200 transition hover:border-white/20 hover:text-stone-50"
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
