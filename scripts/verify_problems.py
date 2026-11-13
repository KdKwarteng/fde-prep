#!/usr/bin/env python3
"""Check every problem: schema is complete, the reference solution passes
all tests, and the starter code does not. Run with: python3 scripts/verify_problems.py
"""
import importlib.util
import sys

sys.dont_write_bytecode = True
import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location("harness", ROOT / "public" / "harness.py")
harness = importlib.util.module_from_spec(spec)
spec.loader.exec_module(harness)

REQUIRED = ["id", "week", "order", "title", "difficulty", "topic", "functionName",
            "description", "starterCode", "tests", "hints", "solution"]


def main():
    failures = 0
    paths = sorted((ROOT / "content" / "problems").glob("*.json"))
    for path in paths:
        problem = json.loads(path.read_text())
        problems = [f"missing field {k}" for k in REQUIRED if k not in problem]
        if problem.get("id") != path.stem:
            problems.append("id does not match file name")
        if not problems:
            tests = json.dumps(problem["tests"])
            report = json.loads(harness.run_tests(problem["solution"], problem["functionName"], tests))
            if report["error"]:
                problems.append(f"solution error: {report['error']}")
            for i, result in enumerate(report["results"]):
                if not result["passed"]:
                    problems.append(f"solution fails test {i + 1}: got {result['got']!r} {result['error'] or ''}")
            starter = json.loads(harness.run_tests(problem["starterCode"], problem["functionName"], tests))
            if not starter["error"] and all(r["passed"] for r in starter["results"]):
                problems.append("starter code already passes every test")
        status = "ok  " if not problems else "FAIL"
        print(f"{status} {path.stem}")
        for message in problems:
            print(f"     {message}")
        failures += bool(problems)
    print(f"\n{len(paths) - failures} of {len(paths)} problems verified")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
