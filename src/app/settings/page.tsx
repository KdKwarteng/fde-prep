import type { Metadata } from "next";
import { Settings } from "@/components/Settings";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <h1 className="mb-8 text-3xl font-semibold tracking-tight">Settings</h1>
      <Settings />
    </div>
  );
}
