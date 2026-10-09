import assert from "node:assert/strict";
import test from "node:test";
import {
  PITCH_PASS_THRESHOLDS,
  isCurrentPitchAttempt,
  isPitchAttemptOver,
  isUsablePitchTranscript,
  nextPitchAttemptCount,
  parsePitchApiResponse,
  parsePitchModelResponse,
  shouldUnlockPitch,
} from "./pitch-validation.ts";

const completeCriteria = {
  problemRelevance: 100,
  bruteForceOrNotApplicable: 100,
  optimalApproach: 100,
  keyReasoning: 100,
  timeComplexity: 100,
  spaceComplexity: 100,
};

const usableTranscript =
  "For this problem, checking every pair is quadratic. A hash map lets me find complements in linear time, using linear extra space.";

function modelResponse(criteria, feedback = "Good explanation.", translation = "A clear explanation.") {
  return JSON.stringify({
    criteria,
    feedback,
    translation,
    hint: "Explain how you find a complement efficiently.",
    referenceApproach: "Track values already seen in a hash map.",
  });
}

function evaluate(criteria, difficulty) {
  return parsePitchModelResponse(
    modelResponse(criteria),
    usableTranscript,
    difficulty,
  );
}

function toApiResult(result, difficulty) {
  return parsePitchApiResponse(200, result, difficulty);
}

test("a correct pitch passes every difficulty and unlocks", () => {
  for (const difficulty of ["Easy", "Medium", "Hard"]) {
    const result = evaluate(completeCriteria, difficulty);
    assert.equal(result?.passed, true);
    assert.equal(
      shouldUnlockPitch("pitch", true, toApiResult(result, difficulty)),
      true,
    );
  }
});

test("a passing partial-credit response is accepted by the client schema", () => {
  const criteria = {
    problemRelevance: 100,
    bruteForceOrNotApplicable: 50,
    optimalApproach: 100,
    keyReasoning: 75,
    timeComplexity: 100,
    spaceComplexity: 100,
  };
  const serverResult = evaluate(criteria, "Medium");
  assert.equal(serverResult?.score, 88);
  assert.equal(serverResult?.passed, true);
  assert.deepEqual(serverResult?.missing, []);

  const clientResult = toApiResult(serverResult, "Medium");
  assert.equal(clientResult.kind, "passed");
  assert.equal(shouldUnlockPitch("pitch", true, clientResult), true);
});

test("difficulty pass thresholds are 60%, 70%, and 85%", () => {
  assert.deepEqual(PITCH_PASS_THRESHOLDS, {
    Easy: 60,
    Medium: 70,
    Hard: 85,
  });

  const criteriaAt60 = {
    problemRelevance: 60,
    bruteForceOrNotApplicable: 60,
    optimalApproach: 60,
    keyReasoning: 60,
    timeComplexity: 60,
    spaceComplexity: 60,
  };
  assert.equal(evaluate(criteriaAt60, "Easy")?.passed, true);
  assert.equal(evaluate(criteriaAt60, "Medium")?.passed, false);
  assert.equal(evaluate(criteriaAt60, "Hard")?.passed, false);

  const criteriaAt70 = {
    ...criteriaAt60,
    problemRelevance: 70,
    bruteForceOrNotApplicable: 70,
    optimalApproach: 70,
    keyReasoning: 70,
    timeComplexity: 70,
    spaceComplexity: 70,
  };
  assert.equal(evaluate(criteriaAt70, "Medium")?.passed, true);
  assert.equal(evaluate(criteriaAt70, "Hard")?.passed, false);

  const criteriaAt85 = Object.fromEntries(
    Object.keys(completeCriteria).map((key) => [key, 85]),
  );
  assert.equal(evaluate(criteriaAt85, "Hard")?.passed, true);
});

test("an unrelated or unviable answer fails even above the numeric threshold", () => {
  const criteria = {
    ...completeCriteria,
    problemRelevance: 0,
  };
  const result = evaluate(criteria, "Easy");
  assert.equal(result?.score, 83);
  assert.equal(result?.passed, false);
  assert.equal(
    shouldUnlockPitch("pitch", true, toApiResult(result, "Easy")),
    false,
  );
});

test("a partially correct hard pitch gives missing-concept feedback and stays locked", () => {
  const criteria = {
    ...completeCriteria,
    spaceComplexity: 0,
  };
  const result = evaluate(criteria, "Hard");
  assert.equal(result?.score, 83);
  assert.deepEqual(result?.missing, ["space complexity"]);
  assert.equal(result?.passed, false);
  assert.equal(
    shouldUnlockPitch("pitch", true, toApiResult(result, "Hard")),
    false,
  );
});

test("empty and very short transcripts cannot pass", () => {
  assert.equal(isUsablePitchTranscript(""), false);
  assert.equal(isUsablePitchTranscript("O(n), optimal, brute force"), false);
  assert.equal(
    parsePitchModelResponse(modelResponse(completeCriteria), "", "Easy"),
    null,
  );
});

test("configuration and malformed-response failures never unlock", () => {
  const unavailable = parsePitchApiResponse(
    503,
    { error: "validation unavailable" },
    "Easy",
  );
  assert.equal(shouldUnlockPitch("pitch", true, unavailable), false);
  assert.equal(
    parsePitchModelResponse("not json", usableTranscript, "Easy"),
    null,
  );
});

test("a stale attempt cannot unlock a newer pitch", () => {
  const result = toApiResult(evaluate(completeCriteria, "Easy"), "Easy");
  assert.equal(isCurrentPitchAttempt(5, 4), false);
  assert.equal(
    shouldUnlockPitch("pitch", isCurrentPitchAttempt(5, 4), result),
    false,
  );
  assert.equal(
    shouldUnlockPitch("pitch", isCurrentPitchAttempt(5, 5), result),
    true,
  );
  assert.equal(shouldUnlockPitch("coding", true, result), false);
});

test("three consecutive failed pitches end the attempt", () => {
  const first = nextPitchAttemptCount(0);
  const second = nextPitchAttemptCount(first);
  const third = nextPitchAttemptCount(second);
  assert.deepEqual([first, second, third], [1, 2, 3]);
  assert.equal(isPitchAttemptOver(second), false);
  assert.equal(isPitchAttemptOver(third), true);
});
