import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1540px] flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8">
      <section className="overflow-hidden rounded-[36px] border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
        <div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div>
            <p className="text-xs uppercase tracking-[0.32em] text-slate-400">
              Design council direction
            </p>
            <h1 className="mt-5 max-w-4xl text-5xl font-semibold tracking-tight text-slate-900 sm:text-6xl">
              A calm shared workspace for one relationship, many property decisions.
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-9 text-slate-500">
              The council recommendation is simple: make the inbox the home screen, make the
              relationship the main container, and let property threads live inside that shared
              workspace. The interface should feel white, editorial, and easy to scan.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/agent"
                className="rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
              >
                Open agent portal
              </Link>
              <Link
                href="/buyer"
                className="rounded-full border border-slate-200 px-5 py-3 text-sm text-slate-700 transition hover:bg-slate-50"
              >
                Open buyer portal
              </Link>
              <Link
                href="/invite/share-roscoe-compare"
                className="rounded-full border border-slate-200 px-5 py-3 text-sm text-slate-700 transition hover:bg-slate-50"
              >
                Preview invite flow
              </Link>
            </div>
          </div>

          <div className="rounded-[30px] border border-slate-200 bg-slate-50 p-6">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Council summary</p>
            <div className="mt-5 space-y-4 text-sm leading-7 text-slate-600">
              <div className="rounded-[22px] border border-slate-200 bg-white p-4">
                <p className="font-semibold text-slate-900">Relationship first</p>
                <p className="mt-1">Do not make the property or deal the top-level container.</p>
              </div>
              <div className="rounded-[22px] border border-slate-200 bg-white p-4">
                <p className="font-semibold text-slate-900">Inbox default</p>
                <p className="mt-1">Open on the inbox, then drill into one shared workspace.</p>
              </div>
              <div className="rounded-[22px] border border-slate-200 bg-white p-4">
                <p className="font-semibold text-slate-900">Property as context</p>
                <p className="mt-1">
                  Use property threads as secondary channels nested under the relationship.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-3">
        <article className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Navigation</p>
          <h2 className="mt-3 text-2xl font-semibold text-slate-900">Inbox, relationships, action items</h2>
          <p className="mt-4 text-sm leading-7 text-slate-500">
            The primary navigation should feel like a calm work tool, not a widget-heavy CRM.
          </p>
        </article>
        <article className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Workspace</p>
          <h2 className="mt-3 text-2xl font-semibold text-slate-900">Direct chat plus property threads</h2>
          <p className="mt-4 text-sm leading-7 text-slate-500">
            The direct chat holds broad planning, while each property gets its own clean thread.
          </p>
        </article>
        <article className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Visual system</p>
          <h2 className="mt-3 text-2xl font-semibold text-slate-900">White, light, quiet, trustworthy</h2>
          <p className="mt-4 text-sm leading-7 text-slate-500">
            Use borders more than shadows, one accent color, and enough whitespace to make a
            high-stakes process feel clear and steady.
          </p>
        </article>
      </section>
    </main>
  );
}
