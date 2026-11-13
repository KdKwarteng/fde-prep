"use client";

import { python } from "@codemirror/lang-python";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import Markdown from "react-markdown";
import type { Problem } from "@/data/problems";
import { clearDraft, loadDraft, progressActions, saveDraft, useProgress } from "@/lib/progress";
import { runTests, warmUpPython, type RunReport, type RunStatus } from "@/lib/runner";
import { DifficultyBadge } from "./DifficultyBadge";

const CodeMirror = dynamic(() => import("@uiw/react-codemirror"), {
  ssr: false,
  loading: () => <div className="h-full animate-pulse bg-surface" />,
});

function subscribeToScheme(listener: () => void) {
  const query = window.matchMedia("(prefers-color-scheme: dark)");
  query.addEventListener("change", listener);
  return () => query.removeEventListener("change", listener);
}

function usePrefersDark(): boolean {
  return useSyncExternalStore(
    subscribeToScheme,
    () => window.matchMedia("(prefers-color-scheme: dark)").matches,
    () => false,
  );
}

const show = (value: unknown) => JSON.stringify(value);

function formatCall(functionName: string, args: unknown[]): string {
  return `${functionName}(${args.map(show).join(", ")})`;
}

function Results({ problem, report }: { problem: Problem; report: RunReport }) {
  if (report.error) {
    return (
      <pre className="whitespace-pre-wrap rounded-lg border border-danger p-3 font-mono text-sm text-danger">
        {report.error}
      </pre>
    );
  }
  const passed = report.results.filter((result) => result.passed).length;
  const allPassed = passed === report.results.length;
  return (
    <div className="flex flex-col gap-2">
      <p className={`font-medium ${allPassed ? "text-accent" : "text-danger"}`}>
        {allPassed
          ? `All ${passed} tests passed.`
          : `${passed} of ${report.results.length} tests passed.`}
      </p>
      {report.results.map((result, index) => {
        const test = problem.tests[index];
        return (
          <details
            key={index}
            open={!result.passed}
            className="rounded-lg border border-border bg-surface text-sm"
          >
            <summary className="flex cursor-pointer items-center gap-2 px-3 py-2">
              <span className={result.passed ? "text-accent" : "text-danger"}>
                {result.passed ? "✓" : "✗"}
              </span>
              <span className="font-medium">Test {index + 1}</span>
              <span className="ml-auto text-xs text-muted tabular-nums">{result.ms} ms</span>
            </summary>
            <dl className="grid grid-cols-[5rem_1fr] gap-x-3 gap-y-1 border-t border-border px-3 py-2 font-mono text-xs">
              <dt className="text-muted">Call</dt>
              <dd className="break-all">{formatCall(problem.functionName, test.args)}</dd>
              <dt className="text-muted">Expected</dt>
              <dd className="break-all">{show(test.expected)}</dd>
              {result.error ? (
                <>
                  <dt className="text-muted">Error</dt>
                  <dd className="whitespace-pre-wrap text-danger">{result.error}</dd>
                </>
              ) : (
                <>
                  <dt className="text-muted">Got</dt>
                  <dd className={`break-all ${result.passed ? "" : "text-danger"}`}>
                    {show(result.got)}
                  </dd>
                </>
              )}
              {result.stdout && (
                <>
                  <dt className="text-muted">Printed</dt>
                  <dd className="whitespace-pre-wrap">{result.stdout}</dd>
                </>
              )}
            </dl>
          </details>
        );
      })}
    </div>
  );
}

type Props = { problem: Problem; position: string; nextId: string | null };

export function Workspace({ problem, position, nextId }: Props) {
  const progress = useProgress();
  const solved = Boolean(progress.solved[problem.id]);
  const dark = usePrefersDark();
  const [code, setCode] = useState(() => loadDraft(problem.id) ?? problem.starterCode);
  const [status, setStatus] = useState<RunStatus | null>(null);
  const [report, setReport] = useState<RunReport | null>(null);
  const [hintsShown, setHintsShown] = useState(0);
  const [solutionShown, setSolutionShown] = useState(false);
  const extensions = useMemo(() => [python()], []);

  useEffect(() => {
    warmUpPython();
  }, []);

  const onChange = (value: string) => {
    setCode(value);
    saveDraft(problem.id, value);
  };

  const run = async () => {
    if (status) return;
    const result = await runTests(code, problem.functionName, problem.tests, setStatus);
    setStatus(null);
    setReport(result);
    if (!result.error && result.results.length > 0 && result.results.every((r) => r.passed)) {
      progressActions.markSolved(problem.id);
    }
  };

  const reset = () => {
    clearDraft(problem.id);
    setCode(problem.starterCode);
    setReport(null);
  };

  return (
    <div className="grid flex-1 gap-4 lg:grid-cols-2">
      <section className="flex flex-col gap-4 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto lg:pr-2">
        <div>
          <Link href={`/week/${problem.week}`} className="text-sm text-muted hover:text-foreground">
            ← Week {problem.week} · Problem {position}
          </Link>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">{problem.title}</h1>
            <DifficultyBadge difficulty={problem.difficulty} />
            {solved && (
              <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent">
                Solved
              </span>
            )}
          </div>
          <p className="text-sm text-muted">{problem.topic}</p>
        </div>

        <div className="prose-problem leading-relaxed">
          <Markdown>{problem.description}</Markdown>
        </div>

        {problem.javaTip && (
          <aside className="rounded-lg border border-border bg-surface p-3 text-sm">
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted">
              Coming from Java
            </p>
            <div className="prose-problem">
              <Markdown>{problem.javaTip}</Markdown>
            </div>
          </aside>
        )}

        <div className="flex flex-col gap-2">
          {problem.hints.slice(0, hintsShown).map((hint, index) => (
            <div key={index} className="rounded-lg border border-border bg-surface p-3 text-sm">
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted">
                Hint {index + 1}
              </p>
              <div className="prose-problem">
                <Markdown>{hint}</Markdown>
              </div>
            </div>
          ))}
          <div className="flex flex-wrap gap-3 text-sm">
            {hintsShown < problem.hints.length && (
              <button
                type="button"
                onClick={() => setHintsShown(hintsShown + 1)}
                className="rounded-md border border-border px-3 py-1.5 hover:border-accent"
              >
                {hintsShown === 0 ? "Show a hint" : "Show another hint"} ({hintsShown} of{" "}
                {problem.hints.length})
              </button>
            )}
            {(solved || hintsShown === problem.hints.length) && !solutionShown && (
              <button
                type="button"
                onClick={() => setSolutionShown(true)}
                className="rounded-md border border-border px-3 py-1.5 hover:border-accent"
              >
                Show reference solution
              </button>
            )}
          </div>
          {solutionShown && (
            <div className="prose-problem">
              <p className="text-xs font-medium uppercase tracking-wide text-muted">
                Reference solution
              </p>
              <pre>
                <code>{problem.solution}</code>
              </pre>
            </div>
          )}
        </div>
      </section>

      <section
        className="flex min-h-[32rem] flex-col gap-3"
        onKeyDown={(event) => {
          if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
            event.preventDefault();
            void run();
          }
        }}
      >
        <div className="h-80 overflow-hidden rounded-lg border border-border lg:h-[26rem]">
          <CodeMirror
            value={code}
            onChange={onChange}
            extensions={extensions}
            theme={dark ? "dark" : "light"}
            height="100%"
            style={{ height: "100%", fontSize: 14 }}
            basicSetup={{ tabSize: 4 }}
            aria-label="Python code editor"
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void run()}
            disabled={status !== null}
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-background disabled:opacity-60"
          >
            {status === "loading-python"
              ? "Loading Python…"
              : status === "running"
                ? "Running…"
                : "Run tests"}
          </button>
          <span className="text-xs text-muted">Ctrl or ⌘ + Enter</span>
          <button type="button" onClick={reset} className="ml-auto text-sm text-muted underline">
            Reset code
          </button>
        </div>
        <div aria-live="polite" className="flex flex-col gap-3">
          {report ? (
            <Results problem={problem} report={report} />
          ) : (
            <p className="text-sm text-muted">
              Run the tests to see results. Python runs in your browser, so the first run takes a
              few seconds to load.
            </p>
          )}
          {solved && report && !report.error && (
            <Link
              href={nextId ? `/problems/${nextId}` : `/week/${problem.week}`}
              className="self-start rounded-md border border-accent px-4 py-2 text-sm font-medium text-accent"
            >
              {nextId ? "Next problem →" : "Back to the week →"}
            </Link>
          )}
        </div>
      </section>
    </div>
  );
}
