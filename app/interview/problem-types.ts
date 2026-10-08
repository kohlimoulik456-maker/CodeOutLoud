export const INTERVIEW_LANGUAGES = ["JavaScript", "Python", "C++", "Java"] as const;
export type InterviewLanguage = (typeof INTERVIEW_LANGUAGES)[number];

export const PROBLEM_DIFFICULTIES = ["Easy", "Medium", "Hard"] as const;
export type ProblemDifficulty = (typeof PROBLEM_DIFFICULTIES)[number];

export const LEETCODE_TOPIC_TAGS = [
  { name: "Array", slug: "array" },
  { name: "Backtracking", slug: "backtracking" },
  { name: "Binary Search", slug: "binary-search" },
  { name: "Binary Search Tree", slug: "binary-search-tree" },
  { name: "Binary Tree", slug: "binary-tree" },
  { name: "Bit Manipulation", slug: "bit-manipulation" },
  { name: "Breadth-First Search", slug: "breadth-first-search" },
  { name: "Depth-First Search", slug: "depth-first-search" },
  { name: "Design", slug: "design" },
  { name: "Divide and Conquer", slug: "divide-and-conquer" },
  { name: "Dynamic Programming", slug: "dynamic-programming" },
  { name: "Graph", slug: "graph" },
  { name: "Greedy", slug: "greedy" },
  { name: "Hash Table", slug: "hash-table" },
  { name: "Heap (Priority Queue)", slug: "heap-priority-queue" },
  { name: "Linked List", slug: "linked-list" },
  { name: "Math", slug: "math" },
  { name: "Matrix", slug: "matrix" },
  { name: "Memoization", slug: "memoization" },
  { name: "Monotonic Stack", slug: "monotonic-stack" },
  { name: "Prefix Sum", slug: "prefix-sum" },
  { name: "Queue", slug: "queue" },
  { name: "Recursion", slug: "recursion" },
  { name: "Sliding Window", slug: "sliding-window" },
  { name: "Sorting", slug: "sorting" },
  { name: "Stack", slug: "stack" },
  { name: "String", slug: "string" },
  { name: "Tree", slug: "tree" },
  { name: "Trie", slug: "trie" },
  { name: "Two Pointers", slug: "two-pointers" },
  { name: "Union Find", slug: "union-find" },
] as const;

export type LeetCodeProblem = {
  questionId: string;
  questionFrontendId: string;
  title: string;
  titleSlug: string;
  difficulty: ProblemDifficulty;
  content: string;
  topicTags: Array<{ name: string; slug: string }>;
  codeTemplates: Record<InterviewLanguage, string>;
};

export type ProblemSearchFilters = {
  difficulty: ProblemDifficulty;
  language: InterviewLanguage;
  tags: string[];
};
