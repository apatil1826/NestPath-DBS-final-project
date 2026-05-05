import { requireAuthenticatedProfile } from "@/lib/auth";
import Link from "next/link";

export default async function AgentPortalPage() {
  const profile = await requireAuthenticatedProfile();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1200px] flex-col gap-8 px-4 py-6 sm:px-6 lg:px-10">
      <header className="flex flex-col gap-3 rounded-[30px] border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-xs uppercase tracking-[0.22em] text-slate-400">NestPath portal</p>
        <h1 className="text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
          Welcome, {profile.full_name}.
        </h1>
        <p className="max-w-3xl text-base leading-8 text-slate-500">
          You’re signed in. Your current mode is{" "}
          <span className="font-semibold text-slate-700">{profile.role}</span>. The UI and features
          will adapt based on what you pick in settings.
        </p>

        <div className="mt-2 flex flex-wrap gap-3">
          {profile.role === "agent" ? (
            <Link
              href="/clients"
              className="rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              Client directory
            </Link>
          ) : (
            <Link
              href="/settings"
              className="rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              Switch to agent mode
            </Link>
          )}
          <Link
            href="/settings"
            className="rounded-full border border-slate-200 px-5 py-3 text-sm text-slate-700 transition hover:bg-slate-50"
          >
            Settings
          </Link>
          <Link
            href="/auth/sign-out"
            className="rounded-full border border-slate-200 px-5 py-3 text-sm text-slate-700 transition hover:bg-slate-50"
          >
            Sign out
          </Link>
        </div>
      </header>

      <section className="grid gap-5 lg:grid-cols-3">
        <article className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Next build step</p>
          <h2 className="mt-3 text-2xl font-semibold text-slate-900">Agent inbox</h2>
          <p className="mt-4 text-sm leading-7 text-slate-500">
            A lightweight inbox of conversations, with a simple message composer and realtime
            updates.
          </p>
        </article>
        <article className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Next build step</p>
          <h2 className="mt-3 text-2xl font-semibold text-slate-900">Client directory</h2>
          <p className="mt-4 text-sm leading-7 text-slate-500">
            A searchable list of buyers/clients (later), but for now a clean place to track who
            you’re working with.
          </p>
        </article>
        <article className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Next build step</p>
          <h2 className="mt-3 text-2xl font-semibold text-slate-900">Property pipeline</h2>
          <p className="mt-4 text-sm leading-7 text-slate-500">
            A calm list of properties being considered, with notes and action items attached.
          </p>
        </article>
      </section>
    </main>
  );
}
