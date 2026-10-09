export function getEditorLockLabel(
  stage: string,
  editorLocked: boolean,
  curveballLoading: boolean,
  hasCurveball: boolean,
): string {
  if (!editorLocked) return "Editor unlocked";
  if (stage === "pitch") return "Verbal lock active";
  if (curveballLoading) return "Interviewer follow-up loading";
  if (hasCurveball) return "Interviewer follow-up — answer to resume";
  return "Editor paused";
}

export function getCurveballDelay(
  codingStartedAt: number | null,
  now: number,
  delayMs: number,
): number | null {
  return codingStartedAt === null
    ? null
    : Math.max(0, delayMs - (now - codingStartedAt));
}
