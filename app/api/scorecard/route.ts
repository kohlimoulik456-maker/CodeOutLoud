import { NextRequest, NextResponse } from "next/server";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "openai/gpt-oss-120b";

export interface ScorecardPayload {
  transcript: string;
  code: string;
  silenceSeconds: number;
  fillerCount: number;
  algorithmicScore: number;
  communicationScore: number;
  edgeScore: number;
}

export interface ScorecardAudit {
  audit: { timestamp: string; quote: string; feedback: string }[];
  summary: string;
}

export async function POST(req: NextRequest) {
  const payload = (await req.json()) as ScorecardPayload;

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GROQ_API_KEY not configured" },
      { status: 503 },
    );
  }

  const systemPrompt = `You are a senior technical interview coach generating a post-interview audit report.
Given a candidate's full transcript, code, and session metrics, produce a timestamped "What You Should Have Said" audit.

Rules:
- Generate 3–5 audit entries, each pointing to a specific moment in the transcript.
- Each entry has: timestamp (MM:SS format), a short direct quote or paraphrase from the transcript, and a concrete coaching note.
- Mix positive reinforcement and constructive criticism.
- End with a 2-sentence overall summary.

Respond ONLY with valid JSON matching exactly this shape:
{
  "audit": [
    { "timestamp": "MM:SS", "quote": "what candidate said (paraphrased)", "feedback": "coaching note" }
  ],
  "summary": "two-sentence overall verdict"
}`;

  const userMessage = `Session data:
- Transcript: "${payload.transcript.slice(0, 1200)}"
- Code: \`\`\`\n${payload.code.slice(0, 600)}\n\`\`\`
- Silence: ${payload.silenceSeconds}s total
- Filler words: ${payload.fillerCount}
- Scores — Algorithmic: ${payload.algorithmicScore}/100, Communication: ${payload.communicationScore}/100, Edge-case: ${payload.edgeScore}/100`;

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
        temperature: 0.4,
        max_tokens: 800,
        response_format: { type: "json_object" },
      }),
    });

    if (!groqRes.ok) {
      const errText = await groqRes.text();
      console.error("Groq error (scorecard):", errText);
      return NextResponse.json(
        { error: "Upstream LLM error", details: errText },
        { status: 502 },
      );
    }

    const data = (await groqRes.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const raw = data.choices?.[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw) as ScorecardAudit;

    return NextResponse.json<ScorecardAudit>({
      audit: parsed.audit ?? [],
      summary: parsed.summary ?? "",
    });
  } catch (err) {
    console.error("scorecard route error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
