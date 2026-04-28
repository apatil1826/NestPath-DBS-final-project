export function BuyerEmptyState() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[960px] flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8">
      <section className="rounded-[36px] border border-slate-200 bg-white p-8 text-center shadow-sm sm:p-10">
        <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Buyer workspace</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
          No shared workspace yet.
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-slate-500">
          Use the invite link from your agent to join a relationship. Once you accept, your direct
          conversation and any property threads will appear here automatically.
        </p>
      </section>
    </main>
  );
}
