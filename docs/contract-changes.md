# Backend Contract Changes — Action Required for Person A

This document lists every contract change introduced by the Person B stabilization
plan (iterations 1–7). Each entry states what changed on the edge function side,
what Person A must do in `itineraryContext.tsx` or related frontend files, and
whether a shared-contract PR is needed before the iteration merges.

---

## Iteration 1 — B7: Unicode Sanitizer (MERGED)

> **URGENT — iteration 1 is half-broken until Person A acts.**
> The edge function now correctly preserves Arabic, Turkish, and Japanese text.
> The frontend `cleanString` silently strips those same characters on the way into
> state, undoing the fix entirely. No user-visible improvement ships until this is
> fixed. This must be the first shared-contract PR.

**What changed (edge function):**
- `sanitizeStrings` now preserves Arabic, Turkish, Japanese, and Malay characters.
  Previously it stripped everything outside Latin/Latin-Extended.

**What Person A must do:**
- `itineraryContext.tsx` `cleanString` (around line 19) currently strips any
  character outside ASCII + Latin-Extended + a handful of currency symbols.
  This strips Arabic, CJK, and Turkish diacritics — exactly what the edge function
  now preserves. Every response is piped through `cleanString` before `setItinerary`,
  so the fix is silently reversed client-side.
- Fix: replace the character-strip line with the Unicode property escape used server-side:
  ```ts
  .replace(/[^\p{L}\p{N}\p{P}\p{Z}\p{Sc}\p{M}]/gu, "")
  ```
- **Shared-contract PR required:** yes — `itineraryContext.tsx` is Person A's file.
- **Status:** OUTSTANDING — blocks the user-visible benefit of iteration 1.

---

## Iteration 2 — B2: AI Response Validation

**What changed (edge function):**

1. **Structured error codes are now emitted.** The `ErrorResponse` shape
   (`{ error, code, retryable }`) was documented in `itinerary-api-contract.md`
   but was never actually sent. From iteration 2 onward, exhausted retries due to
   invalid AI output return:
   ```json
   { "error": "AI did not return a valid itinerary.", "code": "INVALID_RESPONSE", "retryable": true }
   ```
   Existing codes (`RATE_LIMITED` from 429, `PAYMENT_REQUIRED` from 402) will also
   be emitted explicitly.

2. **`hotel: null` is now an explicit server signal.** Previously a malformed or
   absent hotel was simply omitted from the response (`hotel` field absent).
   From iteration 2 onward, a malformed hotel returns `hotel: null` explicitly.
   Semantics: `null` means "preserve the existing hotel in state." This matches the
   contract doc, but the frontend currently calls `setHotel(sanitizeHotelData(data.hotel))`
   unconditionally — `sanitizeHotelData(null)` must not throw or clear the hotel.

**What Person A must do:**

- **`code` + `retryable` wiring:** `itineraryContext.tsx` currently reads only
  `data?.error` as a plain string toast message. Wire `data?.code` and
  `data?.retryable` to drive UI — e.g. show a "Try Again" button only when
  `retryable === true`, surface different toast copy for `RATE_LIMITED` vs
  `INVALID_RESPONSE`.

- **Guard `setHotel` against explicit null:** Verify `sanitizeHotelData(null)`
  returns `null` (not undefined, not an empty object) so that the
  "preserve existing hotel" semantics hold. If it does not, add a null guard:
  ```ts
  if (data.hotel !== null) setHotel(sanitizeHotelData(data.hotel));
  ```
  Only call `setHotel` when the server explicitly sends a valid hotel object.

- **Shared-contract PR required:** yes — both items touch `itineraryContext.tsx`.
- **Status:** outstanding — Person B will ship the edge function side; Person A
  wires the frontend in a follow-up PR.

---

## Iteration 3 — B3: detailedAdjust Response Contract

**What changed (edge function):**
- `hotel: null` (not `undefined`) is now always present in adjust responses when
  no hotel is returned. Semantics: preserve existing hotel.
- Response shapes are now strictly dispatched: targeted mode always returns
  `{ adjustedDay, hotel }`, whole-itinerary mode always returns `{ days, hotel }`.
  Previously the distinction was implicit and untested.

**What Person A must do:**
- Verify `detailedAdjustFn` in `itineraryContext.tsx` handles `hotel: null`
  correctly. Current code (around line 223): `if (data.hotel) setHotel(...)` — a
  null check here is fine since `null` is falsy, so existing hotel is preserved.
  No change needed **unless** the intent is to allow a hotel to be explicitly
  cleared, which it is not.
- **Shared-contract PR required:** no — this is a clarification of existing
  behaviour, not a new field. Notify Person A for awareness only.
- **Status:** outstanding.

---

## Iteration 5 — B4: EdgeRuntime + Learning Fixes

**What changed (edge function):**
- `meta.usedDb: boolean` is now included in all success responses. Already in the
  `ResponseMeta` interface in the contract doc; this makes it real.
- `confidence_score: 0` now correctly returns `0` instead of being silently
  converted to `60`.

**What Person A must do:**
- No frontend changes required. `meta` is optional and informational.
- `confidenceScore: 0` on an `ItineraryItem` is now possible. Frontend rendering
  for low-confidence items (explanation text, visual indicator) should handle `0`
  as a valid score, not assume the minimum is `60`.
- **Shared-contract PR required:** no.
- **Status:** outstanding.

---

## Iteration 6 — B5+B6: Prayer Methods + Geocoding

**What changed (`src/data/dummyData.ts`):**
- New `destinationMetadata` export added. This is a `dummyData.ts` interface
  change — CLAUDE.md requires Person A to be notified before this merges.

**What Person A must do:**
- Review the new `destinationMetadata` export and confirm it does not conflict
  with any frontend usage of destination values (`"istanbul"`, `"dubai"`, etc.).
- **Shared-contract PR required:** yes — CLAUDE.md hard rule: Person B must notify
  Person A before changing any TypeScript interface in `dummyData.ts`.
- **Status:** outstanding.

---

## Summary table

| Iteration | Person A action required | Shared-contract PR | Urgency |
|-----------|-------------------------|--------------------|---------|
| 1 (B7)    | Fix `cleanString` regex in `itineraryContext.tsx` | Yes | **URGENT** |
| 2 (B2)    | Wire `code`/`retryable`; guard `setHotel` against null | Yes | High |
| 3 (B3)    | Verify `detailedAdjustFn` null-hotel handling (likely fine) | No | Low |
| 4 (B1)    | None | No | — |
| 5 (B4)    | Handle `confidenceScore: 0` in rendering | No | Low |
| 6 (B5+B6) | Review `destinationMetadata` export | Yes | Medium |
| 7 (B8)    | None | No | — |
