// Built from content/problems/*.json by scripts/build-problem-index.mjs.
import generated from "./problems.generated.json";

export type TestCase = { args: unknown[]; expected: unknown };

export type Problem = {
  id: string;
  week: number;
  order: number;
  title: string;
  difficulty: "easy" | "medium" | "hard";
  topic: string;
  functionName: string;
  description: string;
  starterCode: string;
  tests: TestCase[];
  hints: string[];
  javaTip?: string;
  solution: string;
};

export const problems = generated as Problem[];

export function getProblem(id: string): Problem | undefined {
  return problems.find((problem) => problem.id === id);
}

export function problemsForWeek(week: number): Problem[] {
  return problems.filter((problem) => problem.week === week);
}
