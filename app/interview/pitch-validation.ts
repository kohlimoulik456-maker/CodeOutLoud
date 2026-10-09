export const PITCH_CRITERIA = [
  "problemRelevance",
  "bruteForceOrNotApplicable",
  "optimalApproach",
  "keyReasoning",
  "timeComplexity",
  "spaceComplexity",
] as const;

export type PitchDifficulty = "Easy" | "Medium" | "Hard";
export type PitchCriteria = Record<(typeof PITCH_CRITERIA)[number], number>;

export type PitchValidationResult = {
  score: number;
  threshold: number;
  passed: boolean;
  criteria: PitchCriteria;
  missing: string[];
  feedback: string;
  translation: string;
  hint: string;
  referenceApproach: string;
};

export type PitchApiResult =
  | { kind: "error" }
  | ({ kind: "rejected" } & PitchValidationResult)
  | ({ kind: "passed" } & PitchValidationResult);

const CRITERION_LABELS: Record<keyof PitchCriteria, string> = {
  problemRelevance: "connection to this problem",
  bruteForceOrNotApplicable: "a brute-force baseline (or why it does not apply)",
  optimalApproach: "the intended efficient approach",
  keyReasoning: "why that approach works",
  timeComplexity: "time complexity",
  spaceComplexity: "space complexity",
};

export const PITCH_PASS_THRESHOLDS: Record<PitchDifficulty, number> = {
  Easy: 60,
  Medium: 70,
  Hard: 85,
};

export const MAX_PITCH_ATTEMPTS = 3;

export function nextPitchAttemptCount(current: number): number {
  return Math.min(MAX_PITCH_ATTEMPTS, Math.max(0, current) + 1);
}

export function isPitchAttemptOver(attempts: number): boolean {
  return attempts >= MAX_PITCH_ATTEMPTS;
}

const CORE_CRITERIA: (keyof PitchCriteria)[] = [
  "problemRelevance",
  "optimalApproach",
];

export function isUsablePitchTranscript(transcript: string): boolean {
  const trimmed = transcript.trim();
  return trimmed.length >= 30 && trimmed.split(/\s+/).filter(Boolean).length >= 5;
}

function isPitchCriteria(value: unknown): value is PitchCriteria {
  if (!value || typeof value !== "object") return false;
  const criteria = value as Record<string, unknown>;
  return PITCH_CRITERIA.every(
    (key) =>
      typeof criteria[key] === "number" &&
      Number.isInteger(criteria[key]) &&
      criteria[key] >= 0 &&
      criteria[key] <= 100,
  );
}

function difficultyThreshold(difficulty: PitchDifficulty): number {
  return PITCH_PASS_THRESHOLDS[difficulty];
}

function pitchScore(criteria: PitchCriteria): number {
  return Math.round(
    PITCH_CRITERIA.reduce((total, key) => total + criteria[key], 0) /
      PITCH_CRITERIA.length,
  );
}

function criteriaPass(
  criteria: PitchCriteria,
  score: number,
  difficulty: PitchDifficulty,
): boolean {
  return (
    score >= difficultyThreshold(difficulty) &&
    CORE_CRITERIA.every((key) => criteria[key] >= 60)
  );
}

function missingConcepts(criteria: PitchCriteria): string[] {
  return PITCH_CRITERIA.filter((key) => criteria[key] < 75).map(
    (key) => CRITERION_LABELS[key],
  );
}

export function parsePitchModelResponse(
  content: string,
  transcript: string,
  difficulty: PitchDifficulty,
): PitchValidationResult | null {
  if (!isUsablePitchTranscript(transcript)) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;

  const value = parsed as Record<string, unknown>;
  if (
    !isPitchCriteria(value.criteria) ||
    typeof value.feedback !== "string" ||
    value.feedback.trim().length === 0 ||
    value.feedback.length > 600 ||
    typeof value.translation !== "string" ||
    value.translation.length > 1200 ||
    typeof value.hint !== "string" ||
    value.hint.trim().length === 0 ||
    value.hint.length > 400 ||
    typeof value.referenceApproach !== "string" ||
    value.referenceApproach.length > 1200
  ) {
    return null;
  }

  const score = pitchScore(value.criteria);
  const passed = criteriaPass(value.criteria, score, difficulty);
  const missing = missingConcepts(value.criteria);
  return {
    score,
    threshold: difficultyThreshold(difficulty),
    passed,
    criteria: value.criteria,
    missing: passed ? [] : missing,
    feedback: value.feedback.trim(),
    translation: value.translation.trim(),
    hint: value.hint.trim(),
    referenceApproach: value.referenceApproach.trim(),
  };
}

export function parsePitchApiResponse(
  status: number,
  payload: unknown,
  difficulty: PitchDifficulty,
): PitchApiResult {
  if (status !== 200 || !payload || typeof payload !== "object") {
    return { kind: "error" };
  }

  const value = payload as Record<string, unknown>;
  if (
    typeof value.passed !== "boolean" ||
    !isPitchCriteria(value.criteria) ||
    typeof value.score !== "number" ||
    !Number.isInteger(value.score) ||
    typeof value.threshold !== "number" ||
    !Array.isArray(value.missing) ||
    !value.missing.every((item) => typeof item === "string") ||
    typeof value.feedback !== "string" ||
    value.feedback.trim().length === 0 ||
    value.feedback.length > 600 ||
    typeof value.translation !== "string" ||
    value.translation.length > 1200 ||
    typeof value.hint !== "string" ||
    value.hint.trim().length === 0 ||
    value.hint.length > 400 ||
    typeof value.referenceApproach !== "string" ||
    value.referenceApproach.length > 1200
  ) {
    return { kind: "error" };
  }

  const expectedScore = pitchScore(value.criteria);
  const expectedThreshold = difficultyThreshold(difficulty);
  const expectedPassed = criteriaPass(
    value.criteria,
    expectedScore,
    difficulty,
  );
  const expectedMissing = value.passed ? [] : missingConcepts(value.criteria);
  if (value.score !== expectedScore || value.threshold !== expectedThreshold ||
    value.passed !== expectedPassed ||
    value.missing.length !== expectedMissing.length ||
    !value.missing.every(
      (item, index) => item === expectedMissing[index],
    )) {
    return { kind: "error" };
  }

  return {
    kind: value.passed ? "passed" : "rejected",
    score: expectedScore,
    threshold: expectedThreshold,
    passed: value.passed,
    criteria: value.criteria,
    missing: expectedMissing,
    feedback: value.feedback.trim(),
    translation: value.translation.trim(),
    hint: value.hint.trim(),
    referenceApproach: value.referenceApproach.trim(),
  };
}

export function isPitchValidationError(
  value: unknown,
): value is { error: string } {
  return (
    !!value &&
    typeof value === "object" &&
    typeof (value as { error?: unknown }).error === "string" &&
    (value as { error: string }).error.trim().length > 0 &&
    (value as { error: string }).error.length <= 300
  );
}

export function shouldUnlockPitch(
  stage: string,
  isCurrentAttempt: boolean,
  result: PitchApiResult,
): boolean {
  return stage === "pitch" && isCurrentAttempt && result.kind === "passed";
}

export function isCurrentPitchAttempt(
  currentAttempt: number,
  responseAttempt: number,
): boolean {
  return currentAttempt === responseAttempt;
}
