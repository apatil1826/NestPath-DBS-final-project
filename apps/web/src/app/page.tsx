import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/supabase/env";

export default async function Home() {
  const supabase = hasSupabaseEnv ? await createSupabaseServerClient() : null;
  const {
    data: { user },
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1500px] flex-col gap-8 px-4 py-6 sm:px-6 lg:px-10">
      <section className="overflow-hidden rounded-[40px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(214,165,79,0.24),_transparent_34%),linear-gradient(145deg,_rgba(255,255,255,0.06),_rgba(255,255,255,0.02))] p-8 shadow-[0_28px_90px_rgba(0,0,0,0.32)] sm:p-10">
        <div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div>
            <p className="text-xs uppercase tracking-[0.36em] text-stone-400">
              NestPath v1 direction
            </p>
            <h1 className="mt-5 max-w-4xl text-5xl font-semibold tracking-tight text-stone-50 sm:text-6xl">
              Shared agent-buyer messaging with property-aware threads.
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-9 text-stone-300">
              This first build establishes a long-lived relationship between an agent and one or
              more buyers, then organizes their communication into a broader inbox plus
              property-specific threads. The next live step is wiring these screens to Supabase Auth,
              Postgres, and Realtime.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {user ? (
                <>
                  <Link
                    href="/agent"
                    className="rounded-full bg-[#d6a54f] px-5 py-3 text-sm font-semibold text-[#1d180e] transition hover:bg-[#e5b965]"
                  >
                    Open agent portal
                  </Link>
                  <Link
                    href="/buyer"
                    className="rounded-full border border-white/12 px-5 py-3 text-sm text-stone-200 transition hover:border-white/20 hover:text-stone-50"
                  >
                    Open buyer portal
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/login?role=agent&next=/agent"
                    className="rounded-full bg-[#d6a54f] px-5 py-3 text-sm font-semibold text-[#1d180e] transition hover:bg-[#e5b965]"
                  >
                    Sign in as agent
                  </Link>
                  <Link
                    href="/login?role=buyer&next=/buyer"
                    className="rounded-full border border-white/12 px-5 py-3 text-sm text-stone-200 transition hover:border-white/20 hover:text-stone-50"
                  >
                    Sign in as buyer
                  </Link>
                </>
              )}
              <Link
                href="/invite/share-roscoe-compare"
                className="rounded-full border border-white/12 px-5 py-3 text-sm text-stone-200 transition hover:border-white/20 hover:text-stone-50"
              >
                Preview invite flow
              </Link>
            </div>
          </div>

          <div className="rounded-[32px] border border-white/10 bg-[#111111] p-6">
            <p className="text-xs uppercase tracking-[0.25em] text-stone-500">Build status</p>
            <div className="mt-5 space-y-4 text-sm leading-7 text-stone-300">
              <div className="rounded-[24px] border border-white/8 bg-white/4 p-4">
                <p className="font-semibold text-stone-100">Auth direction</p>
                <p className="mt-1">Supabase Auth for both agent and buyer roles.</p>
              </div>
              <div className="rounded-[24px] border border-white/8 bg-white/4 p-4">
                <p className="font-semibold text-stone-100">Connection model</p>
                <p className="mt-1">
                  Long-lived relationship, with property threads linked under the same pair.
                </p>
              </div>
              <div className="rounded-[24px] border border-white/8 bg-white/4 p-4">
                <p className="font-semibold text-stone-100">Supabase env</p>
                <p className="mt-1">
                  {hasSupabaseEnv
                    ? "Environment variables detected. Ready to wire live clients."
                    : "Environment variables not set yet. UI is using mock data with live-ready structure."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-3">
        <article className="rounded-[32px] border border-white/10 bg-[#151515] p-6">
          <p className="text-xs uppercase tracking-[0.25em] text-stone-500">Portal pair</p>
          <h2 className="mt-3 text-2xl font-semibold text-stone-50">Concurrent UI tracks</h2>
          <p className="mt-4 text-sm leading-7 text-stone-300">
            Agent and buyer portals are being designed side-by-side so the same thread model feels
            coherent from both perspectives.
          </p>
        </article>
        <article className="rounded-[32px] border border-white/10 bg-[#151515] p-6">
          <p className="text-xs uppercase tracking-[0.25em] text-stone-500">Thread model</p>
          <h2 className="mt-3 text-2xl font-semibold text-stone-50">Inbox plus property context</h2>
          <p className="mt-4 text-sm leading-7 text-stone-300">
            The inbox supports broader relationship messaging, while property threads capture
            evaluations, disclosures, offers, and comparisons in a cleaner way.
          </p>
        </article>
        <article className="rounded-[32px] border border-white/10 bg-[#151515] p-6">
          <p className="text-xs uppercase tracking-[0.25em] text-stone-500">Connect flow</p>
          <h2 className="mt-3 text-2xl font-semibold text-stone-50">Email and share link invites</h2>
          <p className="mt-4 text-sm leading-7 text-stone-300">
            The schema supports both email-address invites and copyable links, so the agent can
            invite buyers however they already work today.
          </p>
        </article>
      </section>
    </main>
  );
}
