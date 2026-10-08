import { redirect } from "next/navigation";
import { connection } from "next/server";
import InterviewArena from "./InterviewArena";
import { isSupabaseConfigured } from "../../utils/supabase/config";
import { createClient } from "../../utils/supabase/server";

export const instant = false;

export default async function InterviewPage() {
  await connection();
  if (!isSupabaseConfigured()) redirect("/login");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return <InterviewArena />;
}
