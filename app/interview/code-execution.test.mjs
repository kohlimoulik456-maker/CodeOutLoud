import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import {
  areSampleResultsEqual,
  createPistonProgram,
  isCurrentCodeSubmission,
  parseCodeSubmissionResponse,
  parseExecutionOutput,
  validateExecutionRequest,
} from "./code-execution.ts";

const executionSpec = {
  methodName: "twoSum",
  parameterTypes: ["integer[]", "integer"],
  returnType: "integer[]",
  sampleCases: [
    { args: [[2, 7, 11, 15], 9], expected: [0, 1] },
    { args: [[3, 2, 4], 6], expected: [1, 2] },
  ],
};

function request(language = "JavaScript", code = "function twoSum() { return [0, 1]; }") {
  return {
    language,
    titleSlug: "two-sum",
    code,
    executionSpec,
    problemTitle: "Two Sum",
    problemDescription: "Given an array of integers and a target.",
  };
}

test("execution input is bounded and rejects unsupported metadata", () => {
  assert.ok(validateExecutionRequest(request()));
  assert.equal(
    validateExecutionRequest({
      ...request(),
      executionSpec: { ...executionSpec, parameterTypes: ["ListNode"] },
    }),
    null,
  );
  assert.equal(validateExecutionRequest({ ...request(), code: "x".repeat(40001) }), null);
});

test("generates wrappers for supported interview languages", () => {
  for (const [language, pistonLanguage, marker] of [
    ["JavaScript", "javascript", "__RESULT__"],
    ["Python", "python", "__RESULT__"],
    ["C++", "c++", "__RESULT__"],
    ["Java", "java", "__RESULT__"],
  ]) {
    const valid = validateExecutionRequest(
      request(language, language === "Java" ? "class Solution {}" : undefined),
    );
    assert.ok(valid);
    const program = createPistonProgram(valid);
    assert.equal(program.language, pistonLanguage);
    assert.ok(program.version);
    assert.ok(program.source.includes(marker));
    if (language === "C++") {
      assert.ok(program.source.includes("__arg0_0"));
      assert.ok(program.source.includes("__arg1_0"));
      assert.ok(program.source.includes("void __write(int value)"));
    }
    if (language === "Java") {
      assert.ok(program.source.indexOf("class Main") < program.source.indexOf("class Solution"));
    }
  }
});

test("generated JavaScript wrapper runs every canonical sample", () => {
  const valid = validateExecutionRequest(request(
    "JavaScript",
    `function twoSum(nums, target) {
  const seen = new Map();
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (seen.has(complement)) return [seen.get(complement), i];
    seen.set(nums[i], i);
  }
  return [];
}`,
  ));
  assert.ok(valid);
  const program = createPistonProgram(valid);
  let output = "";
  vm.runInNewContext(program.source, {
    console: { log: (line) => { output = line; } },
  });
  assert.deepEqual(JSON.parse(output.slice("__RESULT__".length)), [[0, 1], [1, 2]]);
});

test("parses only the marked JSON output and compares sample values structurally", () => {
  assert.deepEqual(
    parseExecutionOutput("debug output\n__RESULT__[[0,1],[1,2]]\n"),
    [[0, 1], [1, 2]],
  );
  assert.equal(parseExecutionOutput("not-json"), null);
  assert.equal(areSampleResultsEqual([0, 1], [0, 1]), true);
  assert.equal(areSampleResultsEqual([1, 0], [0, 1]), false);
});

test("accepts valid passing and failing sample responses only", () => {
  assert.equal(
    parseCodeSubmissionResponse(200, {
      passed: true,
      passedCases: 2,
      totalCases: 2,
      feedback: "All public samples passed.",
    })?.passed,
    true,
  );
  assert.equal(
    parseCodeSubmissionResponse(200, {
      passed: false,
      passedCases: 0,
      totalCases: 2,
      feedback: "Sample mismatch.",
      failedSample: { caseNumber: 1, expected: [0, 1], actual: [-1, -1] },
      errorType: "wrong-answer",
    })?.passed,
    false,
  );
  assert.equal(
    parseCodeSubmissionResponse(200, {
      passed: true,
      passedCases: 1,
      totalCases: 2,
      feedback: "Malformed pass.",
    }),
    null,
  );
  assert.equal(
    parseCodeSubmissionResponse(503, {
      error: "Execution service is not configured.",
    }),
    null,
  );
});

test("stale or post-interview code results cannot update the current interview", () => {
  assert.equal(isCurrentCodeSubmission(8, 7, "coding"), false);
  assert.equal(isCurrentCodeSubmission(8, 8, "submitted"), false);
  assert.equal(isCurrentCodeSubmission(8, 8, "coding"), true);
});
