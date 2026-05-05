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
    <main className="mx-auto flex min-h-screen w-full max-w-[1300px] flex-col gap-8 px-4 py-6 sm:px-6 lg:px-10">
      <section className="overflow-hidden rounded-[36px] border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
        <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_460px]">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-slate-400">NestPath access</p>
            <h1 className="mt-4 max-w-3xl text-5xl font-semibold tracking-tight text-slate-900 sm:text-6xl">
              Sign in to the agent portal.
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-9 text-slate-500">
              Supabase Auth handles identity via email + password. After sign-in, you’ll land in the
              portal.
            </p>
          </div>

          <SignInCard nextPath={nextPath} />
        </div>
      </section>
    </main>
  );
}
