/**
 * Stabilization test suite — Person A ownership.
 * Covers: cleanString Unicode, type guards, trip-length cap, dialog edge
 * cases (confidenceScore 0, lat/lng 0), and ErrorBoundary fallback.
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { cleanString, isValidDayPlan, isValidDays, isValidHotel } from "@/lib/itineraryContext";
import { PlaceDetailDialog } from "@/components/PlaceDetailDialog";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import type { ItineraryItem } from "@/data/dummyData";
import {
  validDay1,
  validDay2,
  validHotel,
  missingDaysResponse,
  emptyDaysResponse,
  nonArrayDaysResponse,
  dayWithNoItemsResponse,
  missingAdjustedDayResponse,
  adjustedDayEmptyItemsResponse,
  malformedHotelResponse,
  unicodeDayPlan,
  validItemZeroConfidence,
} from "@/test/fixtures/itineraryResponses";

// ---------------------------------------------------------------------------
// cleanString — Unicode preservation
// ---------------------------------------------------------------------------

describe("cleanString Unicode preservation", () => {
  it("preserves Arabic text", () => {
    const result = cleanString("مسجد السلطان");
    expect(result).toBe("مسجد السلطان");
  });

  it("preserves Turkish diacritics", () => {
    const result = cleanString("Süleymaniye Camii");
    expect(result).toBe("Süleymaniye Camii");
  });

  it("preserves Malay text", () => {
    const result = cleanString("Jam buka: 9.00 pagi.");
    expect(result).toBe("Jam buka: 9.00 pagi.");
  });

  it("preserves Japanese characters", () => {
    const result = cleanString("清真食品");
    expect(result).toBe("清真食品");
  });

  it("preserves currency symbols including RM and ₺", () => {
    expect(cleanString("RM 12–18")).toBe("RM 12–18");
    expect(cleanString("₺150")).toBe("₺150");
    expect(cleanString("€45")).toBe("€45");
  });

  it("strips LLM finish_reason artifact", () => {
    const result = cleanString("Blue Mosque}}finish_reason:stop");
    expect(result).toBe("Blue Mosque");
  });

  it("strips Base repetition artifact", () => {
    const result = cleanString("Istanbul BaseBaseBase");
    expect(result).toBe("Istanbul");
  });

  it("strips C0 control characters but keeps tab", () => {
    // \x01 and \x02 are stripped; \t (0x09) is preserved
    const result = cleanString("a\x01\x02b\tc");
    expect(result).toBe("ab\tc");
  });

  it("preserves full unicode day title from fixture", () => {
    const result = cleanString(unicodeDayPlan.title);
    expect(result).toContain("Süleymaniye");
    expect(result).toContain("سليمانية");
    expect(result).toContain("スレイマニエ");
  });
});

// ---------------------------------------------------------------------------
// isValidDayPlan
// ---------------------------------------------------------------------------

describe("isValidDayPlan", () => {
  it("accepts a valid day", () => {
    expect(isValidDayPlan(validDay1)).toBe(true);
  });

  it("rejects null", () => {
    expect(isValidDayPlan(null)).toBe(false);
  });

  it("rejects day with empty items array", () => {
    expect(isValidDayPlan({ day: 1, title: "Day 1", items: [] })).toBe(false);
  });

  it("rejects day with missing title", () => {
    expect(isValidDayPlan({ day: 1, title: "", items: [{}] })).toBe(false);
  });

  it("rejects non-object", () => {
    expect(isValidDayPlan("not a day")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isValidDays
// ---------------------------------------------------------------------------

describe("isValidDays", () => {
  it("accepts a valid days array", () => {
    expect(isValidDays([validDay1, validDay2])).toBe(true);
  });

  it("rejects missing days (undefined)", () => {
    expect(isValidDays((missingDaysResponse as any).days)).toBe(false);
  });

  it("rejects empty array", () => {
    expect(isValidDays(emptyDaysResponse.days)).toBe(false);
  });

  it("rejects non-array", () => {
    expect(isValidDays(nonArrayDaysResponse.days)).toBe(false);
  });

  it("rejects array where a day has empty items", () => {
    expect(isValidDays(dayWithNoItemsResponse.days)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isValidHotel
// ---------------------------------------------------------------------------

describe("isValidHotel", () => {
  it("accepts a valid hotel", () => {
    expect(isValidHotel(validHotel)).toBe(true);
  });

  it("rejects null hotel", () => {
    expect(isValidHotel(null)).toBe(false);
  });

  it("rejects malformed hotel missing required fields", () => {
    expect(isValidHotel(malformedHotelResponse.hotel)).toBe(false);
  });

  it("rejects non-object", () => {
    expect(isValidHotel("not a hotel")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Trip length cap — pure calculation (mirrors PlanPage.tsx logic)
// ---------------------------------------------------------------------------

function tripDays(startDate: string, endDate: string): number {
  if (!startDate || !endDate) return 0;
  return (
    Math.round(
      (new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000
    ) + 1
  );
}

describe("tripDays calculation", () => {
  it("counts a 1-day trip as 1", () => {
    expect(tripDays("2026-06-01", "2026-06-01")).toBe(1);
  });

  it("counts a 15-day trip as 15 (should be allowed)", () => {
    expect(tripDays("2026-06-01", "2026-06-15")).toBe(15);
  });

  it("counts a 16-day trip as 16 (should be blocked)", () => {
    expect(tripDays("2026-06-01", "2026-06-16")).toBe(16);
  });

  it("returns 0 when dates are missing", () => {
    expect(tripDays("", "2026-06-10")).toBe(0);
    expect(tripDays("2026-06-01", "")).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// PlaceDetailDialog — confidenceScore 0 renders the low-confidence note
// ---------------------------------------------------------------------------

// validItemZeroConfidence has `badges: readonly []` from the fixture const assertion;
// cast to ItineraryItem so the mutable Badge[] prop is satisfied.
const zeroConfItem = validItemZeroConfidence as unknown as ItineraryItem;

describe("PlaceDetailDialog confidenceScore 0", () => {
  it("shows the low-confidence note when confidenceScore is 0", () => {
    render(
      <PlaceDetailDialog
        item={zeroConfItem}
        open
        onOpenChange={() => {}}
        destination="istanbul"
      />
    );
    expect(screen.getByText(/No information available/i)).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// PlaceDetailDialog — lat=0, lng=0 uses coordinate-based embed URL
// ---------------------------------------------------------------------------

describe("PlaceDetailDialog map embed with zero coordinates", () => {
  it("uses coordinate embed URL when lat and lng are 0", () => {
    render(
      <PlaceDetailDialog
        item={zeroConfItem}
        open
        onOpenChange={() => {}}
        destination="istanbul"
      />
    );
    // Dialog renders into a portal outside `container` — query the full document.
    const iframe = document.querySelector("iframe");
    expect(iframe?.getAttribute("src")).toContain("q=0,0");
  });
});

// ---------------------------------------------------------------------------
// ErrorBoundary — renders fallback on render error
// ---------------------------------------------------------------------------

function ThrowOnRender(): never {
  throw new Error("test render error");
}

describe("ErrorBoundary", () => {
  it("renders fallback UI when a child throws", () => {
    // Suppress the expected console.error from React's error boundary
    const spy = import.meta.env ? undefined : null;
    void spy;
    const consoleError = console.error;
    console.error = () => {};

    render(
      <ErrorBoundary>
        <ThrowOnRender />
      </ErrorBoundary>
    );

    console.error = consoleError;

    expect(screen.getByText(/something went wrong/i)).toBeTruthy();
    expect(screen.getByRole("link", { name: /start planning/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /reload/i })).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Fixture completeness — ensure shared fixtures satisfy type guards
// ---------------------------------------------------------------------------

describe("shared fixtures match type guards", () => {
  it("validDay1 and validDay2 are valid day plans", () => {
    expect(isValidDayPlan(validDay1)).toBe(true);
    expect(isValidDayPlan(validDay2)).toBe(true);
  });

  it("missingAdjustedDayResponse has no adjustedDay", () => {
    expect(isValidDayPlan((missingAdjustedDayResponse as any).adjustedDay)).toBe(false);
  });

  it("adjustedDayEmptyItemsResponse has invalid adjustedDay", () => {
    expect(isValidDayPlan(adjustedDayEmptyItemsResponse.adjustedDay)).toBe(false);
  });
});
