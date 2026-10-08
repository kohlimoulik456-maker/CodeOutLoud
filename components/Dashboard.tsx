"use client";

import Link from "next/link";
import {
  Activity,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  AudioLines,
  BarChart3,
  BookOpen,
  Brain,
  Check,
  Code2,
  Flame,
  LayoutDashboard,
  LockKeyhole,
  MessageSquareText,
  Mic2,
  Plus,
  Sparkles,
  Target,
  Trophy,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { signOut } from "../app/actions/auth";
import UpgradeToProModal from "../components/UpgradeToProModal";
import PrepCoach from "../components/coach/PrepCoach";
import SystemDesignCard from "../components/interview/SystemDesignCard";
import TheoryCard from "../components/interview/TheoryCard";
import {
  GUEST_SESSION_EVENT,
  loadGuestSessions,
  type SessionRecord,
} from "../utils/session-history";

export type { SessionRecord } from "../utils/session-history";

function formatDate(value: string) {
  return value.slice(0, 10);
}

function TrendChart({ sessions }: { sessions: SessionRecord[] }) {
  const points = useMemo(() => {
    const days = [
      ...new Set(sessions.map((session) => session.createdAt.slice(0, 10))),
    ]
      .sort()
      .slice(-7);
    return days.map((day) => {
      const daySessions = sessions.filter(
        (session) => session.createdAt.slice(0, 10) === day,
      );
      return {
        date: day,
        value: daySessions.length
          ? daySessions.reduce((total, session) => total + session.communication, 0) /
            daySessions.length
          : null,
      };
    });
  }, [sessions]);

  const plotted = points
    .map((point, index) =>
      point.value === null
        ? null
        : `${(index / Math.max(1, points.length - 1)) * 280},${88 - (point.value / 100) * 68}`,
    )
    .filter((point): point is string => point !== null);

  return (
    <div className="relative mt-5 h-36">
      <div className="absolute inset-0 flex flex-col justify-between">
        {[100, 75, 50, 25].map((label) => (
          <div
            key={label}
            className="flex items-center gap-3 border-t border-stone-100"
          >
            <span className="w-7 -translate-y-2 text-[10px] text-stone-400">
              {label}
            </span>
          </div>
        ))}
      </div>
      {plotted.length > 0 ? (
        <svg
          viewBox="0 0 280 100"
          preserveAspectRatio="none"
          className="absolute inset-x-7 top-0 h-28 w-[calc(100%-2rem)] overflow-visible"
          role="img"
          aria-label="Communication clarity over the last seven days"
        >
          <polyline
            points={plotted.join(" ")}
            fill="none"
            stroke="#b88d45"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {plotted.map((point) => {
            const [cx, cy] = point.split(",");
            return (
              <circle
                key={point}
                cx={cx}
                cy={cy}
                r="3.5"
                fill="#fff"
                stroke="#b88d45"
                strokeWidth="2"
              />
            );
          })}
        </svg>
      ) : (
        <div className="absolute inset-0 grid place-items-center">
          <p className="rounded-full border border-dashed border-stone-300 bg-white/80 px-4 py-2 text-xs text-stone-500">
            Complete a session to reveal your trend
          </p>
        </div>
      )}
      <div className="absolute bottom-0 left-10 right-0 flex justify-between text-[10px] text-stone-400">
        {points.map((point) => (
          <span key={point.date}>{point.date.slice(5)}</span>
        ))}
      </div>
    </div>
  );
}

export default function Dashboard({
  sessions,
  userEmail,
}: {
  sessions: SessionRecord[];
  userEmail: string;
}) {
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [localSessions, setLocalSessions] = useState<SessionRecord[]>([]);

  useEffect(() => {
    function syncLocalSessions() {
      try {
        setLocalSessions(loadGuestSessions());
      } catch (error) {
        console.error("Could not load local interview history:", error);
      }
    }
    syncLocalSessions();
    window.addEventListener("storage", syncLocalSessions);
    window.addEventListener(GUEST_SESSION_EVENT, syncLocalSessions);
    return () => {
      window.removeEventListener("storage", syncLocalSessions);
      window.removeEventListener(GUEST_SESSION_EVENT, syncLocalSessions);
    };
  }, []);

  const allSessions = useMemo(() => {
    const byId = new Map(sessions.map((session) => [session.id, session]));
    localSessions.forEach((session) => {
      if (!byId.has(session.id)) byId.set(session.id, session);
    });
    return [...byId.values()].sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    );
  }, [sessions, localSessions]);

  const averageScore = allSessions.length
    ? Math.round(
        allSessions.reduce((total, session) => total + session.score, 0) /
          allSessions.length,
      )
    : 0;
  const averageCommunication = allSessions.length
    ? Math.round(
        allSessions.reduce(
          (total, session) => total + session.communication,
          0,
        ) / allSessions.length,
      )
    : 0;
  const solved = allSessions.filter((session) => session.passed).length;
  const activeDays = new Set(
    allSessions.map((session) => session.createdAt.slice(0, 10)),
  ).size;
  const latestSessions = [...allSessions]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 4);

  const activityDates = [
    ...new Set(allSessions.map((session) => session.createdAt.slice(0, 10))),
  ]
    .sort()
    .slice(-35);
  const heatmap = Array.from({ length: 35 }, (_, index) => {
    const historyIndex = index - (35 - activityDates.length);
    const day = historyIndex >= 0 ? activityDates[historyIndex] : "";
    const daySessions = allSessions.filter(
      (session) => session.createdAt.slice(0, 10) === day,
    );
    const best = daySessions.reduce(
      (value, session) => Math.min(value, session.hintsUsed),
      Number.POSITIVE_INFINITY,
    );
    return {
      day,
      count: daySessions.length,
      tone:
        !daySessions.length
          ? "bg-stone-100"
          : best === 0
            ? "bg-emerald-600"
            : best <= 2
              ? "bg-amber-400"
              : "bg-rose-400",
    };
  });

  return (
    <div className="min-h-screen bg-[#f7f6f3] text-[#191916]">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-[236px] flex-col bg-[#171714] px-5 py-6 text-white lg:flex">
        <Link href="/" className="flex items-center gap-3 px-2">
          <span className="grid size-9 place-items-center rounded-xl bg-[#c8a45c] text-[#171714]">
            <AudioLines size={19} strokeWidth={2.5} />
          </span>
          <span className="text-[16px] font-semibold tracking-[-0.04em]">
            CodeOut<span className="text-[#d8bb79]">Loud</span>
          </span>
        </Link>
        <p className="mb-3 mt-11 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-500">
          Workspace
        </p>
        <nav className="space-y-1">
          <Link
            href="/#overview"
            className="flex items-center gap-3 rounded-xl bg-white/10 px-3 py-2.5 text-sm text-white"
          >
            <LayoutDashboard size={17} className="text-[#d8bb79]" />
            Overview
          </Link>
          <Link
            href="/interview"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-stone-400 transition hover:bg-white/5 hover:text-white"
          >
            <Mic2 size={17} />
            Practice interview
          </Link>
          <Link
            href="/#progress"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-stone-400 transition hover:bg-white/5 hover:text-white"
          >
            <BarChart3 size={17} />
            My progress
          </Link>
        </nav>
        <p className="mb-3 mt-9 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-500">
          Coming soon
        </p>
        <div className="space-y-1 opacity-70">
          <Link
            href="/master-interview"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-stone-400 transition hover:bg-white/5 hover:text-white"
          >
            <Brain size={17} />
            Master interview
            <LockKeyhole size={13} className="ml-auto text-stone-500" />
          </Link>
          <div className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-stone-400">
            <BookOpen size={17} />
            Learning paths
            <LockKeyhole size={13} className="ml-auto text-stone-500" />
          </div>
        </div>
        <div className="mt-auto rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <div className="mb-3 flex size-8 items-center justify-center rounded-full bg-[#c8a45c]/15 text-[#e3c780]">
            <Sparkles size={15} />
          </div>
          <p className="text-sm font-medium">Built for the real room.</p>
          <p className="mt-1.5 text-xs leading-5 text-stone-400">
            Practice thinking out loud, not just typing it out.
          </p>
        </div>
      </aside>

      <div className="lg:pl-[236px]">
        <header className="sticky top-0 z-10 flex h-[72px] items-center justify-between border-b border-stone-200/80 bg-[#f7f6f3]/90 px-5 backdrop-blur-xl sm:px-8">
          <div>
            <p className="text-[11px] font-medium text-stone-500">
              Personal workspace
            </p>
            <p className="mt-0.5 text-sm font-semibold">Your interview prep</p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setUpgradeOpen(true)}
              className="inline-flex items-center gap-2 rounded-full border border-[#c8a45c]/50 bg-[#fffdf7] px-3.5 py-2 text-xs font-semibold text-[#70521c] transition hover:bg-[#f8f0dd] sm:px-4 sm:text-sm"
            >
              <Sparkles size={14} />
              Upgrade to Pro
            </button>
            <div className="flex items-center gap-2 rounded-full border border-stone-200 bg-white py-1 pl-1 pr-2.5">
              <span className="grid size-8 place-items-center rounded-full bg-[#24231f] text-xs font-semibold text-[#e8d39e]">
                {userEmail.slice(0, 1).toUpperCase()}
              </span>
              <span className="hidden max-w-[130px] truncate text-xs text-stone-600 sm:block">
                {userEmail}
              </span>
              {userEmail === "Guest" ? (
                <Link
                  href="/login"
                  className="rounded-full bg-stone-100 px-2 py-1 text-[10px] font-medium text-stone-600 transition hover:bg-[#e9dfc9] hover:text-[#725a2f]"
                >
                  Sign in
                </Link>
              ) : (
                <form action={signOut}>
                  <button
                    type="submit"
                    className="rounded-full px-2 py-1 text-[11px] font-medium text-stone-500 hover:bg-stone-100 hover:text-stone-900"
                  >
                    Sign out
                  </button>
                </form>
              )}
            </div>
          </div>
        </header>
        <nav
          aria-label="Workspace navigation"
          className="flex gap-2 border-b border-stone-200/80 bg-[#f7f6f3] px-5 py-2 lg:hidden"
        >
          <Link href="/" className="rounded-lg bg-white px-3 py-2 text-xs font-medium text-stone-700">
            Dashboard
          </Link>
          <Link href="/interview" className="rounded-lg px-3 py-2 text-xs font-medium text-stone-600 hover:bg-white">
            Practice
          </Link>
          <Link href="/#progress" className="rounded-lg px-3 py-2 text-xs font-medium text-stone-600 hover:bg-white">
            Progress
          </Link>
        </nav>

        <main id="overview" className="mx-auto max-w-[1440px] px-5 py-8 sm:px-8">
          <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="mb-2 inline-flex items-center gap-1.5 text-xs font-medium text-[#92713a]">
                <Sparkles size={13} />
                YOUR PERSONAL INTERVIEW STUDIO
              </p>
              <h1 className="text-[30px] font-semibold tracking-[-0.05em] sm:text-[36px]">
                Good afternoon.
              </h1>
              <p className="mt-1.5 text-sm text-stone-500">
                Make your next answer as strong as your next solution.
              </p>
            </div>
            <Link
              href="/interview"
              className="inline-flex w-fit items-center gap-2 rounded-xl bg-[#1c1c19] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-black/10 transition hover:bg-[#33322d]"
            >
              <Plus size={16} />
              Start an interview
              <ArrowRight size={15} />
            </Link>
          </div>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
            <div className="min-w-0 space-y-5">
              <section className="relative overflow-hidden rounded-[22px] bg-[#1b1b18] p-6 text-white sm:p-8">
                <div className="pointer-events-none absolute -right-16 -top-24 size-80 rounded-full border border-[#c8a45c]/15" />
                <div className="pointer-events-none absolute -right-3 -top-12 size-56 rounded-full border border-[#c8a45c]/20" />
                <div className="relative max-w-[590px]">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-[#c8a45c]/30 bg-[#c8a45c]/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#e8d39e]">
                    <Zap size={12} />
                    The voice-first practice
                  </span>
                  <h2 className="mt-5 max-w-[520px] text-[28px] font-medium leading-[1.15] tracking-[-0.04em] sm:text-[36px]">
                    Think clearly.
                    <br />
                    <span className="font-serif italic text-[#dfc27d]">
                      Speak confidently.
                    </span>
                  </h2>
                  <p className="mt-3 max-w-[440px] text-sm leading-6 text-stone-300">
                    A realistic DSA mock interview that keeps your editor locked
                    until you can explain your approach.
                  </p>
                  <Link
                    href="/interview"
                    className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#d2b36d] px-4 py-2.5 text-sm font-semibold text-[#201d16] transition hover:bg-[#e1c982]"
                  >
                    Start your first session
                    <ArrowRight size={15} />
                  </Link>
                </div>
                <div className="absolute bottom-8 right-9 hidden h-[140px] w-[180px] items-center justify-center sm:flex">
                  <div className="absolute size-36 rounded-full border border-[#c8a45c]/20" />
                  <div className="absolute size-24 rounded-full border border-[#c8a45c]/30" />
                  <div className="absolute size-14 rounded-full border border-[#c8a45c]/40" />
                  <div className="absolute h-px w-40 rotate-[-28deg] bg-gradient-to-r from-transparent via-[#c8a45c] to-transparent" />
                  <div className="absolute h-px w-40 rotate-[28deg] bg-gradient-to-r from-transparent via-[#c8a45c]/50 to-transparent" />
                  <div className="z-10 grid size-11 place-items-center rounded-2xl border border-[#dfc27d]/40 bg-[#c8a45c]/15 text-[#e8d39e] shadow-[0_0_35px_rgba(200,164,92,0.18)]">
                    <AudioLines size={21} />
                  </div>
                </div>
              </section>

              <section aria-label="Your statistics" className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-4">
                {[
                  {
                    label: "Sessions completed",
                    value: allSessions.length,
                    icon: Activity,
                    note: "Keep showing up",
                  },
                  {
                    label: "Average score",
                    value: allSessions.length ? `${averageScore}` : "—",
                    icon: Target,
                    note: allSessions.length ? "Across all sessions" : "Earn your first score",
                  },
                  {
                    label: "Problems solved",
                    value: solved,
                    icon: Check,
                    note: "Passing all test cases",
                  },
                  {
                    label: "Practice days",
                    value: activeDays,
                    icon: Flame,
                    note: "Days with a session",
                  },
                ].map((stat) => {
                  const Icon = stat.icon;
                  return (
                    <article
                      key={stat.label}
                      className="rounded-2xl border border-stone-200/80 bg-white p-4"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-medium text-stone-500">
                          {stat.label}
                        </p>
                        <Icon size={15} className="text-[#a17d3f]" />
                      </div>
                      <p className="mt-3 text-[28px] font-semibold tracking-[-0.05em]">
                        {stat.value}
                      </p>
                      <p className="mt-1 text-[11px] text-stone-400">{stat.note}</p>
                    </article>
                  );
                })}
              </section>

              <section
                id="progress"
                className="grid min-w-0 gap-5 xl:grid-cols-[1.1fr_0.9fr]"
              >
                <article className="min-w-0 rounded-2xl border border-stone-200/80 bg-white p-5 sm:p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-sm font-semibold">Practice consistency</h2>
                      <p className="mt-1 text-xs text-stone-500">
                        Each day you have practiced
                      </p>
                    </div>
                    <span className="rounded-full bg-stone-100 px-2.5 py-1 text-[10px] font-medium text-stone-500">
                      Hints used
                    </span>
                  </div>
                  <div className="mt-5 min-w-0 max-w-full overflow-x-auto">
                    <div className="flex min-w-[555px] gap-[5px]">
                      {heatmap.map((cell, index) => (
                        <div
                          key={cell.day || `empty-${index}`}
                          title={cell.day ? `${cell.day}: ${cell.count} session${cell.count === 1 ? "" : "s"}` : "No session"}
                          className={`size-[11px] shrink-0 rounded-[3px] ${cell.tone}`}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-[10px] text-stone-400">
                    <span>Earlier</span>
                    <span className="flex items-center gap-1.5">
                      Less
                      <i className="size-2.5 rounded-sm bg-stone-100" />
                      <i className="size-2.5 rounded-sm bg-emerald-600" />
                      More
                    </span>
                  </div>
                  <div className="mt-5 flex items-center gap-2 border-t border-stone-100 pt-4 text-xs text-stone-500">
                    <div className="flex -space-x-1">
                      <span className="size-2.5 rounded-full border border-white bg-emerald-600" />
                      <span className="size-2.5 rounded-full border border-white bg-amber-400" />
                      <span className="size-2.5 rounded-full border border-white bg-rose-400" />
                    </div>
                    <span>0 hints</span>
                    <span className="text-stone-300">·</span>
                    <span>1–2 hints</span>
                    <span className="text-stone-300">·</span>
                    <span>3 hints</span>
                  </div>
                </article>

                <article className="min-w-0 rounded-2xl border border-stone-200/80 bg-white p-5 sm:p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-sm font-semibold">Communication clarity</h2>
                      <p className="mt-1 text-xs text-stone-500">
                        Last 7 practice days
                      </p>
                    </div>
                    <span className="flex items-center gap-1 rounded-full bg-stone-100 px-2.5 py-1 text-[10px] font-medium text-stone-500">
                      {allSessions.length ? `${averageCommunication}% avg` : "No sessions"}
                    </span>
                  </div>
                  <TrendChart sessions={allSessions} />
                </article>
              </section>

              <section className="space-y-3">
                <div className="flex items-end justify-between">
                  <div>
                    <h2 className="text-sm font-semibold">Choose your practice</h2>
                    <p className="mt-1 text-xs text-stone-500">
                      Start focused with the skills interviewers ask for most.
                    </p>
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  <Link
                    href="/interview"
                    className="group flex min-h-[128px] flex-col justify-between rounded-2xl border border-[#c8a45c]/35 bg-[#fffdf8] p-4 transition hover:-translate-y-0.5 hover:border-[#c8a45c] hover:shadow-lg hover:shadow-[#c8a45c]/10"
                  >
                    <div className="flex items-center justify-between">
                      <span className="grid size-9 place-items-center rounded-xl bg-[#c8a45c]/15 text-[#85652f]">
                        <Code2 size={17} />
                      </span>
                      <span className="rounded-full bg-[#e9dfc9] px-2 py-1 text-[9px] font-semibold uppercase tracking-wider text-[#725a2f]">
                        Available
                      </span>
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold">Data structures</p>
                        <p className="mt-0.5 text-[11px] text-stone-500">DSA · Voice-first</p>
                      </div>
                      <ArrowUpRight size={16} className="text-stone-400 transition group-hover:text-[#80602c]" />
                    </div>
                  </Link>
                  <SystemDesignCard />
                  <TheoryCard />
                </div>
              </section>

              <section className="rounded-2xl border border-stone-200/80 bg-white p-5 sm:p-6">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-semibold">Recent sessions</h2>
                    <p className="mt-1 text-xs text-stone-500">
                      Your interview practice history
                    </p>
                  </div>
                  <span className="text-xs text-stone-400">
                    {allSessions.length} total
                  </span>
                </div>
                {latestSessions.length ? (
                  <div className="divide-y divide-stone-100">
                    {latestSessions.map((session) => (
                      <div
                        key={session.id}
                        className="flex items-center justify-between gap-3 py-3"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-stone-100 text-stone-600">
                            <Code2 size={16} />
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">
                              {session.questionTitle}
                            </p>
                            <p className="mt-0.5 text-[11px] text-stone-500">
                              {session.difficulty} · {formatDate(session.createdAt)}
                            </p>
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-3">
                          <span className="text-sm font-semibold">{session.score}</span>
                          <span className={`text-[10px] font-medium ${session.passed ? "text-emerald-700" : "text-rose-600"}`}>
                            {session.passed ? "Passed" : "Review"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-stone-200 bg-[#faf9f7] px-5 py-7 text-center">
                    <span className="mx-auto grid size-10 place-items-center rounded-full bg-white text-[#a17d3f] shadow-sm">
                      <MessageSquareText size={17} />
                    </span>
                    <p className="mt-3 text-sm font-medium">Your story starts here</p>
                    <p className="mx-auto mt-1 max-w-xs text-xs leading-5 text-stone-500">
                      Finish a voice-first interview and your score, communication
                      audit, and problem history will appear here.
                    </p>
                    <Link
                      href="/interview"
                      className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-[#80602c] hover:text-[#5e451f]"
                    >
                      Practice your first problem <ArrowRight size={13} />
                    </Link>
                  </div>
                )}
              </section>
            </div>

            <aside className="space-y-5">
              <PrepCoach />

              <section className="rounded-2xl border border-[#dfd4bd] bg-[#f1ebdd] p-5">
                <div className="flex items-center gap-2 text-[#725a2f]">
                  <Trophy size={16} />
                  <h2 className="text-sm font-semibold">Small steps, real progress</h2>
                </div>
                <p className="mt-2 text-xs leading-5 text-[#746a56]">
                  One thoughtful practice session is more valuable than a dozen
                  silent problems.
                </p>
                <div className="mt-4 flex items-center justify-between border-t border-[#dfd4bd] pt-3">
                  <span className="text-[11px] text-[#746a56]">Your practice score</span>
                  <span className="text-sm font-semibold text-[#725a2f]">
                    {allSessions.length ? averageScore : "—"}
                  </span>
                </div>
              </section>

              <div className="flex items-center gap-2 px-1 text-[10px] text-stone-400">
                {allSessions.length ? (
                  <>
                    <ArrowUpRight size={12} />
                    Progress updates after each completed session
                  </>
                ) : (
                  <>
                    <ArrowDownRight size={12} />
                    Complete your first session to unlock insights
                  </>
                )}
              </div>
            </aside>
          </div>
        </main>
      </div>

      <UpgradeToProModal
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
      />
    </div>
  );
}
