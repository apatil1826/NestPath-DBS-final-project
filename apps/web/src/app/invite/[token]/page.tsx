import Link from "next/link";
import { getInviteByToken, getPropertyById, getThreadForInvite } from "@/lib/mock-data";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const invite = getInviteByToken(token);

  if (!invite) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center justify-center px-6 py-20 text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-stone-500">Invite</p>
        <h1 className="mt-4 text-4xl font-semibold text-stone-50">Invite not found</h1>
        <p className="mt-4 max-w-xl text-base leading-8 text-stone-300">
          This connection link is missing or expired. In the live app, the buyer would be prompted
          to request a fresh invite from their agent.
        </p>
        <Link
          href="/"
          className="mt-8 rounded-full bg-[#d6a54f] px-5 py-3 text-sm font-semibold text-[#1d180e]"
        >
          Back to NestPath
        </Link>
      </main>
    );
  }

  const property = getPropertyById(invite.propertyId);
  const thread = getThreadForInvite(invite);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center px-6 py-20">
      <div className="rounded-[40px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(214,165,79,0.2),_transparent_32%),linear-gradient(135deg,_rgba(255,255,255,0.06),_rgba(255,255,255,0.03))] p-8 shadow-[0_28px_80px_rgba(0,0,0,0.34)]">
        <p className="text-xs uppercase tracking-[0.32em] text-stone-400">Invite landing</p>
        <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-stone-50 sm:text-5xl">
          Join a NestPath workspace and start a shared search conversation.
        </h1>
        <p className="mt-5 max-w-3xl text-base leading-8 text-stone-300">
          This invite can create a long-lived buyer-agent relationship and optionally drop the buyer
          directly into a property-specific thread.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-[28px] border border-white/10 bg-white/5 p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-stone-500">Channel</p>
            <p className="mt-3 text-2xl font-semibold text-stone-50">{invite.channel}</p>
          </div>
          <div className="rounded-[28px] border border-white/10 bg-white/5 p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-stone-500">Target thread</p>
            <p className="mt-3 text-2xl font-semibold text-stone-50">
              {thread?.title ?? "General inbox"}
            </p>
          </div>
          <div className="rounded-[28px] border border-white/10 bg-white/5 p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-stone-500">Property context</p>
            <p className="mt-3 text-2xl font-semibold text-stone-50">
              {property?.title ?? "No property bound"}
            </p>
          </div>
        </div>

        <div className="mt-8 rounded-[32px] border border-white/10 bg-[#111111] p-6">
          <p className="text-sm text-stone-300">
            In the live Supabase-auth flow, clicking accept would either:
          </p>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-7 text-stone-300">
            <li>Sign the buyer in with Supabase Auth if they already have an account.</li>
            <li>Create a buyer account after auth and attach them to the relationship.</li>
            <li>Add them to the thread participants table and open the shared inbox immediately.</li>
          </ul>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/buyer"
              className="rounded-full bg-[#d6a54f] px-5 py-3 text-sm font-semibold text-[#1d180e]"
            >
              Preview buyer portal
            </Link>
            <Link
              href="/agent"
              className="rounded-full border border-white/12 px-5 py-3 text-sm text-stone-200"
            >
              Preview agent portal
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
