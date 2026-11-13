"use client";

import Link from "next/link";
import { syncActions, syncConfigured, useSync } from "@/lib/sync";

const statusLabel = {
  idle: "",
  syncing: "Syncing…",
  synced: "Synced",
  error: "Sync failed",
} as const;

export function AuthButton() {
  const { user, status, ready } = useSync();

  // Built without Supabase settings: the site runs local-only, so show nothing.
  if (!syncConfigured || !ready) return null;

  if (!user) {
    return (
      <button
        type="button"
        onClick={() => void syncActions.signIn()}
        className="rounded-md border border-border px-3 py-1.5 text-sm hover:border-accent"
      >
        Sign in with GitHub
      </button>
    );
  }

  return (
    <Link
      href="/settings"
      className="flex items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-background"
      title="Account and sync settings"
    >
      {user.avatarUrl && (
        // A plain img keeps this free of image-optimizer configuration for a 24px avatar.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={user.avatarUrl} alt="" width={24} height={24} className="rounded-full" />
      )}
      <span className="hidden sm:inline">{user.name}</span>
      {statusLabel[status] && (
        <span className={`text-xs ${status === "error" ? "text-danger" : "text-muted"}`}>
          {statusLabel[status]}
        </span>
      )}
    </Link>
  );
}
