import Link from "next/link";
import { requireAuthenticatedProfile } from "@/lib/auth";
import { updateProfileSettingsAction } from "@/app/settings/actions";

export default async function SettingsPage() {
  const profile = await requireAuthenticatedProfile();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1100px] flex-col gap-8 px-4 py-6 sm:px-6 lg:px-10">
      <header className="rounded-[30px] border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Profile settings</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
          Settings
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-8 text-slate-500">
          Choose which mode you’re in. The UI will adapt based on your selection.
        </p>
      </header>

      <section className="rounded-[30px] border border-slate-200 bg-white p-8 shadow-sm">
        <form action={updateProfileSettingsAction} className="grid gap-6 lg:grid-cols-2">
          <div>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Full name</span>
              <input
                name="fullName"
                defaultValue={profile.full_name}
                className="w-full rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
              />
            </label>

            <p className="mt-3 text-sm leading-7 text-slate-500">
              Email: <span className="font-mono text-slate-700">{profile.email}</span>
            </p>
          </div>

          <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-6">
            <p className="text-sm font-semibold text-slate-900">Mode</p>
            <p className="mt-2 text-sm leading-7 text-slate-500">
              Agent mode unlocks client directory and (soon) messaging. Buyer mode will later show a
              simpler search workspace view.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="flex cursor-pointer items-start gap-3 rounded-[18px] border border-slate-200 bg-white p-4">
                <input
                  type="radio"
                  name="role"
                  value="agent"
                  defaultChecked={profile.role === "agent"}
                  className="mt-1"
                />
                <div>
                  <p className="text-sm font-semibold text-slate-900">Agent</p>
                  <p className="mt-1 text-sm leading-6 text-slate-500">Clients, pipeline, inbox.</p>
                </div>
              </label>

              <label className="flex cursor-pointer items-start gap-3 rounded-[18px] border border-slate-200 bg-white p-4">
                <input
                  type="radio"
                  name="role"
                  value="buyer"
                  defaultChecked={profile.role === "buyer"}
                  className="mt-1"
                />
                <div>
                  <p className="text-sm font-semibold text-slate-900">Buyer</p>
                  <p className="mt-1 text-sm leading-6 text-slate-500">Search + conversations.</p>
                </div>
              </label>
            </div>

            <button className="mt-6 w-full rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700">
              Save settings
            </button>
          </div>
        </form>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/agent"
            className="rounded-full border border-slate-200 px-5 py-3 text-sm text-slate-700 transition hover:bg-slate-50"
          >
            Back to portal
          </Link>
          <Link
            href="/auth/sign-out"
            className="rounded-full border border-slate-200 px-5 py-3 text-sm text-slate-700 transition hover:bg-slate-50"
          >
            Sign out
          </Link>
        </div>
      </section>
    </main>
  );
}

