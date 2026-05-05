import Link from "next/link";
import { requireAuthenticatedProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { archiveClientAction, createClientAction } from "@/app/clients/actions";

type DbClient = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  status: "active" | "archived";
  notes: string | null;
  created_at: string;
};

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const profile = await requireAuthenticatedProfile();
  const params = await searchParams;

  if (profile.role !== "agent") {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-[1000px] flex-col gap-8 px-4 py-6 sm:px-6 lg:px-10">
        <section className="rounded-[30px] border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Client directory</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
            Switch to agent mode to manage clients.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-8 text-slate-500">
            Your profile is currently set to buyer mode. Change it in settings to unlock the agent
            directory.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/settings"
              className="rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              Open settings
            </Link>
            <Link
              href="/agent"
              className="rounded-full border border-slate-200 px-5 py-3 text-sm text-slate-700 transition hover:bg-slate-50"
            >
              Back to portal
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("clients")
    .select("id, full_name, email, phone, status, notes, created_at")
    .eq("agent_profile_id", profile.id)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Unable to load clients: ${error.message}`);
  }

  const clients = (data as DbClient[] | null) ?? [];
  const errorMessage =
    params.error === "missing-name" ? "Client name is required." : null;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1300px] flex-col gap-8 px-4 py-6 sm:px-6 lg:px-10">
      <header className="flex flex-wrap items-end justify-between gap-4 rounded-[30px] border border-slate-200 bg-white p-8 shadow-sm">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Agent portal</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
            Client directory
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-8 text-slate-500">
            Track who you’re working with. This will become the entry point for buyer messaging.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/agent"
            className="rounded-full border border-slate-200 px-5 py-3 text-sm text-slate-700 transition hover:bg-slate-50"
          >
            Portal home
          </Link>
          <Link
            href="/settings"
            className="rounded-full border border-slate-200 px-5 py-3 text-sm text-slate-700 transition hover:bg-slate-50"
          >
            Settings
          </Link>
        </div>
      </header>

      {errorMessage ? (
        <section className="rounded-[24px] border border-rose-200 bg-rose-50 p-5">
          <p className="text-sm font-semibold text-rose-800">Couldn’t save</p>
          <p className="mt-2 text-sm leading-6 text-rose-700">{errorMessage}</p>
        </section>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-[420px_minmax(0,1fr)]">
        <div className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Add client</p>
          <h2 className="mt-3 text-2xl font-semibold text-slate-900">Create a new client</h2>
          <p className="mt-3 text-sm leading-7 text-slate-500">
            For now this stores an agent-owned directory record. Later we’ll connect a client to an
            authenticated buyer and spin up a shared message thread.
          </p>

          <form action={createClientAction} className="mt-6 space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Full name</span>
              <input
                name="fullName"
                className="w-full rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
                placeholder="Jordan Lee"
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Email</span>
                <input
                  name="email"
                  type="email"
                  className="w-full rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
                  placeholder="buyer@example.com"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Phone</span>
                <input
                  name="phone"
                  className="w-full rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
                  placeholder="(555) 010-1234"
                />
              </label>
            </div>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Notes</span>
              <textarea
                name="notes"
                rows={4}
                className="w-full resize-none rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
                placeholder="Preferred neighborhoods, budget, timeline..."
              />
            </label>

            <button className="w-full rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700">
              Add client
            </button>
          </form>
        </div>

        <div className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                Your clients
              </p>
              <h2 className="mt-3 text-2xl font-semibold text-slate-900">
                {clients.length} total
              </h2>
            </div>
          </div>

          {clients.length ? (
            <div className="mt-6 grid gap-3">
              {clients.map((client) => (
                <div
                  key={client.id}
                  className="rounded-[22px] border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{client.full_name}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {[client.email, client.phone].filter(Boolean).join(" • ") || "No contact details"}
                      </p>
                      {client.notes ? (
                        <p className="mt-3 text-sm leading-6 text-slate-600">{client.notes}</p>
                      ) : null}
                    </div>

                    <form action={archiveClientAction}>
                      <input type="hidden" name="clientId" value={client.id} />
                      <input
                        type="hidden"
                        name="status"
                        value={client.status === "archived" ? "active" : "archived"}
                      />
                      <button className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100">
                        {client.status === "archived" ? "Restore" : "Archive"}
                      </button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-8 rounded-[24px] border border-slate-200 bg-slate-50 p-6">
              <p className="text-sm font-semibold text-slate-900">No clients yet</p>
              <p className="mt-2 text-sm leading-7 text-slate-500">
                Add your first client to start building the directory. This is the foundation for
                messaging.
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

