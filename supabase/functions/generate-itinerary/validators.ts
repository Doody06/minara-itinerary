function hasValidDays(data: unknown): boolean {
  if (!data || typeof data !== "object") return false;
  const record = data as Record<string, unknown>;
  if (!Array.isArray(record.days) || record.days.length === 0) return false;
  return record.days.every((day) => {
    if (!day || typeof day !== "object") return false;
    const items = (day as Record<string, unknown>).items;
    return Array.isArray(items) && items.length > 0;
  });
}

export const isValidFullResponse = hasValidDays;
export const isValidWholeAdjustResponse = hasValidDays;

export function isValidTargetedAdjustResponse(data: unknown): boolean {
  if (!data || typeof data !== "object") return false;
  const record = data as Record<string, unknown>;
  const adjustedDay = record.adjustedDay;
  if (!adjustedDay || typeof adjustedDay !== "object") return false;
  const items = (adjustedDay as Record<string, unknown>).items;
  return Array.isArray(items) && items.length > 0;
}

export function isValidHotel(hotel: unknown): boolean {
  if (!hotel || typeof hotel !== "object") return false;
  const h = hotel as Record<string, unknown>;
  return (
    typeof h.name === "string" &&
    typeof h.description === "string" &&
    Array.isArray(h.badges) &&
    typeof h.halalStatus === "string" &&
    typeof h.confidenceScore === "number" &&
    typeof h.priceRange === "string"
  );
}
