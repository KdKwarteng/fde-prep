import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LockGate } from "@/components/LockGate";
import { WeekView } from "@/components/WeekView";
import { getWeek, weeks } from "@/data/curriculum";

export function generateStaticParams() {
  return weeks.map((week) => ({ n: String(week.number) }));
}

export async function generateMetadata({ params }: PageProps<"/week/[n]">): Promise<Metadata> {
  const { n } = await params;
  const week = getWeek(Number(n));
  return { title: week ? `Week ${week.number}: ${week.title}` : "Week not found" };
}

export default async function WeekPage({ params }: PageProps<"/week/[n]">) {
  const { n } = await params;
  const week = getWeek(Number(n));
  if (!week) notFound();

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      <LockGate weekNumber={week.number}>
        <WeekView week={week} />
      </LockGate>
    </div>
  );
}
