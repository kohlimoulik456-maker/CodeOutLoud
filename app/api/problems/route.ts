import { NextResponse } from "next/server";
import {
  INTERVIEW_LANGUAGES,
  LEETCODE_TOPIC_TAGS,
  PROBLEM_DIFFICULTIES,
  type InterviewLanguage,
  type LeetCodeProblem,
  type ProblemDifficulty,
  type ProblemSearchFilters,
} from "../../interview/problem-types";
import { parseProblemExecutionSpec } from "../../interview/problem-examples";

const LEETCODE_GRAPHQL_URL = "https://leetcode.com/graphql/";
const LANGUAGE_SLUGS: Record<InterviewLanguage, string> = {
  JavaScript: "javascript",
  Python: "python3",
  "C++": "cpp",
  Java: "java",
};

const PROBLEM_LIST_QUERY = `
  query ProblemList($filters: QuestionFilterInput, $limit: Int, $skip: Int) {
    problemsetQuestionListV2(filters: $filters, limit: $limit, skip: $skip) {
      questions {
        questionFrontendId
        titleSlug
        paidOnly
      }
    }
  }
`;

const PROBLEM_DETAIL_QUERY = `
  query ProblemDetail($titleSlug: String!) {
    question(titleSlug: $titleSlug) {
      questionId
      questionFrontendId
      title
      titleSlug
      difficulty
      content
      metaData
      topicTags { name slug }
      codeSnippets { langSlug code }
    }
  }
`;

type GraphQLResponse<T> = {
  data?: T;
  errors?: Array<{ message?: string }>;
};

type ListedQuestion = {
  questionFrontendId: string;
  titleSlug: string;
  paidOnly: boolean;
};

type QuestionDetails = {
  questionId: string;
  questionFrontendId: string;
  title: string;
  titleSlug: string;
  difficulty: string;
  content: string;
  metaData: string;
  topicTags: Array<{ name: string; slug: string }>;
  codeSnippets: Array<{ langSlug: string; code: string }>;
};

function isSearchFilters(value: unknown): value is ProblemSearchFilters {
  if (!value || typeof value !== "object") return false;
  const filters = value as Partial<ProblemSearchFilters>;
  return (
    PROBLEM_DIFFICULTIES.includes(filters.difficulty as ProblemDifficulty) &&
    INTERVIEW_LANGUAGES.includes(filters.language as InterviewLanguage) &&
    Array.isArray(filters.tags) &&
    filters.tags.length <= 8 &&
    filters.tags.every((tag) =>
      LEETCODE_TOPIC_TAGS.some((knownTag) => knownTag.slug === tag),
    )
  );
}

async function leetCodeRequest<T>(
  query: string,
  variables: Record<string, unknown>,
): Promise<T> {
  const response = await fetch(LEETCODE_GRAPHQL_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Referer: "https://leetcode.com",
      "User-Agent": "CodeOutLoud/1.0",
    },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
    signal: AbortSignal.timeout(12_000),
  });

  if (!response.ok) {
    throw new Error(`LeetCode returned HTTP ${response.status}.`);
  }

  const result = (await response.json()) as GraphQLResponse<T>;
  if (result.errors?.length) {
    throw new Error(result.errors.map((error) => error.message ?? "GraphQL error").join("; "));
  }
  if (!result.data) throw new Error("LeetCode returned an empty response.");
  return result.data;
}

function sanitizeProblemHtml(html: string) {
  const safeTags = new Set([
    "p", "strong", "b", "em", "i", "ul", "ol", "li", "pre", "code",
    "blockquote", "br", "hr", "div", "span", "sub", "sup", "table",
    "thead", "tbody", "tr", "th", "td", "h1", "h2", "h3", "h4", "h5", "h6",
  ]);

  return html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(script|style|iframe|object|svg|math)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, "")
    .replace(/<(script|style|iframe|object|svg|math)\b[^>]*\/?>/gi, "")
    .replace(/<\/?([a-z][a-z0-9-]*)\b[^>]*>/gi, (tag, name: string) => {
      const normalizedName = name.toLowerCase();
      if (!safeTags.has(normalizedName)) return "";
      return tag.startsWith("</")
        ? `</${normalizedName}>`
        : `<${normalizedName}>`;
    });
}

function getDifficulty(value: string): ProblemDifficulty | null {
  const normalized = value[0]?.toUpperCase() + value.slice(1).toLowerCase();
  return PROBLEM_DIFFICULTIES.includes(normalized as ProblemDifficulty)
    ? (normalized as ProblemDifficulty)
    : null;
}

export async function POST(request: Request) {
  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  if (!isSearchFilters(input)) {
    return NextResponse.json(
      { error: "Choose a valid difficulty, language, and up to eight LeetCode topics." },
      { status: 400 },
    );
  }

  const difficultyEnum = input.difficulty.toUpperCase();
  const filters = {
    filterCombineType: "ALL",
    difficultyFilter: { difficulties: [difficultyEnum] },
    ...(input.tags.length
      ? { topicFilter: { topicSlugs: input.tags } }
      : {}),
  };

  try {
    const listData = await leetCodeRequest<{
      problemsetQuestionListV2?: { questions?: ListedQuestion[] };
    }>(PROBLEM_LIST_QUERY, { filters, limit: 50, skip: 0 });
    const questions = (listData.problemsetQuestionListV2?.questions ?? []).filter(
      (question) => !question.paidOnly,
    );

    if (!questions.length) {
      return NextResponse.json(
        { error: "No free LeetCode problems match those filters. Try fewer topics." },
        { status: 404 },
      );
    }

    const selected = questions[Math.floor(Math.random() * questions.length)];
    const detailData = await leetCodeRequest<{
      question?: QuestionDetails | null;
    }>(PROBLEM_DETAIL_QUERY, { titleSlug: selected.titleSlug });
    const question = detailData.question;
    if (!question) throw new Error("LeetCode did not return the selected problem details.");

    const difficulty = getDifficulty(question.difficulty);
    if (!difficulty) throw new Error("LeetCode returned an unsupported difficulty.");

    const templates = new Map(
      question.codeSnippets.map((snippet) => [snippet.langSlug, snippet.code]),
    );
    const codeTemplates = Object.fromEntries(
      Object.entries(LANGUAGE_SLUGS).map(([language, slug]) => [
        language,
        templates.get(slug) ?? "",
      ]),
    ) as Record<InterviewLanguage, string>;
    if (!codeTemplates[input.language]) {
      return NextResponse.json(
        { error: `LeetCode does not provide a ${input.language} starter for this problem.` },
        { status: 422 },
      );
    }

    const problem: LeetCodeProblem = {
      questionId: question.questionId,
      questionFrontendId: question.questionFrontendId,
      title: question.title,
      titleSlug: question.titleSlug,
      difficulty,
      content: sanitizeProblemHtml(question.content),
      topicTags: question.topicTags,
      codeTemplates,
      executionSpec: parseProblemExecutionSpec(
        question.content,
        question.metaData,
      ),
    };
    return NextResponse.json({ problem });
  } catch (error) {
    console.error("Could not fetch a LeetCode problem:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? `Could not reach LeetCode: ${error.message}`
            : "Could not reach LeetCode. Please try again.",
      },
      { status: 502 },
    );
  }
}
