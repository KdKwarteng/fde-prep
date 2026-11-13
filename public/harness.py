"""Test harness shared by the in-browser runner and scripts/verify_problems.py.

run_tests(user_code, function_name, tests_json) executes the learner's code,
calls the named function once per test, and returns a JSON report.
"""
import contextlib
import io
import json
import sys
import time
import traceback


def _normalize(value):
    """Round-trip through JSON so tuples, sets, and lists compare equally."""

    def default(obj):
        if isinstance(obj, (set, frozenset)):
            return sorted(obj)
        raise TypeError(f"Cannot return a value of type {type(obj).__name__}")

    return json.loads(json.dumps(value, default=default))


def _short_traceback():
    """Show only the frames from the learner's code, then the error itself."""
    etype, exc, tb = sys.exc_info()
    frames = [f for f in traceback.extract_tb(tb) if f.filename == "solution.py"]
    lines = [f"  line {f.lineno}, in {f.name}" for f in frames[-6:]]
    message = "".join(traceback.format_exception_only(etype, exc)).strip()
    return "\n".join(lines + [message])


def run_tests(user_code, function_name, tests_json):
    tests = json.loads(tests_json)
    namespace = {"__name__": "__main__"}
    setup_out = io.StringIO()
    try:
        with contextlib.redirect_stdout(setup_out):
            exec(compile(user_code, "solution.py", "exec"), namespace)
    except BaseException:
        return json.dumps({"error": _short_traceback(), "results": []})

    fn = namespace.get(function_name)
    if not callable(fn):
        return json.dumps(
            {"error": f"Define a function named {function_name}.", "results": []}
        )

    results = []
    for test in tests:
        out = io.StringIO()
        entry = {"passed": False, "got": None, "error": None, "stdout": "", "ms": 0}
        started = time.perf_counter()
        try:
            args = json.loads(json.dumps(test["args"]))  # fresh copy per test
            with contextlib.redirect_stdout(out):
                got = _normalize(fn(*args))
            entry["got"] = got
            entry["passed"] = got == test["expected"]
        except BaseException:
            entry["error"] = _short_traceback()
        entry["ms"] = round((time.perf_counter() - started) * 1000, 2)
        entry["stdout"] = out.getvalue()[-2000:]
        results.append(entry)
    return json.dumps({"error": None, "results": results})
