# FDE Prep

A personal practice site for Forward Deployed Engineer interviews. It follows a 26-week study plan and opens a new set of coding problems and hands-on tasks every Monday, so the question each week is "what do I do now?" and not "what should I study?".

![The problem workspace with a solved problem](docs/workspace.png)

## What it does

- **Weekly curriculum.** 26 weeks in four phases: coding re-entry, patterns and practical building, design and AI systems, then interview loops. Future weeks stay locked until their Monday.
- **In-browser Python.** Solutions run against test cases entirely in the browser using [Pyodide](https://pyodide.org) (CPython compiled to WebAssembly) inside a web worker. There is no backend, and an infinite loop is stopped after 10 seconds by terminating the worker.
- **FDE-flavored problems.** Problems are framed as the work the role involves, such as cleaning a customer's export, reconciling two ledgers during a migration, or parsing a legacy config format. Each has hints, a reference solution, and for early weeks a "Coming from Java" note.
- **Progress tracking.** Solved problems, finished build and design tasks, and a daily streak are saved in the browser's local storage. Code drafts are saved as you type.

## Tech stack

- [Next.js](https://nextjs.org) (App Router) with TypeScript and Tailwind CSS
- [CodeMirror 6](https://codemirror.net) for the editor
- Pyodide for running Python, served from the site itself
- Every page is statically prerendered, so it deploys anywhere that hosts Next.js

## Run it locally

Requires Node.js 20 or newer.

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run verify` | Run every problem's reference solution against its tests (needs Python 3) |

## How it is organized

```
content/problems/     One JSON file per problem: statement, starter code, tests, hints, solution
public/harness.py     Python test harness, shared by the browser runner and the verify script
public/py-worker.js   Web worker that loads Pyodide and runs the harness
scripts/              verify_problems.py and the Pyodide copy step
src/data/             The 26-week curriculum and the problem index
src/lib/              Progress store, week scheduling, and the runner client
src/components/       Dashboard, week view, roadmap, workspace, settings
src/app/              Routes: /, /roadmap, /week/[n], /problems/[id], /settings
```

## Add a problem

1. Create `content/problems/<id>.json`, using an existing file as a template. The `id` must match the file name, and `week` decides when it unlocks.
2. Import it in `src/data/problems.ts`.
3. Run `npm run verify`. It fails if the reference solution does not pass every test, or if the starter code already does.

Test arguments and expected values are JSON. The harness normalizes return values through JSON before comparing, so a function may return a tuple where a list is expected.

## Deploy

The site has no server-side state, so the simplest route is [Vercel](https://vercel.com/new): import this repository and accept the defaults.
