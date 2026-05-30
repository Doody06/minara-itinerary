import { describe, it, expect } from "vitest";
import { normalizeConfidenceScore } from "../../supabase/functions/generate-itinerary/learning-utils";

describe("normalizeConfidenceScore", () => {
  it("returns 0 for score=0 — must NOT silently become 60", () => {
    expect(normalizeConfidenceScore(0)).toBe(0);
  });

  it("returns 60 for undefined (default when AI omits the field)", () => {
    expect(normalizeConfidenceScore(undefined)).toBe(60);
  });

  it("returns 60 for null", () => {
    expect(normalizeConfidenceScore(null)).toBe(60);
  });

  it("rounds non-zero scores correctly", () => {
    expect(normalizeConfidenceScore(85.7)).toBe(86);
  });
});
