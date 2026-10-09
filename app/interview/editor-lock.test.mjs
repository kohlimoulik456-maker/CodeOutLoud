import assert from "node:assert/strict";
import test from "node:test";
import {
  getCurveballDelay,
  getEditorLockLabel,
} from "./editor-lock.ts";

test("the timer does not begin before coding starts", () => {
  assert.equal(getCurveballDelay(null, 30_000, 30_000), null);
});

test("curveball timing is measured from the first code edit", () => {
  assert.equal(getCurveballDelay(10_000, 10_000, 30_000), 30_000);
  assert.equal(getCurveballDelay(10_000, 39_000, 30_000), 1_000);
  assert.equal(getCurveballDelay(10_000, 40_000, 30_000), 0);
});

test("an approved pitch is not mislabeled as a verbal lock during a follow-up", () => {
  assert.equal(getEditorLockLabel("coding", false, false, false), "Editor unlocked");
  assert.equal(
    getEditorLockLabel("coding", true, true, false),
    "Interviewer follow-up loading",
  );
  assert.equal(
    getEditorLockLabel("coding", true, false, true),
    "Interviewer follow-up — answer to resume",
  );
  assert.equal(getEditorLockLabel("pitch", true, false, false), "Verbal lock active");
});
