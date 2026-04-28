import { createRelationshipInviteAction } from "@/app/actions";

export function AgentEmptyState({
  inviteLink,
}: {
  inviteLink?: string;
}) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1100px] flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8">
      <section className="rounded-[36px] border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
        <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Agent workspace</p>
        <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
          Start your first buyer relationship.
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-8 text-slate-500">
          This is now live data. Creating a relationship here writes directly to Supabase, creates a
          direct thread, and generates a real invite link for the buyer.
        </p>

        {inviteLink ? (
          <div className="mt-6 rounded-[24px] border border-emerald-200 bg-emerald-50 p-5">
            <p className="text-sm font-semibold text-emerald-800">Invite created</p>
            <p className="mt-3 rounded-2xl border border-emerald-200 bg-white px-4 py-4 font-mono text-sm text-emerald-700">
              {inviteLink}
            </p>
          </div>
        ) : null}

        <form action={createRelationshipInviteAction} className="mt-8 grid gap-4 lg:grid-cols-2">
          <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Buyer name</span>
              <input
                name="buyerFullName"
                className="w-full rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
                placeholder="Jordan Lee"
              />
            </label>

            <label className="mt-4 block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Buyer email</span>
              <input
                name="buyerEmail"
                type="email"
                className="w-full rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
                placeholder="buyer@example.com"
              />
            </label>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
            <p className="text-sm font-medium text-slate-700">Invite method</p>
            <div className="mt-4 space-y-3">
              <label className="flex cursor-pointer items-start gap-3 rounded-[20px] border border-slate-200 bg-white p-4">
                <input type="radio" name="channel" value="email" defaultChecked className="mt-1" />
                <div>
                  <p className="text-sm font-semibold text-slate-900">Send email invite</p>
                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    Stores the buyer email on the invite so they can accept with the matching
                    account.
                  </p>
                </div>
              </label>
              <label className="flex cursor-pointer items-start gap-3 rounded-[20px] border border-slate-200 bg-white p-4">
                <input type="radio" name="channel" value="link" className="mt-1" />
                <div>
                  <p className="text-sm font-semibold text-slate-900">Generate shareable link</p>
                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    Creates a live link you can paste into text or email yourself.
                  </p>
                </div>
              </label>
            </div>

            <button className="mt-6 rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700">
              Create relationship
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
