

# MVP Implementation Plan: AI-Powered Itinerary Generation

## Overview

Transform the static demo into a working MVP with three core pieces:
1. **Places database** in Supabase (pre-seeded with Istanbul data)
2. **AI itinerary generation** edge function using Lovable AI Gateway
3. **Quick adjust** functionality that re-generates with modified preferences

## Architecture

```text
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  PlanPage   │────▶│  generate-       │────▶│  Lovable AI     │
│  (wizard)   │     │  itinerary       │     │  Gateway        │
│             │     │  (edge fn)       │     │  (gemini-3-     │
│  Quick      │     │                  │     │   flash-preview)│
│  Adjust     │     │  1. Query DB     │     └─────────────────┘
│  buttons    │     │  2. Build prompt │
└─────────────┘     │  3. Call LLM     │     ┌─────────────────┐
                    │  4. Return plan  │◀───▶│  Supabase DB    │
                    └──────────────────┘     │  (places table) │
                                            └─────────────────┘
```

## Step-by-step

### 1. Enable Lovable Cloud & set up database

- Create `places` table with columns: `id`, `destination` (text), `name`, `description`, `type` (activity/food/prayer/transport/hotel), `badges` (text[]), `halal_status`, `confidence_score`, `cost_range`, `area`/`neighborhood`, `latitude`, `longitude`, `tags` (text[] for matching interests like "Islamic Heritage", "kid-friendly"), `source_url`
- Seed with ~40-50 Istanbul places from the existing dummy data plus extras covering all categories
- Create `hotels` table similarly for accommodation options

### 2. Create `generate-itinerary` edge function

- Receives: destination, dates, traveler type, budget, interests, halal preferences, pace, specific needs text, quick-adjust modifiers
- Step 1: Query `places` table filtered by destination
- Step 2: Build a structured prompt with all user preferences + available places from DB
- Step 3: Call Lovable AI Gateway (gemini-3-flash-preview) with tool calling to get structured JSON output matching the `DayPlan[]` type
- Step 4: If the LLM identifies gaps (e.g., user wants something not in DB), it can flag items as `needs_web_search: true` (future enhancement)
- Returns structured itinerary JSON

### 3. Update PlanPage to call the edge function

- On "Generate Itinerary", show a loading screen with progress animation
- Pass all form data to the edge function via `supabase.functions.invoke`
- Store the returned itinerary in React state (passed via route state or context)

### 4. Update ItineraryPage for quick adjust

- Quick adjust buttons send the current itinerary + the adjustment label back to the edge function
- The prompt instructs the LLM to modify the existing itinerary based on the adjustment (e.g., "More Islamic Sites" → swap some activities for mosque/heritage visits from DB)
- Show a loading overlay while regenerating
- "Regenerate" button also calls the edge function with original preferences

### 5. Create shared state/context

- Create an `ItineraryContext` or use route state to pass form data and generated itinerary between PlanPage and ItineraryPage
- Store current preferences so quick-adjust and regenerate can reference them

## Technical Details

- **LLM structured output**: Use tool calling with a `generate_itinerary` function schema that returns `{ days: DayPlan[], hotel: HotelSuggestion }` — avoids unreliable JSON parsing
- **Prompt design**: System prompt includes all places from DB as context, user preferences as constraints, and instructions to select/schedule appropriate places with times and explanations
- **Quick adjust**: Adds a modifier to the prompt (e.g., "Prioritize Islamic heritage sites") and re-calls the same edge function
- **No streaming needed**: Itinerary generation returns a complete JSON response, not a chat — use `supabase.functions.invoke` directly
- **Error handling**: Surface 429/402 errors from Lovable AI as user-friendly toasts

## Files to create/modify

| File | Action |
|------|--------|
| `supabase/migrations/001_create_places.sql` | Create places + hotels tables, seed data |
| `supabase/functions/generate-itinerary/index.ts` | Edge function for AI generation |
| `src/lib/itineraryContext.tsx` | React context for shared state |
| `src/pages/PlanPage.tsx` | Call edge function, loading state |
| `src/pages/ItineraryPage.tsx` | Quick adjust calls, regenerate, loading overlay |
| `src/data/dummyData.ts` | Keep types, remove hardcoded itinerary usage |

