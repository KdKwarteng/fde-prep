/* Module web worker that runs learner code in Pyodide (CPython compiled to
   WebAssembly). Running in a worker keeps the page responsive and lets the
   page stop an infinite loop by terminating the worker. */
import { loadPyodide } from "/pyodide/pyodide.mjs";

let pyodideReady = null;

async function init() {
  const pyodide = await loadPyodide({ indexURL: "/pyodide/" });
  const response = await fetch("/harness.py");
  if (!response.ok) throw new Error("Could not load the test harness.");
  pyodide.FS.writeFile("harness.py", await response.text());
  pyodide.runPython("import harness");
  return pyodide;
}

self.onmessage = async (event) => {
  const { id, code, functionName, tests } = event.data;
  try {
    if (!pyodideReady) pyodideReady = init();
    const pyodide = await pyodideReady;
    self.postMessage({ id, type: "started" });
    pyodide.globals.set("_code", code);
    pyodide.globals.set("_fn", functionName);
    pyodide.globals.set("_tests", JSON.stringify(tests));
    const report = pyodide.runPython("harness.run_tests(_code, _fn, _tests)");
    self.postMessage({ id, type: "done", report: JSON.parse(report) });
  } catch (error) {
    pyodideReady = null;
    self.postMessage({ id, type: "failed", message: String(error && error.message ? error.message : error) });
  }
};
