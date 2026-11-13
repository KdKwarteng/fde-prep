"use client";

import { getWeek, TOTAL_WEEKS, weeks } from "@/data/curriculum";
import { problems } from "@/data/problems";
import { useProgress, useToday } from "@/lib/progress";
import { currentStreak, currentWeekNumber } from "@/lib/schedule";
import { WeekView, weekTaskKeys } from "./WeekView";

function Stat({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      {detail && <p className="text-sm text-muted">{detail}</p>}
    </div>
  );
}

export function Dashboard() {
  const progress = useProgress();
  const today = useToday();

  if (!today) {
    return <div className="h-96 animate-pulse rounded-lg bg-surface" aria-busy="true" />;
  }

  const weekNumber = currentWeekNumber(progress.startDate, today);
  const week = getWeek(weekNumber)!;
  const notStarted = today < progress.startDate;
  const solvedTotal = problems.filter((problem) => progress.solved[problem.id]).length;
  const allTaskKeys = weeks.flatMap(weekTaskKeys);
  const tasksDone = allTaskKeys.filter((key) => progress.tasks[key]).length;
  const streak = currentStreak(progress.activity, today);

  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat
          label="Week"
          value={`${weekNumber} of ${TOTAL_WEEKS}`}
          detail={notStarted ? "Starts soon. Get a head start." : undefined}
        />
        <Stat label="Problems solved" value={String(solvedTotal)} detail={`of ${problems.length} available`} />
        <Stat label="Tasks finished" value={String(tasksDone)} detail={`of ${allTaskKeys.length} in the plan`} />
        <Stat label="Streak" value={`${streak} ${streak === 1 ? "day" : "days"}`} />
      </div>
      <WeekView week={week} />
    </div>
  );
}
