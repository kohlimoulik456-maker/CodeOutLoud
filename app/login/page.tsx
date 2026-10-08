import Link from "next/link";
import { redirect } from "next/navigation";
import { AudioLines, ArrowLeft, Sparkles } from "lucide-react";
import LoginForm from "../../components/auth/LoginForm";
import { isSupabaseConfigured } from "../../utils/supabase/config";
import { createClient } from "../../utils/supabase/server";

type LoginPageProps = {
  searchParams: Promise<{ checkEmail?: string; error?: string }>;
};

export const instant = false;

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) redirect("/");
  }

  return (
    <main className="grid min-h-screen bg-[#f7f6f3] text-[#191916] lg:grid-cols-[1fr_1fr]">
      <section className="relative hidden flex-col justify-between overflow-hidden bg-[#1b1b18] p-12 text-white lg:flex">
        <div className="pointer-events-none absolute -right-24 top-1/4 size-[500px] rounded-full border border-[#c8a45c]/15" />
        <div className="pointer-events-none absolute -right-8 top-[30%] size-[370px] rounded-full border border-[#c8a45c]/20" />
        <Link href="/" className="relative flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-[#c8a45c] text-[#171714]">
            <AudioLines size={20} />
          </span>
          <span className="text-lg font-semibold tracking-tight">
            CodeOut<span className="text-[#d8bb79]">Loud</span>
          </span>
        </Link>
        <div className="relative max-w-lg">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.16em] text-[#dfc27d]">
            <Sparkles size={13} />
            Sound like the engineer you are
          </span>
          <h1 className="mt-5 text-5xl font-medium leading-[1.08] tracking-[-0.05em]">
            Your next interview starts with{" "}
            <span className="font-serif italic text-[#dfc27d]">your voice.</span>
          </h1>
          <p className="mt-5 max-w-md text-sm leading-6 text-stone-300">
            Practice articulating your reasoning before you code, then build the
            confidence to bring your whole solution into the room.
          </p>
        </div>
        <p className="relative text-xs text-stone-500">
          A calmer, clearer way to prepare for technical interviews.
        </p>
      </section>

      <section className="flex min-h-screen items-center justify-center px-5 py-12 sm:px-10">
        <div className="w-full max-w-[390px]">
          <Link
            href="/"
            className="mb-10 inline-flex items-center gap-2 text-xs font-medium text-stone-500 hover:text-stone-800 lg:hidden"
          >
            <ArrowLeft size={14} />
            Back to CodeOutLoud
          </Link>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#92713a]">
            Your personal interview studio
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">
            Welcome in.
          </h2>
          <p className="mt-2 text-sm text-stone-500">
            Sign in or create an account to continue.
          </p>
          {params.checkEmail === "1" && (
            <p className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              Account created. Check your email for a confirmation link before
              signing in.
            </p>
          )}
          {params.error === "confirmation" && (
            <p role="alert" className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              That confirmation link is invalid or expired. Request a new one by
              creating your account again.
            </p>
          )}
          {!isSupabaseConfigured() && (
            <p role="alert" className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-5 text-amber-900">
              Supabase is not configured yet. Add the project URL and anon key
              to <code>.env.local</code>, then restart the app.
            </p>
          )}
          <LoginForm />
          <p className="mt-8 text-center text-[11px] leading-5 text-stone-400">
            By continuing, you agree to use CodeOutLoud for interview practice.
            Your session history is private to your account.
          </p>
        </div>
      </section>
    </main>
  );
}
