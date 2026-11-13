// Sync logic with no browser or Supabase dependencies, so it can be unit
// tested in plain Node (see sync-engine.test.ts). The Supabase wiring lives
// in sync.ts.
import type { Progress } from "./progress";

export type RemoteRecord = { data: Progress; updatedAt: string };

/** Where progress is stored on the server. */
export interface RemoteStore {
  load(userId: string): Promise<RemoteRecord | null>;
  save(userId: string, data: Progress): Promise<void>;
}

/** The copy of progress kept in this browser. */
export interface LocalStore {
  get(): Progress;
  set(next: Progress): void;
  subscribe(listener: () => void): () => void;
}

/** Remembers which account this browser last synced with. */
export interface SyncMemory {
  getLastUser(): string | null;
  setLastUser(userId: string): void;
}

export type SyncStatus = "idle" | "syncing" | "synced" | "error";

/**
 * Combine two copies of progress without losing work from either.
 * Solved problems and finished tasks are unioned, the earliest solve date is
 * kept, and daily activity takes the larger count. Settings come from `remote`.
 */
export function mergeProgress(local: Progress, remote: Progress): Progress {
  const solved = { ...local.solved };
  for (const [id, date] of Object.entries(remote.solved)) {
    if (!solved[id] || date < solved[id]) solved[id] = date;
  }

  const tasks = { ...local.tasks };
  for (const [key, done] of Object.entries(remote.tasks)) {
    tasks[key] = Boolean(tasks[key]) || done;
  }

  const activity = { ...local.activity };
  for (const [day, count] of Object.entries(remote.activity)) {
    activity[day] = Math.max(activity[day] ?? 0, count);
  }

  return {
    startDate: remote.startDate,
    unlockAll: remote.unlockAll,
    solved,
    tasks,
    activity,
  };
}

type Options = {
  /** How long to wait after a change before saving, so bursts become one request. */
  debounceMs?: number;
  onStatus?: (status: SyncStatus) => void;
};

export class SyncEngine {
  private userId: string | null = null;
  private dirty = false;
  private applyingRemote = false;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private queue: Promise<void> = Promise.resolve();
  private readonly unsubscribe: () => void;
  private readonly debounceMs: number;

  private readonly local: LocalStore;
  private readonly remote: RemoteStore;
  private readonly memory: SyncMemory;
  private readonly options: Options;

  constructor(local: LocalStore, remote: RemoteStore, memory: SyncMemory, options: Options = {}) {
    this.local = local;
    this.remote = remote;
    this.memory = memory;
    this.options = options;
    this.debounceMs = options.debounceMs ?? 1500;
    this.unsubscribe = local.subscribe(() => this.onLocalChange());
  }

  /** Call when a user signs in, or when the page loads with a session. */
  signIn(userId: string): Promise<void> {
    return this.enqueue(async () => {
      this.userId = userId;
      const record = await this.remote.load(userId);
      const lastUser = this.memory.getLastUser();
      const belongsToSomeoneElse = lastUser !== null && lastUser !== userId;

      if (belongsToSomeoneElse) {
        // Never mix one account's progress into another's.
        this.apply(record ? record.data : emptyLike(this.local.get()));
      } else if (record) {
        const merged = mergeProgress(this.local.get(), record.data);
        this.apply(merged);
        await this.remote.save(userId, merged);
      } else {
        // First sign-in for this account: upload what this browser has.
        await this.remote.save(userId, this.local.get());
      }
      this.memory.setLastUser(userId);
      this.dirty = false;
    });
  }

  /** Stop syncing. The local copy stays so the site keeps working signed out. */
  signOut(): void {
    this.cancelTimer();
    this.userId = null;
    this.dirty = false;
    this.options.onStatus?.("idle");
  }

  /** Pick up changes made on other devices, for example when the tab regains focus. */
  refresh(): Promise<void> {
    if (!this.userId) return Promise.resolve();
    const userId = this.userId;
    return this.enqueue(async () => {
      const record = await this.remote.load(userId);
      if (!record) return;
      if (this.dirty) {
        const merged = mergeProgress(this.local.get(), record.data);
        this.apply(merged);
        await this.remote.save(userId, merged);
        this.dirty = false;
      } else {
        // Nothing unsaved here, so the server copy wins outright. This lets an
        // un-ticked task or a reset on another device carry over.
        this.apply(record.data);
      }
    });
  }

  /** Save any pending change now, without waiting for the debounce. */
  flush(): Promise<void> {
    this.cancelTimer();
    if (!this.userId || !this.dirty) return this.queue;
    const userId = this.userId;
    return this.enqueue(async () => {
      if (!this.dirty) return;
      this.dirty = false;
      try {
        await this.remote.save(userId, this.local.get());
      } catch (error) {
        this.dirty = true;
        throw error;
      }
    });
  }

  dispose(): void {
    this.cancelTimer();
    this.unsubscribe();
  }

  private onLocalChange() {
    if (this.applyingRemote || !this.userId) return;
    this.dirty = true;
    this.cancelTimer();
    this.timer = setTimeout(() => void this.flush(), this.debounceMs);
  }

  private apply(next: Progress) {
    this.applyingRemote = true;
    try {
      this.local.set(next);
    } finally {
      this.applyingRemote = false;
    }
  }

  private cancelTimer() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  /** Run tasks one at a time so loads and saves never interleave. */
  private enqueue(task: () => Promise<void>): Promise<void> {
    const run = this.queue.then(async () => {
      this.options.onStatus?.("syncing");
      try {
        await task();
        this.options.onStatus?.(this.userId ? "synced" : "idle");
      } catch (error) {
        this.options.onStatus?.("error");
        throw error;
      }
    });
    this.queue = run.catch(() => {});
    return run;
  }
}

function emptyLike(current: Progress): Progress {
  return { startDate: current.startDate, unlockAll: false, solved: {}, tasks: {}, activity: {} };
}
