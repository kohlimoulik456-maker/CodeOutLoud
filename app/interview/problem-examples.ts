import type { ProblemExecutionSpec } from "./problem-types";

function decodeHtml(value: string): string {
  return value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(?:p|pre|li)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&amp;/gi, "&")
    .trim();
}

function parseJsonValue(source: string): unknown {
  return JSON.parse(source.trim()) as unknown;
}

function parseArguments(
  source: string,
  parameterNames: string[],
): unknown[] | null {
  const assignments = parameterNames.map((name) => {
    const expression = new RegExp(`(?:^|[,\\n])\\s*${name}\\s*=\\s*`, "g");
    const match = expression.exec(source);
    return match
      ? {
          start: match.index + match[0].length,
          assignmentStart: match.index,
        }
      : null;
  });
  if (assignments.some((assignment) => assignment === null)) return null;

  try {
    return assignments.map((assignment, index) => {
      if (!assignment) throw new Error("Missing sample input parameter.");
      const next = assignments[index + 1];
      const end = next?.assignmentStart ?? source.length;
      const value = source
        .slice(assignment.start, end)
        .replace(/,\s*$/, "")
        .trim();
      return parseJsonValue(value);
    });
  } catch {
    return null;
  }
}

export function parseProblemExecutionSpec(
  problemContent: string,
  metadataJson: string,
): ProblemExecutionSpec | null {
  let metadata: unknown;
  try {
    metadata = JSON.parse(metadataJson);
  } catch {
    return null;
  }
  if (!metadata || typeof metadata !== "object") return null;
  const info = metadata as {
    name?: unknown;
    params?: Array<{ name?: unknown; type?: unknown }>;
    return?: { type?: unknown };
  };
  if (
    typeof info.name !== "string" ||
    !/^[A-Za-z_$][\w$]*$/.test(info.name) ||
    !Array.isArray(info.params) ||
    info.params.length > 10 ||
    !info.params.every(
      (param) =>
        typeof param.name === "string" &&
        /^[A-Za-z_$][\w$]*$/.test(param.name) &&
        typeof param.type === "string",
    ) ||
    typeof info.return?.type !== "string"
  ) {
    return null;
  }

  const parameterNames = info.params.map((param) => param.name as string);
  const parameterTypes = info.params.map((param) => param.type as string);
  const preBlocks = [
    ...problemContent.matchAll(/<pre\b[^>]*>([\s\S]*?)<\/pre>/gi),
  ];
  const sampleCases: ProblemExecutionSpec["sampleCases"] = [];

  for (const [, rawBlock] of preBlocks) {
    const block = decodeHtml(rawBlock);
    const inputMarker = block.match(/\bInput:\s*/i);
    const outputMarker = block.match(/\bOutput:\s*/i);
    if (
      !inputMarker ||
      !outputMarker ||
      inputMarker.index === undefined ||
      outputMarker.index === undefined
    ) {
      continue;
    }
    const inputStart = inputMarker.index + inputMarker[0].length;
    const inputEnd = outputMarker.index;
    const outputStart = outputMarker.index + outputMarker[0].length;
    const explanationStart = block.search(/\bExplanation:\s*/i);
    const outputEnd =
      explanationStart >= outputStart ? explanationStart : block.length;
    const args = parseArguments(
      block.slice(inputStart, inputEnd).trim(),
      parameterNames,
    );
    if (!args) continue;

    try {
      sampleCases.push({
        args,
        expected: parseJsonValue(block.slice(outputStart, outputEnd)),
      });
    } catch {
      continue;
    }
  }

  if (sampleCases.length === 0 || sampleCases.length > 10) return null;
  return {
    methodName: info.name,
    parameterTypes,
    returnType: info.return.type,
    sampleCases,
  };
}
