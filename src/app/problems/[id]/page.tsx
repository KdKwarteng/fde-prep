import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LockGate } from "@/components/LockGate";
import { Workspace } from "@/components/Workspace";
import { getProblem, problems } from "@/data/problems";

export function generateStaticParams() {
  return problems.map((problem) => ({ id: problem.id }));
}

export async function generateMetadata({ params }: PageProps<"/problems/[id]">): Promise<Metadata> {
  const { id } = await params;
  return { title: getProblem(id)?.title ?? "Problem not found" };
}

export default async function ProblemPage({ params }: PageProps<"/problems/[id]">) {
  const { id } = await params;
  const problem = getProblem(id);
  if (!problem) notFound();

  const weekProblems = problems.filter((candidate) => candidate.week === problem.week);
  const index = weekProblems.findIndex((candidate) => candidate.id === problem.id);
  const next = weekProblems[index + 1];

  return (
    <div className="flex w-full flex-1 flex-col px-4 py-4">
      <LockGate weekNumber={problem.week}>
        <Workspace
          key={problem.id}
          problem={problem}
          position={`${index + 1} of ${weekProblems.length}`}
          nextId={next?.id ?? null}
        />
      </LockGate>
    </div>
  );
}
