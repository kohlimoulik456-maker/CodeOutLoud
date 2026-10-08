import { connection } from "next/server";
import Dashboard, { type SessionRecord } from "../components/Dashboard";
import { isSupabaseConfigured } from "../utils/supabase/config";
import { createClient } from "../utils/supabase/server";

export const instant = false;

export default async function HomePage() {
  await connection();
  let userEmail = "Guest";
  let sessions: SessionRecord[] = [];

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      console.error("Could not validate dashboard session:", authError.message);
    } else if (user) {
      userEmail = user.email ?? "Account";
      const { data: rows, error } = await supabase
        .from("interview_sessions")
        .select(
          "id, created_at, overall_score, communication_score, avg_dead_air_percentage, total_filler_words",
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) {
        console.error("Could not load dashboard sessions:", error.message);
      } else {
        const sessionIds = (rows ?? []).map((row) => row.id);
        const { data: questions, error: questionsError } = sessionIds.length
          ? await supabase
              .from("attempted_questions")
              .select(
                "session_id, question_title, difficulty, hints_used, test_cases_passed",
              )
              .in("session_id", sessionIds)
          : { data: [], error: null };

        if (questionsError) {
          console.error(
            "Could not load dashboard questions:",
            questionsError.message,
          );
        } else {
          const questionsBySession = new Map(
            (questions ?? []).map((question) => [question.session_id, question]),
          );
          sessions = (rows ?? []).map((row) => {
            const question = questionsBySession.get(row.id);
            return {
              id: row.id,
              createdAt: row.created_at,
              questionTitle: question?.question_title ?? "Interview session",
              difficulty: question?.difficulty ?? "Easy",
              score: row.overall_score,
              hintsUsed: question?.hints_used ?? 0,
              passed: question?.test_cases_passed ?? false,
              communication: row.communication_score,
              deadAirPercent: Number(row.avg_dead_air_percentage),
              fillerCount: row.total_filler_words,
            };
          });
        }
      }
    }
  }

  return <Dashboard sessions={sessions} userEmail={userEmail} />;
}
