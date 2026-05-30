import { describe, it, expect } from "vitest";
import { formatAdjustResponse } from "../../supabase/functions/generate-itinerary/validators";
import { validDay1, validHotel, validWholeAdjustResponse } from "./fixtures/itineraryResponses";

describe("formatAdjustResponse — targeted mode", () => {
  it("returns adjustedDay shape (no days key) and hotel: null when hotel absent", () => {
    const rawData = { days: [validDay1], hotel: null };
    const result = formatAdjustResponse("targeted", rawData as Record<string, unknown>, 1);
    expect(result).toHaveProperty("adjustedDay");
    expect(result).not.toHaveProperty("days");
    expect(result.hotel).toBeNull();
  });

  it("returns hotel: null when hotel is undefined", () => {
    const rawData = { days: [validDay1], hotel: undefined };
    const result = formatAdjustResponse("targeted", rawData as Record<string, unknown>, 1);
    expect(result.hotel).toBeNull();
  });

  it("sets adjustedDay.day to the requested targetDayNumber", () => {
    const rawData = { days: [{ ...validDay1, day: 1 }], hotel: null };
    const result = formatAdjustResponse("targeted", rawData as Record<string, unknown>, 1);
    expect((result.adjustedDay as Record<string, unknown>).day).toBe(1);
  });
});

describe("formatAdjustResponse — whole mode", () => {
  it("returns days array shape (no adjustedDay key) and hotel from data", () => {
    const result = formatAdjustResponse("whole", validWholeAdjustResponse as unknown as Record<string, unknown>);
    expect(result).toHaveProperty("days");
    expect(result).not.toHaveProperty("adjustedDay");
    expect(Array.isArray(result.days)).toBe(true);
    expect(result.hotel).toEqual(validHotel);
  });

  it("returns hotel: null when hotel is undefined in whole mode", () => {
    const rawData = { days: [validDay1], hotel: undefined };
    const result = formatAdjustResponse("whole", rawData as Record<string, unknown>);
    expect(result.hotel).toBeNull();
  });
});
