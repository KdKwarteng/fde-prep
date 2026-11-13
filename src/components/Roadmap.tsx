"use client";

import Link from "next/link";
import { phases, weeks } from "@/data/curriculum";
import { problemsForWeek } from "@/data/problems";
import { useProgress, useToday } from "@/lib/progress";
import { currentWeekNumber, formatWeekRange } from "@/lib/schedule";
import { weekTaskKeys } from "./WeekView";

export function Roadmap() {
  const progress = useProgress();
  const today = useToday();
  const current = today ? currentWeekNumber(progress.startDate, today) : 1;

  return (
    <div className="flex flex-col gap-10">
      {phases.map((phase) => (
        <section key={phase.id}>
          <h2 className="text-lg font-semibold">
            Phase {phase.id}: {phase.name}
          </h2>
          <p className="mb-3 text-sm text-muted">{phase.goal}</p>
          <ol className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
            {weeks
              .filter((week) => week.phase === phase.id)
              .map((week) => {
                const locked = !progress.unlockAll && week.number > current;
                const weekProblems = problemsForWeek(week.number);
                const taskKeys = weekTaskKeys(week);
                const total = weekProblems.length + taskKeys.length;
                const done =
                  weekProblems.filter((problem) => progress.solved[problem.id]).length +
                  taskKeys.filter((key) => progress.tasks[key]).length;
                const percent = Math.round((done / total) * 100);
                return (
                  <li key={week.number}>
                    <Link
                      href={`/week/${week.number}`}
                      className={`flex items-center gap-4 px-4 py-3 hover:bg-background ${
                        locked ? "text-muted" : ""
                      }`}
                    >
                      <span className="w-8 font-mono text-sm text-muted">{week.number}</span>
                      <span className="flex-1">
                        <span className="block font-medium">
                          {week.title}
                          {week.number === current && today && (
                            <span className="ml-2 rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent">
                              This week
                            </span>
                          )}
                        </span>
                        <span className="block text-sm text-muted">
                          {formatWeekRange(progress.startDate, week.number)}
                        </span>
                      </span>
                      {locked ? (
                        <span className="text-sm" aria-label="Locked">
                          🔒
                        </span>
                      ) : (
                        <span className="flex w-28 items-center gap-2">
                          <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-border">
                            <span
                              className="block h-full rounded-full bg-accent"
                              style={{ width: `${percent}%` }}
                            />
                          </span>
                          <span className="w-9 text-right text-xs tabular-nums text-muted">
                            {percent}%
                          </span>
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
          </ol>
        </section>
      ))}
    </div>
  );
}
