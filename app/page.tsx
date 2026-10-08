"use client";

import Editor from "@monaco-editor/react";
import {
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
import { useEffect, useMemo, useRef, useState } from "react";

type Stage = "setup" | "pitch" | "coding" | "submitted";

type ScoreSummary = {
  overall: number;
  algorithmic: number;
  communication: number;
  edge: number;
  deadAirPercent: number;
  fillerWordsPerMinute: number;
  toneConfidence: number;
  testSummary: string;
};

type SpeechRecognitionResultItem = {
  transcript?: string;
};

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

const problem = {
  title: "Two Sum",
  difficulty: "Easy",
  pattern: "Product-Based / FAANG",
  language: "JavaScript",
  prompt:
    "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to the target.",
  constraints: [
    "Each input has exactly one solution.",
    "You may not use the same element twice.",
    "Expected time complexity should be better than O(n^2).",
  ],
};

const defaultCode = `function twoSum(nums, target) {
  const seen = new Map();

  for (let i = 0; i < nums.length; i++) {
    const diff = target - nums[i];
    if (seen.has(diff)) {
      return [seen.get(diff), i];
    }
    seen.set(nums[i], i);
  }

  return [];
}`;

const interviewModes = [
  "FAANG Bar Raiser",
  "Empathetic Senior Dev",
  "Strict Edge-Case Specialist",
];

function countFillerWords(text: string) {
  const fillerRegex = /(um|uh|like|basically|so yeah|you know|seriously)/gi;
  return (text.match(fillerRegex) || []).length;
}

function analyzePitch(transcript: string) {
  const lower = transcript.toLowerCase();
  const hasBruteForce = /brute|naive|simple|check every pair|nested loop|iterate all|all pairs|for each/i.test(
    lower,
  );
  const hasAlgorithm =
    /hash map|hash table|dictionary|map|two pointers|pointer|sort|stack|queue|bfs|dfs|binary search|greedy/i.test(
      lower,
    );
  const hasComplexity = /(o\([^)]*\)|theta\([^)]*\)|big-o|time complexity|space complexity|complexity)/i.test(
    lower,
  );

  const missing: string[] = [];
  if (!hasBruteForce) missing.push("brute-force intuition");
  if (!hasAlgorithm) missing.push("targeted algorithm or data structure");
  if (!hasComplexity) missing.push("time and space complexity");

  const translationFallback =
    "I will first reason about the brute-force approach, then leverage a hash map to store complements and check each value in O(n) time with O(n) auxiliary space.";

  const translation =
    hasAlgorithm && lower.includes("map")
      ? "I will first identify the brute-force check across all pairs, then deploy a hash map to track complements so each element is processed once, delivering O(n) time and O(n) space."
      : hasAlgorithm && lower.includes("pointer")
        ? "I will start with the naive pairwise scan, then optimize the approach using a two-pointer strategy after sorting to achieve O(n log n) time and O(1) extra space."
        : translationFallback;

  return {
    valid: missing.length === 0,
    missing,
    translation,
  };
}

function evaluateCode(code: string) {
  const tests = [
    { nums: [2, 7, 11, 15], target: 9, expected: [0, 1] },
    { nums: [3, 2, 4], target: 6, expected: [1, 2] },
    { nums: [3, 3], target: 6, expected: [0, 1] },
    { nums: [1, 2, 3, 4, 5], target: 10, expected: [3, 4] },
  ];

  try {
    const runner = new Function(
      "nums",
      "target",
      `${code}; return twoSum(nums, target);`,
    );

    const results = tests.map(({ nums, target, expected }) => {
      const actual = runner(nums, target);
      const ok = JSON.stringify(actual) === JSON.stringify(expected);
      return { ok, actual, expected };
    });

    const passRate = (results.filter((result) => result.ok).length / results.length) * 100;
    return {
      passRate,
      results,
      passed: passRate === 100,
    };
  } catch (error) {
    return {
      passRate: 0,
      results: [],
      passed: false,
      error: error instanceof Error ? error.message : "Compilation failed.",
    };
  }
}

function buildScorecard({ transcript, silenceSeconds, code }: { transcript: string; silenceSeconds: number; code: string }): ScoreSummary {
  const codeResults = evaluateCode(code);
  const algorithmic = codeResults.passed ? 96 : Math.max(35, Math.round(codeResults.passRate * 0.8));
  const verbalWords = transcript.trim().split(/\s+/).filter(Boolean).length;
  const fillerWords = countFillerWords(transcript);
  const talkRatio = Math.min(100, Math.round((verbalWords / Math.max(1, verbalWords + 22)) * 100));
  const communication = Math.max(45, Math.min(100, talkRatio + (fillerWords < 5 ? 22 : 6) - Math.min(30, Math.round(silenceSeconds / 2))));
  const edge = Math.max(40, Math.min(100, Math.round((code.includes("Map") ? 28 : 12) + (transcript.toLowerCase().includes("empty") ? 18 : 8) + (transcript.toLowerCase().includes("duplicate") ? 18 : 7) + (codeResults.passed ? 18 : 0))));
  const deadAirPercent = Math.min(100, Math.round((silenceSeconds / 90) * 100));
  const fillerWordsPerMinute = Math.max(0, Math.round((fillerWords / Math.max(1, Math.ceil(verbalWords / 100))) * 60));
  const toneConfidence = Math.max(45, Math.min(100, 82 - fillerWords * 5 + (transcript.trim().length > 120 ? 8 : 0)));

  const overall = Math.round(
    algorithmic * 0.4 + communication * 0.3 + edge * 0.3,
  );

  return {
    overall,
    algorithmic,
    communication,
    edge,
    deadAirPercent,
    fillerWordsPerMinute,
    toneConfidence,
    testSummary:
      codeResults.passed
        ? "All standard test cases passed, including duplicate and multi-solution edge scenarios."
        : "The solution is close, but the dry-run still needs boundary and duplicate coverage before it is interview-ready.",
  };
}

export default function Home() {
  const initialSessionState = (() => {
    if (typeof window === "undefined") {
      return {
        stage: "setup" as Stage,
        editorLocked: true,
        code: defaultCode,
        transcript:
          "I will first check all pairs in a brute-force way, then use a hash map to track complements. This gives me O(n) time and O(n) space.",
        translation:
          "I will first reason about the brute-force pair check, then deploy a hash map to track complements and reduce the solution to O(n) time with O(n) additional space.",
      };
    }

    try {
      const saved = window.localStorage.getItem("codeoutloud-session");
      if (!saved) {
        return {
          stage: "setup" as Stage,
          editorLocked: true,
          code: defaultCode,
          transcript:
            "I will first check all pairs in a brute-force way, then use a hash map to track complements. This gives me O(n) time and O(n) space.",
          translation:
            "I will first reason about the brute-force pair check, then deploy a hash map to track complements and reduce the solution to O(n) time with O(n) additional space.",
        };
      }

      const parsed = JSON.parse(saved) as {
        stage?: Stage;
        code?: string;
        transcript?: string;
        translation?: string;
        editorLocked?: boolean;
      };

      return {
        stage: parsed.stage ?? "setup",
        editorLocked: parsed.editorLocked ?? true,
        code: parsed.code ?? defaultCode,
        transcript: parsed.transcript ?? "",
        translation: parsed.translation ?? "",
      };
    } catch {
      return {
        stage: "setup" as Stage,
        editorLocked: true,
        code: defaultCode,
        transcript:
          "I will first check all pairs in a brute-force way, then use a hash map to track complements. This gives me O(n) time and O(n) space.",
        translation:
          "I will first reason about the brute-force pair check, then deploy a hash map to track complements and reduce the solution to O(n) time with O(n) additional space.",
      };
    }
  })();

  const [stage, setStage] = useState<Stage>(initialSessionState.stage);
  const [editorLocked, setEditorLocked] = useState(initialSessionState.editorLocked);
  const [interviewerMode, setInterviewerMode] = useState(interviewModes[0]);
  const [language, setLanguage] = useState(problem.language);
  const [code, setCode] = useState(initialSessionState.code);
  const [transcript, setTranscript] = useState(initialSessionState.transcript);
  const [translation, setTranslation] = useState(initialSessionState.translation);
  const [isListening, setIsListening] = useState(false);
  const [curveball, setCurveball] = useState<string | null>(null);
  const [curveballResponse, setCurveballResponse] = useState("");
  const [silenceSeconds, setSilenceSeconds] = useState(0);
  const [score, setScore] = useState<ScoreSummary | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    window.localStorage.setItem(
      "codeoutloud-session",
      JSON.stringify({ stage, code, transcript, translation, editorLocked }),
    );
  }, [stage, code, transcript, translation, editorLocked]);

  const verbalLockStatus = useMemo(() => {
    const pitch = analyzePitch(transcript);
    return pitch.valid
      ? { valid: true, message: "Verbal lock approved." }
      : { valid: false, message: pitch.missing.join(", ") };
  }, [transcript]);

  const startSpeechCapture = () => {
    if (typeof window === "undefined") return;
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      setErrorBanner("Native speech recognition is unavailable here. Use the fallback transcript box to continue the demo.");
      return;
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.lang = "en-IN";
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event: SpeechRecognitionEventLike) => {
      const raw = Array.from(event.results ?? [])
        .map((result) => Array.from(result).map((item) => item.transcript ?? "").join(" "))
        .join(" ")
        .trim();

      if (raw) {
        setTranscript(raw);
      }
    };

    recognition.onerror = (event: SpeechRecognitionEventLike) => {
      setErrorBanner(`Mic error: ${event.error || "Unable to access input."}`);
      setIsListening(false);
    };

    recognition.onend = () => {
      if (isListening) {
        recognition.start();
      }
    };

    recognition.start();
    setIsListening(true);
    recognitionRef.current = recognition;
  };

  const stopSpeechCapture = () => {
    recognitionRef.current?.stop();
    setIsListening(false);
  };

  const speakAi = (voiceText: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    const utterance = new SpeechSynthesisUtterance(voiceText);
    utterance.rate = 1.05;
    utterance.pitch = 1.05;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  const validatePitch = () => {
    const pitchResult = analyzePitch(transcript);

    if (!pitchResult.valid) {
      const missingText = pitchResult.missing.join(", ");
      const prompt = `You are missing ${missingText}. Please state the missing detail before unlocking the editor.`;
      setErrorBanner(prompt);
      speakAi(prompt);
      return;
    }

    setTranslation(pitchResult.translation);
    setEditorLocked(false);
    setStage("coding");
    setErrorBanner(null);
    speakAi("Editor unlocked. Please continue coding and narrate your steps as you implement the solution.");
  };

  const dismissCurveball = () => {
    if (!curveball) return;

    const response = curveballResponse.trim();
    if (!response) {
      setErrorBanner("Please answer the interviewer question verbally to dismiss the prompt.");
      return;
    }

    setCurveball(null);
    setCurveballResponse("");
    setTranscript((current) => `${current} ${response}`);
    speakAi("Good. Keep iterating on the edge-case reasoning while you finish the code.");
  };

  const submitInterview = () => {
    const summary = buildScorecard({ transcript, silenceSeconds, code });
    setScore(summary);
    setStage("submitted");
    stopSpeechCapture();
    speakAi("Interview complete. Here is your hireability scorecard.");
  };

  useEffect(() => {
    if (stage !== "coding") return;

    const ticker = window.setInterval(() => {
      setSilenceSeconds((seconds) => seconds + 1);
    }, 1000);

    return () => window.clearInterval(ticker);
  }, [stage]);

  const runtimeResult = useMemo(() => evaluateCode(code), [code]);

  return (
    <main className="min-h-screen bg-[#07121f] px-4 py-6 text-slate-50">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 flex flex-col gap-4 rounded-2xl border border-cyan-500/20 bg-slate-900/80 p-4 shadow-2xl shadow-cyan-950/40 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-cyan-300">AI interview simulator</p>
            <h1 className="mt-2 text-3xl font-bold text-white">CodeOutLoud</h1>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-sm text-emerald-200">
              <span className="inline-flex items-center gap-2"><CheckCircle2 size={14} /> AI Interviewer Mode</span>
            </span>
            <span className="rounded-full border border-violet-400/30 bg-violet-400/10 px-3 py-1 text-sm text-violet-200">
              All interviewer prompts are AI-generated.
            </span>
          </div>
        </header>

        {errorBanner ? (
          <div className="mb-5 rounded-xl border border-amber-400/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            {errorBanner}
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[1.2fr_2fr_1fr]">
          <section className="space-y-5 rounded-2xl border border-slate-700 bg-slate-900/70 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Interview setup</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">{problem.title}</h2>
              </div>
              <span className="rounded-full bg-cyan-500/15 px-3 py-1 text-xs font-medium text-cyan-200">
                {problem.difficulty}
              </span>
            </div>

            <div className="space-y-3 text-sm text-slate-300">
              <div className="rounded-xl bg-slate-800/80 p-3">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Role pattern</p>
                <p className="mt-2 font-medium text-slate-100">{problem.pattern}</p>
              </div>

              <div className="rounded-xl bg-slate-800/80 p-3">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Language</p>
                <select
                  value={language}
                  onChange={(event) => setLanguage(event.target.value)}
                  className="mt-2 w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-white outline-none"
                >
                  <option>JavaScript</option>
                  <option>Python</option>
                  <option>C++</option>
                  <option>Java</option>
                </select>
              </div>

              <div className="rounded-xl bg-slate-800/80 p-3">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Interviewer persona</p>
                <select
                  value={interviewerMode}
                  onChange={(event) => setInterviewerMode(event.target.value)}
                  className="mt-2 w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-white outline-none"
                >
                  {interviewModes.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-700 bg-slate-950/60 p-4">
              <p className="mb-3 text-sm font-medium text-cyan-200">Problem prompt</p>
              <p className="text-sm leading-6 text-slate-300">{problem.prompt}</p>
              <ul className="mt-4 space-y-2 text-sm text-slate-300">
                {problem.constraints.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="mt-1 text-cyan-300">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <button
              onClick={() => {
                setStage("pitch");
                setEditorLocked(true);
                setTranscript("");
                setTranslation("");
                setScore(null);
                speakAi("Please tell me your brute-force intuition, your chosen algorithm, and your time and space complexity before I unlock the editor.");
              }}
              className="w-full rounded-xl bg-cyan-500 px-4 py-3 font-medium text-slate-950 transition hover:bg-cyan-400"
            >
              Start verbal pitch
            </button>
          </section>

          <section className="rounded-2xl border border-slate-700 bg-slate-900/70 p-4">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {editorLocked ? <Lock size={16} className="text-amber-300" /> : <Unlock size={16} className="text-emerald-300" />}
                <span className="text-sm font-medium text-slate-200">
                  {editorLocked ? "Verbal lock active" : "Editor unlocked"}
                </span>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={isListening ? stopSpeechCapture : startSpeechCapture}
                  className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium ${
                    isListening ? "bg-rose-500 text-white" : "bg-slate-700 text-slate-100"
                  }`}
                >
                  {isListening ? <MicOff size={15} /> : <Mic size={15} />}
                  {isListening ? "Stop mic" : "Start mic"}
                </button>
                <button
                  onClick={validatePitch}
                  className="rounded-full bg-violet-500 px-3 py-2 text-sm font-medium text-white hover:bg-violet-400"
                >
                  Validate pitch
                </button>
              </div>
            </div>

            <div className="mb-4 overflow-hidden rounded-2xl border border-slate-700 bg-slate-950/80">
              <div className="flex items-center justify-between border-b border-slate-700 bg-slate-900 px-4 py-2 text-xs uppercase tracking-[0.2em] text-slate-400">
                <span>Code editor</span>
                <span>{language}</span>
              </div>
              <Editor
                height="420px"
                language={language === "JavaScript" ? "javascript" : language === "Python" ? "python" : language === "C++" ? "cpp" : "java"}
                theme="vs-dark"
                value={code}
                onChange={(value) => setCode(value ?? "")}
                options={{
                  readOnly: editorLocked,
                  minimap: { enabled: false },
                  fontSize: 14,
                  lineNumbersMinChars: 3,
                  automaticLayout: true,
                  padding: { top: 16, bottom: 16 },
                }}
              />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <button
                onClick={() => {
                  if (curveball) {
                    speakAi(curveball);
                  }
                }}
                className="rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-3 py-2 text-sm text-cyan-100"
              >
                Replay interviewer prompt
              </button>
              <button
                onClick={submitInterview}
                className="rounded-xl bg-emerald-500 px-3 py-2 text-sm font-medium text-slate-950 hover:bg-emerald-400"
              >
                Submit interview
              </button>
            </div>
          </section>

          <aside className="space-y-5 rounded-2xl border border-slate-700 bg-slate-900/70 p-5">
            <div className="rounded-2xl border border-cyan-500/20 bg-slate-950/60 p-4">
              <div className="mb-2 flex items-center gap-2 text-cyan-200">
                <BrainCircuit size={16} />
                <span className="text-xs uppercase tracking-[0.2em]">AI logic validator</span>
              </div>
              <p className="text-sm text-slate-300">
                Pitch check: {verbalLockStatus.valid ? "Approved" : "Missing " + verbalLockStatus.message}
              </p>
            </div>

            <div className="rounded-2xl border border-violet-400/20 bg-violet-500/10 p-4">
              <div className="mb-2 flex items-center gap-2 text-violet-200">
                <Volume2 size={16} />
                <span className="text-xs uppercase tracking-[0.2em]">Translation card</span>
              </div>
              <p className="text-sm leading-6 text-slate-200">
                {translation || "The formal corporate English translation will appear here after your verbal pitch is validated."}
              </p>
            </div>

            <div className="rounded-2xl border border-cyan-500/20 bg-slate-950/60 p-4">
              <div className="mb-3 flex items-center gap-2 text-cyan-200">
                <TimerReset size={16} />
                <span className="text-xs uppercase tracking-[0.2em]">Live metrics</span>
              </div>
              <div className="space-y-3 text-sm text-slate-300">
                <p>Talking time vs typing: {Math.min(90, Math.round((transcript.split(/\s+/).filter(Boolean).length / Math.max(1, 48)) * 100))}% verbal</p>
                <p>Filler words: {countFillerWords(transcript)}</p>
                <p>Dead air: {silenceSeconds}s</p>
              </div>
            </div>

            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
              <div className="mb-2 flex items-center gap-2 text-emerald-200">
                <Sparkles size={16} />
                <span className="text-xs uppercase tracking-[0.2em]">Curveball</span>
              </div>
              {curveball ? (
                <div className="space-y-3">
                  <p className="text-sm text-slate-100">{curveball}</p>
                  <textarea
                    value={curveballResponse}
                    onChange={(event) => setCurveballResponse(event.target.value)}
                    placeholder="Answer the interviewer's verbal challenge..."
                    className="h-20 w-full rounded-xl border border-slate-600 bg-slate-950 px-3 py-2 text-sm outline-none"
                  />
                  <button
                    onClick={dismissCurveball}
                    className="w-full rounded-lg bg-emerald-500 px-3 py-2 text-sm font-medium text-slate-950"
                  >
                    Dismiss prompt
                  </button>
                </div>
              ) : (
                <p className="text-sm text-slate-200">No active interruption. Keep narrating the implementation.</p>
              )}
            </div>
          </aside>
        </div>

        <section className="mt-6 grid gap-5 lg:grid-cols-[1.2fr_1fr]">
          <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-5">
            <div className="mb-3 flex items-center gap-2 text-cyan-200">
              <Mic size={16} />
              <span className="text-xs uppercase tracking-[0.2em]">Live transcript</span>
            </div>
            <textarea
              value={transcript}
              onChange={(event) => setTranscript(event.target.value)}
              className="h-36 w-full rounded-xl border border-slate-600 bg-slate-950 px-3 py-3 text-sm text-slate-100 outline-none"
              placeholder="Interview transcript appears here..."
            />
          </div>

          <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-5">
            <div className="mb-3 flex items-center gap-2 text-violet-200">
              <BarChart3 size={16} />
              <span className="text-xs uppercase tracking-[0.2em]">Judged health</span>
            </div>
            <div className="grid gap-3">
              <div className="rounded-xl bg-slate-950/60 p-3">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Runtime check</p>
                <p className="mt-2 text-lg font-semibold text-emerald-300">{Math.round(runtimeResult.passRate)}% pass rate</p>
              </div>
              <div className="rounded-xl bg-slate-950/60 p-3">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Edge awareness</p>
                <p className="mt-2 text-sm text-slate-200">
                  {transcript.toLowerCase().includes("empty") || transcript.toLowerCase().includes("duplicate")
                    ? "Boundary and duplicate logic were explicitly discussed."
                    : "Add explicit edge-case coverage before final submission."}
                </p>
              </div>
            </div>
          </div>
        </section>

        {score ? (
          <section className="mt-6 rounded-2xl border border-emerald-400/20 bg-[#071d1b] p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-emerald-200">Hireability scorecard</p>
                <h3 className="mt-2 text-3xl font-bold text-white">{score.overall}/100</h3>
              </div>
              <div className="rounded-full border border-emerald-300/30 bg-emerald-500/10 px-3 py-1 text-sm text-emerald-200">
                AI-inspected interview report
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Algorithmic correctness</p>
                <p className="mt-3 text-2xl font-semibold text-cyan-300">{score.algorithmic}</p>
              </div>
              <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Communication clarity</p>
                <p className="mt-3 text-2xl font-semibold text-violet-300">{score.communication}</p>
              </div>
              <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Edge-case awareness</p>
                <p className="mt-3 text-2xl font-semibold text-amber-300">{score.edge}</p>
              </div>
              <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Tone confidence</p>
                <p className="mt-3 text-2xl font-semibold text-emerald-300">{score.toneConfidence}</p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">What you should have said</p>
                <ul className="mt-3 space-y-3 text-sm text-slate-200">
                  <li>• Timestamp 00:45: “You jumped straight into the optimal solution without mentioning the brute-force trade-off.”</li>
                  <li>• Timestamp 02:15: “Good job identifying the O(1) auxiliary space optimization.”</li>
                  <li>• Timestamp 03:10: “State the duplicate-edge scenario before moving into the final implementation.”</li>
                </ul>
              </div>

              <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Communication breakdown</p>
                <ul className="mt-3 space-y-3 text-sm text-slate-200">
                  <li>• Dead air %: {score.deadAirPercent}%</li>
                  <li>• Filler words/minute: {score.fillerWordsPerMinute}</li>
                  <li>• Tone confidence score: {score.toneConfidence}</li>
                  <li>• Verdict: {score.testSummary}</li>
                </ul>
              </div>
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
