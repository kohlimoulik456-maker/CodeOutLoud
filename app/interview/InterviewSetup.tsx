"use client";

import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";
import type { FormEvent } from "react";
import InterviewArena from "./InterviewArena";
import {
  INTERVIEW_LANGUAGES,
  LEETCODE_TOPIC_TAGS,
  PROBLEM_DIFFICULTIES,
  type InterviewLanguage,
  type LeetCodeProblem,
  type ProblemDifficulty,
  type ProblemSearchFilters,
} from "./problem-types";

const SAVED_PROBLEM_KEY = "codeoutloud-selected-problem-v1";
const SAVED_PROBLEM_EVENT = "codeoutloud:selected-problem";

type SavedProblem = {
  problem: LeetCodeProblem;
  language: InterviewLanguage;
};

function isSavedProblem(value: unknown): value is SavedProblem {
  if (!value || typeof value !== "object") return false;
  const saved = value as Partial<SavedProblem>;
  const problem = saved.problem;
  if (!problem) return false;
  return (
    typeof problem.questionId === "string" &&
    typeof problem.questionFrontendId === "string" &&
    typeof problem.title === "string" &&
    typeof problem.titleSlug === "string" &&
    ["Easy", "Medium", "Hard"].includes(problem.difficulty) &&
    typeof problem.content === "string" &&
    (problem.executionSpec === undefined ||
      problem.executionSpec === null ||
      (!!problem.executionSpec &&
        typeof problem.executionSpec.methodName === "string" &&
        Array.isArray(problem.executionSpec.parameterTypes) &&
        Array.isArray(problem.executionSpec.sampleCases))) &&
    Array.isArray(problem.topicTags) &&
    problem.topicTags.every(
      (tag) =>
        !!tag &&
        typeof tag.name === "string" &&
        typeof tag.slug === "string",
    ) &&
    INTERVIEW_LANGUAGES.every(
      (option) => typeof problem.codeTemplates?.[option] === "string",
    ) &&
    INTERVIEW_LANGUAGES.includes(saved.language as InterviewLanguage)
  );
}

function getSavedProblemSnapshot() {
  return window.localStorage.getItem(SAVED_PROBLEM_KEY) ?? "null";
}

function getServerSavedProblemSnapshot() {
  return "null";
}

function subscribeToSavedProblem(callback: () => void) {
  window.addEventListener(SAVED_PROBLEM_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(SAVED_PROBLEM_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

export default function InterviewSetup() {
  const [difficulty, setDifficulty] = useState<ProblemDifficulty>("Easy");
  const [language, setLanguage] = useState<InterviewLanguage>("JavaScript");
  const [tags, setTags] = useState<string[]>([]);
  const savedProblemJson = useSyncExternalStore(
    subscribeToSavedProblem,
    getSavedProblemSnapshot,
    getServerSavedProblemSnapshot,
  );
  const selection = useMemo(() => {
    try {
      const parsed: unknown = JSON.parse(savedProblemJson);
      return isSavedProblem(parsed) ? parsed : null;
    } catch (restoreError) {
      console.error("Could not restore the selected interview problem:", restoreError);
      return null;
    }
  }, [savedProblemJson]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleTag = (slug: string) => {
    setTags((current) =>
      current.includes(slug)
        ? current.filter((tag) => tag !== slug)
        : current.length < 8
          ? [...current, slug]
          : current,
    );
  };

  const findProblem = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const filters: ProblemSearchFilters = { difficulty, language, tags };

    try {
      const response = await fetch("/api/problems", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(filters),
      });
      const result = (await response.json()) as {
        problem?: LeetCodeProblem;
        error?: string;
      };
      if (!response.ok || !result.problem) {
        throw new Error(result.error ?? "Could not find a matching LeetCode problem.");
      }

      const saved = { problem: result.problem, language };
      window.localStorage.setItem(SAVED_PROBLEM_KEY, JSON.stringify(saved));
      window.dispatchEvent(new Event(SAVED_PROBLEM_EVENT));
      window.localStorage.removeItem("codeoutloud-session-v2");
    } catch (requestError) {
      console.error("Could not start the LeetCode interview:", requestError);
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not load a LeetCode problem. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const chooseAnotherProblem = () => {
    window.localStorage.removeItem(SAVED_PROBLEM_KEY);
    window.dispatchEvent(new Event(SAVED_PROBLEM_EVENT));
    window.localStorage.removeItem("codeoutloud-session-v2");
  };

  if (selection) {
    return (
      <InterviewArena
        key={selection.problem.questionId}
        problem={selection.problem}
        initialLanguage={selection.language}
        onChooseAnotherProblem={chooseAnotherProblem}
      />
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f6f3] px-4 py-8 text-[#191916]">
      <div className="mx-auto max-w-6xl space-y-7">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-[#92713a]">
              Voice-first practice
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight">
              CodeOut<span className="text-[#92713a]">Loud</span>
            </h1>
          </div>
          <Link
            href="/"
            className="rounded-full border border-stone-300 bg-white px-4 py-2 text-sm text-stone-700 transition hover:bg-[#eee9dc]"
          >
            Back to dashboard
          </Link>
        </header>

        <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-lg shadow-black/5 md:p-8">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[#92713a]">New session</p>
            <h2 className="mt-2 text-2xl font-semibold">Configure your interview</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
              Choose your problem preferences. We’ll fetch a matching free LeetCode question and
              open its statement and starter code in the interview arena.
            </p>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-[#c8a45c]/60 bg-[#fffdf7] p-4">
              <p className="text-sm font-semibold">DSA</p>
              <p className="mt-1 text-xs text-stone-500">Available now</p>
            </div>
            {["System Design", "Theory · OS / Networking / OOPs"].map((track) => (
              <div
                key={track}
                aria-disabled="true"
                className="rounded-2xl border border-stone-200 bg-stone-50 p-4 opacity-60"
              >
                <p className="text-sm font-semibold">{track}</p>
                <p className="mt-1 text-xs text-stone-500">Coming soon · Pro</p>
              </div>
            ))}
          </div>

          <form onSubmit={findProblem} className="mt-7">
            <div className="grid gap-5 lg:grid-cols-3">
              <fieldset className="rounded-2xl border border-stone-200 p-5">
                <legend className="px-2 text-sm font-semibold">1. Difficulty</legend>
                <div className="mt-2 space-y-2">
                  {PROBLEM_DIFFICULTIES.map((option) => (
                    <label
                      key={option}
                      className="flex cursor-pointer items-center gap-3 rounded-xl border border-stone-200 px-3 py-3 text-sm transition has-[:checked]:border-[#c8a45c] has-[:checked]:bg-[#fffaf0]"
                    >
                      <input
                        type="radio"
                        name="difficulty"
                        value={option}
                        checked={difficulty === option}
                        onChange={() => setDifficulty(option)}
                        className="accent-[#92713a]"
                      />
                      {option}
                    </label>
                  ))}
                </div>
              </fieldset>

              <fieldset className="rounded-2xl border border-stone-200 p-5">
                <legend className="px-2 text-sm font-semibold">2. Programming language</legend>
                <label htmlFor="setup-language" className="sr-only">
                  Choose programming language
                </label>
                <select
                  id="setup-language"
                  value={language}
                  onChange={(event) => setLanguage(event.target.value as InterviewLanguage)}
                  className="mt-2 w-full rounded-xl border border-stone-300 bg-white px-3 py-3 text-sm outline-none focus:border-[#92713a]"
                >
                  {INTERVIEW_LANGUAGES.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
                <p className="mt-3 text-xs leading-5 text-stone-500">
                  The arena will load LeetCode’s starter template for this language.
                </p>
              </fieldset>

              <fieldset className="rounded-2xl border border-stone-200 p-5">
                <legend className="px-2 text-sm font-semibold">3. Topics</legend>
                <p className="mb-3 text-xs text-stone-500">
                  Select up to 8 tags. Leave empty to search all topics.
                </p>
                <div className="max-h-64 space-y-1 overflow-y-auto pr-1">
                  {LEETCODE_TOPIC_TAGS.map((tag) => (
                    <label
                      key={tag.slug}
                      className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-stone-50"
                    >
                      <input
                        type="checkbox"
                        checked={tags.includes(tag.slug)}
                        disabled={!tags.includes(tag.slug) && tags.length >= 8}
                        onChange={() => toggleTag(tag.slug)}
                        className="accent-[#92713a]"
                      />
                      {tag.name}
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>

            {error && (
              <p role="alert" className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-6 w-full rounded-xl bg-[#191916] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[#302b20] disabled:cursor-wait disabled:opacity-60 sm:w-auto"
            >
              {loading ? "Finding a matching problem…" : "Find problem & start interview"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
