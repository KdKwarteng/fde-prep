"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useProgress, useToday } from "@/lib/progress";
import { currentWeekNumber, formatDay, weekStartDate } from "@/lib/schedule";

/** Shows children only once the given week has unlocked. */
export function LockGate({ weekNumber, children }: { weekNumber: number; children: ReactNode }) {
  const progress = useProgress();
  const today = useToday();

  if (!today) {
    return <div className="h-96 animate-pulse rounded-lg bg-surface" aria-busy="true" />;
  }

  const unlocked =
    progress.unlockAll || weekNumber <= currentWeekNumber(progress.startDate, today);
  if (unlocked) return <>{children}</>;

  return (
    <div className="mx-auto max-w-md rounded-lg border border-border bg-surface p-8 text-center">
      <p className="text-3xl" aria-hidden>
        🔒
      </p>
      <h1 className="mt-2 text-xl font-semibold">Week {weekNumber} is not open yet</h1>
      <p className="mt-2 text-muted">
        It unlocks on {formatDay(weekStartDate(progress.startDate, weekNumber))}. Finishing the
        current week first is the point of the plan.
      </p>
      <div className="mt-6 flex justify-center gap-3 text-sm">
        <Link href="/" className="rounded-md bg-accent px-4 py-2 font-medium text-background">
          Go to this week
        </Link>
        <Link href="/settings" className="rounded-md border border-border px-4 py-2">
          Unlock everything
        </Link>
      </div>
    </div>
  );
}
