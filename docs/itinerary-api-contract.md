# Itinerary API Contract

This document is the shared source of truth for the shape of every response
returned by the `generate-itinerary` Supabase edge function.
Both Person A (frontend) and Person B (edge function) must keep their code
aligned with these definitions. Any change to a response shape requires a
shared-contract PR reviewed by both people before merging.

---

## Request modes

The edge function handles three distinct request modes, selected by which
fields are present in the request body.

| Mode | Trigger field | Response shape |
|------|--------------|----------------|
| Full generation | neither `quickAdjust` nor `detailedAdjust` | `FullGenerationResponse` |
| Quick adjust | `quickAdjust: string` | `FullGenerationResponse` (same shape) |
| Targeted detailed adjust | `detailedAdjust.targetDayNumber` present | `TargetedAdjustResponse` |
| Whole-itinerary detailed adjust | `detailedAdjust` present, no `targetDayNumber` | `FullGenerationResponse` |

---

## Shared sub-types

These mirror the TypeScript types in `src/data/dummyData.ts` and
`src/lib/itineraryContext.tsx`. If either file changes a type, this document
and `src/test/fixtures/itineraryResponses.ts` must be updated in the same PR.

```ts
type HalalStatus = "verified" | "muslim-friendly" | "needs-check";

type Badge =
  | "halal-certified"
  | "muslim-friendly"
  | "no-alcohol"
  | "prayer-nearby"
  | "family-friendly"
  | "kid-friendly"
  | "budget-fit"
  | "verified";

interface ItineraryItem {
  id: string;           // format: "dayNum-itemNum", e.g. "1-3"
  time: string;
  title: string;
  description: string;
  type: "activity" | "food" | "prayer" | "transport" | "hotel";
  badges: Badge[];
  halalStatus?: HalalStatus;
  confidenceScore?: number;  // 0–100; explanation required when < 70
  explanation?: string;      // empty string "" when confidenceScore >= 70
  cost?: string;             // e.g. "$8–12" or "Free"
  latitude?: number;
  longitude?: number;
}

interface DayPlan {
  day: number;
  title: string;
  items: ItineraryItem[];
}

interface HotelSuggestion {
  name: string;
  description: string;
  badges: Badge[];
  halalStatus: HalalStatus;
  confidenceScore: number;
  priceRange: string;        // format: "$X-Y/night" — never "$$$" or "moderate"
}

interface ResponseMeta {
  usedDb?: boolean;
  cappedDays?: { requested: number; max: 15 };
}
```

---

## Response shapes

### FullGenerationResponse

Returned for: full generation, quick adjust, whole-itinerary detailed adjust.

```ts
interface FullGenerationResponse {
  days: DayPlan[];          // always a non-empty array of valid DayPlan objects
  hotel?: HotelSuggestion | null;
  meta?: ResponseMeta;
}
```

**Validity rules (enforced server-side before returning, enforced client-side before storing):**
- `days` must be a non-empty array.
- Every `DayPlan` must have a numeric `day`, a non-empty `title`, and a non-empty `items` array.
- A response where `days` is missing, null, empty, or malformed is invalid and must not reach `setItinerary`.
- `hotel` is preferred but not required. A missing or null `hotel` means: preserve the existing hotel in state.
- `meta` is optional and informational only.

### TargetedAdjustResponse

Returned for: `detailedAdjust` with `targetDayNumber` present.

```ts
interface TargetedAdjustResponse {
  adjustedDay: DayPlan;     // the single modified day, with correct day number
  hotel?: HotelSuggestion | null;
  meta?: ResponseMeta;
}
```

**Validity rules:**
- `adjustedDay` must be a valid `DayPlan` with a non-empty `items` array.
- `adjustedDay.day` must equal the originally requested `targetDayNumber`.
- An invalid or missing `adjustedDay` must not be merged into the existing itinerary.
- Missing or null `hotel` means: preserve the existing hotel.

### ErrorResponse

Returned for any failure (AI error, validation failure, server error).

```ts
interface ErrorResponse {
  error: string;
  code?: string;      // machine-readable code, e.g. "RATE_LIMITED", "INVALID_RESPONSE"
  retryable?: boolean;
}
```

HTTP status codes currently in use: `429` (rate limit), `402` (payment required), `500` (all other errors).

---

## Frontend state rules

These rules govern `src/lib/itineraryContext.tsx` and must not be violated
regardless of what the server returns.

1. **Never overwrite an existing itinerary** unless `days` is a valid non-empty array (for full/quick/whole-itinerary adjust) or `adjustedDay` is a valid `DayPlan` (for targeted adjust).
2. **Never overwrite an existing hotel** unless the response provides a non-null, structurally valid `HotelSuggestion`.
3. **On any invalid or error response**, preserve the existing itinerary and hotel, and show a toast error.
4. **Stale responses** (from a superseded in-flight request) must never overwrite state written by a newer response.

---

## Unicode preservation

Both the frontend sanitizer (`src/lib/itineraryContext.tsx`) and the edge
function sanitizer (`supabase/functions/generate-itinerary/index.ts`) must
preserve these character classes:

- Unicode letters (including Arabic, Turkish, Malay, Japanese, Latin with diacritics)
- Unicode decimal digits
- Unicode punctuation
- Spaces and common separators
- Currency symbols (€, £, ¥, $, ₺, RM, etc.)

The sanitizers must only remove:
- Leaked LLM finish artifacts (`}}finish_reason:...`)
- Leaked structured field names injected into string values
- Trailing/leading partial JSON fragments
- Repeated nonsense tokens (e.g. `BaseBase...`)
- Invalid control characters (C0/C1 except tab and newline)

---

## 15-day cap

- The edge function silently caps trips at 15 days (`Math.min(..., 15)`).
- The frontend must prevent users from submitting trips longer than 15 days,
  showing a clear inline error before the Generate button is reached.
- When the cap fires, `meta.cappedDays` should be set so the frontend can
  optionally surface a notice (not yet implemented; reserved for future use).
