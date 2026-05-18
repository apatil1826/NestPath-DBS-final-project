"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BrowserProfile, getOrCreateBrowserProfile } from "@/lib/browser-auth";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { SignOutButton } from "@/components/auth/sign-out-button";
import {
  createOrOpenDirectThread,
  DirectoryBuyer,
  InboxThread,
  listDirectThreadsForProfile,
} from "@/lib/browser-messaging";

type ManualClientRecord = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  status: "active" | "archived";
  notes: string | null;
  created_at: string;
};

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export default function ClientsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<BrowserProfile | null>(null);
  const [buyers, setBuyers] = useState<DirectoryBuyer[]>([]);
  const [manualClients, setManualClients] = useState<ManualClientRecord[]>([]);
  const [buyerThreadMap, setBuyerThreadMap] = useState<Record<string, InboxThread>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [startingConversationFor, setStartingConversationFor] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");

  async function refreshBuyerThreads(agentProfile: BrowserProfile) {
    const threads = await listDirectThreadsForProfile(agentProfile);
    const nextThreadMap = threads.reduce<Record<string, InboxThread>>((accumulator, thread) => {
      if (thread.counterpart?.role === "buyer" && thread.counterpart.id) {
        accumulator[thread.counterpart.id] = thread;
      }

      return accumulator;
    }, {});

    setBuyerThreadMap(nextThreadMap);
  }

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
        const [
          { data: buyerData, error: buyerError },
          { data: manualData, error: manualError },
          buyerThreads,
        ] = await Promise.all([
            supabase
              .from("profiles")
              .select("id, full_name, email, role")
              .eq("role", "buyer")
              .neq("id", resolvedProfile.id)
              .order("full_name", { ascending: true }),
            supabase
              .from("clients")
              .select("id, full_name, email, phone, status, notes, created_at")
              .eq("agent_profile_id", resolvedProfile.id)
              .order("created_at", { ascending: false }),
            listDirectThreadsForProfile(resolvedProfile),
          ]);

        if (buyerError) {
          throw buyerError;
        }

        if (manualError) {
          throw manualError;
        }

        if (!cancelled) {
          setProfile(resolvedProfile);
          setBuyers((buyerData as DirectoryBuyer[] | null) ?? []);
          setManualClients((manualData as ManualClientRecord[] | null) ?? []);
          setBuyerThreadMap(
            buyerThreads.reduce<Record<string, InboxThread>>((accumulator, thread) => {
              if (thread.counterpart?.role === "buyer" && thread.counterpart.id) {
                accumulator[thread.counterpart.id] = thread;
              }

              return accumulator;
            }, {}),
          );
        }
      } catch (loadError) {
        if (!cancelled) {
          setErrorMessage(
            loadError instanceof Error ? loadError.message : "Unable to load client directory.",
          );
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

  useEffect(() => {
    if (!profile) {
      return;
    }

    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel(`clients-directory:${profile.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        () => {
          void refreshBuyerThreads(profile).catch(() => {
            // Leave the current state visible if a background refresh fails.
          });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [profile]);

  async function refreshManualClients(agentId: string) {
    const supabase = createSupabaseBrowserClient();
    const { data, error } = await supabase
      .from("clients")
      .select("id, full_name, email, phone, status, notes, created_at")
      .eq("agent_profile_id", agentId)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    setManualClients((data as ManualClientRecord[] | null) ?? []);
  }

  async function handleCreateManualClient(event: React.FormEvent<HTMLFormElement>) {
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
      await refreshManualClients(profile.id);
    } catch (createError) {
      setErrorMessage(
        createError instanceof Error ? createError.message : "Unable to create manual client.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleManualClientStatus(client: ManualClientRecord) {
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

      await refreshManualClients(profile.id);
    } catch (updateError) {
      setErrorMessage(
        updateError instanceof Error ? updateError.message : "Unable to update manual client.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleStartConversation(buyer: DirectoryBuyer) {
    if (!profile) {
      return;
    }

    setStartingConversationFor(buyer.id);
    setErrorMessage(null);

    try {
      const threadId = await createOrOpenDirectThread(profile, buyer);
      router.push(`/messages/${threadId}`);
    } catch (conversationError) {
      setErrorMessage(
        conversationError instanceof Error
          ? conversationError.message
          : "Unable to start conversation.",
      );
    } finally {
      setStartingConversationFor(null);
    }
  }

  if (loading) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-[1300px] items-center justify-center px-4 py-6 sm:px-6 lg:px-10">
        <div className="rounded-[30px] border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-sm text-slate-500">Loading the client directory...</p>
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
            This page now does two jobs: it shows every NestPath user currently tagged as a buyer,
            and it gives you an agent-specific list for your own manually added clients.
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

      <section className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Directory summary</p>
          <h2 className="mt-3 text-3xl font-semibold text-slate-900">{buyers.length}</h2>
          <p className="mt-2 text-sm leading-7 text-slate-500">
            buyer accounts currently available in NestPath
          </p>

          <div className="mt-6 rounded-[22px] border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-900">Manual list</p>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              You also have <span className="font-semibold text-slate-900">{manualClients.length}</span>{" "}
              manual client {manualClients.length === 1 ? "record" : "records"} tied specifically
              to your agent account.
            </p>
          </div>
        </aside>

        <section className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Buyer accounts</p>
              <h2 className="mt-3 text-2xl font-semibold text-slate-900">
                {buyers.length} buyer{buyers.length === 1 ? "" : "s"}
              </h2>
            </div>
          </div>

          {buyers.length ? (
            <div className="mt-6 grid gap-3">
              {buyers.map((buyer) => (
                <div
                  key={buyer.id}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-[22px] border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
                      {getInitials(buyer.full_name)}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-slate-900">{buyer.full_name}</p>
                        {(buyerThreadMap[buyer.id]?.unreadCount ?? 0) > 0 ? (
                          <span className="rounded-full bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-white">
                            {buyerThreadMap[buyer.id].unreadCount} new
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm text-slate-500">{buyer.email}</p>
                      {buyerThreadMap[buyer.id]?.lastMessagePreview ? (
                        <p
                          className={[
                            "mt-2 text-sm leading-6",
                            (buyerThreadMap[buyer.id]?.unreadCount ?? 0) > 0
                              ? "font-semibold text-slate-900"
                              : "text-slate-500",
                          ].join(" ")}
                        >
                          {buyerThreadMap[buyer.id].lastMessagePreview}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">
                      Buyer
                    </div>
                    <button
                      type="button"
                      onClick={() => handleStartConversation(buyer)}
                      className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-700 disabled:opacity-70"
                    >
                      {startingConversationFor === buyer.id
                        ? "Opening..."
                        : buyerThreadMap[buyer.id]
                          ? "Open conversation"
                          : "Start conversation"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-8 rounded-[24px] border border-slate-200 bg-slate-50 p-6">
              <p className="text-sm font-semibold text-slate-900">No buyers yet</p>
              <p className="mt-2 text-sm leading-7 text-slate-500">
                As soon as other users switch their settings to buyer mode, they&rsquo;ll appear
                here.
              </p>
            </div>
          )}
        </section>
      </section>

      <section className="grid gap-6 lg:grid-cols-[420px_minmax(0,1fr)]">
        <div className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Manual additions</p>
          <h2 className="mt-3 text-2xl font-semibold text-slate-900">Add a private client record</h2>
          <p className="mt-3 text-sm leading-7 text-slate-500">
            Use this when someone matters to your business but isn&rsquo;t yet a buyer account in the
            app, or when you want an agent-specific note card separate from the global buyer list.
          </p>

          <form onSubmit={handleCreateManualClient} className="mt-6 space-y-4">
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
              {saving ? "Saving..." : "Add manual client"}
            </button>
          </form>
        </div>

        <div className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                Manual client records
              </p>
              <h2 className="mt-3 text-2xl font-semibold text-slate-900">
                {manualClients.length} record{manualClients.length === 1 ? "" : "s"}
              </h2>
            </div>
          </div>

          {manualClients.length ? (
            <div className="mt-6 grid gap-3">
              {manualClients.map((client) => (
                <div
                  key={client.id}
                  className="rounded-[22px] border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{client.full_name}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {[client.email, client.phone].filter(Boolean).join(" • ") ||
                          "No contact details"}
                      </p>
                      {client.notes ? (
                        <p className="mt-3 text-sm leading-6 text-slate-600">{client.notes}</p>
                      ) : null}
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleManualClientStatus(client)}
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
              <p className="text-sm font-semibold text-slate-900">No manual additions yet</p>
              <p className="mt-2 text-sm leading-7 text-slate-500">
                Add the first one when someone should live in your personal client list even if they
                don&rsquo;t belong in the global buyer directory for your active conversations yet.
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
