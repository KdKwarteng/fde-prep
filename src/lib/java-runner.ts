"use client";

// Runs Java in the browser with CheerpJ, a JVM compiled to WebAssembly
// (https://cheerpj.com). Our harness jar (built from java/src by
// scripts/build-java-harness.sh) compiles the code with javac, or with the
// Eclipse compiler in public/java/ecj.jar if the runtime has no javac, then
// runs the tests and returns a JSON report shaped like the Python one.
import type { TestCase } from "@/data/problems";
import type { RunReport, RunStatus } from "./runner";

const LOADER_URL = "https://cjrtnc.leaningtech.com/5.0/loader.js";
// CheerpJ mounts the site's root at /app/, so public/java/* is /app/java/*.
const CLASSPATH = "/app/java/harness.jar:/app/java/ecj.jar";
// The harness stops each run after 10 seconds. This is a backstop in case the
// runtime itself stops responding.
const BACKSTOP_MS = 30_000;

type HarnessClass = {
  run(code: string, methodName: string, testsJson: string): Promise<string>;
  warmUp(): Promise<string>;
};

type CheerpJLibrary = { dev: { fdeprep: { Harness: Promise<HarnessClass> } } };

type CheerpJ = {
  cheerpjInit: (options?: Record<string, unknown>) => Promise<void>;
  cheerpjRunLibrary: (classpath: string) => Promise<CheerpJLibrary>;
};

/**
 * Find a function the loader defined. A top-level `function` becomes a
 * property of `window`, but a top-level `const` or `let` is global without
 * being on `window`, so fall back to looking the name up as a bare identifier.
 */
function findGlobal<T>(name: string): T | undefined {
  const onWindow = (window as unknown as Record<string, unknown>)[name];
  if (typeof onWindow === "function") return onWindow as T;
  try {
    // The name is one of our own constants, never user input.
    return new Function(`return typeof ${name} === "function" ? ${name} : undefined`)() as T | undefined;
  } catch {
    return undefined;
  }
}

// The loader defines only cheerpjInit. The other functions, such as
// cheerpjRunLibrary, appear once cheerpjInit has finished.
function cheerpjInit(): CheerpJ["cheerpjInit"] | undefined {
  return findGlobal<CheerpJ["cheerpjInit"]>("cheerpjInit");
}

function loadScript(src: string): Promise<void> {
  if (cheerpjInit()) return Promise.resolve();
  // A tag left by an earlier failed attempt never fires again, so replace it.
  document.querySelector(`script[src="${src}"]`)?.remove();
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener(
      "error",
      () => {
        script.remove();
        reject(new Error("could not download the Java runtime"));
      },
      { once: true },
    );
    document.head.appendChild(script);
  });
}

async function start(): Promise<HarnessClass> {
  await loadScript(LOADER_URL);
  // cheerpjInit may only run once per page, so keep its promise across retries.
  if (!initialized) {
    const init = cheerpjInit();
    if (!init) throw new Error("the Java runtime did not load");
    initialized = init({ version: 17, status: "none" });
  }
  await initialized;
  const runLibrary = findGlobal<CheerpJ["cheerpjRunLibrary"]>("cheerpjRunLibrary");
  if (!runLibrary) throw new Error("the Java runtime started without cheerpjRunLibrary");
  const library = await runLibrary(CLASSPATH);
  return await library.dev.fdeprep.Harness;
}

function getHarness(): Promise<HarnessClass> {
  if (!harness) {
    harness = start().catch((error) => {
      harness = null;
      throw error;
    });
  }
  return harness;
}

/** Start downloading Java in the background so the first run is faster. */
export function warmUpJava() {
  void getHarness()
    .then((h) => h.warmUp())
    .catch(() => {});
}

export async function runJavaTests(
  code: string,
  methodName: string,
  tests: TestCase[],
  onStatus?: (status: RunStatus) => void,
): Promise<RunReport> {
  if (broken) {
    return {
      error: "The Java runtime stopped responding. Reload the page to start it again.",
      results: [],
    };
  }
  onStatus?.("loading-java");
  let h: HarnessClass;
  try {
    h = await getHarness();
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return {
      error: `Java could not start: ${reason}. Check your internet connection and try again.`,
      results: [],
    };
  }

  onStatus?.("running");
  let timer: ReturnType<typeof setTimeout> | undefined;
  const backstop = new Promise<RunReport>((resolve) => {
    timer = setTimeout(() => {
      broken = true;
      resolve({
        error: "Java did not finish. Check for an infinite loop, then reload the page.",
        results: [],
      });
    }, BACKSTOP_MS);
  });

  try {
    const run = h.run(code, methodName, JSON.stringify(tests)).then(
      (json) => JSON.parse(json) as RunReport,
    );
    return await Promise.race([run, backstop]);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return { error: `Java failed to run your code: ${reason}`, results: [] };
  } finally {
    clearTimeout(timer);
  }
}
