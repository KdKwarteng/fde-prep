import { TOTAL_WEEKS } from "@/data/curriculum";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Parse YYYY-MM-DD as a UTC midnight timestamp so day math ignores DST. */
function toUtc(day: string): number {
  const [year, month, date] = day.split("-").map(Number);
  return Date.UTC(year, month - 1, date);
}

/**
 * The week of the plan that `today` falls in, clamped to 1..TOTAL_WEEKS.
 * Before the start date this is week 1 so there is always something to do.
 */
export function currentWeekNumber(startDate: string, today: string): number {
  const elapsedDays = Math.floor((toUtc(today) - toUtc(startDate)) / DAY_MS);
  const week = Math.floor(elapsedDays / 7) + 1;
  return Math.min(Math.max(week, 1), TOTAL_WEEKS);
}

export function weekStartDate(startDate: string, weekNumber: number): Date {
  return new Date(toUtc(startDate) + (weekNumber - 1) * 7 * DAY_MS);
}

const formatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

export function formatWeekRange(startDate: string, weekNumber: number): string {
  const start = weekStartDate(startDate, weekNumber);
  const end = new Date(start.getTime() + 6 * DAY_MS);
  return `${formatter.format(start)} to ${formatter.format(end)}`;
}

export function formatDay(date: Date): string {
  return formatter.format(date);
}

/** Consecutive days with activity, ending today or yesterday. */
export function currentStreak(activity: Record<string, number>, today: string): number {
  let cursor = toUtc(today);
  const key = (time: number) => new Date(time).toISOString().slice(0, 10);
  if (!activity[key(cursor)]) cursor -= DAY_MS;
  let streak = 0;
  while (activity[key(cursor)]) {
    streak += 1;
    cursor -= DAY_MS;
  }
  return streak;
}
