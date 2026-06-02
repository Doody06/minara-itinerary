/**
 * Integration tests — cross-boundary contracts between backend (Person B)
 * and frontend (Person A).
 *
 * These tests import from BOTH the Supabase edge function modules and the
 * frontend library to verify that what the backend produces is what the
 * frontend accepts. A failure here means the two sides have drifted apart
 * and need a shared-contract PR before merging.
 */

import { describe, it, expect } from "vitest";

// Person B — backend edge function modules
import {
  sanitizeItinerary,
  sanitizeHotel,
} from "../../supabase/functions/generate-itinerary/sanitizers";
import {
  isValidFullResponse,
  isValidWholeAdjustResponse,
  isValidTargetedAdjustResponse,
  formatAdjustResponse,
} from "../../supabase/functions/generate-itinerary/validators";
import { normalizeConfidenceScore } from "../../supabase/functions/generate-itinerary/learning-utils";

// Person A — frontend validators and sanitizers
import {
  isValidDayPlan,
  isValidDays,
  isValidHotel,
  cleanString,
} from "@/lib/itineraryContext";

// Shared fixtures
import {
  validDay1,
  validDay2,
  validHotel,
  validItem,
  unicodeDayPlan,
} from "./fixtures/itineraryResponses";

// Shared destination metadata
import { destinationMetadata } from "@/data/dummyData";

// ---------------------------------------------------------------------------
// 1. Backend sanitizer → Frontend validator
// Tests that sanitizeItinerary (Person B) produces days arrays that pass
// isValidDays (Person A) — the core full-response pipeline.
// ---------------------------------------------------------------------------

describe("sanitizeItinerary → isValidDays", () => {
  it("sanitized multi-day response passes frontend isValidDays", () => {
    const response = { days: [{ ...validDay1 }, { ...validDay2 }], hotel: { ...validHotel } };
    sanitizeItinerary(response);
    expect(isValidDays((response as Record<string, unknown>).days)).toBe(true);
  });

  it("sanitized single-day response passes frontend isValidDays", () => {
    const response = { days: [{ ...validDay1 }], hotel: null };
    sanitizeItinerary(response);
    expect(isValidDays((response as Record<string, unknown>).days)).toBe(true);
  });

  it("day with leaked-field title is cleaned by backend and still valid for frontend", () => {
    const dirtyDay = {
      day: 1,
      title: "Blue Mosque,type:activity,badges:[prayer-nearby]",
      items: [{ ...validItem }],
    };
    const response = { days: [dirtyDay], hotel: null };
    sanitizeItinerary(response);
    const days = (response as Record<string, unknown>).days as typeof dirtyDay[];
    expect(isValidDays(days)).toBe(true);
    // Leaked field must be stripped
    expect(days[0].title).not.toContain("type:activity");
    expect(days[0].title).toBe("Blue Mosque");
  });

  it("item with leaked-field artifact in title is cleaned and passes isValidDays", () => {
    // sanitizeItineraryItem strips LEAKED_FIELD_PATTERN (comma-prefixed field names)
    const dirtyItem = { ...validItem, title: "Topkapi Palace,type:activity,badges:[prayer-nearby]" };
    const response = { days: [{ day: 1, title: "Day 1", items: [dirtyItem] }], hotel: null };
    sanitizeItinerary(response);
    const days = (response as Record<string, unknown>).days as { items: { title: string }[] }[];
    expect(isValidDays(days)).toBe(true);
    expect(days[0].items[0].title).toBe("Topkapi Palace");
  });
});

// ---------------------------------------------------------------------------
// 2. Backend sanitizeHotel → Frontend isValidHotel
// ---------------------------------------------------------------------------

describe("sanitizeHotel → frontend isValidHotel", () => {
  it("sanitized valid hotel passes frontend isValidHotel", () => {
    const sanitized = sanitizeHotel({ ...validHotel });
    expect(isValidHotel(sanitized)).toBe(true);
  });

  it("hotel with leaked priceRange in name is fixed and still valid", () => {
    const dirty = { ...validHotel, name: "Grand Hotel,priceRange:$100" };
    const sanitized = sanitizeHotel(dirty) as Record<string, unknown>;
    expect(isValidHotel(sanitized)).toBe(true);
    expect(sanitized.name).not.toContain("priceRange");
  });

  it("hotel with non-standard priceRange format is normalised and stays valid", () => {
    const dirty = { ...validHotel, priceRange: "$80 - $150" };
    const sanitized = sanitizeHotel(dirty) as Record<string, unknown>;
    expect(isValidHotel(sanitized)).toBe(true);
    expect(sanitized.priceRange).toMatch(/^\$\d+-\d+\/night$/);
  });
});

// ---------------------------------------------------------------------------
// 3. Backend formatter → Frontend validator
// Verifies that what formatAdjustResponse sends to the client is accepted by
// the frontend's type guards — the targeted and whole adjust pipelines.
// ---------------------------------------------------------------------------

describe("formatAdjustResponse → frontend validators", () => {
  it("targeted: adjustedDay passes frontend isValidDayPlan", () => {
    const rawAI = { days: [{ ...validDay1 }], hotel: null };
    const formatted = formatAdjustResponse("targeted", rawAI as Record<string, unknown>, 1);
    expect(isValidDayPlan(formatted.adjustedDay)).toBe(true);
  });

  it("targeted: output has adjustedDay, no days key — matches itineraryContext shape check", () => {
    const rawAI = { days: [{ ...validDay1, day: 3 }], hotel: null };
    const formatted = formatAdjustResponse("targeted", rawAI as Record<string, unknown>, 3);
    expect(formatted).toHaveProperty("adjustedDay");
    expect(formatted).not.toHaveProperty("days");
    // Frontend checks: data.adjustedDay.day === dayNumber
    expect((formatted.adjustedDay as Record<string, unknown>).day).toBe(3);
  });

  it("whole: days pass frontend isValidDays", () => {
    const rawAI = { days: [{ ...validDay1 }, { ...validDay2 }], hotel: { ...validHotel } };
    const formatted = formatAdjustResponse("whole", rawAI as Record<string, unknown>);
    expect(isValidDays(formatted.days)).toBe(true);
  });

  it("whole: output has days array, no adjustedDay key — matches itineraryContext shape check", () => {
    const rawAI = { days: [{ ...validDay1 }], hotel: null };
    const formatted = formatAdjustResponse("whole", rawAI as Record<string, unknown>);
    expect(formatted).toHaveProperty("days");
    expect(formatted).not.toHaveProperty("adjustedDay");
  });
});

// ---------------------------------------------------------------------------
// 4. Full pipeline: backend validate → backend format → frontend validate
// Each step runs on the same data to confirm no step breaks the invariants.
// ---------------------------------------------------------------------------

describe("Full pipeline: AI response → backend → frontend", () => {
  it("targeted adjust: backend validates AI response, formats, frontend accepts result", () => {
    const aiResponse = { days: [{ ...validDay1 }], hotel: null };
    // Step 1: backend validates the AI raw response
    expect(isValidTargetedAdjustResponse(aiResponse)).toBe(true);
    // Step 2: backend formats it for the client
    const formatted = formatAdjustResponse("targeted", aiResponse as Record<string, unknown>, 1);
    // Step 3: frontend accepts the formatted output
    expect(isValidDayPlan(formatted.adjustedDay)).toBe(true);
  });

  it("whole adjust: backend validates AI response, formats, frontend accepts result", () => {
    const aiResponse = { days: [{ ...validDay1 }, { ...validDay2 }], hotel: { ...validHotel } };
    expect(isValidWholeAdjustResponse(aiResponse)).toBe(true);
    const formatted = formatAdjustResponse("whole", aiResponse as Record<string, unknown>);
    expect(isValidDays(formatted.days)).toBe(true);
  });

  it("full generation: backend validates AI response, sanitizes, frontend accepts result", () => {
    const aiResponse = {
      days: [{ ...validDay1 }, { ...validDay2 }],
      hotel: { ...validHotel },
    };
    // Step 1: backend validates
    expect(isValidFullResponse(aiResponse)).toBe(true);
    // Step 2: backend sanitizes
    sanitizeItinerary(aiResponse);
    // Step 3: frontend accepts
    expect(isValidDays((aiResponse as Record<string, unknown>).days)).toBe(true);
    expect(isValidHotel((aiResponse as Record<string, unknown>).hotel)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 5. Unicode round-trip: backend sanitizer preserves what frontend cleanString accepts
// Regression guard for the STRIP_NON_ASCII pattern that broke non-Latin scripts.
// ---------------------------------------------------------------------------

describe("Unicode round-trip: sanitizeItinerary → cleanString", () => {
  it("Arabic text survives backend sanitization and frontend cleanString", () => {
    const response = { days: [{ ...unicodeDayPlan, items: [...unicodeDayPlan.items] }], hotel: null };
    sanitizeItinerary(response);
    const items = ((response as Record<string, unknown>).days as typeof unicodeDayPlan[])[0].items;
    expect(cleanString(items[0].title)).toContain("مسجد السلطان");
  });

  it("Turkish diacritics survive backend sanitization and frontend cleanString", () => {
    const response = { days: [{ ...unicodeDayPlan }], hotel: null };
    sanitizeItinerary(response);
    const dayTitle = ((response as Record<string, unknown>).days as typeof unicodeDayPlan[])[0].title;
    expect(cleanString(dayTitle)).toContain("Süleymaniye");
  });

  it("Japanese kanji survive backend sanitization and frontend cleanString", () => {
    const response = { days: [{ ...unicodeDayPlan, items: [...unicodeDayPlan.items] }], hotel: null };
    sanitizeItinerary(response);
    const items = ((response as Record<string, unknown>).days as typeof unicodeDayPlan[])[0].items;
    expect(cleanString(items[1].description)).toContain("清真食品");
  });

  it("full unicode day title survives the full pipeline and isValidDays still passes", () => {
    const response = { days: [{ ...unicodeDayPlan }], hotel: null };
    sanitizeItinerary(response);
    expect(isValidDays((response as Record<string, unknown>).days)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 6. normalizeConfidenceScore zero-value preservation
// A score of 0 must NOT be coerced to 60 (the AI-omission default) at any
// pipeline stage — backend normaliser, backend sanitizer, or frontend.
// ---------------------------------------------------------------------------

describe("normalizeConfidenceScore → backend sanitizer (zero confidence preserved)", () => {
  it("normalizeConfidenceScore(0) returns exactly 0, not the 60 default", () => {
    expect(normalizeConfidenceScore(0)).toBe(0);
  });

  it("an item with confidenceScore=0 survives sanitizeItinerary unchanged", () => {
    const zeroItem = { ...validItem, confidenceScore: 0, id: "zero-1" };
    const response = { days: [{ day: 1, title: "Day 1", items: [zeroItem] }], hotel: null };
    sanitizeItinerary(response);
    const items = ((response as Record<string, unknown>).days as { items: { confidenceScore: number }[] }[])[0].items;
    expect(items[0].confidenceScore).toBe(0);
  });

  it("a zero-confidence day still passes frontend isValidDays", () => {
    const zeroItem = { ...validItem, confidenceScore: 0, id: "zero-2" };
    const response = { days: [{ day: 1, title: "Day 1", items: [zeroItem] }], hotel: null };
    sanitizeItinerary(response);
    expect(isValidDays((response as Record<string, unknown>).days)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 7. All 5 destinations have prayer method config
// London and Tokyo are not covered by prayer-methods.test.ts.
// ---------------------------------------------------------------------------

describe("All 5 destinations have prayerMethod config", () => {
  const allDestinations = ["istanbul", "dubai", "london", "tokyo", "kuala-lumpur"];
  for (const dest of allDestinations) {
    it(`${dest} is in destinationMetadata with a numeric prayerMethod > 0`, () => {
      const meta = destinationMetadata.find((m) => m.value === dest);
      expect(meta).toBeDefined();
      expect(typeof meta?.prayerMethod).toBe("number");
      expect(meta!.prayerMethod).toBeGreaterThan(0);
    });
  }
});

// ---------------------------------------------------------------------------
// 8. Frontend error consumption — data.error field is readable
// The frontend reads data?.error to surface error messages; verify that all
// structured error fixtures from the backend have a non-empty error string.
// ---------------------------------------------------------------------------

import {
  genericErrorResponse,
  rateLimitErrorResponse,
  paymentErrorResponse,
  invalidAiOutputErrorResponse,
} from "./fixtures/itineraryResponses";

describe("Error response shapes consumed by frontend", () => {
  it("generic error has a non-empty error string", () => {
    expect(typeof genericErrorResponse.error).toBe("string");
    expect(genericErrorResponse.error.length).toBeGreaterThan(0);
  });

  it("rate limit error has code RATE_LIMITED and retryable=true", () => {
    expect(rateLimitErrorResponse.code).toBe("RATE_LIMITED");
    expect(rateLimitErrorResponse.retryable).toBe(true);
    expect(typeof rateLimitErrorResponse.error).toBe("string");
  });

  it("payment error has code PAYMENT_REQUIRED and retryable=false", () => {
    expect(paymentErrorResponse.code).toBe("PAYMENT_REQUIRED");
    expect(paymentErrorResponse.retryable).toBe(false);
  });

  it("invalid AI output error is retryable", () => {
    expect(invalidAiOutputErrorResponse.retryable).toBe(true);
  });
});
