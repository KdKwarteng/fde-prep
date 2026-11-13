"use client";

import type { TestCase } from "@/data/problems";

export type TestResult = {
  passed: boolean;
  got: unknown;
  error: string | null;
  stdout: string;
  ms: number;
};

export type RunReport = {
  /** Set when the code could not be loaded at all (syntax error, missing function, timeout). */
  error: string | null;
  results: TestResult[];
};

export type RunStatus = "loading-python" | "running";

const RUN_TIMEOUT_MS = 10_000;

let worker: Worker | null = null;
let nextId = 1;

function getWorker(): Worker {
  if (!worker) worker = new Worker("/py-worker.js", { type: "module" });
  return worker;
}

function discardWorker() {
  worker?.terminate();
  worker = null;
}

/** Start downloading Python in the background so the first run is fast. */
export function warmUpPython() {
  getWorker();
}

export function runTests(
  code: string,
  functionName: string,
  tests: TestCase[],
  onStatus?: (status: RunStatus) => void,
): Promise<RunReport> {
  const id = nextId++;
  const active = getWorker();
  onStatus?.("loading-python");

  return new Promise((resolve) => {
    let timer: ReturnType<typeof setTimeout> | undefined;

    const finish = (report: RunReport) => {
      clearTimeout(timer);
      active.removeEventListener("message", onMessage);
      active.removeEventListener("error", onError);
      resolve(report);
    };

    const onMessage = (event: MessageEvent) => {
      const message = event.data;
      if (message.id !== id) return;
      if (message.type === "started") {
        onStatus?.("running");
        timer = setTimeout(() => {
          discardWorker();
          finish({
            error: `Timed out after ${RUN_TIMEOUT_MS / 1000} seconds. Check for an infinite loop.`,
            results: [],
          });
        }, RUN_TIMEOUT_MS);
      } else if (message.type === "done") {
        finish(message.report as RunReport);
      } else if (message.type === "failed") {
        discardWorker();
        finish({ error: `Python could not start: ${message.message}`, results: [] });
      }
    };

    const onError = () => {
      discardWorker();
      finish({
        error: "Python could not load. Check your internet connection and try again.",
        results: [],
      });
    };

    active.addEventListener("message", onMessage);
    active.addEventListener("error", onError);
    active.postMessage({ id, code, functionName, tests });
  });
}
