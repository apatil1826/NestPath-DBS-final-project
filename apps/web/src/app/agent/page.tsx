"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BrowserProfile, getOrCreateBrowserProfile } from "@/lib/browser-auth";
import { SignOutButton } from "@/components/auth/sign-out-button";

export default function AgentPortalPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<BrowserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load profile.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, [router]);

  if (loading) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-[1200px] items-center justify-center px-4 py-6 sm:px-6 lg:px-10">
        <div className="rounded-[30px] border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-sm text-slate-500">Loading your portal...</p>
        </div>
      </main>
    );
  }

  if (error || !profile) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-[1200px] items-center justify-center px-4 py-6 sm:px-6 lg:px-10">
        <div className="rounded-[30px] border border-rose-200 bg-white p-8 shadow-sm">
          <p className="text-sm font-semibold text-rose-800">Unable to load the portal</p>
          <p className="mt-2 text-sm text-rose-700">{error ?? "Please sign in again."}</p>
          <Link
            href="/login"
            className="mt-5 inline-flex rounded-full border border-slate-200 px-5 py-3 text-sm text-slate-700 transition hover:bg-slate-50"
          >
            Back to login
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1200px] flex-col gap-8 px-4 py-6 sm:px-6 lg:px-10">
      <header className="flex flex-col gap-3 rounded-[30px] border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-xs uppercase tracking-[0.22em] text-slate-400">NestPath portal</p>
        <h1 className="text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
          Welcome, {profile.full_name}.
        </h1>
        <p className="max-w-3xl text-base leading-8 text-slate-500">
          You&rsquo;re signed in. Your current mode is{" "}
          <span className="font-semibold text-slate-700">{profile.role}</span>. The UI and
          features will adapt based on what you pick in settings.
        </p>

        <div className="mt-2 flex flex-wrap gap-3">
          <Link
            href="/messages"
            className="rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            Messages
          </Link>
          {profile.role === "agent" ? (
            <Link
              href="/clients"
              className="rounded-full border border-slate-200 px-5 py-3 text-sm text-slate-700 transition hover:bg-slate-50"
            >
              Client directory
            </Link>
          ) : (
            <Link
              href="/settings"
              className="rounded-full border border-slate-200 px-5 py-3 text-sm text-slate-700 transition hover:bg-slate-50"
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
          <SignOutButton className="rounded-full border border-slate-200 px-5 py-3 text-sm text-slate-700 transition hover:bg-slate-50" />
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
            A searchable list of buyers and clients, with the first layer of messaging-ready
            relationship data.
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
