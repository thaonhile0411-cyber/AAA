export type StreakActivityDay = {
  date: string;
  completions: number;
  active: boolean;
};

function asUtcDate(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function offsetDate(date: string, offset: number) {
  const value = asUtcDate(date);
  value.setUTCDate(value.getUTCDate() + offset);
  return isoDate(value);
}

/**
 * Count consecutive active calendar days. If today has not finished yet, a
 * streak ending yesterday remains visible; missing yesterday resets to zero.
 */
export function calculateStreak(activeDates: Iterable<string>, today: string) {
  const active = new Set(activeDates);
  let cursor = active.has(today)
    ? today
    : active.has(offsetDate(today, -1))
      ? offsetDate(today, -1)
      : null;
  let streak = 0;
  while (cursor && active.has(cursor)) {
    streak += 1;
    cursor = offsetDate(cursor, -1);
  }
  return streak;
}

/** Return seven inclusive local calendar days, oldest first, with safe counts. */
export function lastSevenActivity(completionsByDate: Record<string, number>, today: string): StreakActivityDay[] {
  return Array.from({ length: 7 }, (_, index) => {
    const date = offsetDate(today, index - 6);
    const completions = Math.max(0, Math.floor(completionsByDate[date] ?? 0));
    return { date, completions, active: completions > 0 };
  });
}
