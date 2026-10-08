import { NextRequest, NextResponse } from "next/server";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama-3.3-70b-versatile";

export async function POST(req: NextRequest) {
  const { transcript } = (await req.json()) as { transcript: string };

  if (!transcript || transcript.trim().length < 10) {
    return NextResponse.json(
      { valid: false, missing: ["verbal explanation"], translation: "" },
      { status: 200 },
    );
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    // Graceful fallback: run client-side heuristic (caller handles this)
    return NextResponse.json(
      { error: "GROQ_API_KEY not configured" },
      { status: 503 },
    );
  }

  const systemPrompt = `You are a strict technical interview evaluator.
A candidate has given a verbal explanation before coding.
Evaluate whether their explanation covers ALL THREE of these required points:
1. brute_force: Did they mention a brute-force or naive approach?
2. algorithm: Did they name a specific data structure or algorithm (e.g. hash map, two pointers, binary search, stack, queue, BFS, DFS, greedy, DP)?
3. complexity: Did they mention time AND space complexity in Big-O notation?

Also generate a polished "corporate English" translation of what they said (even if parts were in Hinglish/mixed language), preserving all technical accuracy.

Respond ONLY with valid JSON matching exactly this shape:
{
  "valid": boolean,
  "missing": string[],
  "translation": string
}

If valid is true, missing must be an empty array.
If valid is false, missing must list only the points that were absent, e.g. ["time and space complexity"].
The translation should always be a professionally worded version of their pitch even if incomplete.`;

  const userMessage = `Candidate's verbal explanation:\n"${transcript.trim()}"`;

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
        temperature: 0.2,
        max_tokens: 400,
        response_format: { type: "json_object" },
      }),
    });

    if (!groqRes.ok) {
      const errText = await groqRes.text();
      console.error("Groq error (validate-pitch):", errText);
      return NextResponse.json(
        { error: "Upstream LLM error", details: errText },
        { status: 502 },
      );
    }

    const data = (await groqRes.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const raw = data.choices?.[0]?.message?.content ?? "{}";

    const parsed = JSON.parse(raw) as {
      valid?: boolean;
      missing?: string[];
      translation?: string;
    };

    return NextResponse.json({
      valid: parsed.valid ?? false,
      missing: parsed.missing ?? [],
      translation: parsed.translation ?? "",
    });
  } catch (err) {
    console.error("validate-pitch route error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
