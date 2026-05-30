export function normalizeConfidenceScore(score: unknown): number {
  if (score == null) return 60;
  const n = Number(score);
  return isNaN(n) ? 60 : Math.round(n);
}
