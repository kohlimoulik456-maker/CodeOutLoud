import assert from "node:assert/strict";
import test from "node:test";
import { parseProblemExecutionSpec } from "./problem-examples.ts";

test("extracts arguments and expected outputs from public problem examples", () => {
  const content = `
    <p><strong>Example 1:</strong></p>
    <pre><strong>Input:</strong> nums = [2,7,11,15], target = 9
    <strong>Output:</strong> [0,1]
    <strong>Explanation:</strong> The first two entries add up to 9.</pre>
    <p><strong>Example 2:</strong></p>
    <pre><strong>Input:</strong> nums = [3,2,4], target = 6
    <strong>Output:</strong> [1,2]</pre>
  `;
  const metadata = JSON.stringify({
    name: "twoSum",
    params: [
      { name: "nums", type: "integer[]" },
      { name: "target", type: "integer" },
    ],
    return: { type: "integer[]" },
  });

  assert.deepEqual(
    parseProblemExecutionSpec(content, metadata),
    {
      methodName: "twoSum",
      parameterTypes: ["integer[]", "integer"],
      returnType: "integer[]",
      sampleCases: [
        { args: [[2, 7, 11, 15], 9], expected: [0, 1] },
        { args: [[3, 2, 4], 6], expected: [1, 2] },
      ],
    },
  );
});

test("rejects invalid metadata and examples rather than inventing test inputs", () => {
  assert.equal(parseProblemExecutionSpec("<pre>Example</pre>", "{}"), null);
  assert.equal(
    parseProblemExecutionSpec(
      "<pre><strong>Input:</strong> nums = nope\n<strong>Output:</strong> []</pre>",
      JSON.stringify({
        name: "twoSum",
        params: [{ name: "nums", type: "integer[]" }],
        return: { type: "integer[]" },
      }),
    ),
    null,
  );
});
