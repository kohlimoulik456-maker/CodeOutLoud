import type { InterviewLanguage, ProblemExecutionSpec } from "./problem-types";

export type ValidatedExecutionRequest = {
  code: string;
  language: InterviewLanguage;
  executionSpec: ProblemExecutionSpec;
  titleSlug: string;
  problemTitle: string;
  problemDescription: string;
};

export type CodeSubmissionResult = {
  passed: boolean;
  passedCases: number;
  totalCases: number;
  feedback: string;
  errorType?: "compile" | "runtime" | "wrong-answer";
  failedSample?: { caseNumber: number; expected: unknown; actual: unknown };
};

const TYPE_ALIASES: Record<string, string> = {
  integer: "integer",
  number: "number",
  long: "long",
  boolean: "boolean",
  string: "string",
  character: "character",
};

function normalizedType(type: string): string | null {
  const normalized = type.replace(/\s+/g, "").toLowerCase();
  const match = normalized.match(/^(integer|number|long|boolean|string|character)((?:\[\]){0,3})$/);
  if (!match || !TYPE_ALIASES[match[1]]) return null;
  return `${TYPE_ALIASES[match[1]]}${match[2]}`;
}

function isJsonValue(value: unknown, depth = 0): boolean {
  if (depth > 8) return false;
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) return true;
  if (typeof value === "number") return Number.isFinite(value);
  return (
    Array.isArray(value) &&
    value.length <= 10000 &&
    value.every((item) => isJsonValue(item, depth + 1))
  );
}

export function validateExecutionRequest(
  value: unknown,
  canonicalExecutionSpec?: ProblemExecutionSpec | null,
): ValidatedExecutionRequest | null {
  if (!value || typeof value !== "object") return null;
  const request = value as Record<string, unknown>;
  const spec = canonicalExecutionSpec ??
    (request.executionSpec as ProblemExecutionSpec | null);
  if (
    typeof request.code !== "string" ||
    request.code.length === 0 ||
    request.code.length > 40000 ||
    (request.language !== "JavaScript" &&
      request.language !== "Python" &&
      request.language !== "C++" &&
      request.language !== "Java") ||
    typeof request.problemTitle !== "string" ||
    request.problemTitle.trim().length === 0 ||
    request.problemTitle.length > 200 ||
    typeof request.titleSlug !== "string" ||
    !/^[a-z0-9-]{1,120}$/.test(request.titleSlug) ||
    typeof request.problemDescription !== "string" ||
    request.problemDescription.length > 100000 ||
    !spec ||
    typeof spec.methodName !== "string" ||
    !/^[A-Za-z_$][\w$]*$/.test(spec.methodName) ||
    !Array.isArray(spec.parameterTypes) ||
    spec.parameterTypes.length > 10 ||
    !spec.parameterTypes.every(
      (type) => typeof type === "string" && normalizedType(type) !== null,
    ) ||
    typeof spec.returnType !== "string" ||
    normalizedType(spec.returnType) === null ||
    !Array.isArray(spec.sampleCases) ||
    spec.sampleCases.length === 0 ||
    spec.sampleCases.length > 10 ||
    !spec.sampleCases.every(
      (sample) =>
        !!sample &&
        Array.isArray(sample.args) &&
        sample.args.length === spec.parameterTypes.length &&
        sample.args.every((arg) => isJsonValue(arg)) &&
        isJsonValue(sample.expected),
    )
  ) {
    return null;
  }
  return {
    code: request.code,
    language: request.language,
    executionSpec: {
      methodName: spec.methodName,
      parameterTypes: spec.parameterTypes.map(normalizedType) as string[],
      returnType: normalizedType(spec.returnType)!,
      sampleCases: spec.sampleCases,
    },
    titleSlug: request.titleSlug,
    problemTitle: request.problemTitle.trim(),
    problemDescription: request.problemDescription,
  };
}

function cppType(type: string): string {
  const normalized = normalizedType(type)!;
  const depth = (normalized.match(/\[\]/g) ?? []).length;
  const base = normalized.replace(/(?:\[\])+$/, "");
  const scalar: Record<string, string> = {
    integer: "int",
    number: "double",
    long: "long long",
    boolean: "bool",
    string: "string",
    character: "char",
  };
  return `${"vector<".repeat(depth)}${scalar[base]}${">".repeat(depth)}`;
}

function javaType(type: string): string {
  const normalized = normalizedType(type)!;
  const depth = (normalized.match(/\[\]/g) ?? []).length;
  const base = normalized.replace(/(?:\[\])+$/, "");
  const scalar: Record<string, string> = {
    integer: "int",
    number: "double",
    long: "long",
    boolean: "boolean",
    string: "String",
    character: "char",
  };
  return `${scalar[base]}${"[]".repeat(depth)}`;
}

function typedLiteral(value: unknown, type: string, language: "cpp" | "java"): string {
  const normalized = normalizedType(type)!;
  const dimensions = (normalized.match(/\[\]/g) ?? []).length;
  const base = normalized.replace(/(?:\[\])+$/, "");
  if (dimensions > 0) {
    if (!Array.isArray(value)) throw new Error("Sample input does not match its type.");
    const innerType = `${base}${"[]".repeat(dimensions - 1)}`;
    const values = value.map((item) => typedLiteral(item, innerType, language));
    return language === "cpp"
      ? `${cppType(normalized)}{${values.join(",")}}`
      : `new ${javaType(normalized)}{${values.join(",")}}`;
  }
  if (base === "string") {
    if (typeof value !== "string") throw new Error("Sample input does not match its type.");
    return JSON.stringify(value);
  }
  if (base === "character") {
    if (typeof value !== "string" || value.length !== 1) {
      throw new Error("Sample input does not match its type.");
    }
    return `'${value.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`;
  }
  if (base === "boolean") {
    if (typeof value !== "boolean") throw new Error("Sample input does not match its type.");
    if (language === "java") return value ? "true" : "false";
    return value ? "true" : "false";
  }
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error("Sample input does not match its type.");
  }
  if (base === "integer" && !Number.isInteger(value)) {
    throw new Error("Sample input does not match its type.");
  }
  return String(value);
}

function wrapJavaScript(code: string, spec: ProblemExecutionSpec): string {
  return `${code}
const __cases = ${JSON.stringify(spec.sampleCases)};
const __candidate = typeof ${spec.methodName} === "function"
  ? ${spec.methodName}
  : (...args) => new Solution()[${JSON.stringify(spec.methodName)}](...args);
const __results = __cases.map(({ args }) => __candidate(...args));
console.log("__RESULT__" + JSON.stringify(__results));`;
}

function wrapPython(code: string, spec: ProblemExecutionSpec): string {
  return `${code}
import json as __json
__cases = __json.loads(${JSON.stringify(JSON.stringify(spec.sampleCases))})
if "Solution" in globals():
    __candidate = getattr(Solution(), ${JSON.stringify(spec.methodName)})
else:
    __candidate = globals()[${JSON.stringify(spec.methodName)}]
__results = [__candidate(*case["args"]) for case in __cases]
print("__RESULT__" + __json.dumps(__results, separators=(",", ":")))`;
}

function wrapCpp(code: string, spec: ProblemExecutionSpec): string {
  const body = spec.sampleCases.map((sample, index) => {
    const declarations = sample.args
      .map(
        (arg, argIndex) =>
          `${cppType(spec.parameterTypes[argIndex])} __arg${argIndex} = ${typedLiteral(arg, spec.parameterTypes[argIndex], "cpp")};`,
      )
      .join("\n");
    const args = sample.args.map((_, argIndex) => `__arg${argIndex}`).join(", ");
    return `${declarations}
  if (${index}) cout << ",";
  __write(__solution.${spec.methodName}(${args}));`;
  });
  return `#include <bits/stdc++.h>
using namespace std;
${code}
void __write(const string& value) { cout << '"'; for (char c : value) { if (c == '"' || c == '\\\\') cout << '\\\\' << c; else if (c == '\\n') cout << "\\\\n"; else if (c == '\\r') cout << "\\\\r"; else if (c == '\\t') cout << "\\\\t"; else cout << c; } cout << '"'; }
void __write(char value) { __write(string(1, value)); }
void __write(bool value) { cout << (value ? "true" : "false"); }
template<class T> void __write(const vector<T>& values) { cout << "["; for (size_t i = 0; i < values.size(); ++i) { if (i) cout << ","; __write(static_cast<T>(values[i])); } cout << "]"; }
template<class T> void __write(const T& value) { cout << value; }
int main() {
  Solution __solution;
  cout << "__RESULT__[";
  ${body.join("\n  ")}
  cout << "]\\n";
  return 0;
}`;
}

function wrapJava(code: string, spec: ProblemExecutionSpec): string {
  const calls = spec.sampleCases.map((sample, caseIndex) => {
    const args = sample.args
      .map((arg, index) =>
        typedLiteral(arg, spec.parameterTypes[index], "java"),
      )
      .join(", ");
    return `${caseIndex ? 'System.out.print(",");' : ""}
    __write(__solution.${spec.methodName}(${args}));`;
  });
  return `import java.lang.reflect.Array;
import java.util.*;
${code}
class Main {
  static void __write(Object value) {
    if (value == null) { System.out.print("null"); return; }
    if (value instanceof String || value instanceof Character) {
      String text = value.toString().replace("\\\\", "\\\\\\\\").replace("\\"", "\\\\\\"").replace("\\n", "\\\\n").replace("\\r", "\\\\r");
      System.out.print("\\"" + text + "\\""); return;
    }
    if (value instanceof Boolean || value instanceof Number) { System.out.print(value); return; }
    if (value.getClass().isArray()) {
      System.out.print("[");
      for (int i = 0; i < Array.getLength(value); i++) { if (i > 0) System.out.print(","); __write(Array.get(value, i)); }
      System.out.print("]"); return;
    }
    throw new IllegalArgumentException("Unsupported return value");
  }
  public static void main(String[] args) {
    Solution __solution = new Solution();
    System.out.print("__RESULT__[");
    ${calls.join("\n    ")}
    System.out.println("]");
  }
}`;
}

export function createPistonProgram(
  request: ValidatedExecutionRequest,
): { language: string; version: string; filename: string; source: string } {
  const { code, language, executionSpec } = request;
  switch (language) {
    case "JavaScript":
      return { language: "javascript", version: "18.15.0", filename: "main.js", source: wrapJavaScript(code, executionSpec) };
    case "Python":
      return { language: "python", version: "3.10.0", filename: "main.py", source: wrapPython(code, executionSpec) };
    case "C++":
      return { language: "c++", version: "10.2.0", filename: "main.cpp", source: wrapCpp(code, executionSpec) };
    case "Java":
      return { language: "java", version: "15.0.2", filename: "Main.java", source: wrapJava(code, executionSpec) };
  }
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, stableValue(item)]),
    );
  }
  return value;
}

export function areSampleResultsEqual(actual: unknown, expected: unknown): boolean {
  return JSON.stringify(stableValue(actual)) === JSON.stringify(stableValue(expected));
}

export function parseExecutionOutput(stdout: string): unknown[] | null {
  const resultLine = stdout
    .split(/\r?\n/)
    .reverse()
    .find((line) => line.startsWith("__RESULT__"));
  if (!resultLine) return null;
  try {
    const parsed: unknown = JSON.parse(resultLine.slice("__RESULT__".length));
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function isCurrentCodeSubmission(
  currentSubmission: number,
  responseSubmission: number,
  stage: string,
): boolean {
  return currentSubmission === responseSubmission && stage === "coding";
}

export function parseCodeSubmissionResponse(
  status: number,
  payload: unknown,
): CodeSubmissionResult | null {
  if (status !== 200 || !payload || typeof payload !== "object") return null;
  const value = payload as Record<string, unknown>;
  if (
    typeof value.passed !== "boolean" ||
    typeof value.passedCases !== "number" ||
    !Number.isInteger(value.passedCases) ||
    typeof value.totalCases !== "number" ||
    !Number.isInteger(value.totalCases) ||
    value.totalCases < 1 ||
    value.totalCases > 10 ||
    value.passedCases < 0 ||
    value.passedCases > value.totalCases ||
    typeof value.feedback !== "string" ||
    value.feedback.trim().length === 0 ||
    value.feedback.length > 600
  ) return null;
  const validErrorTypes = ["compile", "runtime", "wrong-answer"];
  if (
    value.errorType !== undefined &&
    !validErrorTypes.includes(value.errorType as string)
  ) return null;

  let failedSample: CodeSubmissionResult["failedSample"];
  if (value.failedSample !== undefined) {
    if (!value.failedSample || typeof value.failedSample !== "object") {
      return null;
    }
    const sample = value.failedSample as Record<string, unknown>;
    if (
      typeof sample.caseNumber !== "number" ||
      !Number.isInteger(sample.caseNumber) ||
      !isJsonValue(sample.expected) ||
      !isJsonValue(sample.actual)
    ) return null;
    failedSample = {
      caseNumber: sample.caseNumber,
      expected: sample.expected,
      actual: sample.actual,
    };
    if (
      failedSample.caseNumber < 1 ||
      failedSample.caseNumber > value.totalCases ||
      value.passedCases !== failedSample.caseNumber - 1
    ) return null;
  }
  if (
    (value.passed &&
      (value.passedCases !== value.totalCases ||
        value.errorType !== undefined ||
        failedSample !== undefined)) ||
    (!value.passed &&
      (value.passedCases === value.totalCases ||
        !validErrorTypes.includes(value.errorType as string) ||
        (value.errorType === "wrong-answer") !== (failedSample !== undefined)))
  ) return null;
  return {
    passed: value.passed,
    passedCases: value.passedCases,
    totalCases: value.totalCases,
    feedback: value.feedback.trim(),
    ...(value.errorType
      ? { errorType: value.errorType as CodeSubmissionResult["errorType"] }
      : {}),
    ...(failedSample ? { failedSample } : {}),
  };
}

export function parseCodeSubmissionError(
  status: number,
  payload: unknown,
): string | null {
    if (status === 200 || !payload || typeof payload !== "object") return null;
    const error = (payload as { error?: unknown }).error;
    return typeof error === "string" && error.trim().length > 0 && error.length <= 300
      ? error
      : null;
}
