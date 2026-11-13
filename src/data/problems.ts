import w0101 from "../../content/problems/w01-clean-customer-names.json";
import w0102 from "../../content/problems/w01-count-status-codes.json";
import w0103 from "../../content/problems/w01-chunk-records.json";
import w0104 from "../../content/problems/w01-parse-settings.json";
import w0105 from "../../content/problems/w01-invert-tag-index.json";
import w0106 from "../../content/problems/w01-top-search-terms.json";
import w0201 from "../../content/problems/w02-pair-for-budget.json";
import w0202 from "../../content/problems/w02-first-repeated-ticket.json";
import w0203 from "../../content/problems/w02-reconcile-ledgers.json";
import w0204 from "../../content/problems/w02-group-scrambled-skus.json";
import w0205 from "../../content/problems/w02-longest-active-streak.json";
import w0206 from "../../content/problems/w02-windows-matching-target.json";

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

// To add a problem: drop a JSON file in content/problems, import it here,
// and run `npm run verify` to check its reference solution against its tests.
export const problems = (
  [w0101, w0102, w0103, w0104, w0105, w0106, w0201, w0202, w0203, w0204, w0205, w0206] as Problem[]
).sort((a, b) => a.week - b.week || a.order - b.order);

export function getProblem(id: string): Problem | undefined {
  return problems.find((problem) => problem.id === id);
}

export function problemsForWeek(week: number): Problem[] {
  return problems.filter((problem) => problem.week === week);
}
