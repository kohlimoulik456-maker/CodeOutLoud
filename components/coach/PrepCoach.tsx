"use client";

import { ArrowUp, Bot, LoaderCircle, Sparkles } from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";

type Message = { role: "user" | "assistant"; content: string };

const suggestions = [
  "How do I explain Big O clearly?",
  "Give me a hint for Two Sum",
  "What makes a good edge case?",
];

export default function PrepCoach() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hi, I’m your interview coach. Ask me about DSA, explaining your approach, or preparing for an interview.",
    },
  ]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, pending]);

  async function sendMessage(event?: FormEvent<HTMLFormElement>, text = draft) {
    event?.preventDefault();
    const content = text.trim();
    if (!content || pending) return;

    const conversation = [...messages, { role: "user" as const, content }];
    setMessages(conversation);
    setDraft("");
    setError(null);
    setPending(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: conversation.slice(-12) }),
      });
      const result = (await response.json()) as { reply?: string; error?: string };
      const reply = result.reply;
      if (!response.ok || !reply) {
        throw new Error(result.error ?? "Could not get a reply from the coach.");
      }
      setMessages((current) => [
        ...current,
        { role: "assistant", content: reply },
      ]);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not get a reply from the coach.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-stone-200/80 bg-white">
      <div className="flex items-center gap-2.5 border-b border-stone-100 px-4 py-4">
        <span className="grid size-9 place-items-center rounded-xl bg-[#1d1d19] text-[#dfc27d]">
          <Sparkles size={16} />
        </span>
        <div>
          <h2 className="text-sm font-semibold">Your prep coach</h2>
          <p className="text-[10px] text-stone-500">AI-powered DSA coaching</p>
        </div>
        <span className="ml-auto flex items-center gap-1.5 text-[10px] text-stone-500">
          Ask away
        </span>
      </div>

      <div
        ref={scrollRef}
        aria-live="polite"
        className="flex h-[270px] flex-col gap-3 overflow-y-auto bg-[#faf9f7] px-3 py-4"
      >
        {messages.map((message, index) => (
          <div
            key={`${index}-${message.role}`}
            className={`flex items-start gap-2 ${message.role === "user" ? "justify-end" : ""}`}
          >
            {message.role === "assistant" && (
              <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-lg bg-[#e9dfc9] text-[#725a2f]">
                <Bot size={13} />
              </span>
            )}
            <p
              className={`max-w-[88%] whitespace-pre-wrap rounded-2xl px-3 py-2.5 text-xs leading-5 ${
                message.role === "user"
                  ? "rounded-tr-sm bg-[#1d1d19] text-white"
                  : "rounded-tl-sm border border-stone-100 bg-white text-stone-700"
              }`}
            >
              {message.content}
            </p>
          </div>
        ))}
        {pending && (
          <div className="flex items-center gap-2 text-xs text-stone-500">
            <LoaderCircle size={14} className="animate-spin" />
            Coach is thinking…
          </div>
        )}
      </div>

      {messages.length === 1 && (
        <div className="flex flex-wrap gap-1.5 border-t border-stone-100 px-3 py-3">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              disabled={pending}
              onClick={(event) => {
                void event.currentTarget.form;
                void sendMessage(undefined, suggestion);
              }}
              className="rounded-full border border-stone-200 bg-white px-2.5 py-1.5 text-[10px] text-stone-600 transition hover:border-[#c8a45c]/60 hover:text-[#725a2f] disabled:opacity-50"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      <form
        onSubmit={(event) => void sendMessage(event)}
        className="flex items-center gap-2 border-t border-stone-100 p-3"
      >
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          aria-label="Ask your interview coach"
          maxLength={1200}
          placeholder="Ask your coach a question…"
          className="min-w-0 flex-1 rounded-xl border border-stone-200 bg-[#faf9f7] px-3 py-2.5 text-xs outline-none transition placeholder:text-stone-400 focus:border-[#b88d45] focus:bg-white"
        />
        <button
          type="submit"
          disabled={pending || !draft.trim()}
          aria-label="Send message"
          className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#1d1d19] text-[#dfc27d] transition hover:bg-[#33322d] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ArrowUp size={16} />
        </button>
      </form>
      {error && (
        <p role="alert" className="border-t border-rose-100 bg-rose-50 px-3 py-2 text-[11px] leading-4 text-rose-700">
          {error}
        </p>
      )}
    </section>
  );
}
