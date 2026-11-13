// Run with: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import type { Progress } from "./progress";
import {
  mergeProgress,
  SyncEngine,
  type LocalStore,
  type RemoteRecord,
  type RemoteStore,
  type SyncMemory,
} from "./sync-engine.ts";

const base: Progress = { startDate: "2026-11-16", unlockAll: false, solved: {}, tasks: {}, activity: {} };
const make = (patch: Partial<Progress>): Progress => ({ ...base, ...patch });

class FakeRemote implements RemoteStore {
  rows = new Map<string, RemoteRecord>();
  saves = 0;
  failNextSave = false;
  async load(userId: string) {
    const row = this.rows.get(userId);
    return row ? structuredClone(row) : null;
  }
  async save(userId: string, data: Progress) {
    if (this.failNextSave) {
      this.failNextSave = false;
      throw new Error("network down");
    }
    this.saves += 1;
    this.rows.set(userId, { data: structuredClone(data), updatedAt: new Date().toISOString() });
  }
}

/** One simulated browser: its own local copy and its own memory of the last user. */
function device(remote: RemoteStore, initial: Progress = base) {
  let value = initial;
  const listeners = new Set<() => void>();
  const local: LocalStore = {
    get: () => value,
    set: (next) => {
      value = next;
      listeners.forEach((listener) => listener());
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
  let lastUser: string | null = null;
  const memory: SyncMemory = { getLastUser: () => lastUser, setLastUser: (id) => (lastUser = id) };
  const engine = new SyncEngine(local, remote, memory, { debounceMs: 5 });
  return { local, engine };
}

test("mergeProgress unions work and keeps the earliest solve date", () => {
  const merged = mergeProgress(
    make({ solved: { a: "2026-11-20", b: "2026-11-18" }, tasks: { "w1-build": true }, activity: { "2026-11-18": 2 } }),
    make({ solved: { a: "2026-11-17", c: "2026-11-19" }, tasks: { "w1-customer": true }, activity: { "2026-11-18": 1, "2026-11-19": 1 }, unlockAll: true }),
  );
  assert.deepEqual(merged.solved, { a: "2026-11-17", b: "2026-11-18", c: "2026-11-19" });
  assert.deepEqual(merged.tasks, { "w1-build": true, "w1-customer": true });
  assert.deepEqual(merged.activity, { "2026-11-18": 2, "2026-11-19": 1 });
  assert.equal(merged.unlockAll, true);
});

test("first sign-in uploads the guest progress from this browser", async () => {
  const remote = new FakeRemote();
  const laptop = device(remote, make({ solved: { a: "2026-11-17" } }));
  await laptop.engine.signIn("kd");
  assert.deepEqual(remote.rows.get("kd")?.data.solved, { a: "2026-11-17" });
});

test("a second device receives progress and contributes its own", async () => {
  const remote = new FakeRemote();
  const laptop = device(remote, make({ solved: { a: "2026-11-17" } }));
  await laptop.engine.signIn("kd");

  const phone = device(remote, make({ solved: { b: "2026-11-18" } }));
  await phone.engine.signIn("kd");
  assert.deepEqual(Object.keys(phone.local.get().solved).sort(), ["a", "b"]);

  await laptop.engine.refresh();
  assert.deepEqual(Object.keys(laptop.local.get().solved).sort(), ["a", "b"]);
});

test("local changes are saved after the debounce, in one request", async () => {
  const remote = new FakeRemote();
  const laptop = device(remote);
  await laptop.engine.signIn("kd");
  const before = remote.saves;

  laptop.local.set(make({ solved: { a: "2026-11-17" } }));
  laptop.local.set(make({ solved: { a: "2026-11-17", b: "2026-11-17" } }));
  await new Promise((resolve) => setTimeout(resolve, 30));
  await laptop.engine.flush();

  assert.equal(remote.saves, before + 1);
  assert.deepEqual(Object.keys(remote.rows.get("kd")!.data.solved), ["a", "b"]);
});

test("refresh takes the server copy when nothing is unsaved, so un-ticks carry over", async () => {
  const remote = new FakeRemote();
  const laptop = device(remote, make({ tasks: { "w1-build": true } }));
  await laptop.engine.signIn("kd");
  const phone = device(remote);
  await phone.engine.signIn("kd");
  assert.equal(phone.local.get().tasks["w1-build"], true);

  laptop.local.set(make({ tasks: { "w1-build": false } }));
  await laptop.engine.flush();
  await phone.engine.refresh();
  assert.equal(phone.local.get().tasks["w1-build"], false);
});

test("applying server data does not echo back as a new save", async () => {
  const remote = new FakeRemote();
  const laptop = device(remote, make({ solved: { a: "2026-11-17" } }));
  await laptop.engine.signIn("kd");
  const phone = device(remote);
  await phone.engine.signIn("kd");
  const before = remote.saves;
  await phone.engine.refresh();
  await new Promise((resolve) => setTimeout(resolve, 30));
  assert.equal(remote.saves, before);
});

test("a different account never inherits the previous account's progress", async () => {
  const remote = new FakeRemote();
  const shared = device(remote, make({ solved: { a: "2026-11-17" } }));
  await shared.engine.signIn("kd");
  shared.engine.signOut();

  await shared.engine.signIn("someone-else");
  assert.deepEqual(shared.local.get().solved, {});
  assert.equal(remote.rows.has("someone-else"), false);
});

test("a failed save is retried on the next flush", async () => {
  const remote = new FakeRemote();
  const laptop = device(remote);
  await laptop.engine.signIn("kd");

  laptop.local.set(make({ solved: { a: "2026-11-17" } }));
  remote.failNextSave = true;
  await assert.rejects(laptop.engine.flush());
  await laptop.engine.flush();
  assert.deepEqual(remote.rows.get("kd")?.data.solved, { a: "2026-11-17" });
});

test("changes made while signed out are not uploaded", async () => {
  const remote = new FakeRemote();
  const laptop = device(remote);
  laptop.local.set(make({ solved: { a: "2026-11-17" } }));
  await new Promise((resolve) => setTimeout(resolve, 30));
  assert.equal(remote.saves, 0);
});
