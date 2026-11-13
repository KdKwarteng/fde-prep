"use client";

import Link from "next/link";
import { getPhase, type Week } from "@/data/curriculum";
import { problemsForWeek } from "@/data/problems";
import { progressActions, useProgress } from "@/lib/progress";
import { formatWeekRange } from "@/lib/schedule";
import { DifficultyBadge } from "./DifficultyBadge";

export function weekTaskKeys(week: Week): string[] {
  const keys = [`w${week.number}-customer`];
  if (!week.build.startsWith("None")) keys.unshift(`w${week.number}-build`);
  return keys;
}

function TaskRow({ taskKey, label, text }: { taskKey: string; label: string; text: string }) {
  const progress = useProgress();
  const done = Boolean(progress.tasks[taskKey]);
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-surface p-4 hover:border-accent">
      <input
        type="checkbox"
        checked={done}
        onChange={() => progressActions.toggleTask(taskKey)}
        className="mt-1 h-4 w-4 accent-(--accent)"
      />
      <span>
        <span className="block text-xs font-medium uppercase tracking-wide text-muted">{label}</span>
        <span className={done ? "text-muted line-through" : ""}>{text}</span>
      </span>
    </label>
  );
}

export function WeekView({ week }: { week: Week }) {
  const progress = useProgress();
  const phase = getPhase(week.phase);
  const problems = problemsForWeek(week.number);
  const solvedCount = problems.filter((problem) => progress.solved[problem.id]).length;
  const hasBuild = !week.build.startsWith("None");

  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="text-sm text-muted">
          Phase {phase.id}: {phase.name} · {formatWeekRange(progress.startDate, week.number)}
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">
          Week {week.number}: {week.title}
        </h1>
      </div>

      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-lg font-semibold">Coding problems</h2>
          {problems.length > 0 && (
            <span className="text-sm text-muted">
              {solvedCount} of {problems.length} solved
            </span>
          )}
        </div>
        <p className="mb-3 text-sm text-muted">Focus: {week.coding}</p>
        {problems.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted">
            The problem set for this week has not been added yet. Use the focus topic above to pick
            5 or 6 problems from your usual list in the meantime.
          </p>
        ) : (
          <ol className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
            {problems.map((problem, index) => {
              const solved = Boolean(progress.solved[problem.id]);
              return (
                <li key={problem.id}>
                  <Link
                    href={`/problems/${problem.id}`}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-background"
                  >
                    <span
                      aria-label={solved ? "Solved" : "Not solved"}
                      className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border text-xs ${
                        solved
                          ? "border-accent bg-accent text-background"
                          : "border-border text-muted"
                      }`}
                    >
                      {solved ? "✓" : index + 1}
                    </span>
                    <span className="flex-1">
                      <span className="block font-medium">{problem.title}</span>
                      <span className="block text-sm text-muted">{problem.topic}</span>
                    </span>
                    <DifficultyBadge difficulty={problem.difficulty} />
                  </Link>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">This week&apos;s other work</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {hasBuild && (
            <TaskRow taskKey={`w${week.number}-build`} label="Build" text={week.build} />
          )}
          <TaskRow
            taskKey={`w${week.number}-customer`}
            label="Design and customer skills"
            text={week.customer}
          />
        </div>
      </section>
    </div>
  );
}
