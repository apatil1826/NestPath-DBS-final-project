"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function SignInCard({
  nextPath,
}: {
  nextPath: string;
}) {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"sign_in" | "sign_up">("sign_in");
  const [status, setStatus] = useState<
    "idle" | "submitting" | "success" | "error" | "needs_confirmation"
  >("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    setErrorMessage("");

    try {
      const supabase = createSupabaseBrowserClient();
      const trimmedEmail = email.trim();
      const trimmedPassword = password;

      if (mode === "sign_up") {
        const { data, error } = await supabase.auth.signUp({
          email: trimmedEmail,
          password: trimmedPassword,
          options: {
            data: {
              role: "agent",
              full_name: fullName.trim(),
            },
          },
        });

        if (error) throw error;

        // If email confirmations are enabled, Supabase creates the user but returns no session.
        if (!data.session) {
          setStatus("needs_confirmation");
          return;
        }

        window.location.assign(nextPath);
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password: trimmedPassword,
      });

      if (error) throw error;

      window.location.assign(nextPath);
    } catch (error) {
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "Unable to sign in.");
    }
  }

  return (
    <div className="rounded-[30px] border border-slate-200 bg-slate-50 p-6 shadow-sm">
      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Supabase auth</p>
      <h2 className="mt-3 text-2xl font-semibold text-slate-900">Sign in</h2>
      <p className="mt-3 text-sm leading-7 text-slate-500">
        Uses email + password (no magic link emails). Create an account once, then sign in normally.
      </p>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => {
              setMode("sign_in");
              setStatus("idle");
              setErrorMessage("");
            }}
            className={[
              "rounded-[22px] border px-4 py-4 text-left transition",
              mode === "sign_in"
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
            ].join(" ")}
          >
            <p className="text-sm font-semibold">Sign in</p>
            <p className="mt-1 text-xs uppercase tracking-[0.14em] text-slate-400">
              Existing account
            </p>
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("sign_up");
              setStatus("idle");
              setErrorMessage("");
            }}
            className={[
              "rounded-[22px] border px-4 py-4 text-left transition",
              mode === "sign_up"
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
            ].join(" ")}
          >
            <p className="text-sm font-semibold">Create account</p>
            <p className="mt-1 text-xs uppercase tracking-[0.14em] text-slate-400">
              First time here
            </p>
          </button>
        </div>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">Full name</span>
          <input
            required={mode === "sign_up"}
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            className="w-full rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-900"
            placeholder="Jordan Lee"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">Email address</span>
          <input
            required
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-900"
            placeholder="name@example.com"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">Password</span>
          <input
            required
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-900"
            placeholder="••••••••"
            minLength={8}
            autoComplete={mode === "sign_in" ? "current-password" : "new-password"}
          />
        </label>

        <div className="rounded-[22px] border border-slate-200 bg-white px-4 py-4 text-xs uppercase tracking-[0.14em] text-slate-400">
          Redirect after sign-in: {nextPath}
        </div>

        <button
          type="submit"
          disabled={status === "submitting"}
          className="w-full rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {status === "submitting"
            ? mode === "sign_up"
              ? "Creating account..."
              : "Signing in..."
            : mode === "sign_up"
              ? "Create account"
              : "Sign in"}
        </button>
      </form>

      {status === "error" ? (
        <p className="mt-4 rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {errorMessage}
        </p>
      ) : null}

      {status === "needs_confirmation" ? (
        <div className="mt-4 rounded-[18px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <p className="font-semibold">Account created, but not signed in yet.</p>
          <p className="mt-1 leading-6">
            Your Supabase project is likely requiring email confirmation, so no session is issued on
            sign-up. If you want zero emails during development, disable confirmations in Supabase:
            Auth → Providers → Email.
          </p>
        </div>
      ) : null}
    </div>
  );
}
