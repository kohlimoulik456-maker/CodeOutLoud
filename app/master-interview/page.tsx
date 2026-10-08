import Link from "next/link";
import { ArrowLeft, LockKeyhole, Sparkles } from "lucide-react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { isSupabaseConfigured } from "../../utils/supabase/config";
import { createClient } from "../../utils/supabase/server";

export const instant = false;

export default async function MasterInterviewPage() {
  await connection();
  if (!isSupabaseConfigured()) redirect("/login");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <main className="grid min-h-screen place-items-center bg-[#f7f6f3] px-5 py-12 text-[#191916]">
      <section className="w-full max-w-lg rounded-3xl border border-stone-200 bg-white p-8 text-center shadow-sm">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-[#1d1d19] text-[#dfc27d]">
          <LockKeyhole size={22} />
        </span>
        <p className="mt-6 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#92713a]">
          Pro experience
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Master interview
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-stone-500">
          A full-length, multi-round interview simulation is in the works. Build
          your fundamentals in DSA practice while we get it ready.
        </p>
        <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-[#c8a45c]/40 bg-[#fffdf8] px-3 py-1.5 text-xs font-medium text-[#725a2f]">
          <Sparkles size={13} />
          Coming soon
        </div>
        <div>
          <Link
            href="/"
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-[#1d1d19] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#33322d]"
          >
            <ArrowLeft size={15} />
            Back to dashboard
          </Link>
        </div>
      </section>
    </main>
  );
}
