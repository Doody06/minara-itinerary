import { describe, it, expect } from "vitest";
import { sanitizeStrings, sanitizeItineraryItem } from "../../supabase/functions/generate-itinerary/sanitizers";
import { unicodeDayPlan } from "./fixtures/itineraryResponses";

describe("sanitizeStrings — Unicode preservation", () => {
  it("preserves Arabic script", () => {
    const result = sanitizeStrings({ title: "مسجد السلطان" });
    expect(result.title).toBe("مسجد السلطان");
  });

  it("preserves Turkish diacritics", () => {
    const result = sanitizeStrings({ title: "ğ ı ş ç ö ü" });
    expect(result.title).toBe("ğ ı ş ç ö ü");
  });

  it("preserves Japanese katakana", () => {
    const result = sanitizeStrings({ title: "スレイマニエ" });
    expect(result.title).toBe("スレイマニエ");
  });

  it("strips LLM finish artifact", () => {
    const result = sanitizeStrings({ title: "Blue Mosque}}finish_reason:complete" });
    expect(result.title).toBe("Blue Mosque");
  });
});

describe("sanitizeItineraryItem — leaked field stripping", () => {
  it("strips leaked field pattern from title", () => {
    const item = { ...unicodeDayPlan.items[0], title: "Masjid Sultan,type:food,badges:[" };
    const result = sanitizeItineraryItem(item);
    expect(result.title).toBe("Masjid Sultan");
  });
});

describe("unicodeDayPlan fixture round-trip", () => {
  it("sanitizeStrings preserves all multilingual text in the fixture", () => {
    const result = sanitizeStrings(unicodeDayPlan);
    // day title contains Arabic (سليمانية) and Japanese (スレイマニエ)
    expect(result.title).toContain("سليمانية");
    expect(result.title).toContain("スレイマニエ");
    // item title contains Arabic
    expect(result.items[0].title).toContain("مسجد السلطان");
  });
});
