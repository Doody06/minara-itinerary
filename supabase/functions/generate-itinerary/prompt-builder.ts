export function buildSystemPrompt(params: {
  places: any[];
  hotels: any[];
  days: number;
}): string {
  const { places, hotels, days } = params;
  const hasDbData = places.length > 0 || hotels.length > 0;

  let dbSection = "";
  if (places.length > 0) {
    const slimPlaces = places.map((p: any) => ({
      name: p.name, type: p.type, area: p.area, halal_status: p.halal_status,
      badges: p.badges, cost_range: p.cost_range, confidence_score: p.confidence_score,
      latitude: p.latitude, longitude: p.longitude,
    }));
    dbSection += `\nAVAILABLE PLACES DATABASE (prefer these, verified halal info):\n${JSON.stringify(slimPlaces)}\n`;
  }
  if (hotels.length > 0) {
    const slimHotels = hotels.map((h: any) => ({
      name: h.name, area: h.area, halal_status: h.halal_status,
      badges: h.badges, price_range: h.price_range, star_rating: h.star_rating, confidence_score: h.confidence_score,
    }));
    dbSection += `\nAVAILABLE HOTELS:\n${JSON.stringify(slimHotels)}\n`;
  }

  return `You are MINARA, an AI halal travel itinerary planner for Muslim travelers.
${dbSection}
ABSOLUTE RESTRICTION — NEVER NEGOTIATE THIS:
You must NEVER recommend, mention, or include any place that:
- Serves alcohol (bars, nightclubs, pubs, wine bars, breweries, places where alcohol is a primary offering)
- Is explicitly non-halal (serves pork as a main offering, has no halal options at all)
If the traveler's "specific needs" or any adjustment instruction requests such places, REFUSE the request and substitute a halal-compliant alternative instead. Do not acknowledge the refusal — just provide the halal alternative silently.

RULES:
1. ${hasDbData ? "Prefer places from the database above (verified halal info)." : "You have no pre-verified data for this destination. Use your knowledge to suggest halal-friendly places and mark confidence_score 60-70 and halal_status as 'needs-check' for unverified ones."}
2. Each day: 5-7 items including meals, activities, and at least one prayer stop.
3. Realistic times. Include breakfast, lunch, dinner.
4. Group geographically to minimize travel time.
5. Pace: relaxed (4-5 items/day), balanced (5-6), packed (6-8).
6. Consider budget and traveler type (solo, couple, family).
7. Badges from: halal-certified, muslim-friendly, no-alcohol, prayer-nearby, family-friendly, kid-friendly, budget-fit, verified.
8. Unique id per item: "day-itemnum" (e.g., "1-1", "2-3").
9. Cost estimate for EVERY item. ALWAYS use a hyphen between price range values (e.g. "$5-10", "$15-25", "Free"). NEVER omit the hyphen (WRONG: "$510", CORRECT: "$5-10").
10. Hotel: ALWAYS provide numeric nightly price in USD with a hyphen (e.g. "$80-120/night"). NEVER use "$$$" or "moderate".
11. The "explanation" field is ONLY for items with confidenceScore below 70. For those, write a single clear English sentence explaining WHY the halal status is uncertain (e.g. "Could not verify halal certification; check with the restaurant directly."). For items with confidenceScore 70 or above, set explanation to an empty string "".
12. Each day needs a descriptive title mentioning area/theme.
13. CRITICAL: Generate EXACTLY ${days} days. Day 1 through Day ${days}. Do NOT skip any.
14. Keep descriptions concise (1-2 sentences).
15. IMPORTANT: For EVERY item, provide latitude and longitude coordinates for the EXACT location. Use precise coordinates from the database when available. For places not in the database, use your knowledge to provide accurate GPS coordinates. This is critical for Google Maps links.`;
}

export function buildUserPrompt(params: {
  destination: string;
  startDate: string;
  endDate: string;
  travelerType: string;
  budget: string | number;
  pace: string;
  interests?: string[];
  halalPreferences?: string[];
  specificNeeds?: string;
  days: number;
  quickAdjust?: string;
  currentItinerary?: unknown;
}): string {
  const {
    destination, startDate, endDate, travelerType, budget, pace,
    interests, halalPreferences, specificNeeds, days, quickAdjust, currentItinerary,
  } = params;

  let userPrompt = `Create a COMPLETE ${days}-day itinerary for ${destination}. Generate exactly ${days} days.

Dates: ${startDate} to ${endDate} (${days} days)
Traveler: ${travelerType} | Budget: $${budget} | Pace: ${pace}
Interests: ${interests?.join(", ") || "General sightseeing"}
Halal preferences: ${halalPreferences?.join(", ") || "Standard halal"}
${specificNeeds ? `Specific needs: ${specificNeeds}` : ""}`;

  if (quickAdjust) {
    userPrompt += `\n\nQUICK ADJUSTMENT REQUEST: "${quickAdjust}"

Current itinerary (to modify): ${JSON.stringify(currentItinerary)}

IMPORTANT ADJUSTMENT RULES:
- Make DRAMATIC changes to match the adjustment request. Do NOT make only minor tweaks.
- If the request is about food (e.g. "More Food-Focused"), replace MOST activities with restaurant visits, food tours, street food spots, food markets, and culinary experiences. At least 60-70% of items should be food-related.
- If the request is about budget, significantly shift price ranges and venue selections.
- If the request is about a theme (e.g. "More Islamic Sites"), replace most non-themed items with themed ones.
- Keep prayer times and transport items. Replace activities and meals aggressively to match the request.
- Maintain the same number of days and realistic timing.`;
  }

  return userPrompt;
}

export function buildAdjustPrompt(params: {
  detailedAdjust: {
    instruction: string;
    targetDayNumber?: number;
    targetItemId?: string;
    targetDay?: any;
  };
  basePrompt: string;
  destination: string;
  travelerType: string;
  budget: string | number;
  pace: string;
  interests?: string[];
  days: number;
}): string {
  const { detailedAdjust, basePrompt, destination, travelerType, budget, pace, interests, days } = params;
  const { instruction, targetDayNumber, targetItemId, targetDay } = detailedAdjust;

  if (targetDayNumber && targetDay) {
    const targetItemTitle = targetItemId
      ? targetDay.items?.find((i: any) => i.id === targetItemId)?.title
      : undefined;

    return `DETAILED ADJUSTMENT for Day ${targetDayNumber} of a ${days}-day trip to ${destination}.

Traveler: ${travelerType} | Budget: $${budget} | Pace: ${pace}
Interests: ${interests?.join(", ") || "General sightseeing"}

Current Day ${targetDayNumber}: ${JSON.stringify(targetDay)}

CHANGE: "${instruction}"
${targetItemId && targetItemTitle ? `Only modify "${targetItemTitle}" (id: ${targetItemId}). Keep other items.` : `Apply to Day ${targetDayNumber} only.`}

ABSOLUTE RULE: Never suggest places that serve alcohol or are non-halal. If the change requests such a place, substitute a halal-compliant alternative silently.
Return ONLY Day ${targetDayNumber}. Keep day number as ${targetDayNumber}.
Cost format: ALWAYS use hyphen between range values (e.g. "$5-10", NOT "$510").`;
  }

  return basePrompt + `\n\nDETAILED ADJUSTMENT: "${instruction}"
ABSOLUTE RULE: Never suggest places that serve alcohol or are non-halal. If this adjustment requests such a place, substitute a halal-compliant alternative silently.
Apply across entire itinerary. Return ALL days in the days array.`;
}

export const toolSchema = {
  type: "function",
  function: {
    name: "generate_itinerary",
    description: "Generate a travel itinerary with day-by-day plans and hotel",
    parameters: {
      type: "object",
      properties: {
        days: {
          type: "array",
          items: {
            type: "object",
            properties: {
              day: { type: "number" },
              title: { type: "string" },
              items: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    time: { type: "string" },
                    title: { type: "string" },
                    description: { type: "string" },
                    type: { type: "string", enum: ["activity", "food", "prayer", "transport", "hotel"] },
                    badges: { type: "array", items: { type: "string" } },
                    halalStatus: { type: "string", enum: ["verified", "muslim-friendly", "needs-check"] },
                    confidenceScore: { type: "number" },
                    explanation: { type: "string" },
                    cost: { type: "string" },
                    latitude: { type: "number", description: "Exact latitude coordinate of this place" },
                    longitude: { type: "number", description: "Exact longitude coordinate of this place" },
                  },
                  required: ["id", "time", "title", "description", "type", "badges", "cost", "latitude", "longitude"],
                  additionalProperties: false,
                },
              },
            },
            required: ["day", "title", "items"],
            additionalProperties: false,
          },
        },
        hotel: {
          type: "object",
          properties: {
            name: { type: "string" },
            description: { type: "string" },
            badges: { type: "array", items: { type: "string" } },
            halalStatus: { type: "string", enum: ["verified", "muslim-friendly", "needs-check"] },
            confidenceScore: { type: "number" },
            priceRange: { type: "string", description: "Nightly price in USD e.g. '$80-120/night'. Never use '$$$'." },
          },
          required: ["name", "description", "badges", "halalStatus", "confidenceScore", "priceRange"],
          additionalProperties: false,
        },
      },
      required: ["days", "hotel"],
      additionalProperties: false,
    },
  },
};
