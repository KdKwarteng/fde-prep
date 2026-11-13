export type Phase = {
  id: number;
  name: string;
  goal: string;
};

export type Week = {
  number: number;
  phase: number;
  title: string;
  coding: string;
  build: string;
  customer: string;
};

/** First Monday of the plan. Learners can change this in Settings. */
export const DEFAULT_START_DATE = "2026-11-16";

export const phases: Phase[] = [
  {
    id: 1,
    name: "Coding re-entry",
    goal: "Write Python without looking things up and solve easy problems in under 15 minutes.",
  },
  {
    id: 2,
    name: "Patterns and practical building",
    goal: "Handle most medium problems in 25 to 30 minutes and ship a data pipeline and a first LLM feature.",
  },
  {
    id: 3,
    name: "Design, AI systems, and a portfolio project",
    goal: "Deploy one project that looks like real FDE work and get comfortable in a 45-minute design round.",
  },
  {
    id: 4,
    name: "Interview loops and applications",
    goal: "Run timed mocks every week and get applications out, warm-up companies first.",
  },
];

const w = (
  number: number,
  phase: number,
  title: string,
  coding: string,
  build: string,
  customer: string,
): Week => ({ number, phase, title, coding, build, customer });

export const weeks: Week[] = [
  w(1, 1, "Python for Java developers", "Strings, lists, dicts, sets, comprehensions, slicing, unpacking", "Set up your environment and write a CLI that parses a CSV and prints summary stats", "Write one page on why you want FDE over SWE"),
  w(2, 1, "Arrays and hashing", "Arrays and hashing", "Call a public REST API, handle errors and pagination, save results to JSON", "Read two FDE job listings and list the skills you lack"),
  w(3, 1, "Two pointers and sliding window", "Two pointers and sliding window", "Load that JSON into SQLite and answer 5 questions in SQL", "Decomposition case 1: untimed, written"),
  w(4, 1, "Stacks, queues, and parsing", "Stacks, queues, and string parsing", "Build a small FastAPI service with 3 endpoints and tests", "Sketch the design of a system you own at work in one page"),
  w(5, 1, "Binary search and sorting", "Binary search and sorting, first mediums", "Add auth and input validation to the service", "Decomposition case 2: 45 minutes, spoken aloud and recorded"),
  w(6, 1, "Linked lists and recursion", "Linked lists and recursion, plus a timed review set", "Dockerize the service and deploy it somewhere free", "Checkpoint: one timed 60-minute mock coding screen"),
  w(7, 2, "Holiday review week", "Light week: redo 6 missed problems", "None this week", "Draft 3 behavioral stories from past roles"),
  w(8, 2, "Trees", "Traversals, BST, depth-first and breadth-first search", "Write an ETL script: pull from an API, clean, load to Postgres", "Design a URL shortener as a warm-up"),
  w(9, 2, "Graphs", "BFS, DFS, topological sort", "Add scheduling, retries, and logging to the ETL", "Decomposition case 3"),
  w(10, 2, "Heaps and intervals", "Heaps and intervals", "Advanced SQL: window functions, CTEs, query plans", "Design a rate limiter"),
  w(11, 2, "Backtracking", "Backtracking", "First LLM app: a script that calls a model API with structured output", "Decomposition case 4, with a friend playing the customer"),
  w(12, 2, "Dynamic programming, 1D", "Dynamic programming, 1D", "Basic RAG: chunk documents, embed, retrieve, answer", "Design a job queue with retries"),
  w(13, 2, "Dynamic programming, 2D", "Dynamic programming, 2D, and greedy", "Add an eval set of 20 questions and score your RAG app", "Write a tradeoff memo: fine-tuning vs. prompting vs. RAG"),
  w(14, 2, "Practical systems set", "Log parser, LRU cache, in-memory key-value store", "Give the RAG app a small web front end", "Checkpoint: one mock coding round and one mock decomposition round"),
  w(15, 3, "Design framework", "3 mixed problems for maintenance", "Project: write a one-page scope document as if for a client", "Design framework: requirements, data model, APIs, scale, failure. Decomposition case 5"),
  w(16, 3, "Data pipelines", "3 mixed problems for maintenance", "Project: ingest and model the data", "Batch vs. streaming, schemas, data quality. Practice a 5-minute non-technical explanation of your project"),
  w(17, 3, "Integrations", "3 mixed problems for maintenance", "Project: build the core agent or retrieval workflow", "Auth, SSO, webhooks, working inside a customer's cloud. Role-play a scope change"),
  w(18, 3, "LLM system design", "3 mixed problems for maintenance", "Project: add evals and observability", "RAG at scale, guardrails, cost, latency. Decomposition case 6"),
  w(19, 3, "Agents", "3 mixed problems for maintenance", "Project: deploy it and write the README", "Tool use, multi-step workflows, human escalation. Role-play a production incident"),
  w(20, 3, "Design mocks", "3 mixed problems for maintenance", "Project: record a 3-minute demo video", "Two timed mock design rounds. Finish all 8 behavioral stories"),
  w(21, 4, "Resume and repos", "1 mock coding round", "Rewrite your resume and LinkedIn around customer-facing engineering, and polish both repos", "1 mock decomposition round. Build a list of 15 to 20 openings"),
  w(22, 4, "Palantir-style prep", "1 mock coding round", "Study the Palantir decomposition style and Foundry basics", "1 mock design round. Apply to 5 warm-up companies and ask for referrals"),
  w(23, 4, "Take-home practice", "Maintenance problems", "Build a small tool on a model API in 5 hours, then present it", "1 take-home walkthrough and 1 client role-play. Apply to Microsoft and Google"),
  w(24, 4, "Weak-spot week", "Redo every problem type you missed in mocks", "None this week", "1 full mock loop of 3 rounds in one sitting. Apply to Palantir and OpenAI"),
  w(25, 4, "Behavioral polish", "Maintenance problems", "None this week", "Why FDE, why this company, conflict and failure stories. 1 behavioral and 1 decomposition mock"),
  w(26, 4, "Maintain while interviewing", "3 problems and 1 design a week while loops run", "None this week", "Review every real loop afterward and adjust"),
];

export const TOTAL_WEEKS = weeks.length;

export function getWeek(number: number): Week | undefined {
  return weeks.find((week) => week.number === number);
}

export function getPhase(id: number): Phase {
  return phases.find((phase) => phase.id === id)!;
}
