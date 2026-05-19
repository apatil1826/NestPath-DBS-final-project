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
import { getThreadContext } from "@/lib/browser-workspaces";

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
      const existingThread = buyerThreadMap[buyer.id];

      if (existingThread) {
        router.push(`/relationships/${existingThread.relationshipId}`);
        return;
      }

      const threadId = await createOrOpenDirectThread(profile, buyer);
      const threadContext = await getThreadContext(threadId);

      router.push(`/relationships/${threadContext.relationshipId}`);
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
      <main className="np-page items-center justify-center">
        <div className="np-surface rounded-[28px] p-8">
          <p className="text-sm text-slate-500">Loading the client directory...</p>
        </div>
      </main>
    );
  }

  if (!profile) {
    return null;
  }

  return (
    <main className="np-page">
      <header className="np-surface rounded-[28px] px-7 py-6 sm:px-8">
        <div>
          <p className="np-kicker">Agent portal</p>
          <h1 className="mt-3 text-[2rem] font-semibold tracking-tight text-slate-950 sm:text-[2.55rem]">
            Client directory
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-500">
            Browse live buyer relationships, jump into a shared workspace, and keep private CRM-style records for off-platform contacts.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/agent"
            className="np-button-secondary"
          >
            Portal home
          </Link>
          <Link
            href="/settings"
            className="np-button-secondary"
          >
            Settings
          </Link>
          <SignOutButton className="np-button-secondary" />
        </div>
      </header>

      {errorMessage ? (
        <section className="rounded-[20px] border border-rose-200 bg-rose-50/85 p-4">
          <p className="text-sm font-semibold text-rose-800">Something went wrong</p>
          <p className="mt-2 text-sm leading-6 text-rose-700">{errorMessage}</p>
        </section>
      ) : null}

      <section className="np-shell overflow-hidden">
        <div className="grid gap-0 lg:grid-cols-[290px_minmax(0,1fr)]">
          <aside className="np-pane-muted border-b border-r border-[var(--line)] px-5 py-5 lg:border-b-0">
            <p className="np-kicker">Directory summary</p>
            <h2 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">{buyers.length}</h2>
            <p className="mt-1 text-sm leading-7 text-slate-500">
              buyer accounts currently available in NestPath
            </p>

            <div className="np-card mt-6 p-4">
              <p className="text-sm font-semibold text-slate-900">Relationship-first</p>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Every buyer opens into one shared workspace with a general thread and property channels.
              </p>
            </div>

            <div className="np-card-muted mt-4 p-4">
              <p className="text-sm font-semibold text-slate-900">Manual records</p>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                {manualClients.length} private client {manualClients.length === 1 ? "record" : "records"} tied to your agent account.
              </p>
            </div>
          </aside>

          <section className="bg-white/72 px-6 py-5">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="np-kicker">Buyer accounts</p>
                <h2 className="mt-2 text-[1.45rem] font-semibold tracking-tight text-slate-950">
                  {buyers.length} buyer{buyers.length === 1 ? "" : "s"}
                </h2>
              </div>
            </div>

            {buyers.length ? (
              <div className="mt-5 grid gap-3">
                {buyers.map((buyer) => (
                  <div
                    key={buyer.id}
                    className="np-list-row flex flex-wrap items-center justify-between gap-4 px-4 py-4"
                  >
                    <div className="flex min-w-0 items-center gap-4">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-950 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(15,23,42,0.12)]">
                        {getInitials(buyer.full_name)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-slate-900">{buyer.full_name}</p>
                          <span className="np-pill">Buyer</span>
                          {(buyerThreadMap[buyer.id]?.unreadCount ?? 0) > 0 ? (
                            <span className="np-pill-unread">
                              {buyerThreadMap[buyer.id].unreadCount} new
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1 text-sm text-slate-500">{buyer.email}</p>
                        <p
                          className={[
                            "mt-2 line-clamp-2 text-sm leading-6",
                            (buyerThreadMap[buyer.id]?.unreadCount ?? 0) > 0
                              ? "font-semibold text-slate-900"
                              : "text-slate-500",
                          ].join(" ")}
                        >
                          {buyerThreadMap[buyer.id]?.lastMessagePreview ?? "No relationship opened yet."}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleStartConversation(buyer)}
                      className="np-button-primary !px-4 !py-2 text-xs disabled:opacity-70"
                    >
                      {startingConversationFor === buyer.id
                        ? "Opening..."
                        : buyerThreadMap[buyer.id]
                          ? "Open workspace"
                          : "Start relationship"}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="np-card-muted mt-8 p-6">
                <p className="text-sm font-semibold text-slate-900">No buyers yet</p>
                <p className="mt-2 text-sm leading-7 text-slate-500">
                  As soon as other users switch their settings to buyer mode, they&rsquo;ll appear here.
                </p>
              </div>
            )}
          </section>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[390px_minmax(0,1fr)]">
        <div className="np-surface rounded-[26px] p-6">
          <p className="np-kicker">Manual additions</p>
          <h2 className="mt-3 text-[1.45rem] font-semibold tracking-tight text-slate-950">Add a private client record</h2>
          <p className="mt-2 text-sm leading-7 text-slate-500">
            Keep side notes for people who matter to your business but should not appear in the shared buyer directory yet.
          </p>

          <form onSubmit={handleCreateManualClient} className="mt-6 space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Full name</span>
              <input
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                className="np-field"
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
                  className="np-field"
                  placeholder="buyer@example.com"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Phone</span>
                <input
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  className="np-field"
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
                className="np-textarea"
                placeholder="Preferred neighborhoods, budget, timeline..."
              />
            </label>

            <button className="np-button-primary w-full disabled:opacity-70">
              {saving ? "Saving..." : "Add manual client"}
            </button>
          </form>
        </div>

        <div className="np-surface rounded-[26px] p-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="np-kicker">Manual client records</p>
              <h2 className="mt-2 text-[1.45rem] font-semibold tracking-tight text-slate-950">
                {manualClients.length} record{manualClients.length === 1 ? "" : "s"}
              </h2>
            </div>
          </div>

          {manualClients.length ? (
            <div className="mt-6 grid gap-3">
              {manualClients.map((client) => (
                <div
                  key={client.id}
                  className="np-list-row p-4"
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
                      onClick={() => toggleManualClientStatus(client)}
                      className="np-button-secondary !px-4 !py-2 text-xs"
                    >
                      {client.status === "archived" ? "Restore" : "Archive"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="np-card-muted mt-8 p-6">
              <p className="text-sm font-semibold text-slate-900">No manual additions yet</p>
              <p className="mt-2 text-sm leading-7 text-slate-500">
                Add the first one when someone should live in your personal client list even if they don&rsquo;t belong in the global buyer directory yet.
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
