# Backend Stabilization — Person B Implementation Plan

## Context

Person B is responsible for stabilizing the `generate-itinerary` Supabase edge function, prayer times feature, geocoding, and repo hygiene. The current edge function is a single 574-line file (`supabase/functions/generate-itinerary/index.ts`) with mixed concerns and several known bugs:

- `sanitizeStrings()` uses ASCII-only regex that strips Arabic, Turkish diacritics, Japanese, and Malay characters
- `confidence_score: Math.round(Number(p.confidence_score) || 60)` silently converts legitimate `0` to `60`
- No validation of AI response before returning to frontend — malformed output reaches the client
- `detailedAdjust` targeted vs whole-itinerary response shapes are implicit and untested
- Background learning doesn't use `EdgeRuntime.waitUntil`, risking truncation
- Prayer times hardcode `method=2` regardless of destination
- Browser-side Nominatim geocoding used for all destinations (should use static coordinates)
- `.env` may be tracked in git; repo has Bun lockfile artifacts and stale SEO metadata

Each iteration below is a self-contained implement + test chunk. All tests live in `src/test/` and are run with `npm test`.

---

## Iteration 1 — B7: Server-Side Unicode Sanitizer

**Goal:** Fix `sanitizeStrings()` to preserve Arabic, Turkish, Malay, and Japanese characters while still stripping LLM artifacts.

**Problem:** Current regex `[^\x00-\x7F -ÿ€£¥]` strips all non-Latin characters.

**Fix:**
- Extract `sanitizeStrings()`, `sanitizeItineraryItem()`, `sanitizeItinerary()`, `sanitizeHotel()` into `supabase/functions/generate-itinerary/sanitizers.ts`
- Replace the character-strip regex with Unicode property escapes: `[^\p{L}\p{N}\p{P}\p{Z}\p{Sc}\p{M}]/gu` (preserves letters, numbers, punctuation, separators, currency, combining marks)
- Keep the LLM artifact strippers (`}}finish_reason:`, `LEAKED_FIELD_PATTERN`, Base repetitions)
- `index.ts` imports from `sanitizers.ts`

**Test file:** `src/test/edge-sanitizer.test.ts`
- Import sanitizer helpers from `../../supabase/functions/generate-itinerary/sanitizers`
- Use `unicodeDayPlan` fixture from `src/test/fixtures/itineraryResponses.ts`
- Assert: Arabic text `مسجد السلطان` survives
- Assert: Turkish diacritics `ğ, ı, ş, ç, ö, ü` survive
- Assert: Japanese `スレイマニエ` survives
- Assert: LLM artifact `}}finish_reason:complete` is stripped
- Assert: Leaked field pattern `,type:food,badges:[` is stripped

**Files changed:** `supabase/functions/generate-itinerary/sanitizers.ts` (new), `index.ts` (imports sanitizers)

---

## Iteration 2 — B2: AI Response Validation

**Goal:** Validate AI output after parsing and before returning to the frontend. Invalid output retries if attempts remain; otherwise returns a structured error.

**Fix:**
- Create `supabase/functions/generate-itinerary/validators.ts` with pure functions:
  - `isValidFullResponse(data)`: `data.days` is a non-empty array and every day has at least 1 item
  - `isValidTargetedAdjustResponse(data)`: `data.adjustedDay` exists and has non-empty `items`
  - `isValidWholeAdjustResponse(data)`: same shape as `isValidFullResponse`
- In `callAIWithRetry`, after parsing tool-call arguments, call the appropriate validator; if invalid treat as a retry-eligible failure
- On exhausted retries, return `{ error: "AI did not return a valid itinerary.", code: "INVALID_RESPONSE", retryable: true }`
- Hotel validation: a malformed hotel must NOT block valid days from being returned — only log a warning and set hotel to `null`

**Test file:** `src/test/edge-validators.test.ts`
- Import validators from `../../supabase/functions/generate-itinerary/validators`
- `validFullResponse` → passes `isValidFullResponse`
- `missingDaysResponse` → fails
- `emptyDaysResponse` → fails
- `nonArrayDaysResponse` → fails
- `dayWithNoItemsResponse` → fails (items array empty)
- `validTargetedAdjustResponse` → passes `isValidTargetedAdjustResponse`
- `missingAdjustedDayResponse` → fails
- `adjustedDayEmptyItemsResponse` → fails
- `malformedHotelResponse` → `isValidFullResponse` still passes (hotel separate concern)

**Files changed:** `supabase/functions/generate-itinerary/validators.ts` (new), `index.ts` (uses validators)

---

## Iteration 3 — B3: detailedAdjust Response Contract

**Goal:** Make targeted vs whole-itinerary detailedAdjust response shapes explicit and tested.

**Current behavior:** The distinction is implicit; the prompt wording for whole-itinerary mode is ambiguous.

**Fix (in `index.ts`):**
- `targetDayNumber` present → **targeted mode**: prompt asks for single day only, validate `adjustedDay`, return `{ adjustedDay, hotel? }`
- `targetDayNumber` absent → **whole-itinerary mode**: prompt asks for all days, validate `days`, return `{ days, hotel? }`
- Missing hotel in either mode → return `hotel: null` (not `undefined`)
- Extract a small helper `formatAdjustResponse(mode, data)` for clarity

**Test file:** `src/test/edge-adjust-contract.test.ts`
- Test `formatAdjustResponse("targeted", validTargetedAdjustResponse)` returns `{ adjustedDay, hotel: null }` shape (hotel null when absent)
- Test `formatAdjustResponse("whole", validWholeAdjustResponse)` returns `{ days, hotel }` shape
- Test that targeted mode with `hotel: undefined` still returns `hotel: null`

**Files changed:** `index.ts` only (prompt wording + response dispatch logic)

---

## Iteration 4 — B1: Edge Function Internal Refactor

**Goal:** Break `index.ts` into small helpers now that sanitizers, validators, and adjust logic are extracted. No behavior change — this is a structural refactor.

**New files:**
- `sanitizers.ts` — already done in iteration 1
- `validators.ts` — already done in iteration 2
- `date-utils.ts` — `parseDateOnlyAsUtc`, `calculateTripDays`
- `prompt-builder.ts` — `buildSystemPrompt(params)`, `buildUserPrompt(params)`, `buildAdjustPrompt(params)` (extracted from the serve handler)
- `learning.ts` — `learnNewPlaces(...)` function (moved from bottom of `index.ts`)
- `index.ts` — becomes a thin orchestrator: parse request → DB reads → build prompts → call AI → validate → sanitize → dispatch response → fire learning

**Tests:** No new test file. Run `npm test` to confirm existing tests (including the three new test files from iterations 1–3) still pass. Run `npm run build` to confirm TypeScript compiles.

**Files changed:** All files above (new), `index.ts` (dramatically reduced)

---

## Iteration 5 — B4: EdgeRuntime.waitUntil + Background Learning Fixes

**Goal:** Fix confidence_score=0 bug, use `EdgeRuntime.waitUntil`, pass richer context to learning AI, add service-role DB fallback.

**Bugs to fix:**

1. **confidence_score=0**: `Math.round(Number(p.confidence_score) || 60)` converts 0 → 60. Fix:
   ```ts
   p.confidence_score != null ? Math.round(Number(p.confidence_score)) : 60
   ```

2. **EdgeRuntime.waitUntil**: Wrap the learn call:
   ```ts
   if (typeof EdgeRuntime !== "undefined" && EdgeRuntime.waitUntil) {
     EdgeRuntime.waitUntil(learnPromise);
   }
   ```

3. **Richer learning context**: Pass `{ title, type, latitude, longitude, halal_status, cost }` instead of just `{ title, type }` to the research prompt

4. **Service-role DB reads**: In main handler, create the Supabase client with `SUPABASE_SERVICE_ROLE_KEY` when available, fall back to `SUPABASE_ANON_KEY`. Add `meta: { usedDb: places.length > 0 || hotels.length > 0 }` to the response body.

**Test file:** `src/test/edge-learning.test.ts`
- Import the confidence_score fix helper from `../../supabase/functions/generate-itinerary/learning`
- `normalizeConfidenceScore(0)` → `0` (not 60)
- `normalizeConfidenceScore(undefined)` → `60`
- `normalizeConfidenceScore(null)` → `60`
- `normalizeConfidenceScore(85)` → `85`

**Files changed:** `learning.ts`, `index.ts` (meta field, service-role key, waitUntil call)

---

## Iteration 6 — B5 + B6: Prayer Methods + Geocoding Cache

**Goal:** Stop hardcoding `method=2` for prayer times; use static destination coordinates; cache prayer times in localStorage.

**B5 — Prayer methods (`src/data/dummyData.ts`):**
> **Note:** `dummyData.ts` interface changes require a shared-contract PR and notification to Person A before merging (per CLAUDE.md).

Add `destinationMetadata` export:
```ts
export const destinationMetadata = [
  { value: "istanbul",     label: "Istanbul, Turkey",       latitude: 41.0082, longitude: 28.9784, prayerMethod: 13 },
  { value: "dubai",        label: "Dubai, UAE",             latitude: 25.2048, longitude: 55.2708, prayerMethod: 8  },
  { value: "kuala-lumpur", label: "Kuala Lumpur, Malaysia", latitude: 3.1390,  longitude: 101.6869, prayerMethod: 11 },
  { value: "london",       label: "London, UK",             latitude: 51.5074, longitude: -0.1278,  prayerMethod: 3  },
  { value: "tokyo",        label: "Tokyo, Japan",           latitude: 35.6762, longitude: 139.6503, prayerMethod: 3  },
];
```

**B5 — `src/components/PrayerTimesSidebar.tsx`:**
- `fetchPrayerTimes(lat: number, lng: number, date: string, method: number)` — typed, method-aware
- Look up `destinationMetadata` by destination value to get `latitude`, `longitude`, `prayerMethod`
- If destination not found in metadata, show inline error: "Prayer times unavailable for this destination."
- Remove hardcoded `method=2`

**B6 — `src/components/PrayerTimesSidebar.tsx`:**
- Cache result: `localStorage.setItem(\`prayer_\${dest}_\${date}_\${method}\`, JSON.stringify(result))`
- On load: check cache first; skip API call if cache hit
- Remove browser-side Nominatim fetch

**Test file:** `src/test/prayer-methods.test.ts`
- `destinationMetadata` lookup: Istanbul → method 13, Dubai → method 8, KL → method 11
- Aladhan URL includes correct `method` query param
- Cache key format: `prayer_istanbul_2026-05-25_13`
- Unknown destination → returns null/undefined from metadata lookup

**Files changed:** `src/data/dummyData.ts`, `src/components/PrayerTimesSidebar.tsx`

---

## Iteration 7 — B8: Repo Hygiene

**Goal:** Stop tracking `.env`, canonicalize npm, fix SEO metadata, re-enable HMR overlay.

**Changes (no behavior change to app logic):**
- `.gitignore`: add `.env` line (check with `git ls-files .env` first; if tracked, `git rm --cached .env`)
- `index.html`: fix title → "MINARA — Halal Travel Planner", fix "Itenarary" typo, update og:title/og:description/og:image if stale Lovable defaults present
- `vite.config.ts`: re-enable HMR overlay if disabled (check for `hmr: { overlay: false }`)
- `package.json`: ensure no `packageManager: bun` field; add `engines: { node: ">=18" }` if absent
- Bun lockfiles: check `git ls-files bun.lock bun.lockb`; if tracked, `git rm --cached` them and add to `.gitignore`

**Tests:** None new. Run `npm test` and `npm run build` to confirm clean.

**Files changed:** `.gitignore`, `index.html`, potentially `vite.config.ts`, `package.json`

---

## Test file summary

| Iteration | New test file | What it tests |
|---|---|---|
| 1 (B7) | `src/test/edge-sanitizer.test.ts` | Unicode chars survive; LLM artifacts stripped |
| 2 (B2) | `src/test/edge-validators.test.ts` | Valid fixtures pass; invalid fixtures fail |
| 3 (B3) | `src/test/edge-adjust-contract.test.ts` | Response shapes per adjust mode |
| 4 (B1) | None (regression run) | Existing tests still pass |
| 5 (B4) | `src/test/edge-learning.test.ts` | normalizeConfidenceScore edge cases |
| 6 (B5+B6) | `src/test/prayer-methods.test.ts` | Metadata lookup, URL, cache key |
| 7 (B8) | None | Build + test pass |

## Critical files

- `supabase/functions/generate-itinerary/index.ts` — modified in every iteration
- `supabase/functions/generate-itinerary/sanitizers.ts` — new (iteration 1)
- `supabase/functions/generate-itinerary/validators.ts` — new (iteration 2)
- `supabase/functions/generate-itinerary/date-utils.ts` — new (iteration 4)
- `supabase/functions/generate-itinerary/prompt-builder.ts` — new (iteration 4)
- `supabase/functions/generate-itinerary/learning.ts` — new (iteration 4)
- `src/data/dummyData.ts` — modified (iteration 6, requires shared-contract PR)
- `src/components/PrayerTimesSidebar.tsx` — modified (iteration 6)
- `src/test/fixtures/itineraryResponses.ts` — shared fixtures (already exists, used in iterations 2–3)

## Verification (each iteration)

1. `npm test` — all tests pass (including new test file for that iteration)
2. `npm run build` — TypeScript compiles clean
3. No changes to frontend-owned files (`itineraryContext.tsx`, `ItineraryPage.tsx`, `PlanPage.tsx`, `App.tsx`, `exportItineraryPdf.ts`)
