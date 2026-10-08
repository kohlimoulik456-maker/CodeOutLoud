import { NextRequest, NextResponse } from "next/server";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama-3.3-70b-versatile";

type InterviewerMode = "FAANG Bar Raiser" | "Empathetic Senior Dev" | "Strict Edge-Case Specialist";

const personaInstructions: Record<InterviewerMode, string> = {
  "FAANG Bar Raiser":
    "You are an aggressive FAANG Bar Raiser. Ask sharp, scalability-focused follow-up questions about Big-O trade-offs, memory constraints, or distributed system implications. Be direct and challenging.",
  "Empathetic Senior Dev":
    "You are a supportive senior engineer. Offer a gentle, structured hint if there is dead air, or ask a guiding question about the candidate's design choice. Keep the tone warm but intellectually probing.",
  "Strict Edge-Case Specialist":
    "You are a meticulous edge-case specialist. Ask specifically about null inputs, empty arrays, integer overflow, duplicate values, or off-by-one errors in the candidate's current code.",
};

export async function POST(req: NextRequest) {
  const { code, transcript, interviewerMode, trigger } = (await req.json()) as {
    code: string;
    transcript: string;
    interviewerMode: string;
    trigger: "nested_loop" | "missing_boundary" | "silence" | "random";
  };

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GROQ_API_KEY not configured" },
      { status: 503 },
    );
  }

  const persona =
    personaInstructions[interviewerMode as InterviewerMode] ??
    personaInstructions["FAANG Bar Raiser"];

  const triggerContext: Record<string, string> = {
    nested_loop:
      "The candidate has written a nested loop in their code. Challenge them on worst-case time complexity.",
    missing_boundary:
      "The candidate's code appears to be missing boundary checks. Ask about empty input or duplicate edge cases.",
    silence:
      "The candidate has gone silent for too long. Probe them on their current thought process or loop invariant.",
    random:
      "Ask a context-aware follow-up question based on the code and transcript below.",
  };

  const systemPrompt = `${persona}

Context trigger: ${triggerContext[trigger] ?? triggerContext.random}

You will be given the candidate's current code and their verbal transcript so far.
Generate EXACTLY ONE short, punchy interviewer interruption question (1–2 sentences max).
The question must be directly relevant to what they have written or said.
Do NOT offer hints or answers. Ask only the question.
Respond ONLY with the question text — no JSON, no preamble.`;

  const userMessage = `Candidate's code so far:\n\`\`\`\n${code.slice(0, 800)}\n\`\`\`\n\nCandidate's verbal transcript:\n"${transcript.slice(0, 600)}"`;

  try {
    const groqRes = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        temperature: 0.7,
        max_tokens: 120,
      }),
    });

    if (!groqRes.ok) {
      const errText = await groqRes.text();
      console.error("Groq error (curveball):", errText);
      return NextResponse.json(
        { error: "Upstream LLM error", details: errText },
        { status: 502 },
      );
    }

    const data = (await groqRes.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const question =
      data.choices?.[0]?.message?.content?.trim() ??
      "What is the worst-case time complexity of your current approach?";

    return NextResponse.json({ question });
  } catch (err) {
    console.error("curveball route error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
