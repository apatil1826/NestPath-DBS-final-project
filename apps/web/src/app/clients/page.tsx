"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BrowserProfile, getOrCreateBrowserProfile } from "@/lib/browser-auth";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { SignOutButton } from "@/components/auth/sign-out-button";

type ClientRecord = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  status: "active" | "archived";
  notes: string | null;
  created_at: string;
};

export default function ClientsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<BrowserProfile | null>(null);
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const resolvedProfile = await getOrCreateBrowserProfile();

        if (!resolvedProfile) {
          router.replace("/login");
          return;
        }

        if (resolvedProfile.role !== "agent") {
          router.replace("/settings");
          return;
        }

        const supabase = createSupabaseBrowserClient();
        const { data, error } = await supabase
          .from("clients")
          .select("id, full_name, email, phone, status, notes, created_at")
          .eq("agent_profile_id", resolvedProfile.id)
          .order("created_at", { ascending: false });

        if (error) {
          throw error;
        }

        if (!cancelled) {
          setProfile(resolvedProfile);
          setClients((data as ClientRecord[] | null) ?? []);
        }
      } catch (loadError) {
        if (!cancelled) {
          setErrorMessage(loadError instanceof Error ? loadError.message : "Unable to load clients.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [router]);

  async function refreshClients(agentId: string) {
    const supabase = createSupabaseBrowserClient();
    const { data, error } = await supabase
      .from("clients")
      .select("id, full_name, email, phone, status, notes, created_at")
      .eq("agent_profile_id", agentId)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    setClients((data as ClientRecord[] | null) ?? []);
  }

  async function handleCreateClient(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!profile) {
      return;
    }

    if (!fullName.trim()) {
      setErrorMessage("Client name is required.");
      return;
    }

    setSaving(true);
    setErrorMessage(null);

    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.from("clients").insert({
        agent_profile_id: profile.id,
        buyer_profile_id: null,
        full_name: fullName.trim(),
        email: email.trim().toLowerCase() || null,
        phone: phone.trim() || null,
        notes: notes.trim() || null,
      });

      if (error) {
        throw error;
      }

      setFullName("");
      setEmail("");
      setPhone("");
      setNotes("");
      await refreshClients(profile.id);
    } catch (createError) {
      setErrorMessage(
        createError instanceof Error ? createError.message : "Unable to create client.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleClientStatus(client: ClientRecord) {
    if (!profile) {
      return;
    }

    setSaving(true);
    setErrorMessage(null);

    try {
      const supabase = createSupabaseBrowserClient();
      const nextStatus = client.status === "archived" ? "active" : "archived";
      const { error } = await supabase
        .from("clients")
        .update({ status: nextStatus })
        .eq("id", client.id)
        .eq("agent_profile_id", profile.id);

      if (error) {
        throw error;
      }

      await refreshClients(profile.id);
    } catch (updateError) {
      setErrorMessage(
        updateError instanceof Error ? updateError.message : "Unable to update client.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-[1300px] items-center justify-center px-4 py-6 sm:px-6 lg:px-10">
        <div className="rounded-[30px] border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-sm text-slate-500">Loading your client directory...</p>
        </div>
      </main>
    );
  }

  if (!profile) {
    return null;
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1300px] flex-col gap-8 px-4 py-6 sm:px-6 lg:px-10">
      <header className="flex flex-wrap items-end justify-between gap-4 rounded-[30px] border border-slate-200 bg-white p-8 shadow-sm">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Agent portal</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
            Client directory
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-8 text-slate-500">
            Track who you&rsquo;re working with. This becomes the entry point for buyer messaging.
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
          <SignOutButton className="rounded-full border border-slate-200 px-5 py-3 text-sm text-slate-700 transition hover:bg-slate-50" />
        </div>
      </header>

      {errorMessage ? (
        <section className="rounded-[24px] border border-rose-200 bg-rose-50 p-5">
          <p className="text-sm font-semibold text-rose-800">Something went wrong</p>
          <p className="mt-2 text-sm leading-6 text-rose-700">{errorMessage}</p>
        </section>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-[420px_minmax(0,1fr)]">
        <div className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Add client</p>
          <h2 className="mt-3 text-2xl font-semibold text-slate-900">Create a new client</h2>
          <p className="mt-3 text-sm leading-7 text-slate-500">
            This stores an agent-owned directory record now. Next, we can connect that client to
            a buyer account and thread.
          </p>

          <form onSubmit={handleCreateClient} className="mt-6 space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Full name</span>
              <input
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                className="w-full rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
                placeholder="Jordan Lee"
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Email</span>
                <input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  type="email"
                  className="w-full rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
                  placeholder="buyer@example.com"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Phone</span>
                <input
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  className="w-full rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
                  placeholder="(555) 010-1234"
                />
              </label>
            </div>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Notes</span>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={4}
                className="w-full resize-none rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
                placeholder="Preferred neighborhoods, budget, timeline..."
              />
            </label>

            <button className="w-full rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-70">
              {saving ? "Saving..." : "Add client"}
            </button>
          </form>
        </div>

        <div className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Your clients</p>
              <h2 className="mt-3 text-2xl font-semibold text-slate-900">{clients.length} total</h2>
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

                    <button
                      type="button"
                      onClick={() => toggleClientStatus(client)}
                      className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                    >
                      {client.status === "archived" ? "Restore" : "Archive"}
                    </button>
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

