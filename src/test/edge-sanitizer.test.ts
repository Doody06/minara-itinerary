import { describe, it, expect } from "vitest";
import {
  sanitizeStrings,
  sanitizeItineraryItem,
  sanitizeItinerary,
} from "../../supabase/functions/generate-itinerary/sanitizers";
import { unicodeDayPlan } from "./fixtures/itineraryResponses";

describe("sanitizeStrings — Unicode preservation", () => {
  it("preserves Arabic text", () => {
    expect(sanitizeStrings("مسجد السلطان")).toBe("مسجد السلطان");
  });

  it("preserves Turkish diacritics in Latin Extended-A range (ğ ı ş ç ö ü)", () => {
    expect(sanitizeStrings("ğ ı ş ç ö ü")).toBe("ğ ı ş ç ö ü");
  });

  it("preserves Japanese katakana text", () => {
    expect(sanitizeStrings("スレイマニエ")).toBe("スレイマニエ");
  });

  it("strips LLM finish artifact", () => {
    expect(sanitizeStrings("Blue Mosque}}finish_reason:complete")).toBe("Blue Mosque");
  });
});

describe("sanitizeItineraryItem — leaked field pattern", () => {
  it("strips leaked field pattern from title", () => {
    const item = {
      title: "Place Name,type:food,badges:[",
      description: "A fine place.",
    };
    const result = sanitizeItineraryItem(item) as typeof item;
    expect(result.title).toBe("Place Name");
  });

  it("leaves clean title untouched", () => {
    const item = { title: "Blue Mosque", description: "Historic Ottoman mosque." };
    const result = sanitizeItineraryItem(item) as typeof item;
    expect(result.title).toBe("Blue Mosque");
  });
});

describe("sanitizeItinerary — unicodeDayPlan end-to-end", () => {
  it("Arabic, Turkish, and Japanese text all survive sanitization", () => {
    const copy = JSON.parse(JSON.stringify({ days: [unicodeDayPlan] }));
    const result = sanitizeItinerary(copy) as { days: typeof import("./fixtures/itineraryResponses").unicodeDayPlan[] };
    const day = result.days[0];

    expect(day.title).toContain("Süleymaniye");
    expect(day.title).toContain("سليمانية");
    expect(day.title).toContain("スレイマニエ");
    expect(day.items[0].title).toContain("مسجد السلطان");
  });
});
