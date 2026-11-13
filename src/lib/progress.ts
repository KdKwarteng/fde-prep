"use client";

import { useSyncExternalStore } from "react";
import { DEFAULT_START_DATE } from "@/data/curriculum";

export type Progress = {
  startDate: string;
  unlockAll: boolean;
  /** problem id -> ISO date first solved */
  solved: Record<string, string>;
  /** task key like "w3-build" -> done */
  tasks: Record<string, boolean>;
  /** YYYY-MM-DD -> number of problems solved or tasks finished that day */
  activity: Record<string, number>;
};

const KEY = "fde-prep:progress:v1";
const DRAFT_PREFIX = "fde-prep:draft:";

export const EMPTY_PROGRESS: Progress = {
  startDate: DEFAULT_START_DATE,
  unlockAll: false,
  solved: {},
  tasks: {},
  activity: {},
};

let cache: Progress | null = null;
const listeners = new Set<() => void>();

function read(): Progress {
  if (cache) return cache;
  try {
    const raw = window.localStorage.getItem(KEY);
    cache = raw ? { ...EMPTY_PROGRESS, ...JSON.parse(raw) } : EMPTY_PROGRESS;
  } catch {
    cache = EMPTY_PROGRESS;
  }
  return cache!;
}

function write(next: Progress) {
  cache = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Storage can be unavailable (private mode). Progress then lasts for the session.
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === KEY) {
      cache = null;
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** Local calendar date as YYYY-MM-DD. */
export function dayKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function bumpActivity(progress: Progress): Record<string, number> {
  const today = dayKey(new Date());
  return { ...progress.activity, [today]: (progress.activity[today] ?? 0) + 1 };
}

export const progressActions = {
  markSolved(problemId: string) {
    const current = read();
    if (current.solved[problemId]) return;
    write({
      ...current,
      solved: { ...current.solved, [problemId]: new Date().toISOString() },
      activity: bumpActivity(current),
    });
  },
  toggleTask(taskKey: string) {
    const current = read();
    const done = !current.tasks[taskKey];
    write({
      ...current,
      tasks: { ...current.tasks, [taskKey]: done },
      activity: done ? bumpActivity(current) : current.activity,
    });
  },
  setStartDate(startDate: string) {
    write({ ...read(), startDate });
  },
  setUnlockAll(unlockAll: boolean) {
    write({ ...read(), unlockAll });
  },
  reset() {
    try {
      Object.keys(window.localStorage)
        .filter((key) => key.startsWith(DRAFT_PREFIX))
        .forEach((key) => window.localStorage.removeItem(key));
    } catch {}
    write(EMPTY_PROGRESS);
  },
};

/** Direct access for the sync engine, which runs outside React. */
export const progressStore = {
  get: read,
  set: write,
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};

export function useProgress(): Progress {
  return useSyncExternalStore(subscribe, read, () => EMPTY_PROGRESS);
}

const noopSubscribe = () => () => {};

/** False during server render and hydration, true afterwards. */
export function useHydrated(): boolean {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}

let todayCache: string | null = null;

/** Today's local date key, or null until the page has hydrated in the browser. */
export function useToday(): string | null {
  return useSyncExternalStore(
    noopSubscribe,
    () => (todayCache ??= dayKey(new Date())),
    () => null,
  );
}

export function loadDraft(problemId: string): string | null {
  try {
    return window.localStorage.getItem(DRAFT_PREFIX + problemId);
  } catch {
    return null;
  }
}

export function saveDraft(problemId: string, code: string) {
  try {
    window.localStorage.setItem(DRAFT_PREFIX + problemId, code);
  } catch {}
}

export function clearDraft(problemId: string) {
  try {
    window.localStorage.removeItem(DRAFT_PREFIX + problemId);
  } catch {}
}
