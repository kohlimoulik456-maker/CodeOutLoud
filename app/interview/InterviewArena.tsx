"use client";

import Editor from "@monaco-editor/react";
import Link from "next/link";
import {
  AlertTriangle,
  BarChart3,
  BrainCircuit,
  CheckCircle2,
  Lock,
  Mic,
  MicOff,
  Sparkles,
  TimerReset,
  Unlock,
  Volume2,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { SetStateAction } from "react";
import UpgradeToProModal from "../../components/UpgradeToProModal";
import { saveGuestSession, type SessionRecord } from "../../utils/session-history";

// ─── Types ────────────────────────────────────────────────────────────────────

type Stage = "setup" | "pitch" | "coding" | "submitted";

type ScoreNumbers = {
  overall: number;
  algorithmic: number;
  communication: number;
  edge: number;
  deadAirPercent: number;
  fillerWordsPerMinute: number;
  toneConfidence: number;
  testSummary: string;
};

type AuditEntry = { timestamp: string; quote: string; feedback: string };

type ScoreSummary = ScoreNumbers & {
  audit: AuditEntry[];
  auditSummary: string;
};

type SpeechRecognitionResultItem = { transcript?: string };
type SpeechRecognitionEventLike = {
  results?: ArrayLike<ArrayLike<SpeechRecognitionResultItem>>;
  error?: string;
};
type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

declare global {
  interface Window {
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    SpeechRecognition?: new () => SpeechRecognitionLike;
  }
}

// ─── Static data ──────────────────────────────────────────────────────────────

const problem = {
  title: "Two Sum",
  difficulty: "Easy",
  pattern: "Product-Based / FAANG",
  prompt:
    "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to the target.",
  constraints: [
    "Each input has exactly one solution.",
    "You may not use the same element twice.",
    "Expected time complexity should be better than O(n²).",
  ],
};

const defaultCode: Record<string, string> = {
  JavaScript: `function twoSum(nums, target) {
  const seen = new Map();
  for (let i = 0; i < nums.length; i++) {
    const diff = target - nums[i];
    if (seen.has(diff)) return [seen.get(diff), i];
    seen.set(nums[i], i);
  }
  return [];
}`,
  Python: `def two_sum(nums, target):
    seen = {}
    for i, num in enumerate(nums):
        diff = target - num
        if diff in seen:
            return [seen[diff], i]
        seen[num] = i
    return []`,
  "C++": `#include <unordered_map>
#include <vector>
using namespace std;

vector<int> twoSum(vector<int>& nums, int target) {
    unordered_map<int,int> seen;
    for (int i = 0; i < (int)nums.size(); i++) {
        int diff = target - nums[i];
        if (seen.count(diff)) return {seen[diff], i};
        seen[nums[i]] = i;
    }
    return {};
}`,
  Java: `import java.util.HashMap;

class Solution {
    public int[] twoSum(int[] nums, int target) {
        HashMap<Integer, Integer> seen = new HashMap<>();
        for (int i = 0; i < nums.length; i++) {
            int diff = target - nums[i];
            if (seen.containsKey(diff)) return new int[]{seen.get(diff), i};
            seen.put(nums[i], i);
        }
        return new int[]{};
    }
}`,
};

const LANGUAGES = ["JavaScript", "Python", "C++", "Java"] as const;
type Language = (typeof LANGUAGES)[number];

const INTERVIEWER_MODES = [
  "FAANG Bar Raiser",
  "Empathetic Senior Dev",
  "Strict Edge-Case Specialist",
] as const;
type InterviewerMode = (typeof INTERVIEWER_MODES)[number];

const MONACO_LANG: Record<Language, string> = {
  JavaScript: "javascript",
  Python: "python",
  "C++": "cpp",
  Java: "java",
};

const DEAD_AIR_THRESHOLD_SEC = 15;
// Curveball fires once after this many seconds of coding if not yet triggered
const CURVEBALL_AUTO_SEC = 30;

// ─── Helpers (pure, no side-effects) ─────────────────────────────────────────

function countFillerWords(text: string) {
  return (text.match(/\b(um|uh|like|basically|so yeah|you know|seriously)\b/gi) ?? []).length;
}

/** Client-side heuristic fallback for pitch validation (used if API unavailable) */
function analyzePitchLocal(transcript: string) {
  const lower = transcript.toLowerCase();
  const hasBrute =
    /brute|naive|simple|check every|nested loop|all pairs|iterate all|for each pair/i.test(lower);
  const hasAlgo =
    /hash ?map|hash ?table|dictionary|\bmap\b|two pointer|pointer|sort|stack|queue|bfs|dfs|binary search|greedy|dp|dynamic/i.test(
      lower,
    );
  const hasComplexity =
    /(o\s*\([^)]+\)|big-?o|time complexity|space complexity|complexity)/i.test(lower);

  const missing: string[] = [];
  if (!hasBrute) missing.push("brute-force intuition");
  if (!hasAlgo) missing.push("targeted algorithm or data structure");
  if (!hasComplexity) missing.push("time and space complexity");

  const translation = hasAlgo
    ? lower.includes("map") || lower.includes("hash")
      ? "I will identify the brute-force pair-scan, then deploy a hash map to track complements — delivering O(n) time and O(n) auxiliary space."
      : lower.includes("pointer")
        ? "I will start with the naive scan, then optimize via a two-pointer strategy after sorting, achieving O(n log n) time and O(1) extra space."
        : "I will reason through the brute-force approach first, then select the appropriate algorithm for an optimal solution."
    : "I will reason through the brute-force approach, then leverage a hash map to reduce the time complexity to O(n) with O(n) space.";

  return { valid: missing.length === 0, missing, translation };
}

function evaluateCode(code: string): {
  passRate: number;
  passed: boolean;
  error?: string;
} {
  const tests = [
    { nums: [2, 7, 11, 15], target: 9, expected: [0, 1] },
    { nums: [3, 2, 4], target: 6, expected: [1, 2] },
    { nums: [3, 3], target: 6, expected: [0, 1] },
    { nums: [1, 2, 3, 4, 6], target: 10, expected: [3, 4] },
  ];
  try {
    if (!code.includes("function twoSum") && !code.includes("const twoSum")) {
      return {
        passRate: 0,
        passed: false,
        error: "In-browser test checks currently support the JavaScript Two Sum solution only.",
      };
    }
    const runner = new Function("nums", "target", `${code}; return twoSum(nums, target);`);
    const results = tests.map(({ nums, target, expected }) => {
      const actual = runner(nums, target) as number[];
      return JSON.stringify(actual) === JSON.stringify(expected);
    });
    const passRate = (results.filter(Boolean).length / results.length) * 100;
    return { passRate, passed: passRate === 100 };
  } catch (err) {
    return {
      passRate: 0,
      passed: false,
      error: err instanceof Error ? err.message : "Compilation error.",
    };
  }
}

function buildScoreNumbers(
  transcript: string,
  silenceSeconds: number,
  code: string,
): ScoreNumbers {
  const codeResults = evaluateCode(code);
  const algorithmic = codeResults.passed
    ? 96
    : Math.max(35, Math.round(codeResults.passRate * 0.8));
  const words = transcript.trim().split(/\s+/).filter(Boolean).length;
  const fillers = countFillerWords(transcript);
  const talkRatio = Math.min(100, Math.round((words / Math.max(1, words + 22)) * 100));
  const communication = Math.max(
    45,
    Math.min(
      100,
      talkRatio + (fillers < 5 ? 22 : 6) - Math.min(30, Math.round(silenceSeconds / 2)),
    ),
  );
  const edge = Math.max(
    40,
    Math.min(
      100,
      (code.includes("Map") || code.includes("map") ? 28 : 12) +
        (transcript.toLowerCase().includes("empty") ? 18 : 8) +
        (transcript.toLowerCase().includes("duplicate") ? 18 : 7) +
        (codeResults.passed ? 18 : 0),
    ),
  );
  const deadAirPercent = Math.min(100, Math.round((silenceSeconds / 90) * 100));
  const fillerWordsPerMinute = Math.max(
    0,
    Math.round((fillers / Math.max(1, Math.ceil(words / 100))) * 60),
  );
  const toneConfidence = Math.max(
    45,
    Math.min(100, 82 - fillers * 5 + (transcript.trim().length > 120 ? 8 : 0)),
  );
  const overall = Math.round(algorithmic * 0.4 + communication * 0.3 + edge * 0.3);
  return {
    overall,
    algorithmic,
    communication,
    edge,
    deadAirPercent,
    fillerWordsPerMinute,
    toneConfidence,
    testSummary: codeResults.passed
      ? "All standard test cases passed including duplicate and multi-solution edge scenarios."
      : "The solution is close — add boundary and duplicate coverage before submission.",
  };
}

// ─── Session persistence ──────────────────────────────────────────────────────

const SESSION_KEY = "codeoutloud-session-v2";
const SESSION_UPDATED_EVENT = "codeoutloud:arena-session";

type PersistedSession = {
  stage: Stage;
  language: Language;
  interviewerMode: InterviewerMode;
  editorLocked: boolean;
  code: string;
  transcript: string;
  translation: string;
  silenceSeconds: number;
};

function freshSession(): PersistedSession {
  return {
    stage: "setup",
    language: "JavaScript",
    interviewerMode: "FAANG Bar Raiser",
    editorLocked: true,
    code: defaultCode["JavaScript"],
    transcript: "",
    translation: "",
    silenceSeconds: 0,
  };
}

function loadSession(): PersistedSession {
  const fallback = freshSession();
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return fallback;
    return { ...fallback, ...(JSON.parse(raw) as Partial<PersistedSession>) };
  } catch {
    return fallback;
  }
}

const FRESH_SESSION_JSON = JSON.stringify(freshSession());

function getSessionSnapshot() {
  return typeof window === "undefined"
    ? FRESH_SESSION_JSON
    : window.localStorage.getItem(SESSION_KEY) ?? FRESH_SESSION_JSON;
}

function getServerSessionSnapshot() {
  return FRESH_SESSION_JSON;
}

function subscribeToSession(callback: () => void) {
  window.addEventListener(SESSION_UPDATED_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(SESSION_UPDATED_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

function writeSessionSnapshot(session: PersistedSession) {
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  window.dispatchEvent(new Event(SESSION_UPDATED_EVENT));
}

function updateSessionField<K extends keyof PersistedSession>(
  key: K,
  value: SetStateAction<PersistedSession[K]>,
) {
  const current = loadSession();
  const nextValue =
    typeof value === "function"
      ? (value as (previous: PersistedSession[K]) => PersistedSession[K])(
          current[key],
        )
      : value;
  writeSessionSnapshot({ ...current, [key]: nextValue });
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Home() {
  const initial = JSON.parse(
    useSyncExternalStore(
      subscribeToSession,
      getSessionSnapshot,
      getServerSessionSnapshot,
    ),
  ) as PersistedSession;
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const stage = initial.stage;
  const language = initial.language;
  const interviewerMode = initial.interviewerMode;
  const editorLocked = initial.editorLocked;
  const code = initial.code;
  const transcript = initial.transcript;
  const translation = initial.translation;
  const silenceSeconds = initial.silenceSeconds;
  const setStage = (value: SetStateAction<Stage>) =>
    updateSessionField("stage", value);
  const setLanguage = (value: SetStateAction<Language>) =>
    updateSessionField("language", value);
  const setInterviewerMode = (value: SetStateAction<InterviewerMode>) =>
    updateSessionField("interviewerMode", value);
  const setEditorLocked = (value: SetStateAction<boolean>) =>
    updateSessionField("editorLocked", value);
  const setCode = (value: SetStateAction<string>) =>
    updateSessionField("code", value);
  const setTranscript = (value: SetStateAction<string>) =>
    updateSessionField("transcript", value);
  const setTranslation = (value: SetStateAction<string>) =>
    updateSessionField("translation", value);
  const setSilenceSeconds = (value: SetStateAction<number>) =>
    updateSessionField("silenceSeconds", value);

  // UI state
  const [isListening, setIsListening] = useState(false);
  const [pitchLoading, setPitchLoading] = useState(false);
  const [curveball, setCurveball] = useState<string | null>(null);
  const [curveballResponse, setCurveballResponse] = useState("");
  const [curveballLoading, setCurveballLoading] = useState(false);
  const [score, setScore] = useState<ScoreSummary | null>(null);
  const [scorecardLoading, setScorecardLoading] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [deadAirBanner, setDeadAirBanner] = useState(false);
  const [pitchMissing, setPitchMissing] = useState<string[]>([]);

  // Refs
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const isListeningRef = useRef(false);
  const curveballFiredRef = useRef(false);

  // ── Silence / dead-air timer ─────────────────────────────────────────────
  useEffect(() => {
    if (stage !== "coding") return;
    const ticker = window.setInterval(() => {
      setSilenceSeconds((s) => s + 1);
    }, 1000);
    return () => window.clearInterval(ticker);
  }, [stage]);

  // Show dead air banner after threshold while coding
  useEffect(() => {
    if (stage !== "coding") return;
    if (silenceSeconds > 0 && silenceSeconds % DEAD_AIR_THRESHOLD_SEC === 0) {
      const show = window.setTimeout(() => setDeadAirBanner(true), 0);
      const dismiss = window.setTimeout(() => setDeadAirBanner(false), 6000);
      return () => {
        window.clearTimeout(show);
        window.clearTimeout(dismiss);
      };
    }
  }, [silenceSeconds, stage]);

  // ── Speech helpers ───────────────────────────────────────────────────────

  const speakAi = useCallback((text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.05;
    utterance.pitch = 1.05;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }, []);

  const startSpeechCapture = useCallback(() => {
    if (typeof window === "undefined") return;
    const SpeechAPI = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!SpeechAPI) {
      setErrorBanner(
        "Native speech recognition is unavailable in this browser. Use the transcript box below to type your explanation manually.",
      );
      return;
    }
    const rec = new SpeechAPI();
    rec.lang = "en-IN";
    rec.continuous = true;
    rec.interimResults = true;

    rec.onresult = (event) => {
      const raw = Array.from(event.results ?? [])
        .map((r) => Array.from(r).map((item) => item.transcript ?? "").join(" "))
        .join(" ")
        .trim();
      if (raw) setTranscript(raw);
    };

    rec.onerror = (event) => {
      setErrorBanner(`Mic error: ${event.error ?? "Unable to access microphone."}`);
      setIsListening(false);
      isListeningRef.current = false;
    };

    rec.onend = () => {
      // Restart if we deliberately keep listening
      if (isListeningRef.current) {
        try { rec.start(); } catch { /* already started */ }
      }
    };

    rec.start();
    setIsListening(true);
    isListeningRef.current = true;
    recognitionRef.current = rec;
  }, []);

  const stopSpeechCapture = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
    isListeningRef.current = false;
  }, []);

  // ── API calls ────────────────────────────────────────────────────────────

  const validatePitch = async () => {
    if (!transcript.trim()) {
      setErrorBanner("Please speak or type your approach first before validating.");
      speakAi("Please describe your brute-force approach, algorithm, and complexity before I can unlock the editor.");
      return;
    }
    setPitchLoading(true);
    setPitchMissing([]);
    setErrorBanner(null);

    let result: ReturnType<typeof analyzePitchLocal>;
    let usedLocalCheck = false;
    try {
      const res = await fetch("/api/validate-pitch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript }),
      });

      if (!res.ok) {
        usedLocalCheck = true;
        console.error("AI pitch validation unavailable:", res.status);
        result = analyzePitchLocal(transcript);
      } else {
        const data = (await res.json()) as { valid?: boolean; missing?: string[]; translation?: string; error?: string };
        if (data.error) {
          usedLocalCheck = true;
          result = analyzePitchLocal(transcript);
        } else {
          result = {
            valid: data.valid ?? false,
            missing: data.missing ?? [],
            translation: data.translation ?? "",
          };
        }
      }
    } catch (error) {
      console.error("AI pitch validation request failed:", error);
      usedLocalCheck = true;
      result = analyzePitchLocal(transcript);
    }

    const fallbackNotice =
      "AI pitch review is unavailable; a local checklist was used. Configure a valid GROQ_API_KEY to enable AI review.";
    if (!result.valid) {
      setPitchMissing(result.missing);
      const msg = `${usedLocalCheck ? `${fallbackNotice} ` : ""}Your pitch is missing: ${result.missing.join(", ")}. Please cover those points before I unlock the editor.`;
      setErrorBanner(msg);
      speakAi(msg);
    } else {
      setTranslation(result.translation);
      setEditorLocked(false);
      setStage("coding");
      setDeadAirBanner(false);
      setErrorBanner(usedLocalCheck ? fallbackNotice : null);
      setPitchMissing([]);
      speakAi(
        "Editor unlocked. Excellent approach. Continue coding and narrate your implementation step by step.",
      );
    }
    setPitchLoading(false);
  };

  const fireCurveball = useCallback(async (
    trigger: "nested_loop" | "missing_boundary" | "silence" | "random" = "random",
  ) => {
    setCurveballLoading(true);
    try {
      const res = await fetch("/api/curveball", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, transcript, interviewerMode, trigger }),
      });

      let question: string;

      if (!res.ok) {
        console.error("AI curveball unavailable:", res.status);
        setErrorBanner("AI follow-up is unavailable; a built-in edge-case question was used.");
        const fallbacks: Record<string, string> = {
          nested_loop: "I see a nested loop forming — what does this do to your worst-case time complexity?",
          missing_boundary: "What happens if the input array is empty or contains all duplicate elements?",
          silence: "Walk me through what this loop invariant is doing right now.",
          random: "Can you justify why your chosen data structure is optimal here?",
        };
        question = fallbacks[trigger] ?? fallbacks.random;
      } else {
        const data = (await res.json()) as { question?: string; error?: string };
        question = data.question ?? "What is the worst-case time complexity of your current approach?";
      }

      setCurveball(question);
      speakAi(question);
    } catch (error) {
      console.error("AI curveball request failed:", error);
      setErrorBanner("AI follow-up is unavailable; a built-in edge-case question was used.");
      const fallback = "What happens if the input array is empty or has only one element?";
      setCurveball(fallback);
      speakAi(fallback);
    } finally {
      setCurveballLoading(false);
    }
  }, [code, transcript, interviewerMode, speakAi]);

  // Auto-fire curveball once after CURVEBALL_AUTO_SEC seconds of coding.
  useEffect(() => {
    if (stage !== "coding") return;
    if (curveballFiredRef.current) return;
    if (silenceSeconds < CURVEBALL_AUTO_SEC) return;

    curveballFiredRef.current = true;
    const trigger = /for.*for|while.*while/i.test(code)
      ? "nested_loop"
      : !/if.*length|null|undefined|empty/i.test(code)
        ? "missing_boundary"
        : "random";
    const timeout = window.setTimeout(() => {
      void fireCurveball(trigger);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [silenceSeconds, stage, code, fireCurveball]);

  const dismissCurveball = () => {
    if (!curveball) return;
    const response = curveballResponse.trim();
    if (!response) {
      setErrorBanner("Verbally answer the interviewer's question to dismiss the prompt.");
      return;
    }
    setCurveball(null);
    setCurveballResponse("");
    setErrorBanner(null);
    setTranscript((t) => `${t} ${response}`.trim());
    speakAi("Good reasoning. Keep going — finish your implementation and continue narrating.");
  };

  const persistSession = async (
    audit: AuditEntry[],
    auditSummary: string,
    numbers: ScoreNumbers,
    fillerCount: number,
  ) => {
    const passed = evaluateCode(code).passed;
    const localSession: SessionRecord = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      questionTitle: problem.title,
      difficulty: problem.difficulty,
      score: numbers.overall,
      hintsUsed: 0,
      passed,
      communication: numbers.communication,
      deadAirPercent: numbers.deadAirPercent,
      fillerCount,
    };

    let response: Response;
    try {
      response = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          overallScore: numbers.overall,
          communicationScore: numbers.communication,
          deadAirPercent: numbers.deadAirPercent,
          fillerCount,
          questionId: "two-sum",
          questionTitle: problem.title,
          difficulty: problem.difficulty,
          hintsUsed: 0,
          passed,
          transcriptData: {
            transcript,
            translation,
            code,
            audit,
            auditSummary,
            silenceSeconds,
          },
        }),
      });
    } catch (error) {
      saveGuestSession(localSession);
      setErrorBanner(
        "Account sync is unavailable, so this session was saved on this device only.",
      );
      console.error("Could not sync interview session:", error);
      return;
    }

    if (!response.ok) {
      const result = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      if (response.status === 401 || response.status >= 500) {
        saveGuestSession(localSession);
        setErrorBanner(
          response.status === 401
            ? "Guest session saved on this device. Sign in to sync it to your account."
            : "Account sync failed, so this session was saved on this device only.",
        );
        return;
      }
      throw new Error(result.error ?? "Could not save interview session.");
    }
  };

  const submitInterview = async () => {
    stopSpeechCapture();
    setScorecardLoading(true);

    const numbers = buildScoreNumbers(transcript, silenceSeconds, code);
    const fillerCount = countFillerWords(transcript);

    let audit: AuditEntry[] = [];
    let auditSummary = "";
    try {
      const res = await fetch("/api/scorecard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript,
          code,
          silenceSeconds,
          fillerCount,
          algorithmicScore: numbers.algorithmic,
          communicationScore: numbers.communication,
          edgeScore: numbers.edge,
        }),
      });

      if (res.ok) {
        const data = (await res.json()) as {
          audit?: typeof audit;
          summary?: string;
          error?: string;
        };
        audit = data.audit ?? [];
        auditSummary = data.summary ?? "";
      } else {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        setErrorBanner(
          data.error ?? "AI review is unavailable; a local score estimate is shown.",
        );
      }
    } catch (error) {
      console.error("Could not generate the interview AI review:", error);
      setErrorBanner("AI review is unavailable; a local score estimate is shown.");
    }

    try {
      await persistSession(audit, auditSummary, numbers, fillerCount);
    } catch (error) {
      console.error("Could not persist interview session:", error);
      setErrorBanner(
        error instanceof Error
          ? error.message
          : "Could not save interview session.",
      );
    } finally {
      setScorecardLoading(false);
    }
    setScore({ ...numbers, audit, auditSummary });
    setStage("submitted");
    speakAi(`Interview complete. Your hireability index is ${numbers.overall} out of 100.`);
  };

  const resetSession = () => {
    stopSpeechCapture();
    writeSessionSnapshot({
      ...freshSession(),
      language,
      interviewerMode,
      code: defaultCode[language],
    });
    setTranslation("");
    setCurveball(null);
    setCurveballResponse("");
    setScore(null);
    setErrorBanner(null);
    setDeadAirBanner(false);
    setPitchMissing([]);
    curveballFiredRef.current = false;
  };

  // ── Derived values ───────────────────────────────────────────────────────

  const runtimeResult = useMemo(() => evaluateCode(code), [code]);
  const fillerCount = useMemo(() => countFillerWords(transcript), [transcript]);
  const wordCount = useMemo(
    () => transcript.trim().split(/\s+/).filter(Boolean).length,
    [transcript],
  );
  const verbalPercent = Math.min(90, Math.round((wordCount / Math.max(1, wordCount + 22)) * 100));

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <main className="interview-workspace min-h-screen bg-[#f7f6f3] px-4 py-6 text-[#191916]">
      <div className="mx-auto max-w-7xl space-y-6">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <header className="flex flex-col gap-4 rounded-2xl border border-stone-200/80 bg-white p-4 shadow-lg shadow-black/5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-[#92713a]">
              Voice-First DSA Interview Simulator
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-[#191916]">
              CodeOut<span className="text-[#92713a]">Loud</span>
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/"
              className="rounded-full border border-stone-200 bg-[#f7f6f3] px-3 py-1.5 text-sm text-stone-700 transition hover:bg-[#eee9dc]"
            >
              Dashboard
            </Link>
            <Link
              href="/#progress"
              className="rounded-full border border-stone-200 bg-[#f7f6f3] px-3 py-1.5 text-sm text-stone-700 transition hover:bg-[#eee9dc]"
            >
              My progress
            </Link>
            <button
              type="button"
              onClick={() => setUpgradeOpen(true)}
              className="inline-flex items-center gap-2 rounded-full border border-[#c8a45c]/50 bg-[#fffdf7] px-3 py-1.5 text-sm font-semibold text-[#70521c] transition hover:bg-[#f8f0dd]"
            >
              <Sparkles size={14} />
              Upgrade to Pro
            </button>
            <span className="inline-flex items-center gap-2 rounded-full border border-[#c8a45c]/30 bg-[#c8a45c]/10 px-3 py-1 text-sm text-[#725a2f]">
              <CheckCircle2 size={13} />
              Voice practice
            </span>
            {stage !== "setup" && (
              <button
                onClick={resetSession}
                className="rounded-full border border-stone-200 bg-[#f7f6f3] px-3 py-1 text-sm text-stone-600 hover:bg-[#eee9dc]"
              >
                Reset session
              </button>
            )}
          </div>
        </header>

        {/* ── Error banner ────────────────────────────────────────────────── */}
        {errorBanner && (
          <div
            role="alert"
            className="rounded-xl border border-amber-400/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100"
          >
            {errorBanner}
          </div>
        )}

        {/* ── Dead air banner ─────────────────────────────────────────────── */}
        {stage === "coding" && deadAirBanner && (
          <div
            role="alert"
            aria-live="assertive"
            className="animate-pulse rounded-xl border border-rose-400/60 bg-rose-500/20 px-4 py-3 text-sm font-medium text-rose-100"
          >
            💬 Think out loud — explain what this loop invariant is doing right now.
          </div>
        )}

        {/* ── Main 3-column grid ──────────────────────────────────────────── */}
        <div className="grid gap-6 lg:grid-cols-[1.2fr_2fr_1fr]">

          {/* ── Left: Problem panel ──────────────────────────────────────── */}
          <section
            aria-label="Problem setup"
            className="space-y-4 rounded-2xl border border-slate-700 bg-slate-900/70 p-5"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
                  Interview setup
                </p>
                <h2 className="mt-1 text-2xl font-semibold text-white">{problem.title}</h2>
              </div>
              <span className="rounded-full bg-cyan-500/15 px-3 py-1 text-xs font-medium text-cyan-200">
                {problem.difficulty}
              </span>
            </div>

            <div className="space-y-3 text-sm">
              <div className="rounded-xl bg-slate-800/80 p-3">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Role pattern</p>
                <p className="mt-1 font-medium text-slate-100">{problem.pattern}</p>
              </div>

              <div className="rounded-xl bg-slate-800/80 p-3">
                <label htmlFor="language-select" className="text-xs uppercase tracking-[0.2em] text-slate-400">
                  Language
                </label>
                <select
                  id="language-select"
                  value={language}
                  onChange={(e) => {
                    const lang = e.target.value as Language;
                    setLanguage(lang);
                    if (stage === "setup") setCode(defaultCode[lang]);
                  }}
                  className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-white outline-none focus:border-cyan-500"
                >
                  {LANGUAGES.map((l) => (
                    <option key={l}>{l}</option>
                  ))}
                </select>
              </div>

              <div className="rounded-xl bg-slate-800/80 p-3">
                <label htmlFor="persona-select" className="text-xs uppercase tracking-[0.2em] text-slate-400">
                  Interviewer persona
                </label>
                <select
                  id="persona-select"
                  value={interviewerMode}
                  onChange={(e) => setInterviewerMode(e.target.value as InterviewerMode)}
                  className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-white outline-none focus:border-cyan-500"
                >
                  {INTERVIEWER_MODES.map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-700 bg-slate-950/60 p-4">
              <p className="mb-2 text-sm font-medium text-cyan-200">Problem prompt</p>
              <p className="text-sm leading-6 text-slate-300">{problem.prompt}</p>
              <ul className="mt-3 space-y-1.5 text-sm text-slate-300" aria-label="Constraints">
                {problem.constraints.map((c) => (
                  <li key={c} className="flex gap-2">
                    <span className="mt-0.5 shrink-0 text-cyan-300" aria-hidden>•</span>
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </div>

            {stage === "setup" && (
              <button
                onClick={() => {
                  setStage("pitch");
                  setEditorLocked(true);
                  setTranscript("");
                  setTranslation("");
                  setScore(null);
                  curveballFiredRef.current = false;
                  setSilenceSeconds(0);
                  speakAi(
                    "Please describe your brute-force intuition, your chosen algorithm, and your time and space complexity. I will unlock the editor once I hear all three.",
                  );
                }}
                className="w-full rounded-xl bg-cyan-500 px-4 py-3 font-medium text-slate-950 transition hover:bg-cyan-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400"
              >
                Start verbal pitch
              </button>
            )}

            {stage === "pitch" && (
              <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-3 text-sm text-amber-100">
                <Lock size={14} className="mb-1 inline-block" aria-hidden />{" "}
                <strong>Verbal lock active.</strong> Speak your approach to unlock the editor.
                {pitchMissing.length > 0 && (
                  <p className="mt-2 text-amber-200">
                    Still missing: {pitchMissing.join(", ")}.
                  </p>
                )}
              </div>
            )}
          </section>

          {/* ── Centre: Editor panel ─────────────────────────────────────── */}
          <section
            aria-label="Code editor"
            className="flex flex-col gap-4 rounded-2xl border border-slate-700 bg-slate-900/70 p-4"
          >
            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {editorLocked ? (
                  <Lock size={15} className="text-amber-300" aria-label="Editor locked" />
                ) : (
                  <Unlock size={15} className="text-emerald-300" aria-label="Editor unlocked" />
                )}
                <span className="text-sm font-medium text-slate-200">
                  {editorLocked ? "Verbal lock active" : "Editor unlocked"}
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={isListening ? stopSpeechCapture : startSpeechCapture}
                  aria-pressed={isListening}
                  aria-label={isListening ? "Stop microphone" : "Start microphone"}
                  className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition ${
                    isListening
                      ? "bg-rose-500 text-white hover:bg-rose-400"
                      : "bg-slate-700 text-slate-100 hover:bg-slate-600"
                  }`}
                >
                  {isListening ? <MicOff size={14} aria-hidden /> : <Mic size={14} aria-hidden />}
                  {isListening ? "Stop mic" : "Start mic"}
                  {isListening && (
                    <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-white" aria-hidden />
                  )}
                </button>

                {(stage === "pitch" || stage === "coding") && (
                  <button
                    onClick={validatePitch}
                    disabled={pitchLoading}
                    aria-busy={pitchLoading}
                    className="rounded-full bg-violet-500 px-3 py-2 text-sm font-medium text-white transition hover:bg-violet-400 disabled:opacity-60"
                  >
                    {pitchLoading ? "Validating…" : "Validate pitch"}
                  </button>
                )}

                {stage === "coding" && (
                  <button
                    onClick={() => void fireCurveball("random")}
                    disabled={curveballLoading || !!curveball}
                    className="rounded-full border border-cyan-400/40 bg-cyan-500/10 px-3 py-2 text-sm text-cyan-100 transition hover:bg-cyan-500/20 disabled:opacity-50"
                  >
                    {curveballLoading ? "Generating…" : "Fire curveball"}
                  </button>
                )}
              </div>
            </div>

            {/* Monaco editor */}
            <div className="overflow-hidden rounded-2xl border border-slate-700 bg-slate-950/80">
              <div className="flex items-center justify-between border-b border-slate-700 bg-slate-900 px-4 py-2 text-xs uppercase tracking-[0.2em] text-slate-400">
                <span>Code editor</span>
                <span aria-label={`Language: ${language}`}>{language}</span>
              </div>
              <Editor
                height="420px"
                language={MONACO_LANG[language]}
                theme="vs-dark"
                value={code}
                onChange={(v) => setCode(v ?? "")}
                options={{
                  readOnly: editorLocked,
                  minimap: { enabled: false },
                  fontSize: 14,
                  lineNumbersMinChars: 3,
                  automaticLayout: true,
                  padding: { top: 16, bottom: 16 },
                  ariaLabel: editorLocked
                    ? "Code editor — locked until verbal pitch is validated"
                    : "Code editor — write your solution here",
                }}
              />
            </div>

            {/* Submit row */}
            {(stage === "coding" || stage === "submitted") && (
              <div className="flex gap-3">
                {curveball && (
                  <button
                    onClick={() => speakAi(curveball)}
                    className="flex-1 rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-3 py-2 text-sm text-cyan-100 hover:bg-cyan-500/20"
                  >
                    Replay interviewer prompt
                  </button>
                )}
                {stage === "coding" && (
                  <button
                    onClick={submitInterview}
                    disabled={scorecardLoading}
                    aria-busy={scorecardLoading}
                    className="flex-1 rounded-xl bg-emerald-500 px-3 py-2 text-sm font-medium text-slate-950 transition hover:bg-emerald-400 disabled:opacity-60"
                  >
                    {scorecardLoading ? "Generating scorecard…" : "Submit interview"}
                  </button>
                )}
              </div>
            )}
          </section>

          {/* ── Right: sidebar panels ─────────────────────────────────────── */}
          <aside aria-label="Interview assistant" className="space-y-4">

            {/* AI logic validator */}
            <div className="rounded-2xl border border-cyan-500/20 bg-slate-950/60 p-4">
              <div className="mb-2 flex items-center gap-2 text-cyan-200">
                <BrainCircuit size={15} aria-hidden />
                <span className="text-xs uppercase tracking-[0.2em]">AI logic validator</span>
              </div>
              {pitchMissing.length > 0 ? (
                <p className="text-sm text-amber-200">
                  <AlertTriangle size={13} className="mr-1 inline-block" aria-hidden />
                  Missing: {pitchMissing.join(", ")}
                </p>
              ) : (
                <p className="text-sm text-slate-300">
                  {stage === "coding" || stage === "submitted"
                    ? "✓ Pitch approved — editor unlocked."
                    : "Speak your approach and press Validate pitch."}
                </p>
              )}
            </div>

            {/* Translation card */}
            <div className="rounded-2xl border border-violet-400/20 bg-violet-500/10 p-4">
              <div className="mb-2 flex items-center gap-2 text-violet-200">
                <Volume2 size={15} aria-hidden />
                <span className="text-xs uppercase tracking-[0.2em]">Articulate like a pro</span>
              </div>
              <p className="text-sm leading-6 text-slate-200">
                {translation ||
                  "Your corporate-English translation will appear here after a successful pitch."}
              </p>
            </div>

            {/* Live metrics */}
            <div className="rounded-2xl border border-cyan-500/20 bg-slate-950/60 p-4">
              <div className="mb-3 flex items-center gap-2 text-cyan-200">
                <TimerReset size={15} aria-hidden />
                <span className="text-xs uppercase tracking-[0.2em]">Live metrics</span>
              </div>
              <ul className="space-y-2 text-sm text-slate-300">
                <li>
                  <span className="text-slate-400">Verbal ratio: </span>
                  <span className={verbalPercent >= 50 ? "text-emerald-300" : "text-amber-300"}>
                    {verbalPercent}%
                  </span>
                  <span className="text-slate-500"> (target ≥50%)</span>
                </li>
                <li>
                  <span className="text-slate-400">Filler words: </span>
                  <span className={fillerCount > 5 ? "text-rose-300" : "text-slate-100"}>
                    {fillerCount}
                  </span>
                </li>
                <li>
                  <span className="text-slate-400">Dead air: </span>
                  <span className={silenceSeconds > 20 ? "text-rose-300" : "text-slate-100"}>
                    {silenceSeconds}s
                  </span>
                </li>
                <li>
                  <span className="text-slate-400">Words spoken: </span>
                  {wordCount}
                </li>
              </ul>
            </div>

            {/* Curveball panel */}
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
              <div className="mb-2 flex items-center gap-2 text-emerald-200">
                <Sparkles size={15} aria-hidden />
                <span className="text-xs uppercase tracking-[0.2em]">Curveball</span>
              </div>
              {curveball ? (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-slate-100">{curveball}</p>
                  <textarea
                    value={curveballResponse}
                    onChange={(e) => setCurveballResponse(e.target.value)}
                    placeholder="Type or dictate your answer to dismiss this prompt…"
                    aria-label="Answer for curveball question"
                    className="h-20 w-full rounded-xl border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-500"
                  />
                  <button
                    onClick={dismissCurveball}
                    className="w-full rounded-lg bg-emerald-500 px-3 py-2 text-sm font-medium text-slate-950 hover:bg-emerald-400"
                  >
                    Dismiss prompt
                  </button>
                </div>
              ) : (
                <p className="text-sm text-slate-400">
                  {stage === "coding"
                    ? "Curveball fires automatically — or press 'Fire curveball' above."
                    : "No active interruption."}
                </p>
              )}
            </div>
          </aside>
        </div>

        {/* ── Bottom row: transcript + runtime ─────────────────────────────── */}
        <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
          <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-5">
            <div className="mb-3 flex items-center gap-2 text-cyan-200">
              <Mic size={15} aria-hidden />
              <span className="text-xs uppercase tracking-[0.2em]">Live transcript</span>
            </div>
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              aria-label="Interview transcript — edit manually if microphone is unavailable"
              className="h-36 w-full rounded-xl border border-slate-600 bg-slate-950 px-3 py-3 text-sm text-slate-100 outline-none focus:border-cyan-500"
              placeholder="Your speech appears here in real time. You can also type directly as a fallback…"
            />
          </div>

          <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-5">
            <div className="mb-3 flex items-center gap-2 text-violet-200">
              <BarChart3 size={15} aria-hidden />
              <span className="text-xs uppercase tracking-[0.2em]">Code health</span>
            </div>
            <div className="space-y-3">
              <div className="rounded-xl bg-slate-950/60 p-3">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Runtime check</p>
                <p className="mt-1 text-lg font-semibold text-emerald-300">
                  {Math.round(runtimeResult.passRate)}% pass rate
                </p>
                {runtimeResult.error && (
                  <p className="mt-1 text-xs text-rose-300">{runtimeResult.error}</p>
                )}
              </div>
              <div className="rounded-xl bg-slate-950/60 p-3">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Edge awareness</p>
                <p className="mt-1 text-sm text-slate-200">
                  {transcript.toLowerCase().includes("empty") ||
                  transcript.toLowerCase().includes("duplicate")
                    ? "✓ Boundary and duplicate logic discussed."
                    : "Add explicit edge-case coverage before final submission."}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Hireability scorecard ─────────────────────────────────────────── */}
        {score && (
          <section
            aria-label="Hireability scorecard"
            className="rounded-2xl border border-stone-200/80 bg-white p-6"
          >
            <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-emerald-200">
                  Hireability scorecard
                </p>
                <p className="mt-1 text-5xl font-bold text-white">
                  {score.overall}
                  <span className="ml-1 text-2xl font-normal text-slate-400">/100</span>
                </p>
              </div>
              <span className="rounded-full border border-[#c8a45c]/30 bg-[#c8a45c]/10 px-3 py-1 text-sm text-[#725a2f]">
                {score.audit.length ? "AI transcript review" : "Local score estimate"}
              </span>
            </div>

            {/* Score tiles */}
            <div className="grid gap-4 md:grid-cols-4">
              {[
                { label: "Algorithmic correctness", value: score.algorithmic, color: "text-cyan-300" },
                { label: "Communication clarity", value: score.communication, color: "text-violet-300" },
                { label: "Edge-case awareness", value: score.edge, color: "text-amber-300" },
                { label: "Tone confidence", value: score.toneConfidence, color: "text-emerald-300" },
              ].map(({ label, value, color }) => (
                <div key={label} className="rounded-xl border border-slate-700 bg-slate-900/70 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{label}</p>
                  <p className={`mt-2 text-2xl font-semibold ${color}`}>{value}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {/* Transcript feedback is shown only when the AI review succeeds. */}
              <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-4">
                <p className="mb-3 text-xs uppercase tracking-[0.2em] text-slate-400">
                  What you should have said
                </p>
                <ul className="space-y-3 text-sm text-slate-200">
                  {score.audit.length > 0
                    ? score.audit.map((entry, i) => (
                        <li key={i}>
                          <span className="mr-2 font-mono text-xs text-cyan-400">
                            {entry.timestamp}
                          </span>
                          <span className="text-slate-300 italic">&quot;{entry.quote}&quot;</span>
                          <span className="ml-1 text-slate-200"> — {entry.feedback}</span>
                        </li>
                      ))
                      : (
                        <li>
                          AI transcript feedback was unavailable for this session.
                          Configure <code>GROQ_API_KEY</code> to enable it.
                        </li>
                      )}
                </ul>
                {score.auditSummary && (
                  <p className="mt-4 border-t border-slate-700 pt-3 text-sm text-slate-300">
                    {score.auditSummary}
                  </p>
                )}
              </div>

              {/* Communication breakdown */}
              <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-4">
                <p className="mb-3 text-xs uppercase tracking-[0.2em] text-slate-400">
                  Communication breakdown
                </p>
                <ul className="space-y-2 text-sm text-slate-200">
                  <li>
                    <span className="text-slate-400">Dead air: </span>
                    <span className={score.deadAirPercent > 30 ? "text-rose-300" : "text-slate-100"}>
                      {score.deadAirPercent}%
                    </span>
                  </li>
                  <li>
                    <span className="text-slate-400">Filler words/min: </span>
                    <span className={score.fillerWordsPerMinute > 8 ? "text-amber-300" : "text-slate-100"}>
                      {score.fillerWordsPerMinute}
                    </span>
                  </li>
                  <li>
                    <span className="text-slate-400">Tone confidence: </span>
                    {score.toneConfidence}
                  </li>
                  <li className="pt-2 text-slate-300">{score.testSummary}</li>
                </ul>
              </div>
            </div>

            <button
              onClick={resetSession}
              className="mt-5 rounded-xl border border-slate-600 bg-slate-800 px-5 py-2.5 text-sm text-slate-200 hover:bg-slate-700"
            >
              Start new interview
            </button>
          </section>
        )}
      </div>
      <UpgradeToProModal
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
      />
    </main>
  );
}
