"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { ProfileRole } from "@/lib/nestpath-types";

export function SignInCard({
  defaultRole,
  nextPath,
}: {
  defaultRole: ProfileRole;
  nextPath: string;
}) {
  const [role, setRole] = useState<ProfileRole>(defaultRole);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "sent" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    setErrorMessage("");

    try {
      const supabase = createSupabaseBrowserClient();
      const redirectUrl = new URL("/auth/callback", window.location.origin);
      redirectUrl.searchParams.set("next", nextPath);

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectUrl.toString(),
          data: {
            role,
            full_name: fullName,
          },
        },
      });

      if (error) {
        throw error;
      }

      setStatus("sent");
    } catch (error) {
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "Unable to send sign-in link.");
    }
  }

  return (
    <div className="rounded-[32px] border border-white/10 bg-[#111111] p-6 shadow-[0_24px_60px_rgba(0,0,0,0.28)]">
      <p className="text-xs uppercase tracking-[0.28em] text-stone-500">Supabase auth</p>
      <h2 className="mt-3 text-2xl font-semibold text-stone-50">Request a magic link</h2>
      <p className="mt-3 text-sm leading-7 text-stone-300">
        This first live auth flow uses email magic links so an agent or buyer can enter the product
        without managing passwords during early development.
      </p>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setRole("agent")}
            className={[
              "rounded-[22px] border px-4 py-4 text-left transition",
              role === "agent"
                ? "border-[#d6a54f]/50 bg-[#231d13] text-stone-50"
                : "border-white/8 bg-white/4 text-stone-300 hover:border-white/16",
            ].join(" ")}
          >
            <p className="text-sm font-semibold">Agent</p>
            <p className="mt-1 text-xs uppercase tracking-[0.18em] text-stone-500">
              Dashboard + buyer threads
            </p>
          </button>
          <button
            type="button"
            onClick={() => setRole("buyer")}
            className={[
              "rounded-[22px] border px-4 py-4 text-left transition",
              role === "buyer"
                ? "border-[#d6a54f]/50 bg-[#231d13] text-stone-50"
                : "border-white/8 bg-white/4 text-stone-300 hover:border-white/16",
            ].join(" ")}
          >
            <p className="text-sm font-semibold">Buyer</p>
            <p className="mt-1 text-xs uppercase tracking-[0.18em] text-stone-500">
              Search hub + property threads
            </p>
          </button>
        </div>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-stone-200">Full name</span>
          <input
            required
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            className="w-full rounded-[18px] border border-white/10 bg-white/4 px-4 py-3 text-sm text-stone-50 outline-none transition placeholder:text-stone-500 focus:border-[#d6a54f]/50"
            placeholder="Jordan Lee"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-stone-200">Email address</span>
          <input
            required
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-[18px] border border-white/10 bg-white/4 px-4 py-3 text-sm text-stone-50 outline-none transition placeholder:text-stone-500 focus:border-[#d6a54f]/50"
            placeholder="name@example.com"
          />
        </label>

        <div className="rounded-[22px] border border-white/8 bg-white/4 px-4 py-4 text-xs uppercase tracking-[0.18em] text-stone-500">
          Redirect after sign-in: {nextPath}
        </div>

        <button
          type="submit"
          disabled={status === "submitting"}
          className="w-full rounded-full bg-[#d6a54f] px-5 py-3 text-sm font-semibold text-[#1d180e] transition hover:bg-[#e6b760] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {status === "submitting" ? "Sending link..." : "Email me a magic link"}
        </button>
      </form>

      {status === "sent" ? (
        <p className="mt-4 rounded-[18px] border border-emerald-400/15 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
          Magic link sent. Open the email on this device and you’ll land in the right NestPath
          portal.
        </p>
      ) : null}

      {status === "error" ? (
        <p className="mt-4 rounded-[18px] border border-rose-400/15 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
