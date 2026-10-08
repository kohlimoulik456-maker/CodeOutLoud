import { NextRequest, NextResponse } from "next/server";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama-3.3-70b-versatile";
const MAX_MESSAGES = 12;
const MAX_MESSAGE_LENGTH = 1200;

type ChatMessage = { role: "user" | "assistant"; content: string };

function isChatMessage(value: unknown): value is ChatMessage {
  if (!value || typeof value !== "object") return false;
  const message = value as Partial<ChatMessage>;
  return (
    (message.role === "user" || message.role === "assistant") &&
    typeof message.content === "string" &&
    message.content.trim().length > 0 &&
    message.content.length <= MAX_MESSAGE_LENGTH
  );
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON." },
      { status: 400 },
    );
  }

  if (
    !body ||
    typeof body !== "object" ||
    !Array.isArray((body as { messages?: unknown }).messages)
  ) {
    return NextResponse.json({ error: "Chat messages are required." }, { status: 400 });
  }

  const messages = (body as { messages: unknown[] }).messages;
  if (
    messages.length === 0 ||
    messages.length > MAX_MESSAGES ||
    !messages.every(isChatMessage) ||
    messages[messages.length - 1]?.role !== "user"
  ) {
    return NextResponse.json(
      { error: "Send up to 12 valid chat messages, ending with a user message." },
      { status: 400 },
    );
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    const setupLocation = process.env.VERCEL
      ? "Vercel project settings"
      : ".env.local";
    return NextResponse.json(
      { error: `AI coach is not configured. Add GROQ_API_KEY to ${setupLocation}.` },
      { status: 503 },
    );
  }

  try {
    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.45,
        max_tokens: 500,
        messages: [
          {
            role: "system",
            content:
              "You are CodeOutLoud's friendly, concise DSA interview coach. Explain concepts clearly, guide the student with questions instead of dumping full solutions, and help them practice articulating brute force, optimizations, edge cases, and time/space complexity. Keep responses focused and supportive. Do not claim to run code or know a student's private data.",
          },
          ...messages,
        ],
      }),
      signal: AbortSignal.timeout(20_000),
    });

    if (!response.ok) {
      const details = await response.text();
      console.error("Groq error (chat):", response.status, details);
      if (response.status === 401 || response.status === 403) {
        return NextResponse.json(
          { error: "Groq rejected the configured key. Replace GROQ_API_KEY with a valid server-side key." },
          { status: 502 },
        );
      }
      if (response.status === 429) {
        return NextResponse.json(
          { error: "The Groq rate limit was reached. Please try again shortly." },
          { status: 429 },
        );
      }
      return NextResponse.json(
        { error: "The AI coach could not respond right now. Please try again." },
        { status: 502 },
      );
    }

    const result = (await response.json()) as {
      choices?: { message?: { content?: string | null } }[];
    };
    const reply = result.choices?.[0]?.message?.content?.trim();
    if (!reply) {
      console.error("Groq chat response did not include a message.");
      return NextResponse.json(
        { error: "The AI coach returned an empty response. Please try again." },
        { status: 502 },
      );
    }

    return NextResponse.json({ reply });
  } catch (error) {
    console.error("Chat route failed:", error);
    return NextResponse.json(
      { error: "The AI coach could not be reached. Please try again." },
      { status: 502 },
    );
  }
}
