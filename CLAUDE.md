# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server (localhost:8080)
npm run build        # Production build
npm run lint         # Run ESLint
npm run test         # Run tests once
npm run test:watch   # Run tests in watch mode
```

To run a single test file: `npx vitest run src/test/place-detail-dialog.test.tsx`
#Claude behaviour

1.Work iteritevely until you reach your goal, trying new methods one one doesn't work.
2.Use test-driven-development to reach your goals.
3.Do not hide confusion, always ask questions when needed.
4.Use powershell or git bash.
## Architecture

**Minara** is an AI-powered halal travel itinerary generator for Muslim travelers targeting 5 destinations (Istanbul, Dubai, London, Tokyo, and Kuala Lumpur).

**Stack:** React 18 + TypeScript, Vite, Tailwind CSS + shadcn-ui (Radix UI), Supabase (PostgreSQL + Auth + Edge Functions), React Query v5, React Hook Form + Zod, Vitest.

### Data Flow

1. **PlanPage** — user fills trip preferences (destination, dates, traveler type, budget, halal preferences)
2. **Supabase Edge Function** (`/functions/v1/generate-itinerary`) — queries local DB for known places/hotels, builds a structured prompt, calls the Lovable AI Gateway (Gemini models), validates and sanitizes the JSON response, and asynchronously saves newly discovered places back to the DB
3. **itineraryContext.tsx** — global React Context holding `TripPreferences` and the generated `ItineraryData`; both PlanPage and ItineraryPage share this state
4. **ItineraryPage** — renders day-by-day plans with interactive place/hotel modals, prayer times sidebar, PDF export, and a regenerate button

### Key Data Structures (defined in `src/data/dummyData.ts`)

- `TripPreferences` — destination, dates, traveler type, budget, interests, halal preferences, pace
- `ItineraryItem` — id, time, title, description, type (`activity | food | prayer | transport | hotel`), badges, halalStatus (with confidence 0–100), cost, coordinates
- `DayPlan` — day number, title, items array
- `Hotel` — name, description, badges, halal status, price range

### Theme & Styling

Custom Tailwind colors: `navy`, `emerald`, `gold`, `sand`. Custom fonts: Playfair Display (headings), DM Sans (body). Configure in `tailwind.config.ts`.

### Supabase

- Client initialized in `src/integrations/supabase/client.ts`
- Auto-generated types in `src/integrations/supabase/types.ts` — regenerate with `npx supabase gen types typescript`
- Edge functions live in `supabase/functions/`

### Path Aliases

`@/` maps to `src/` (configured in `vite.config.ts` and `tsconfig.app.json`).

## Two-Person Ownership (stabilization phase)

Start every session with `git status --short --branch` to confirm you are on the correct branch.

**Person A owns:** `src/lib/itineraryContext.tsx`, `src/pages/ItineraryPage.tsx`, `src/pages/PlanPage.tsx`, `src/lib/exportItineraryPdf.ts`, `src/App.tsx`, `src/test/`, ErrorBoundary component, dialog UI edge cases.

**Person B owns:** `supabase/functions/`, `src/components/PrayerTimesSidebar.tsx`, `src/data/dummyData.ts` (destination metadata, prayer methods, TypeScript interface changes).

**Hard rules:**
- Never edit the other person's files without a shared-contract PR.
- Person B must notify Person A before changing any TypeScript interface in `dummyData.ts`.
- Both people share this Claude account — `CLAUDE.md` and the memory system are shared across sessions. Do not store session-specific state in memory files.
- Commit message format: `fix(scope): short description` — one commit per scoped task.
- Run `npm test` and `npm run build` before every commit.

### AI Integration Notes

- The edge function calls the Lovable AI Gateway with retry logic (max 2 retries, exponential backoff)
- Responses are heavily sanitized to strip LLM artifacts (leaked JSON, CJK characters, repetition patterns)
- Rate limit (429) and payment (402) errors from the AI gateway are handled gracefully
- Trips are capped at 15 days maximum
