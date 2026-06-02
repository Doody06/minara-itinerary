/**
 * Shared test fixtures for itinerary API response shapes.
 * Both Person A (frontend tests) and Person B (edge function tests) import from here.
 * Keep in sync with docs/itinerary-api-contract.md and src/data/dummyData.ts.
 */

import type { DayPlan } from "@/data/dummyData";
import type { HotelSuggestion } from "@/lib/itineraryContext";

// ---------------------------------------------------------------------------
// Building blocks
// ---------------------------------------------------------------------------

export const validItem = {
  id: "1-1",
  time: "9:00 AM",
  title: "Blue Mosque Visit",
  description: "Iconic Ottoman mosque in Sultanahmet, open to visitors outside prayer times.",
  type: "activity" as const,
  badges: ["muslim-friendly", "prayer-nearby", "family-friendly"] as const,
  halalStatus: "verified" as const,
  confidenceScore: 95,
  explanation: "",
  cost: "Free",
  latitude: 41.0054,
  longitude: 28.9768,
};

export const validItemLowConfidence = {
  id: "1-2",
  time: "1:00 PM",
  title: "Local Café",
  description: "Small café near the bazaar.",
  type: "food" as const,
  badges: ["budget-fit"] as const,
  halalStatus: "needs-check" as const,
  confidenceScore: 55,
  explanation: "Could not verify halal certification; check with the restaurant directly.",
  cost: "$5–10",
  latitude: 41.0082,
  longitude: 28.9784,
};

export const validItemZeroConfidence = {
  id: "1-3",
  time: "3:00 PM",
  title: "Unnamed Street Vendor",
  description: "Popular street food stall.",
  type: "food" as const,
  badges: [] as const,
  halalStatus: "needs-check" as const,
  confidenceScore: 0,
  explanation: "No information available; verify halal status on-site.",
  cost: "$2–5",
  latitude: 0,   // explicit zero coordinates — must still be usable as map link
  longitude: 0,
};

export const validDay1: DayPlan = {
  day: 1,
  title: "Sultanahmet — Islamic Heritage & Old City",
  items: [validItem, validItemLowConfidence],
};

export const validDay2: DayPlan = {
  day: 2,
  title: "Fatih — Culture & Cuisine",
  items: [
    {
      id: "2-1",
      time: "8:00 AM",
      title: "Breakfast at Sefa Restaurant",
      description: "Traditional Turkish breakfast spread.",
      type: "food",
      badges: ["halal-certified", "budget-fit"],
      halalStatus: "verified",
      confidenceScore: 88,
      explanation: "",
      cost: "$6–10",
      latitude: 41.0165,
      longitude: 28.9505,
    },
  ],
};

export const validHotel: HotelSuggestion = {
  name: "Dosso Dossi Hotels Old City",
  description: "Family-friendly hotel with halal breakfast and prayer mats.",
  badges: ["muslim-friendly", "family-friendly", "prayer-nearby"],
  halalStatus: "muslim-friendly",
  confidenceScore: 85,
  priceRange: "$80-150/night",
};

// ---------------------------------------------------------------------------
// Valid complete responses
// ---------------------------------------------------------------------------

/** Valid full generation response (2 days). */
export const validFullResponse = {
  days: [validDay1, validDay2] as DayPlan[],
  hotel: validHotel,
};

/** Valid full response — hotel absent (frontend must preserve existing hotel). */
export const validFullResponseNoHotel = {
  days: [validDay1, validDay2] as DayPlan[],
  hotel: null,
};

/** Valid targeted detailed-adjust response (single day in days array — actual AI shape). */
export const validTargetedAdjustResponse = {
  days: [{ ...validDay1, title: "Sultanahmet — Updated" }] as DayPlan[],
  hotel: null,
};

/** Valid whole-itinerary detailed-adjust response. */
export const validWholeAdjustResponse = {
  days: [
    { ...validDay1, title: "Sultanahmet — Revised" },
    { ...validDay2, title: "Fatih — Revised" },
  ] as DayPlan[],
  hotel: validHotel,
};

// ---------------------------------------------------------------------------
// Invalid / malformed responses — frontend must reject these without wiping state
// ---------------------------------------------------------------------------

/** days is missing entirely. */
export const missingDaysResponse = {
  hotel: validHotel,
};

/** days is present but empty. */
export const emptyDaysResponse = {
  days: [] as DayPlan[],
  hotel: validHotel,
};

/** days is not an array. */
export const nonArrayDaysResponse = {
  days: "not an array",
  hotel: validHotel,
};

/** days array contains a day with no items. */
export const dayWithNoItemsResponse = {
  days: [{ day: 1, title: "Empty Day", items: [] }] as DayPlan[],
  hotel: validHotel,
};

/** days is missing from a targeted adjust response. */
export const missingAdjustedDayResponse = {
  hotel: validHotel,
};

/** targeted adjust response where the day has an empty items array. */
export const adjustedDayEmptyItemsResponse = {
  days: [{ day: 1, title: "Day 1", items: [] }] as DayPlan[],
  hotel: validHotel,
};

/** hotel is structurally malformed (missing required fields). */
export const malformedHotelResponse = {
  days: [validDay1, validDay2] as DayPlan[],
  hotel: { name: "Incomplete Hotel" }, // missing description, badges, etc.
};

/** Null response body. */
export const nullResponse = null;

// ---------------------------------------------------------------------------
// Error responses
// ---------------------------------------------------------------------------

export const genericErrorResponse = {
  error: "Failed to generate itinerary. Please try again.",
};

export const rateLimitErrorResponse = {
  error: "Rate limit exceeded. Please try again in a moment.",
  code: "RATE_LIMITED",
  retryable: true,
};

export const paymentErrorResponse = {
  error: "AI usage limit reached. Please add credits.",
  code: "PAYMENT_REQUIRED",
  retryable: false,
};

export const invalidAiOutputErrorResponse = {
  error: "AI did not return a valid itinerary.",
  code: "INVALID_RESPONSE",
  retryable: true,
};

// ---------------------------------------------------------------------------
// Unicode fixture — must survive both frontend and edge function sanitizers
// ---------------------------------------------------------------------------

/** A day plan containing Arabic, Turkish, Malay, and Japanese place names. */
export const unicodeDayPlan: DayPlan = {
  day: 1,
  title: "Süleymaniye — سليمانية — スレイマニエ",
  items: [
    {
      id: "u-1",
      time: "9:00 AM",
      title: "Masjid Sultan — مسجد السلطان",
      description: "Historic mosque. Jam buka: 9.00 pagi.",
      type: "prayer",
      badges: ["prayer-nearby"],
      halalStatus: "verified",
      confidenceScore: 100,
      explanation: "",
      cost: "Free",
      latitude: 1.2847,
      longitude: 103.8479,
    },
    {
      id: "u-2",
      time: "1:00 PM",
      title: "Restoran Nasi Padang — RM 12–18",
      description: "Masakan Melayu halal. 清真食品.",
      type: "food",
      badges: ["halal-certified"],
      halalStatus: "verified",
      confidenceScore: 90,
      explanation: "",
      cost: "RM 12–18",
      latitude: 1.283,
      longitude: 103.85,
    },
  ],
};
