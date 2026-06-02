import { describe, it, expect } from "vitest";
import {
  isValidFullResponse,
  isValidWholeAdjustResponse,
  isValidTargetedAdjustResponse,
  isValidHotel,
} from "../../supabase/functions/generate-itinerary/validators";
import {
  validFullResponse,
  validFullResponseNoHotel,
  validWholeAdjustResponse,
  validTargetedAdjustResponse,
  missingDaysResponse,
  emptyDaysResponse,
  nonArrayDaysResponse,
  dayWithNoItemsResponse,
  missingAdjustedDayResponse,
  adjustedDayEmptyItemsResponse,
  malformedHotelResponse,
  validHotel,
} from "./fixtures/itineraryResponses";

describe("isValidFullResponse", () => {
  it("passes for a valid full response", () => {
    expect(isValidFullResponse(validFullResponse)).toBe(true);
  });

  it("passes when hotel is null (hotel is not a days concern)", () => {
    expect(isValidFullResponse(validFullResponseNoHotel)).toBe(true);
  });

  it("passes for malformedHotelResponse (hotel is a separate concern)", () => {
    expect(isValidFullResponse(malformedHotelResponse)).toBe(true);
  });

  it("fails when days is missing", () => {
    expect(isValidFullResponse(missingDaysResponse)).toBe(false);
  });

  it("fails when days is an empty array", () => {
    expect(isValidFullResponse(emptyDaysResponse)).toBe(false);
  });

  it("fails when days is not an array", () => {
    expect(isValidFullResponse(nonArrayDaysResponse)).toBe(false);
  });

  it("fails when a day has an empty items array", () => {
    expect(isValidFullResponse(dayWithNoItemsResponse)).toBe(false);
  });

  it("fails for null", () => {
    expect(isValidFullResponse(null)).toBe(false);
  });
});

describe("isValidWholeAdjustResponse", () => {
  it("passes for a valid whole-adjust response", () => {
    expect(isValidWholeAdjustResponse(validWholeAdjustResponse)).toBe(true);
  });

  it("fails when days is missing", () => {
    expect(isValidWholeAdjustResponse(missingDaysResponse)).toBe(false);
  });

  it("shares implementation with isValidFullResponse", () => {
    // Both must agree on every fixture
    const fixtures = [validFullResponse, missingDaysResponse, emptyDaysResponse, dayWithNoItemsResponse];
    for (const f of fixtures) {
      expect(isValidWholeAdjustResponse(f)).toBe(isValidFullResponse(f));
    }
  });
});

describe("isValidTargetedAdjustResponse", () => {
  it("passes for a valid targeted adjust response (days array shape)", () => {
    expect(isValidTargetedAdjustResponse(validTargetedAdjustResponse)).toBe(true);
  });

  it("fails when days is missing", () => {
    expect(isValidTargetedAdjustResponse(missingAdjustedDayResponse)).toBe(false);
  });

  it("fails when the day has an empty items array", () => {
    expect(isValidTargetedAdjustResponse(adjustedDayEmptyItemsResponse)).toBe(false);
  });

  it("fails for null", () => {
    expect(isValidTargetedAdjustResponse(null)).toBe(false);
  });
});

describe("isValidHotel", () => {
  it("passes for a valid hotel", () => {
    expect(isValidHotel(validHotel)).toBe(true);
  });

  it("fails for a malformed hotel missing required fields", () => {
    expect(isValidHotel({ name: "Incomplete Hotel" })).toBe(false);
  });

  it("fails for null", () => {
    expect(isValidHotel(null)).toBe(false);
  });

  it("fails for a non-object", () => {
    expect(isValidHotel("not a hotel")).toBe(false);
  });
});
