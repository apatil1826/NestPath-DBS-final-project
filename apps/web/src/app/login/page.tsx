import { redirect } from "next/navigation";
import { SignInCard } from "@/components/auth/sign-in-card";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUserRoleRedirect, resolveNextPath } from "@/lib/auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect(await getCurrentUserRoleRedirect(params.next));
  }

  const nextPath = resolveNextPath(params.next);

  return (
    <main className="np-page justify-center">
      <section className="np-shell overflow-hidden p-8 sm:p-10">
        <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_460px]">
          <div>
            <p className="np-kicker">NestPath access</p>
            <h1 className="mt-4 max-w-3xl text-5xl font-semibold tracking-tight text-slate-950 sm:text-6xl">
              Enter the shared buyer-agent workspace.
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-8 text-slate-500">
              One login, role-aware routing, and collaboration around conversations, properties, PDFs, and review threads.
            </p>
          </div>

          <SignInCard nextPath={nextPath} />
        </div>
      </section>
    </main>
  );
}
