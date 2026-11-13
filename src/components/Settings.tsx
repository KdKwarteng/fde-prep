"use client";

import { useState } from "react";
import { DEFAULT_START_DATE } from "@/data/curriculum";
import { progressActions, useHydrated, useProgress } from "@/lib/progress";

export function Settings() {
  const progress = useProgress();
  const hydrated = useHydrated();
  const [confirmingReset, setConfirmingReset] = useState(false);

  if (!hydrated) {
    return <div className="h-64 animate-pulse rounded-lg bg-surface" aria-busy="true" />;
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-lg border border-border bg-surface p-5">
        <h2 className="font-semibold">Start date</h2>
        <p className="mb-3 text-sm text-muted">
          Week 1 begins on this date and a new week unlocks every 7 days after it. Move it later
          if you fall behind and want to repeat a week.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="date"
            value={progress.startDate}
            onChange={(event) => {
              if (event.target.value) progressActions.setStartDate(event.target.value);
            }}
            className="rounded-md border border-border bg-background px-3 py-2"
          />
          <button
            type="button"
            onClick={() => progressActions.setStartDate(DEFAULT_START_DATE)}
            className="text-sm text-muted underline"
          >
            Use the default ({DEFAULT_START_DATE})
          </button>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-surface p-5">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={progress.unlockAll}
            onChange={(event) => progressActions.setUnlockAll(event.target.checked)}
            className="mt-1 h-4 w-4 accent-(--accent)"
          />
          <span>
            <span className="block font-semibold">Unlock every week</span>
            <span className="block text-sm text-muted">
              Lets you open future weeks early. The weekly pacing is there for a reason, so use
              this for peeking ahead, not skipping.
            </span>
          </span>
        </label>
      </section>

      <section className="rounded-lg border border-border bg-surface p-5">
        <h2 className="font-semibold">Reset progress</h2>
        <p className="mb-3 text-sm text-muted">
          Progress is stored in this browser only. Resetting clears solved problems, finished
          tasks, your streak, and saved code. This cannot be undone.
        </p>
        {confirmingReset ? (
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                progressActions.reset();
                setConfirmingReset(false);
              }}
              className="rounded-md bg-danger px-4 py-2 text-sm font-medium text-background"
            >
              Yes, erase everything
            </button>
            <button
              type="button"
              onClick={() => setConfirmingReset(false)}
              className="rounded-md border border-border px-4 py-2 text-sm"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmingReset(true)}
            className="rounded-md border border-danger px-4 py-2 text-sm text-danger"
          >
            Reset progress
          </button>
        )}
      </section>
    </div>
  );
}
