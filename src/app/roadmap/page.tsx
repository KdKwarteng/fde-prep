import type { Metadata } from "next";
import { Roadmap } from "@/components/Roadmap";

export const metadata: Metadata = { title: "Roadmap" };

export default function RoadmapPage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      <h1 className="mb-1 text-3xl font-semibold tracking-tight">Roadmap</h1>
      <p className="mb-8 text-muted">
        26 weeks in four phases. A new week unlocks every Monday.
      </p>
      <Roadmap />
    </div>
  );
}
