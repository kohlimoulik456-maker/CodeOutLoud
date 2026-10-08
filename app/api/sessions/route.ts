import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../utils/supabase/server";

type SessionPayload = {
  overallScore: number;
  communicationScore: number;
  deadAirPercent: number;
  fillerCount: number;
  questionId: string;
  questionTitle: string;
  difficulty: string;
  hintsUsed: number;
  passed: boolean;
  transcriptData: Record<string, unknown>;
};

function isValidPayload(value: unknown): value is SessionPayload {
  if (!value || typeof value !== "object") return false;
  const payload = value as Partial<SessionPayload>;
  return (
    Number.isInteger(payload.overallScore) &&
    payload.overallScore! >= 0 &&
    payload.overallScore! <= 100 &&
    Number.isInteger(payload.communicationScore) &&
    payload.communicationScore! >= 0 &&
    payload.communicationScore! <= 100 &&
    typeof payload.deadAirPercent === "number" &&
    payload.deadAirPercent >= 0 &&
    payload.deadAirPercent <= 100 &&
    Number.isInteger(payload.fillerCount) &&
    payload.fillerCount! >= 0 &&
    typeof payload.questionId === "string" &&
    payload.questionId.length > 0 &&
    typeof payload.questionTitle === "string" &&
    payload.questionTitle.length > 0 &&
    ["Easy", "Medium", "Hard"].includes(payload.difficulty ?? "") &&
    Number.isInteger(payload.hintsUsed) &&
    payload.hintsUsed! >= 0 &&
    payload.hintsUsed! <= 3 &&
    typeof payload.passed === "boolean" &&
    typeof payload.transcriptData === "object" &&
    payload.transcriptData !== null &&
    !Array.isArray(payload.transcriptData)
  );
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const { data: sessions, error } = await supabase
    .from("interview_sessions")
    .select("id, created_at, overall_score, communication_score, avg_dead_air_percentage, total_filler_words")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    console.error("Could not load interview sessions:", error.message);
    return NextResponse.json({ error: "Could not load interview history." }, { status: 500 });
  }
  if (!sessions.length) return NextResponse.json({ sessions: [] });

  const { data: questions, error: questionsError } = await supabase
    .from("attempted_questions")
    .select("session_id, question_title, difficulty, hints_used, test_cases_passed")
    .in("session_id", sessions.map((session) => session.id));

  if (questionsError) {
    console.error("Could not load attempted questions:", questionsError.message);
    return NextResponse.json({ error: "Could not load interview questions." }, { status: 500 });
  }

  const questionsBySession = new Map(
    questions.map((question) => [question.session_id, question]),
  );

  return NextResponse.json({
    sessions: sessions.map((session) => {
      const question = questionsBySession.get(session.id);
      return {
        id: session.id,
        createdAt: session.created_at,
        questionTitle: question?.question_title ?? "Interview session",
        difficulty: question?.difficulty ?? "Easy",
        score: session.overall_score,
        hintsUsed: question?.hints_used ?? 0,
        passed: question?.test_cases_passed ?? false,
        communication: session.communication_score,
        deadAirPercent: session.avg_dead_air_percentage,
        fillerCount: session.total_filler_words,
      };
    }),
  });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  if (!isValidPayload(body)) {
    return NextResponse.json({ error: "Interview summary is invalid." }, { status: 400 });
  }

  const { data: sessionId, error } = await supabase.rpc("save_interview_session", {
    p_overall_score: body.overallScore,
    p_communication_score: body.communicationScore,
    p_avg_dead_air_percentage: body.deadAirPercent,
    p_total_filler_words: body.fillerCount,
    p_question_id: body.questionId,
    p_question_title: body.questionTitle,
    p_difficulty: body.difficulty,
    p_hints_used: body.hintsUsed,
    p_test_cases_passed: body.passed,
    p_transcript_data: body.transcriptData,
  });

  if (error) {
    console.error("Could not save interview session:", error.message);
    return NextResponse.json({ error: "Could not save interview session." }, { status: 500 });
  }

  return NextResponse.json({ id: sessionId }, { status: 201 });
}
