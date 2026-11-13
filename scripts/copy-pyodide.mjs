// Copies the Pyodide runtime from node_modules into public/pyodide so the site
// serves Python itself and does not depend on a third-party CDN.
// Runs automatically before `npm run dev` and `npm run build`.
import { cpSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = join(root, "node_modules", "pyodide");
const target = join(root, "public", "pyodide");
const files = ["pyodide.mjs", "pyodide.asm.mjs", "pyodide.asm.wasm", "python_stdlib.zip", "pyodide-lock.json"];

mkdirSync(target, { recursive: true });
for (const file of files) cpSync(join(source, file), join(target, file));
console.log(`Copied Pyodide runtime to public/pyodide (${files.length} files)`);
