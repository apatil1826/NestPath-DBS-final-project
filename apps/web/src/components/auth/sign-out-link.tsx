import Link from "next/link";

export function SignOutLink() {
  return (
    <Link
      href="/auth/sign-out"
      className="rounded-full border border-white/12 px-4 py-3 text-sm text-stone-200 transition hover:border-white/20 hover:text-stone-50"
    >
      Sign out
    </Link>
  );
}
