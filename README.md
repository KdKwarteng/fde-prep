# FDE Prep

A personal practice site for Forward Deployed Engineer (FDE) interviews. It follows a 26-week study plan and opens a new set of coding problems and hands-on tasks every Monday, so the question each week is "what do I do now?" and not "what should I study?".

![The problem workspace with a solved problem](docs/workspace.png)

## Contents

- [What this project is for](#what-this-project-is-for)
- [Features](#features)
- [Tech stack](#tech-stack)
- [Run it locally](#run-it-locally)
- [How the code works](#how-the-code-works)
- [Project layout](#project-layout)
- [Add a problem](#add-a-problem)
- [Deploy](#deploy)
- [Limitations and next steps](#limitations-and-next-steps)

## What this project is for

Forward Deployed Engineers embed with customers and build software against messy, real-world problems. Their interviews reflect that. Compared with a standard software engineering loop, they put less weight on puzzle problems and more on four things:

1. **Practical coding** in Python: parsing, cleaning data, calling APIs.
2. **System and data design** for enterprise environments.
3. **Decomposition**: structuring a vague customer problem out loud.
4. **Customer skills**: scoping, explaining tradeoffs, staying calm when things break.

General practice sites cover only the first item, and they offer thousands of problems with no schedule. This site is the opposite. It is a single fixed curriculum, built for one person returning to hands-on coding after time away, that covers all four areas and releases work one week at a time.

The plan has four phases:

| Phase | Weeks | Goal |
| --- | --- | --- |
| 1. Coding re-entry | 1 to 6 | Write Python without looking things up and solve easy problems in under 15 minutes |
| 2. Patterns and practical building | 7 to 14 | Handle most medium problems and ship a data pipeline and a first LLM feature |
| 3. Design, AI systems, and a portfolio project | 15 to 20 | Deploy one project that looks like real FDE work |
| 4. Interview loops and applications | 21 to 26 | Timed mocks every week and applications out |

Each week has three parts: a set of coding problems solved on the site, a **build task** done in your own environment (for example "build a small FastAPI service with 3 endpoints"), and a **design or customer task** (for example a written decomposition case). The site runs and grades the coding problems, and tracks the other two as checkboxes.

## Features

- **Weekly dashboard.** The home page shows the current week's problems and tasks, with totals for problems solved, tasks finished, and your daily streak.
- **Locked future weeks.** A week opens on its Monday. The roadmap page shows all 26 weeks with a progress bar for each one that is open.
- **Python or Java.** Pick a language on any problem page or in settings. Both run against the same test cases entirely in the browser, with no server to send code to. Each language keeps its own saved code, hints, and reference solution.
- **FDE-style problems.** Problems are framed as the work the role involves, such as cleaning a customer's export, reconciling two ledgers during a migration, or parsing a legacy config format.
- **Graduated help.** Each problem has hints that reveal one at a time. The reference solution unlocks after you solve the problem or use every hint. Week 1 problems include a "Coming from Java" note.
- **Saved work.** Code drafts are saved as you type, and progress survives a page reload.
- **Optional sign-in and sync.** With a Supabase project connected, "Sign in with GitHub" stores progress in your account so it follows you between devices. Without one, the site runs local-only.
- **Settings.** Change the start date, unlock every week, or reset all progress.

## Tech stack

| Piece | Choice | Why |
| --- | --- | --- |
| Framework | [Next.js](https://nextjs.org) App Router, TypeScript | Static prerendering of every page, with typed routes and data |
| Styling | Tailwind CSS | Small design-token set in `globals.css`, with light and dark themes that follow the system |
| Editor | [CodeMirror 6](https://codemirror.net) | Lightweight, with Python syntax highlighting |
| Python runtime | [Pyodide](https://pyodide.org) | CPython compiled to WebAssembly, so real Python runs in the browser |
| Java runtime | [CheerpJ](https://cheerpj.com) 5 (Java 17) | A JVM compiled to WebAssembly, so real Java compiles and runs in the browser. Free community license, which asks for a "Built with CheerpJ" credit |
| Storage | Browser `localStorage` | Works with no backend, and stays the fast local copy when sync is on |
| Auth and sync | [Supabase](https://supabase.com) with GitHub OAuth | Optional. Hosted Postgres with row-level security, called straight from the browser |
| CI | GitHub Actions | Verifies problems, runs unit tests, lints, and builds on every push |

## Run it locally

Requires Node.js 20 or newer. Python 3 and a Java 17+ JDK are needed only for `npm run verify`.

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run verify` | Run every problem's Python and Java reference solutions against its tests |
| `npm run verify:java` | Rebuild `public/java/harness.jar` and check only the Java versions |
| `npm test` | Unit tests for the sync logic |

`dev` and `build` first run two small scripts. `scripts/copy-pyodide.mjs` copies the Pyodide runtime from `node_modules` into `public/pyodide/`, and `scripts/build-problem-index.mjs` builds the problem index. Both outputs are git-ignored.

## How the code works

The app has no server code of its own. Everything below happens in the browser, on top of pages that were rendered to static HTML at build time. The one optional outside service is Supabase, which the browser calls directly for sign-in and sync.

### 1. Content is data, not code

The curriculum and the problems are plain data, kept apart from the interface.

- `src/data/curriculum.ts` holds the four phases and all 26 weeks. Each week has a title, a coding focus, a build task, and a design or customer task.
- `content/problems/*.json` holds one file per coding problem.
- `scripts/build-problem-index.mjs` combines those files into one generated JSON index before each `dev` or `build`.
- `src/data/problems.ts` imports that index, gives it a `Problem` type, and exposes `getProblem(id)` and `problemsForWeek(n)`.

A problem file looks like this (shortened):

```json
{
  "id": "w01-chunk-records",
  "week": 1,
  "order": 3,
  "title": "Chunk records into batches",
  "difficulty": "easy",
  "topic": "Slicing",
  "functionName": "chunk",
  "description": "Markdown problem statement...",
  "starterCode": "def chunk(items, size):\n    pass\n",
  "tests": [
    { "args": [[1, 2, 3, 4, 5], 2], "expected": [[1, 2], [3, 4], [5]] }
  ],
  "hints": ["First hint...", "Second hint..."],
  "javaTip": "Optional note for Java developers",
  "solution": "def chunk(items, size):\n    return [...]\n",
  "java": {
    "methodName": "chunk",
    "starterCode": "import java.util.*;\n\nclass Solution {\n    static <T> List<List<T>> chunk(List<T> items, int size) {...}\n}\n",
    "solution": "...",
    "hints": ["Java-specific hint..."]
  }
}
```

`week` decides when the problem unlocks, and `order` sets its position within the week. Each test calls `functionName` with `args` and compares the return value to `expected`. The optional `java` block holds the Java version. It reuses the same `tests`, so both languages are checked against exactly the same cases.

### 2. Pages and routing

Routes live in `src/app/`:

| Route | File | Shows |
| --- | --- | --- |
| `/` | `page.tsx` | Dashboard for the current week |
| `/roadmap` | `roadmap/page.tsx` | All 26 weeks grouped by phase |
| `/week/[n]` | `week/[n]/page.tsx` | One week's problems and tasks |
| `/problems/[id]` | `problems/[id]/page.tsx` | The problem workspace |
| `/settings` | `settings/page.tsx` | Start date, unlock, reset |

The page files are server components. They look up static data and hand it to a client component from `src/components/`. The two dynamic routes export `generateStaticParams`, so Next.js prerenders a page for every week and every problem at build time.

Anything that depends on the visitor, meaning their progress or today's date, cannot be known at build time. Those parts are client components that render a placeholder first and fill in once the page is running in the browser.

### 3. Weekly unlocking

`src/lib/schedule.ts` contains the date logic as small pure functions.

`currentWeekNumber(startDate, today)` counts the whole days between the start date and today, divides by 7, and clamps the result to the range 1 to 26. Before the start date it returns week 1, so there is always something to work on. Dates are handled as `YYYY-MM-DD` strings and converted to UTC midnight for the arithmetic, which keeps daylight saving changes from shifting a week boundary.

`src/components/LockGate.tsx` wraps the week and problem pages. It renders its children only if the week number is at or below the current week, or if "Unlock every week" is on in Settings. Otherwise it shows a lock screen with the date the week opens.

The lock is a pacing aid and not a security boundary. All content ships to the browser, which is fine for a personal study tool.

### 4. Progress storage

`src/lib/progress.ts` is a small store over `localStorage`. It keeps one JSON object under the key `fde-prep:progress:v1`:

```ts
type Progress = {
  startDate: string;                 // first Monday of the plan
  unlockAll: boolean;                // Settings toggle
  solved: Record<string, string>;    // problem id -> date first solved
  tasks: Record<string, boolean>;    // "w3-build" -> done
  activity: Record<string, number>;  // "2026-11-16" -> items finished that day
};
```

Components read it with the `useProgress()` hook, which is built on React's `useSyncExternalStore`. That hook does two useful things here. On the server and during the first browser render it returns an empty default, so the server HTML and the browser's first render match. After that it returns the stored value and re-renders every subscribed component whenever the store changes, including changes made in another tab.

Writes go through `progressActions` (`markSolved`, `toggleTask`, `setStartDate`, `setUnlockAll`, `reset`). Marking a problem solved or ticking a task also adds one to today's entry in `activity`. `currentStreak()` in `schedule.ts` walks backward from today through `activity` and counts consecutive days.

Code drafts are stored separately, one key per problem (`fde-prep:draft:<id>`), so typing in the editor does not rewrite the whole progress object.

### 5. Running a solution

This is the core of the site. Four files are involved:

```
Workspace.tsx  ->  runner.ts  ->  py-worker.js  ->  harness.py
 (the page)      (page side)     (web worker)      (Python)
```

Step by step, when you click **Run tests**:

1. **`src/components/Workspace.tsx`** calls `runTests(code, functionName, tests)` with the editor's contents.
2. **`src/lib/runner.ts`** owns a single web worker, created on first use. It posts the code and tests to the worker and returns a promise for the report. Opening a problem page calls `warmUpPython()`, which starts the worker early so Python is already downloading while you read the problem.
3. **`public/py-worker.js`** runs off the main thread. On its first message it loads Pyodide from `/pyodide/`, fetches `/harness.py`, writes it into Pyodide's in-memory file system, and imports it. It then posts a `started` message and calls `harness.run_tests(...)`.
4. **`public/harness.py`** is ordinary Python. It executes your code with `exec` into a fresh namespace, looks up the function by name, and calls it once per test. For each test it captures anything you print, times the call, and catches any exception. It returns a JSON report.
5. The worker posts the report back. `runner.ts` resolves its promise, and `Workspace.tsx` renders one row per test showing the call, the expected value, what your code returned, and any printed output or error. If every test passed, it calls `progressActions.markSolved`.

A few details in that flow are worth knowing:

- **Why a worker.** Python execution is synchronous. On the main thread, a slow solution would freeze the page, and an infinite loop would freeze it for good. In a worker, the page stays responsive.
- **Stopping infinite loops.** When `runner.ts` receives `started`, it begins a 10-second timer. If no report arrives in time, it calls `worker.terminate()`, reports a timeout, and creates a fresh worker on the next run. Terminating the worker is the only reliable way to stop running WebAssembly from outside.
- **Comparing results.** The harness passes each return value through `json.dumps` and `json.loads` before comparing it to `expected`. This makes a tuple equal to a list and turns a set into a sorted list, so tests check the answer and not the container type.
- **Readable errors.** The harness compiles your code under the file name `solution.py` and filters tracebacks down to frames from that file. You see `line 4, in chunk` and the error, without the harness's own frames.
- **Fresh inputs.** Arguments are deep-copied for each test, so a solution that mutates its input cannot affect later tests.
- **Self-hosted runtime.** Pyodide is served from the site's own `/pyodide/` folder and not from a CDN, so the site keeps working if a third-party host is down or blocked.

### 6. Sign-in and sync

Sync is optional and layered on top of the local store, which stays the copy the interface reads from. Three files are involved:

```
sync.ts            Supabase wiring: login, the database calls, React hook
sync-engine.ts     The sync rules, with no browser or Supabase dependencies
progress.ts        The local store from section 4
```

**Configuration.** `sync.ts` reads `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. If either is missing, `syncConfigured` is false, no sign-in button renders, and nothing else in this section runs.

**Signing in.** `syncActions.signIn()` sends the browser to GitHub through Supabase. GitHub sends it back with a session, which the Supabase client stores and refreshes on its own. `onAuthStateChange` then reports the signed-in user, and `sync.ts` hands the user's ID to the engine.

**The database.** There is one table, `progress`, with one row per user: `user_id`, a `data` column holding the whole progress object as JSON, and `updated_at`. The browser reads and writes it directly using a public key. What keeps users apart is row-level security in `supabase/schema.sql`: Postgres itself rejects any read or write where `user_id` is not the signed-in user.

**The rules**, all in `SyncEngine`:

| Moment | What happens |
| --- | --- |
| First sign-in on a browser | Local progress is merged with the account's and the result is saved to both. Guest progress is never lost by signing in. |
| A local change while signed in | Marked as unsaved, then saved after a 1.5 second pause, so a burst of changes becomes one request. |
| The tab regains focus | The server copy is fetched. With nothing unsaved locally it replaces the local copy, so an un-ticked task or a reset on another device carries over. With unsaved changes, the two are merged. |
| The tab is hidden | Any unsaved change is flushed immediately. |
| A different account signs in on the same browser | The local copy is replaced, never merged, so one person's progress cannot leak into another's account. |
| A save fails | The change stays marked unsaved and is retried on the next flush. The header shows "Sync failed". |

**Merging** (`mergeProgress`) takes the union of solved problems and finished tasks, keeps the earliest solve date, and takes the larger activity count per day.

**Why the engine is separate.** `sync-engine.ts` talks to three small interfaces (`LocalStore`, `RemoteStore`, `SyncMemory`) and never imports Supabase or touches `window`. `sync-engine.test.ts` supplies in-memory fakes and simulates two devices sharing one account, which covers the rules above without a network or a browser.

Setup steps are in [docs/sync-setup.md](docs/sync-setup.md).

### 6b. Running Java

Java follows the same shape as Python, with a different runtime.

1. **`src/lib/java-runner.ts`** loads the CheerpJ loader script from CheerpJ's CDN the first time you pick Java, starts a Java 17 runtime, and loads `public/java/harness.jar`. The first run downloads the runtime, so it takes longer than later runs.
2. **The harness jar** is built from `java/src/dev/fdeprep/` by `scripts/build-java-harness.sh` and committed, because Vercel's build machines have no JDK. `Harness.run(code, methodName, testsJson)` compiles your `class Solution` in memory with the JDK's own compiler (`javax.tools`), finds the method by name, and runs each test.
3. **Converting JSON to Java types.** Test inputs are JSON, but Java methods have types. `Convert.java` reads the method's generic signature with reflection and builds the matching values: `int[]`, `List<String>`, `Map<String, List<String>>`, or a small class like `ListNode` whose fields are filled by name. Return values go back to JSON the same way, and `Convert.same` compares them to `expected` the way the Python harness does (a `Set` becomes a sorted list, `2` equals `2.0`).
4. **Infinite loops.** Each test runs on its own thread with a 10-second deadline. CheerpJ can't kill a thread, so a timed-out run tells you to reload the page if later runs stay slow.
5. **Compiler fallback.** If a runtime ever ships without `javac`, the harness falls back to the Eclipse compiler in `public/java/ecj.jar` (EPL-2.0), which CheerpJ only downloads if it is needed.

### 7. Checking the problems themselves

`scripts/verify_problems.py` loads the same `public/harness.py` that the browser uses and, for every problem file, checks that:

- all required fields are present and `id` matches the file name,
- the reference solution passes every test, and
- the starter code does not already pass every test.

Because the script and the browser share one harness, a problem that verifies locally behaves the same way on the site. `java/src/dev/fdeprep/VerifyCli.java` does the same for every `java` block, using the same `harness.jar` the browser loads, and also checks it with the Eclipse compiler fallback when run with `-Dfdeprep.compiler=ecj`. CI runs this script on every push, along with the unit tests, lint, and a production build.

## Project layout

```
content/problems/         One JSON file per problem
public/
  harness.py              Python test harness (browser and verify script)
  py-worker.js            Web worker that loads Pyodide and runs the harness
  pyodide/                Pyodide runtime, copied at build time (git-ignored)
  java/harness.jar        Java test harness, built from java/src (committed)
  java/ecj.jar            Eclipse Java compiler, used only as a fallback
java/src/dev/fdeprep/     Java harness source: Harness, Convert, Json, VerifyCli
scripts/
  copy-pyodide.mjs        Copies Pyodide out of node_modules
  build-problem-index.mjs Combines content/problems into one index
  verify_problems.py      Checks every problem's solution against its tests
  build-java-harness.sh   Compiles java/src into public/java/harness.jar
src/
  app/                    Routes and the root layout
  components/
    Dashboard.tsx         Home page: stats and the current week
    WeekView.tsx          A week's problem list and task checkboxes
    Roadmap.tsx           All weeks with lock state and progress bars
    LockGate.tsx          Hides weeks that have not opened yet
    Workspace.tsx         Problem statement, editor, and test results
    Settings.tsx          Start date, unlock toggle, reset
    AuthButton.tsx        Sign-in button and sync status in the header
    AccountSettings.tsx   Account section of the settings page
    DifficultyBadge.tsx   Easy, medium, hard label
  data/
    curriculum.ts         Phases and the 26 weeks
    problems.ts           Typed index over content/problems
  lib/
    progress.ts           localStorage store and hooks
    sync.ts               Supabase sign-in and database calls
    sync-engine.ts        Sync rules, tested in sync-engine.test.ts
    schedule.ts           Week and streak date math
    runner.ts             Page-side client for the Python worker
    java-runner.ts        Loads CheerpJ and calls the Java harness
supabase/schema.sql       Table and row-level security policies for sync
docs/sync-setup.md        How to turn on sign-in and sync
.github/workflows/ci.yml  Verify, test, lint, build
```

## Add a problem

1. Create `content/problems/<id>.json`, using an existing file as a template. The `id` must match the file name. By convention ids start with the week, as in `w03-...`.
2. Optionally add a `java` block with `methodName`, `starterCode`, `solution`, and `hints`. Problems without one show the Java button disabled.
3. Run `npm run verify`.

The problem index is rebuilt from the folder each time you run `dev` or `build`, so there is nothing to register by hand.

Test arguments and expected values must be valid JSON. That means no tuples, sets, or non-string dictionary keys in `expected`. Return a list or a string-keyed dictionary from the reference solution.

## Deploy

The simplest route is [Vercel](https://vercel.com/new): import this repository and accept the defaults. The `prebuild` script copies Pyodide into place during the build.

To turn on sign-in and sync, follow [docs/sync-setup.md](docs/sync-setup.md) and add the two Supabase environment variables to the Vercel project.

## Limitations and next steps

- **Sync needs setup.** Until a Supabase project is connected, progress lives in one browser and is lost if you clear site data.
- **Code drafts do not sync.** Only progress does. Drafts stay in the browser where you typed them.
- **Whole-object sync.** Progress is saved as one JSON document, and the newest save wins when two devices change it at the same moment. That is fine for one person, and would need per-field timestamps for anything collaborative.
- **Problem sets exist for weeks 1 to 6.** Later weeks show their focus topic and tasks, with problems still to be written.
- **Java needs a CDN.** CheerpJ's license requires loading it from their CDN, so Java (unlike Python) does not work offline or where `cjrtnc.leaningtech.com` is blocked.
- **Java problem text is written for Python.** The description names the Python function, and the Java panel tells you the Java method name. The inputs and outputs are the same.
- **Standard library only.** Solutions can import anything in Python's standard library. Third-party packages such as `numpy` are not loaded.
- **Single-function problems.** Every problem tests one function with JSON inputs and outputs, so linked lists are represented as nested dictionaries. Class-based problems, such as an LRU cache, will need a small extension to the harness.
