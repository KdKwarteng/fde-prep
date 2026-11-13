// Combines every file in content/problems into src/data/problems.generated.json,
// so adding a problem is just adding a file. Runs before `npm run dev`,
// `npm run build`, and `npm run lint`.
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = join(root, "content", "problems");
const target = join(root, "src", "data", "problems.generated.json");

const problems = readdirSync(source)
  .filter((file) => file.endsWith(".json"))
  .map((file) => JSON.parse(readFileSync(join(source, file), "utf8")))
  .sort((a, b) => a.week - b.week || a.order - b.order);

mkdirSync(dirname(target), { recursive: true });
writeFileSync(target, JSON.stringify(problems));
console.log(`Indexed ${problems.length} problems`);
