export type SessionRecord = {
  id: string;
  createdAt: string;
  questionTitle: string;
  difficulty: string;
  score: number;
  hintsUsed: number;
  passed: boolean;
  communication: number;
  deadAirPercent: number;
  fillerCount: number;
};

export const GUEST_SESSIONS_KEY = "codeoutloud-guest-sessions-v1";
export const GUEST_SESSION_EVENT = "codeoutloud:session-history";

function isSessionRecord(value: unknown): value is SessionRecord {
  if (!value || typeof value !== "object") return false;
  const session = value as Partial<SessionRecord>;
  return (
    typeof session.id === "string" &&
    typeof session.createdAt === "string" &&
    typeof session.questionTitle === "string" &&
    typeof session.difficulty === "string" &&
    typeof session.score === "number" &&
    typeof session.hintsUsed === "number" &&
    typeof session.passed === "boolean" &&
    typeof session.communication === "number" &&
    typeof session.deadAirPercent === "number" &&
    typeof session.fillerCount === "number"
  );
}

export function loadGuestSessions(): SessionRecord[] {
  const stored = window.localStorage.getItem(GUEST_SESSIONS_KEY);
  if (!stored) return [];
  const parsed: unknown = JSON.parse(stored);
  if (!Array.isArray(parsed) || !parsed.every(isSessionRecord)) {
    throw new Error("Saved local interview history is invalid.");
  }
  return parsed;
}

export function saveGuestSession(session: SessionRecord) {
  const sessions = loadGuestSessions();
  const next = [
    session,
    ...sessions.filter((item) => item.id !== session.id),
  ].slice(0, 200);
  window.localStorage.setItem(GUEST_SESSIONS_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event(GUEST_SESSION_EVENT));
}
