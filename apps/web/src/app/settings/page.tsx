"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BrowserProfile, getOrCreateBrowserProfile } from "@/lib/browser-auth";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { SignOutButton } from "@/components/auth/sign-out-button";

export default function SettingsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<BrowserProfile | null>(null);
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"agent" | "buyer">("agent");
  const [status, setStatus] = useState<"idle" | "loading" | "saving" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      try {
        const resolvedProfile = await getOrCreateBrowserProfile();

        if (!resolvedProfile) {
          router.replace("/login");
          return;
        }

        if (!cancelled) {
          setProfile(resolvedProfile);
          setFullName(resolvedProfile.full_name);
          setRole(resolvedProfile.role);
          setStatus("idle");
        }
      } catch (loadError) {
        if (!cancelled) {
          setErrorMessage(loadError instanceof Error ? loadError.message : "Unable to load settings.");
          setStatus("error");
        }
      }
    }

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, [router]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!profile) {
      return;
    }

    setStatus("saving");
    setErrorMessage(null);

    try {
      const supabase = createSupabaseBrowserClient();
      const trimmedName = fullName.trim() || profile.full_name;

      const { error } = await supabase
        .from("profiles")
        .update({ role, full_name: trimmedName })
        .eq("id", profile.id);

      if (error) {
        throw error;
      }

      router.replace(role === "agent" ? "/clients" : "/messages");
      router.refresh();
    } catch (submitError) {
      setErrorMessage(
        submitError instanceof Error ? submitError.message : "Unable to save settings.",
      );
      setStatus("error");
    }
  }

  if (status === "loading") {
    return (
      <main className="np-page items-center justify-center">
        <div className="np-surface rounded-[28px] p-8">
          <p className="text-sm text-slate-500">Loading your settings...</p>
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
        <p className="np-kicker">Profile settings</p>
        <h1 className="mt-3 text-[2rem] font-semibold tracking-tight text-slate-950 sm:text-[2.5rem]">
          Settings
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-500">
          Choose which mode you&rsquo;re in. The UI will adapt based on your selection.
        </p>
      </header>

      <section className="np-shell overflow-hidden">
        <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="bg-white/72 px-7 py-6">
        <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-2">
          <div>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Full name</span>
              <input
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                className="np-field"
              />
            </label>

            <p className="mt-3 text-sm leading-7 text-slate-500">
              Email: <span className="font-mono text-slate-700">{profile.email}</span>
            </p>
          </div>

          <div className="np-card-muted p-6">
            <p className="text-sm font-semibold text-slate-900">Mode</p>
            <p className="mt-2 text-sm leading-7 text-slate-500">
              Agent mode unlocks client directory and relationship workspaces. Buyer mode keeps things conversation-first.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="np-list-row flex cursor-pointer items-start gap-3 p-4">
                <input
                  type="radio"
                  name="role"
                  value="agent"
                  checked={role === "agent"}
                  onChange={() => setRole("agent")}
                  className="mt-1"
                />
                <div>
                  <p className="text-sm font-semibold text-slate-900">Agent</p>
                  <p className="mt-1 text-sm leading-6 text-slate-500">Directory, workspaces, pipeline.</p>
                </div>
              </label>

              <label className="np-list-row flex cursor-pointer items-start gap-3 p-4">
                <input
                  type="radio"
                  name="role"
                  value="buyer"
                  checked={role === "buyer"}
                  onChange={() => setRole("buyer")}
                  className="mt-1"
                />
                <div>
                  <p className="text-sm font-semibold text-slate-900">Buyer</p>
                  <p className="mt-1 text-sm leading-6 text-slate-500">Messages, property channels, review.</p>
                </div>
              </label>
            </div>

            <button className="np-button-primary mt-6 w-full disabled:opacity-70">
              {status === "saving" ? "Saving..." : "Save settings"}
            </button>
          </div>
        </form>

        {errorMessage ? (
          <div className="mt-6 rounded-[18px] border border-rose-200 bg-rose-50/85 px-4 py-3 text-sm text-rose-700">
            {errorMessage}
          </div>
        ) : null}
          </div>

          <aside className="np-pane-warm border-l border-t border-[var(--line)] px-6 py-6 lg:border-t-0">
            <p className="np-kicker">Workspace behavior</p>
            <div className="mt-4 space-y-3">
              <div className="np-card p-4">
                <p className="text-sm font-semibold text-slate-900">Agent</p>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Lands in the client directory, then opens buyer relationships with property-specific collaboration.
                </p>
              </div>
              <div className="np-card p-4">
                <p className="text-sm font-semibold text-slate-900">Buyer</p>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Lands in messages and sees the same relationship workspace with a simpler focus.
                </p>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/agent"
                className="np-button-secondary"
              >
                Back to portal
              </Link>
              <SignOutButton className="np-button-secondary" />
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
