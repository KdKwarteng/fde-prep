"use client";

import { syncActions, syncConfigured, useSync } from "@/lib/sync";

export function AccountSettings() {
  const { user, status, ready } = useSync();

  return (
    <section className="rounded-lg border border-border bg-surface p-5">
      <h2 className="font-semibold">Account and sync</h2>
      {!syncConfigured ? (
        <p className="text-sm text-muted">
          This copy of the site was built without a database, so progress is saved in this
          browser only. See <code>docs/sync-setup.md</code> in the repository to turn on sign-in.
        </p>
      ) : !ready ? (
        <p className="text-sm text-muted">Checking sign-in…</p>
      ) : user ? (
        <>
          <p className="mb-3 text-sm text-muted">
            Signed in as <span className="font-medium text-foreground">{user.name}</span>. Solved
            problems, finished tasks, and your streak sync to your account and follow you to any
            device. Code drafts stay in this browser.
          </p>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <button
              type="button"
              onClick={() => void syncActions.signOut()}
              className="rounded-md border border-border px-4 py-2"
            >
              Sign out
            </button>
            {status === "error" ? (
              <>
                <span className="text-danger">The last sync failed.</span>
                <button type="button" onClick={syncActions.retry} className="underline">
                  Try again
                </button>
              </>
            ) : (
              <span className="text-muted">
                {status === "syncing" ? "Syncing…" : "Everything is synced."}
              </span>
            )}
          </div>
        </>
      ) : (
        <>
          <p className="mb-3 text-sm text-muted">
            Sign in to keep your progress in your account and pick it up on another device.
            Anything you have done in this browser is added to your account when you sign in.
          </p>
          <button
            type="button"
            onClick={() => void syncActions.signIn()}
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-background"
          >
            Sign in with GitHub
          </button>
        </>
      )}
    </section>
  );
}
