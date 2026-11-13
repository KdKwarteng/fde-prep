"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { useSyncExternalStore } from "react";
import { EMPTY_PROGRESS, progressStore, type Progress } from "./progress";
import { SyncEngine, type RemoteStore, type SyncStatus } from "./sync-engine";

// Both values are safe to expose in the browser. Access is enforced by
// row-level security in the database (see supabase/schema.sql).
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** False when the site was built without Supabase settings. It then runs local-only. */
export const syncConfigured = Boolean(url && key);

const LAST_USER_KEY = "fde-prep:sync-user";
const TABLE = "progress";

export type SyncUser = { id: string; name: string; avatarUrl: string | null };
export type SyncState = { user: SyncUser | null; status: SyncStatus; ready: boolean };

const SERVER_STATE: SyncState = { user: null, status: "idle", ready: false };
let state: SyncState = SERVER_STATE;
const listeners = new Set<() => void>();

function setState(patch: Partial<SyncState>) {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener());
}

let client: SupabaseClient | null = null;
let engine: SyncEngine | null = null;

function remoteStore(supabase: SupabaseClient): RemoteStore {
  return {
    async load(userId) {
      const { data, error } = await supabase
        .from(TABLE)
        .select("data, updated_at")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return {
        data: { ...EMPTY_PROGRESS, ...(data.data as Partial<Progress>) },
        updatedAt: data.updated_at as string,
      };
    },
    async save(userId, progress) {
      const { error } = await supabase
        .from(TABLE)
        .upsert({ user_id: userId, data: progress, updated_at: new Date().toISOString() });
      if (error) throw error;
    },
  };
}

const memory = {
  getLastUser() {
    try {
      return window.localStorage.getItem(LAST_USER_KEY);
    } catch {
      return null;
    }
  },
  setLastUser(userId: string) {
    try {
      window.localStorage.setItem(LAST_USER_KEY, userId);
    } catch {}
  },
};

/** Connect to Supabase and start syncing. Safe to call more than once. */
function start() {
  if (client || !syncConfigured) return;
  const supabase = createClient(url!, key!);
  client = supabase;
  const sync = new SyncEngine(progressStore, remoteStore(supabase), memory, {
    onStatus: (status) => setState({ status }),
  });
  engine = sync;

  // Fires once on load with the stored session (or none), then on every
  // sign-in and sign-out, including the redirect back from GitHub.
  supabase.auth.onAuthStateChange((event, session) => {
    const account = session?.user ?? null;
    const previousId = state.user?.id ?? null;
    setState({
      ready: true,
      user: account
        ? {
            id: account.id,
            name:
              (account.user_metadata?.user_name as string | undefined) ??
              account.email ??
              "Signed in",
            avatarUrl: (account.user_metadata?.avatar_url as string | undefined) ?? null,
          }
        : null,
    });
    // Supabase warns against calling its API from inside this callback, so defer.
    setTimeout(() => {
      if (account && account.id !== previousId) {
        sync.signIn(account.id).catch(() => {});
      } else if (!account && previousId) {
        sync.signOut();
      }
    }, 0);
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      sync.refresh().catch(() => {});
    } else {
      sync.flush().catch(() => {});
    }
  });
}

function subscribe(listener: () => void) {
  start();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useSync(): SyncState {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => SERVER_STATE,
  );
}

export const syncActions = {
  async signIn() {
    start();
    await client?.auth.signInWithOAuth({
      provider: "github",
      options: { redirectTo: window.location.origin },
    });
  },
  async signOut() {
    await engine?.flush().catch(() => {});
    await client?.auth.signOut();
  },
  retry() {
    engine?.refresh().catch(() => {});
  },
};
