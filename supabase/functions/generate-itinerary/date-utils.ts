const MS_PER_DAY = 1000 * 60 * 60 * 24;

// UTC parsing prevents DST/timezone shifts from skewing day counts.
// A trip from Mar 26 to Mar 30 yields 4 days (return date is a travel day).
export function parseDateOnlyAsUtc(dateString: string): Date {
  const [year, month, day] = dateString.split("-").map(Number);
  if (!year || !month || !day) {
    throw new Error(`Invalid date: ${dateString}`);
  }
  return new Date(Date.UTC(year, month - 1, day));
}

export function calculateTripDays(startDate: string, endDate: string): number {
  const start = parseDateOnlyAsUtc(startDate);
  const end = parseDateOnlyAsUtc(endDate);
  const diffInDays = Math.round((end.getTime() - start.getTime()) / MS_PER_DAY) + 1;
  return Math.min(Math.max(1, diffInDays), 15);
}
