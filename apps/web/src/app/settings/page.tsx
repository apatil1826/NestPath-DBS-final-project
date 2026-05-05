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

      router.replace("/agent");
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
      <main className="mx-auto flex min-h-screen w-full max-w-[1100px] items-center justify-center px-4 py-6 sm:px-6 lg:px-10">
        <div className="rounded-[30px] border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-sm text-slate-500">Loading your settings...</p>
        </div>
      </main>
    );
  }

  if (!profile) {
    return null;
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1100px] flex-col gap-8 px-4 py-6 sm:px-6 lg:px-10">
      <header className="rounded-[30px] border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Profile settings</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
          Settings
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-8 text-slate-500">
          Choose which mode you&rsquo;re in. The UI will adapt based on your selection.
        </p>
      </header>

      <section className="rounded-[30px] border border-slate-200 bg-white p-8 shadow-sm">
        <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-2">
          <div>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Full name</span>
              <input
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
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
              Agent mode unlocks client directory and messaging setup. Buyer mode will later show a
              simpler search workspace.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="flex cursor-pointer items-start gap-3 rounded-[18px] border border-slate-200 bg-white p-4">
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
                  <p className="mt-1 text-sm leading-6 text-slate-500">Clients, pipeline, inbox.</p>
                </div>
              </label>

              <label className="flex cursor-pointer items-start gap-3 rounded-[18px] border border-slate-200 bg-white p-4">
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
                  <p className="mt-1 text-sm leading-6 text-slate-500">Search + conversations.</p>
                </div>
              </label>
            </div>

            <button className="mt-6 w-full rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-70">
              {status === "saving" ? "Saving..." : "Save settings"}
            </button>
          </div>
        </form>

        {errorMessage ? (
          <div className="mt-6 rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {errorMessage}
          </div>
        ) : null}

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/agent"
            className="rounded-full border border-slate-200 px-5 py-3 text-sm text-slate-700 transition hover:bg-slate-50"
          >
            Back to portal
          </Link>
          <SignOutButton className="rounded-full border border-slate-200 px-5 py-3 text-sm text-slate-700 transition hover:bg-slate-50" />
        </div>
      </section>
    </main>
  );
}

