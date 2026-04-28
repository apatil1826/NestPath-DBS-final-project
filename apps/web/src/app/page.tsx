import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1500px] flex-col gap-8 px-4 py-6 sm:px-6 lg:px-10">
      <section className="overflow-hidden rounded-[40px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(214,165,79,0.24),_transparent_34%),linear-gradient(145deg,_rgba(255,255,255,0.06),_rgba(255,255,255,0.02))] p-8 shadow-[0_28px_90px_rgba(0,0,0,0.32)] sm:p-10">
        <div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div>
            <p className="text-xs uppercase tracking-[0.36em] text-stone-400">
              NestPath public preview
            </p>
            <h1 className="mt-5 max-w-4xl text-5xl font-semibold tracking-tight text-stone-50 sm:text-6xl">
              Shared agent-buyer messaging with property-aware threads.
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-9 text-stone-300">
              The full app is visible now as a public preview: a broad inbox, property-specific
              threads, buyer-agent invite flows, and separate agent and buyer perspectives built
              around the same relationship.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
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
                <p className="font-semibold text-stone-100">Preview mode</p>
                <p className="mt-1">The portals are currently public so the full app is visible.</p>
              </div>
              <div className="rounded-[24px] border border-white/8 bg-white/4 p-4">
                <p className="font-semibold text-stone-100">Connection model</p>
                <p className="mt-1">
                  Long-lived relationship, with property threads linked under the same pair.
                </p>
              </div>
              <div className="rounded-[24px] border border-white/8 bg-white/4 p-4">
                <p className="font-semibold text-stone-100">Next integration</p>
                <p className="mt-1">
                  Re-enable auth gates and live realtime threads after the Tailwind deployment path
                  is stable again.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-3">
        <article className="rounded-[32px] border border-white/10 bg-[#151515] p-6">
          <p className="text-xs uppercase tracking-[0.25em] text-stone-500">Relationship model</p>
          <h2 className="mt-3 text-2xl font-semibold text-stone-50">Long-lived client connection</h2>
          <p className="mt-4 text-sm leading-7 text-stone-300">
            One agent can work with multiple buyers over time, while property-specific threads stay
            organized underneath that relationship.
          </p>
        </article>
        <article className="rounded-[32px] border border-white/10 bg-[#151515] p-6">
          <p className="text-xs uppercase tracking-[0.25em] text-stone-500">Messaging model</p>
          <h2 className="mt-3 text-2xl font-semibold text-stone-50">Inbox plus property threads</h2>
          <p className="mt-4 text-sm leading-7 text-stone-300">
            There is a broad direct channel for ongoing coordination and dedicated channels for each
            property under review.
          </p>
        </article>
        <article className="rounded-[32px] border border-white/10 bg-[#151515] p-6">
          <p className="text-xs uppercase tracking-[0.25em] text-stone-500">Build direction</p>
          <h2 className="mt-3 text-2xl font-semibold text-stone-50">Supabase + Vercel path</h2>
          <p className="mt-4 text-sm leading-7 text-stone-300">
            The next layer is live auth, database-backed threads, and realtime sync once the
            deployment baseline is stable.
          </p>
        </article>
      </section>
    </main>
  );
}
