# Two-Person Claude Code Stabilization Plan

## 1. Executive Decision

Stabilize the current app. Do **not** rebuild.

The app already has a usable product structure: React routes, itinerary context, Supabase edge generation, seeded data, prayer times, dialogs, PDF export, and tests. The bugs are serious, but they are mostly boundary and robustness failures: unsafe API response handling, weak async control, brittle validation, and missing guardrails around AI output. A rebuild would likely recreate the same hard problems.

Default decisions:

- Keep Vite + React + Supabase.
- Use **npm** as the canonical package manager.
- Preserve current UX unless a bug fix explicitly changes it.
- Split work by ownership to avoid file conflicts.

## 2. Claude Code Working Model

Use one small shared branch first, then two independent work branches.

Recommended branch setup:

```bash
git checkout main
git pull origin main
git checkout -b stabilize/contracts
```

After `stabilize/contracts` merges:

```bash
git checkout main
git pull origin main
git checkout -b stabilize/a-frontend-stability
git checkout -b stabilize/b-edge-prayer-hygiene
```

If using worktrees:

```bash
git worktree add ../minara-a -b stabilize/a-frontend-stability main
git worktree add ../minara-b -b stabilize/b-edge-prayer-hygiene main
```

Claude Code operating rules:

- Both people share the same Claude Code account and machine, which means the memory system (`~/.claude/projects/...`) and `CLAUDE.md` are shared across sessions. This is intentional — both Claude sessions will inherit project context and ownership rules automatically via `CLAUDE.md`. Do not write session-specific state to memory files.
- Start every Claude session with `git status --short --branch`.
- Give Claude one scoped task at a time.
- Ask Claude to inspect first, state a short plan, then implement.
- Commit after each passing scoped task.
- Do not let Claude combine unrelated fixes.
- If Claude changes more than about 8 files for one task, stop and review.
- Each PR must include changed files, tests run, and residual risks.
- Person A must not edit Supabase edge function files.
- Person B must not edit itinerary context, itinerary page, PDF export, or ErrorBoundary files except through an agreed shared-contract PR.

## 3. Two-Person Ownership Split

Person A owns frontend stability:

- `src/lib/itineraryContext.tsx`
- `src/pages/ItineraryPage.tsx`
- `src/pages/PlanPage.tsx`
- `src/lib/exportItineraryPdf.ts`
- `src/App.tsx`, new ErrorBoundary component
- frontend tests under `src/test`
- dialog UI edge cases such as `confidenceScore === 0` and `lat/lng === 0`

Person B owns backend/domain/infrastructure stability:

- `supabase/functions/generate-itinerary/**`
- AI response validation and edge helper refactor
- detailed-adjust response contract
- background learning and `EdgeRuntime.waitUntil`
- prayer method logic
- destination coordinates/geocoding/cache behavior
- `src/data/dummyData.ts` — destination metadata, prayer-method additions, and any interface changes
- repo hygiene: `.env`, lockfiles, metadata, Vite HMR overlay
- DB/RLS/service-role review

Note: if Person B changes a TypeScript interface in `dummyData.ts`, they must open a shared-contract PR and notify Person A before merging, since Person A's code depends on those types.

## 4. Shared Contracts To Define First

Create a tiny PR: `stabilize/contracts`.

Assigned owner: one person writes the first draft, both review and approve before merging. This must merge before either person branches.

Add `docs/itinerary-api-contract.md` and shared fixtures under `src/test/fixtures/itineraryResponses.ts`. Also create `src/test/fixtures/` as a directory with at minimum a stub `itineraryResponses.ts` so both downstream branches have a merge-safe landing zone for their own fixture additions.

Contract decisions:

- Full generation response:
  ```ts
  {
    days: DayPlan[];
    hotel?: HotelSuggestion | null;
    meta?: { usedDb?: boolean; cappedDays?: { requested: number; max: 15 } };
  }
  ```

- Targeted detailed-adjust response:
  ```ts
  {
    adjustedDay: DayPlan;
    hotel?: HotelSuggestion | null;
    meta?: object;
  }
  ```

- Whole-itinerary detailed-adjust response:
  ```ts
  {
    days: DayPlan[];
    hotel?: HotelSuggestion | null;
    meta?: object;
  }
  ```

- Error response stays backward-compatible:
  ```ts
  {
    error: string;
    code?: string;
    retryable?: boolean;
  }
  ```

- Frontend rule: never overwrite an existing itinerary unless `days` is a valid non-empty array or `adjustedDay` is valid.
- Missing `hotel` means preserve the existing hotel.
- Initial generation should require valid `days`; hotel is preferred but not allowed to crash the UI.
- Unicode must preserve Arabic, Turkish, Malay, Japanese, punctuation, spaces, numbers, and currency symbols.

## 5. Claude Code Prompts For Person A

### A1. Itinerary State Safety

```text
Start with git status. Inspect src/lib/itineraryContext.tsx, src/data/dummyData.ts, and the shared contract docs/itinerary-api-contract.md. Propose a short plan, then implement only frontend state-safety fixes.

Goal: prevent failed or malformed generate/quick-adjust/detailed-adjust responses from wiping a valid existing itinerary or hotel. Add small validation/type-guard helpers if useful. Only call setItinerary when data.days is a valid array. Only merge adjustedDay when valid. Only update hotel when valid. Preserve existing itinerary/hotel on invalid partial responses and show a toast error.

Also replace the frontend string sanitizer so it preserves Unicode letters/numbers/punctuation/spaces/currency instead of stripping Arabic/Turkish/Malay/Japanese characters.

Do not edit Supabase edge function files. Do not rewrite the context architecture. Add or update focused tests. Run npm test and npm run build. Summarize changed files, tests, and remaining risks.
```

### A2. Async Timeout And Race Handling

```text
Start with git status. Inspect src/lib/itineraryContext.tsx and src/integrations/supabase/client.ts. Propose a short plan, then implement only async safety fixes.

Goal: make generation requests stop hanging the UI and prevent stale quick-adjust/regenerate responses from overwriting newer responses. Use a real timeout strategy, preferably direct fetch to the Supabase function endpoint with AbortController.signal if feasible. Add an in-flight request token/ref so stale responses are ignored. Ensure isGenerating/isDetailedAdjusting remain true until the latest relevant request finishes.

Do not change edge function behavior. Do not change UI design. Add tests for overlapping quick-adjust calls and timeout/error preservation if practical. Run npm test and npm run build. Summarize changed files, tests, and risks.
```

### A3. Enforce 15-Day UI Validation

```text
Start with git status. Inspect src/pages/PlanPage.tsx and the shared contract docs/itinerary-api-contract.md. Propose a short plan, then implement only trip-length validation.

Goal: prevent users from requesting trips longer than 15 days because the server caps at 15. Add inclusive date-difference validation on the date step. Show a clear inline error and disable Next/Generate when the trip is longer than 15 days. Preserve existing past-date and return-before-outbound validation.

Do not edit the edge function. Add tests for 15-day allowed and 16-day blocked if practical. Run npm test and npm run build. Summarize changed files, tests, and risks.
```

### A4. PDF Pagination

```text
Start with git status. Inspect src/lib/exportItineraryPdf.ts. Propose a short plan, then implement only PDF overflow fixes.

Goal: PDF export must never silently drop itinerary items or hotel/cover content. Replace the current break-on-overflow behavior with pagination. Add helper logic to check available page space, add pages when needed, and continue rendering remaining items. Keep the existing visual style broadly the same.

Do not change itinerary generation or React UI. Add a testable helper if useful. Run npm test and npm run build. Summarize changed files, tests, and risks.
```

### A5. ErrorBoundary

```text
Start with git status. Inspect src/App.tsx and src/main.tsx. Propose a short plan, then add a minimal React ErrorBoundary.

Goal: a render-time error should show a recoverable fallback instead of blanking the whole app. Add a small ErrorBoundary component, wrap the routed app area, and provide a button/link to return to planning or reload. Keep styling consistent with existing shadcn/Tailwind patterns.

Do not change route structure beyond wrapping. Add a focused test if practical. Run npm test and npm run build. Summarize changed files, tests, and risks.
```

### A6. Frontend Tests And Dialog Edge Cases

```text
Start with git status. Inspect src/test, src/components/PlaceDetailDialog.tsx, src/components/HotelDetailDialog.tsx, src/pages/PlanPage.tsx, and src/lib/itineraryContext.tsx. Propose a short plan, then add focused frontend tests only for stabilization bugs.

Cover: malformed generation response preserves old itinerary, adjustedDay merge works, long trip validation blocks Generate, confidenceScore 0 renders correctly, latitude/longitude 0 use coordinate map embed, and ErrorBoundary fallback renders.

Fix tiny dialog bugs if needed to make tests pass, but do not refactor unrelated UI. Run npm test and npm run build. Summarize changed files, tests, and risks.
```

## 6. Claude Code Prompts For Person B

### B1. Edge Function Internal Refactor

```text
Start with git status. Inspect supabase/functions/generate-itinerary/index.ts and docs/itinerary-api-contract.md. Propose a short plan, then refactor internally without changing public behavior.

Goal: split the large edge function into small local helpers where safe: date calculation, DB reads, prompt building, AI call, response formatting, sanitization, and background learning. Keep the deployed entrypoint path the same. Do not change React frontend files. Keep the same model/prompt behavior unless required by this task.

Add pure helper tests if practical through Vitest. Run npm test and npm run build if the repo supports it. Summarize changed files, tests, and risks.
```

### B2. AI Response And Schema Validation

```text
Start with git status. Inspect supabase/functions/generate-itinerary/index.ts, any new helper files, and docs/itinerary-api-contract.md. Propose a short plan, then implement backend response validation.

Goal: after parsing model tool-call arguments, validate that full responses contain valid days/items and targeted adjustments contain a valid adjustedDay. Invalid AI output should retry when possible, then return a backward-compatible error response: { error: string, code?: string, retryable?: boolean }. Do not return malformed days to the frontend.

Do not edit frontend state code. Add tests using shared fixtures for valid full response, valid adjustedDay response, missing days, empty items, and malformed hotel. Run npm test and npm run build. Summarize changed files, tests, and risks.
```

### B3. detailedAdjust Whole-Itinerary Contract

```text
Start with git status. Inspect supabase/functions/generate-itinerary/index.ts and docs/itinerary-api-contract.md. Propose a short plan, then fix only detailedAdjust response behavior.

Goal: targeted detailedAdjust with targetDayNumber returns { adjustedDay, hotel? }. Whole-itinerary detailedAdjust without targetDayNumber returns { days, hotel? }. Make this explicit and tested. Ensure the prompt asks for the correct shape in each mode.

Do not edit frontend files. Run npm test and npm run build. Summarize changed files, tests, and risks.
```

### B4. EdgeRuntime.waitUntil And Background Learning

```text
Start with git status. Inspect the background learnNewPlaces flow in supabase/functions/generate-itinerary. Propose a short plan, then fix only background learning reliability and related data-quality issues.

Goal: use EdgeRuntime.waitUntil when available so background learning can finish after the response is returned. Preserve non-blocking behavior. Fix confidence_score handling so legitimate 0 does not become 60. Pass enough original item context into learning so the model is not researching title/type only. Decide DB reads should use service-role key when available, falling back to anon, and return meta.usedDb.

Do not edit frontend files. Add tests for helper behavior if practical. Run npm test and npm run build. Summarize changed files, tests, and risks.
```

### B5. Prayer Calculation Method Logic

```text
Start with git status. Inspect src/components/PrayerTimesSidebar.tsx, src/lib/utils.ts, and src/data/dummyData.ts. Propose a short plan, then implement destination-specific prayer calculation methods.

Goal: stop hard-coding Aladhan method=2. Add destination metadata for supported destinations: Istanbul method 13, Dubai method 8, Kuala Lumpur method 11, London method 3, Tokyo method 3. Update fetchPrayerTimes to accept typed latitude, longitude, date, and method. Improve malformed API handling without changing the sidebar design.

Do not edit itinerary context or edge generation files. Add tests for URL/method selection if practical. Run npm test and npm run build. Summarize changed files, tests, and risks.
```

### B6. Geocoding, Caching, Nominatim Compliance

```text
Start with git status. Inspect src/components/PrayerTimesSidebar.tsx and src/data/dummyData.ts. Propose a short plan, then fix only geocoding/caching behavior.

Goal: avoid browser-side public Nominatim calls for supported destinations. Use static destination metadata with label, country code, latitude, longitude, and prayer method. Cache prayer times in localStorage by destination/date/method. If destination metadata is missing, show a clear sidebar error instead of fuzzy geocoding.

Do not edit itinerary generation or PDF code. Add tests for metadata lookup/cache behavior if practical. Run npm test and npm run build. Summarize changed files, tests, and risks.
```

### B7. Server-Side Unicode Sanitization

```text
Start with git status. Inspect supabase/functions/generate-itinerary/index.ts and any sanitizer helper files. Propose a short plan, then fix only server-side Unicode sanitization.

Goal: preserve legitimate Arabic, Turkish, Malay, Japanese, numbers, punctuation, spaces, and currency symbols while still removing leaked model artifacts and invalid control characters. Prefer a Unicode property regex such as letters/numbers/punctuation/separators/currency plus existing leaked-field cleanup.

Do not edit src/lib/itineraryContext.tsx because Person A owns frontend sanitizer. Add tests with Istanbul diacritics, Arabic mosque names, Japanese place names, and leaked JSON artifacts. Run npm test and npm run build. Summarize changed files, tests, and risks.
```

### B8. Repo Hygiene

```text
Start with git status. Inspect .gitignore, index.html, vite.config.ts, README.md, package.json, package-lock.json, bun.lock, bun.lockb, and tracked .env status. Propose a short plan, then implement only repo hygiene.

Goal: stop tracking .env without editing or printing its values, add .env to .gitignore, choose npm as canonical package manager, remove Bun lockfiles if safe, fix stale Lovable SEO metadata, fix “Itenarary” typo, set author/title/description to MINARA, and re-enable Vite HMR overlay for development.

Do not change application behavior. Do not modify secret values. Run npm test and npm run build after changes. Summarize changed files, tests, and risks.
```

## 7. Parallel Timeline

Week 0 / Day 1:

- Shared branch: `stabilize/contracts`.
- Add API contract doc and fixtures.
- Merge first.
- Definition of done: both people understand response shapes and file ownership.

Week 1:

- Person A branch: `stabilize/a-frontend-stability`.
  - A1 state safety.
  - A2 async/race handling.
  - A3 15-day UI validation.
- Person B branch: `stabilize/b-edge-prayer-hygiene`.
  - B1 edge refactor.
  - B2 backend validation.
  - B3 detailedAdjust contract.
- Can merge independently after contract branch.
- Review together: any response shape changes.

Week 2:

- Person A:`
  - A4 PDF pagination.
  - A5 ErrorBoundary.
  - A6 frontend tests/dialog edge cases.
- Person B:
  - B4 waitUntil/background learning.
  - B5 prayer methods.
  - B6 geocoding/cache.
- Can merge independently if no contract changes.
- Review together: prayer UX and generated-response behavior.

Week 3:

- Person B:
  - B7 Unicode sanitizer.
  - B8 repo hygiene.
- Person A:
  - regression pass, test coverage gaps, mobile smoke test.
- Definition of done: green build/test/lint or documented pre-existing lint issues, demo checklist passed.

## 8. Bug-To-Owner Mapping

- Hotel/sidebar gated by empty itinerary: Person A, independent.
- Failed adjust wiping state: Person A, depends on shared contract.
- Whole detailedAdjust contract: Person B, depends on shared contract.
- Missing `EdgeRuntime.waitUntil`: Person B, independent.
- Fake AbortController timeout: Person A, independent.
- 15-day silent cap: Shared contract, then Person A UI and Person B optional meta.
- Date validation trip length: Person A, independent.
- Prayer typing/error handling: Person B, independent.
- PDF clipping/cover overflow: Person A, independent.
- `lat && lng` truthiness: Person A, independent.
- Unicode stripping: Person A frontend + Person B edge, contract-dependent.
- Confidence score `0`: Person A, independent.
- Prayer destination/method correctness: Person B, independent.
- Nominatim compliance/cache: Person B, independent.
- Map iframe lazy/unmount polish: Person A, low priority.
- DB/RLS/service-role reads: Person B, independent.
- Quick-adjust race: Person A, independent.
- ItineraryPage handler ordering: Person A, independent.
- Landing reduced motion: Person A only if time remains.
- SEO/Lovable/HMR/lockfiles/.env: Person B, independent.
- ErrorBoundary: Person A, independent.
- TypeScript strictness path: Shared policy; Person A adds typed frontend guards, Person B handles package/config hygiene.

## 9. Safe Claude Code Rules

Strict checklist for every Claude session:

- Run `git status --short --branch` first.
- Confirm current branch before edits.
- Never print, edit, or replace `.env` values.
- Never rewrite the whole app.
- Never edit shadcn UI primitives unless the task requires it.
- Never mix unrelated bug categories.
- Never touch the other person’s owned files without asking.
- Preserve current product behavior unless the prompt explicitly changes it.
- Prefer small helpers over large rewrites.
- Run `npm test` and `npm run build` before each commit.
- If tests fail before edits, capture baseline and report it.
- Show `git diff --stat` and changed files before committing.
- One commit per scoped prompt.
- Commit message format: `fix(frontend): preserve itinerary on invalid responses`.
- PR description must include: task, changed files, tests run, risks, screenshots if UI changed.

## 10. Merge Order

Best merge order:

1. `stabilize/contracts`
2. Person A state-safety PR
3. Person B edge validation/detailedAdjust PR
4. Person A async/race + 15-day validation PR
5. Person B waitUntil/background learning PR
6. Person B prayer/geocoding/cache PR
7. Person A PDF + ErrorBoundary + frontend tests PR
8. Person B Unicode edge sanitizer PR
9. Person B repo hygiene PR
10. Final regression PR only if needed

Do not merge repo hygiene first because lockfile/package changes can create noisy conflicts.

## 11. Final Stabilized Architecture

After stabilization:

- Frontend validates API responses before state updates.
- Existing itinerary/hotel state is preserved on failed or partial AI responses.
- Async generation has real timeout behavior and stale-response protection.
- Edge function has smaller helpers around prompt building, AI calls, validation, DB reads, sanitization, and background learning.
- Full generation, targeted adjustment, whole-itinerary adjustment, and errors have documented response shapes.
- Prayer times use destination-specific coordinates and calculation methods.
- Browser-side Nominatim calls are removed for supported destinations.
- PDF export paginates instead of clipping.
- Unicode names survive both frontend and backend sanitization.
- ErrorBoundary prevents full-app blank screens.
- Tests cover contract fixtures, state preservation, adjustment merges, trip cap, PDF overflow helpers, prayer methods, Unicode sanitization, and dialog edge cases.
- TypeScript is tightened through typed boundaries first, with full strict mode deferred to a later dedicated PR.

## 12. Demo-Readiness Checklist

Before demo/submission:

- `git status` clean on main.
- `.env` no longer tracked; `.env.example` exists if needed.
- `npm ci` works from a fresh checkout.
- `npm test` passes.
- `npm run build` passes.
- `npm run lint` passes or has documented pre-existing issues.
- Generate Istanbul 3-day itinerary successfully.
- Quick-adjust twice rapidly; latest result wins and itinerary is not wiped.
- Detailed edit one item; only that day/item changes.
- Failed generation shows toast and preserves previous itinerary.
- 16-day trip is blocked in the UI.
- Prayer times show correct method-backed results for Istanbul, Dubai, Kuala Lumpur, London, and Tokyo.
- PDF export includes all items across pages.
- Arabic/Turkish/Japanese names render in UI and are not stripped.
- Confidence score `0` warnings render correctly.
- `lat=0` or `lng=0` map links still use coordinates.
- Mobile navbar and itinerary page are manually checked at narrow width.
- SEO title/description say MINARA, not Lovable.