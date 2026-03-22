import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Strip stray non-ASCII characters (CJK, etc.) that the model occasionally injects
function sanitizeStrings(obj: any): any {
  if (typeof obj === "string") {
    // Keep basic Latin, common punctuation, currency symbols — remove CJK and other stray unicode
    return obj.replace(/[^\x00-\x7F\u00A0-\u00FF\u20AC\u00A3\u00A5]/g, "").trim();
  }
  if (Array.isArray(obj)) return obj.map(sanitizeStrings);
  if (obj && typeof obj === "object") {
    const out: any = {};
    for (const [k, v] of Object.entries(obj)) out[k] = sanitizeStrings(v);
    return out;
  }
  return obj;
}

// Helper: call AI gateway with retry
async function callAIWithRetry(
  url: string,
  headers: Record<string, string>,
  body: any,
  maxRetries = 2
): Promise<any> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    if (attempt > 0) {
      console.log(`Retry attempt ${attempt}...`);
      await new Promise((r) => setTimeout(r, 2000 * attempt)); // backoff
    }
    try {
      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });

      if (response.status === 429) {
        return { rateLimited: true, status: 429 };
      }
      if (response.status === 402) {
        return { paymentRequired: true, status: 402 };
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`AI Gateway error (attempt ${attempt}):`, response.status, errorText);
        lastError = new Error(`AI Gateway error: ${response.status}`);
        continue; // retry
      }

      const data = await response.json();
      const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
      if (!toolCall?.function?.arguments) {
        console.error(`No tool call (attempt ${attempt}):`, JSON.stringify(data).slice(0, 500));
        lastError = new Error("AI did not return structured data");
        continue; // retry
      }

      return { success: true, data: JSON.parse(toolCall.function.arguments) };
    } catch (e) {
      console.error(`Fetch error (attempt ${attempt}):`, e);
      lastError = e instanceof Error ? e : new Error(String(e));
    }
  }
  throw lastError || new Error("AI call failed after retries");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      destination,
      startDate,
      endDate,
      travelerType,
      budget,
      interests,
      halalPreferences,
      pace,
      specificNeeds,
      quickAdjust,
      currentItinerary,
      detailedAdjust,
    } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const aiHeaders = {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    };
    const aiUrl = "https://ai.gateway.lovable.dev/v1/chat/completions";

    // Query places from DB
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!
    );

    const [placesResult, hotelsResult] = await Promise.all([
      supabase.from("places").select("*").eq("destination", destination),
      supabase.from("hotels").select("*").eq("destination", destination),
    ]);

    if (placesResult.error) {
      console.error("Places query error:", placesResult.error);
    }
    if (hotelsResult.error) {
      console.error("Hotels query error:", hotelsResult.error);
    }

    const places = placesResult.data || [];
    const hotels = hotelsResult.data || [];

    // Calculate trip duration (inclusive of both start and end dates)
    const start = new Date(startDate);
    const end = new Date(endDate);
    const rawDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
    const days = Math.min(rawDays, 15);
    console.log(`Trip duration: ${rawDays} days (capped to ${days}) (${startDate} to ${endDate})`);

    // Build the system prompt - keep it concise when DB has no data
    const hasDbData = places.length > 0 || hotels.length > 0;
    
    let dbSection = "";
    if (places.length > 0) {
      // Only send essential fields to reduce prompt size
      const slimPlaces = places.map((p: any) => ({
        name: p.name, type: p.type, area: p.area, halal_status: p.halal_status, 
        badges: p.badges, cost_range: p.cost_range, confidence_score: p.confidence_score,
        latitude: p.latitude, longitude: p.longitude
      }));
      dbSection += `\nAVAILABLE PLACES DATABASE (prefer these, verified halal info):\n${JSON.stringify(slimPlaces)}\n`;
    }
    if (hotels.length > 0) {
      const slimHotels = hotels.map((h: any) => ({
        name: h.name, area: h.area, halal_status: h.halal_status,
        badges: h.badges, price_range: h.price_range, star_rating: h.star_rating, confidence_score: h.confidence_score
      }));
      dbSection += `\nAVAILABLE HOTELS:\n${JSON.stringify(slimHotels)}\n`;
    }

    const systemPrompt = `You are MINARA, an AI halal travel itinerary planner for Muslim travelers.
${dbSection}
RULES:
1. ${hasDbData ? "Prefer places from the database above (verified halal info)." : "You have no pre-verified data for this destination. Use your knowledge to suggest halal-friendly places and mark confidence_score 60-70 and halal_status as 'needs-check' for unverified ones."}
2. Each day: 5-7 items including meals, activities, and at least one prayer stop.
3. Realistic times. Include breakfast, lunch, dinner.
4. Group geographically to minimize travel time.
5. Pace: relaxed (4-5 items/day), balanced (5-6), packed (6-8).
6. Consider budget and traveler type (solo, couple, family).
7. Badges from: halal-certified, muslim-friendly, no-alcohol, prayer-nearby, family-friendly, kid-friendly, budget-fit, verified.
8. Unique id per item: "day-itemnum" (e.g., "1-1", "2-3").
9. Cost estimate for EVERY item (e.g. "$5-10", "Free"). Always provide a cost string.
10. Hotel: ALWAYS provide numeric nightly price in USD (e.g. "$80-120/night"). NEVER use "$$$" or "moderate".
11. The "explanation" field is ONLY for items with confidenceScore below 70. For those, write a single clear English sentence explaining WHY the halal status is uncertain (e.g. "Could not verify halal certification; check with the restaurant directly."). For items with confidenceScore 70 or above, set explanation to an empty string "".
12. Each day needs a descriptive title mentioning area/theme.
13. CRITICAL: Generate EXACTLY ${days} days. Day 1 through Day ${days}. Do NOT skip any.
14. Keep descriptions concise (1-2 sentences).
15. IMPORTANT: For EVERY item, provide latitude and longitude coordinates for the EXACT location. Use precise coordinates from the database when available. For places not in the database, use your knowledge to provide accurate GPS coordinates. This is critical for Google Maps links.`;

    let userPrompt = `Create a COMPLETE ${days}-day itinerary for ${destination}. Generate exactly ${days} days.

Dates: ${startDate} to ${endDate} (${days} days)
Traveler: ${travelerType} | Budget: $${budget} | Pace: ${pace}
Interests: ${interests?.join(", ") || "General sightseeing"}
Halal preferences: ${halalPreferences?.join(", ") || "Standard halal"}
${specificNeeds ? `Specific needs: ${specificNeeds}` : ""}`;

    if (quickAdjust) {
      userPrompt += `\n\nQUICK ADJUSTMENT: "${quickAdjust}"
Current itinerary: ${JSON.stringify(currentItinerary)}
Modify based on the request. Keep structure, swap/add/remove items as needed.`;
    }

    // --- DETAILED ADJUST ---
    const isDetailedAdjust = !!detailedAdjust;
    let detailedAdjustDayNumber: number | undefined;

    if (isDetailedAdjust) {
      const { instruction, targetDayNumber, targetItemId, targetDay } = detailedAdjust;
      detailedAdjustDayNumber = targetDayNumber;

      if (targetDayNumber && targetDay) {
        const targetItemTitle = targetItemId
          ? targetDay.items?.find((i: any) => i.id === targetItemId)?.title
          : undefined;

        userPrompt = `DETAILED ADJUSTMENT for Day ${targetDayNumber} of a ${days}-day trip to ${destination}.

Traveler: ${travelerType} | Budget: $${budget} | Pace: ${pace}
Interests: ${interests?.join(", ") || "General sightseeing"}

Current Day ${targetDayNumber}: ${JSON.stringify(targetDay)}

CHANGE: "${instruction}"
${targetItemId && targetItemTitle ? `Only modify "${targetItemTitle}" (id: ${targetItemId}). Keep other items.` : `Apply to Day ${targetDayNumber} only.`}

Return ONLY Day ${targetDayNumber}. Keep day number as ${targetDayNumber}.`;
      } else {
        userPrompt += `\n\nDETAILED ADJUSTMENT: "${instruction}"
Apply across entire itinerary.`;
      }
    }

    // Tool schema for structured output
    const toolSchema = {
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

    // Call AI with retry - use fast model for speed
    const result = await callAIWithRetry(aiUrl, aiHeaders, {
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      tools: [toolSchema],
      tool_choice: { type: "function", function: { name: "generate_itinerary" } },
    });

    if (result.rateLimited) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (result.paymentRequired) {
      return new Response(
        JSON.stringify({ error: "AI usage limit reached. Please add credits." }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const itineraryData = sanitizeStrings(result.data);

    // For detailed adjust targeting a single day, return immediately
    if (isDetailedAdjust && detailedAdjustDayNumber && itineraryData.days?.length > 0) {
      const adjustedDay = itineraryData.days.find((d: any) => d.day === detailedAdjustDayNumber) || itineraryData.days[0];
      adjustedDay.day = detailedAdjustDayNumber;
      return new Response(JSON.stringify({ adjustedDay, hotel: itineraryData.hotel }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Return itinerary immediately, then learn new places in background
    const responseBody = JSON.stringify(itineraryData);

    // Fire-and-forget: learn new places (don't block the response)
    const existingPlaceNames = new Set((places).map((p: any) => p.name.toLowerCase()));
    const existingHotelNames = new Set((hotels).map((h: any) => h.name.toLowerCase()));

    const newPlaceItems: { title: string; type: string }[] = [];
    for (const day of itineraryData.days || []) {
      for (const item of day.items || []) {
        if (item.type !== "transport" && !existingPlaceNames.has(item.title.toLowerCase())) {
          newPlaceItems.push({ title: item.title, type: item.type });
        }
      }
    }
    const hotelIsNew = itineraryData.hotel && !existingHotelNames.has(itineraryData.hotel.name.toLowerCase());
    const uniqueNewPlaces = [...new Map(newPlaceItems.map((p) => [p.title.toLowerCase(), p])).values()];

    if (uniqueNewPlaces.length > 0 || hotelIsNew) {
      // Use EdgeRuntime.waitUntil if available, otherwise just don't await
      const learnPromise = learnNewPlaces(uniqueNewPlaces, hotelIsNew ? itineraryData.hotel : null, destination, aiUrl, aiHeaders);
      // Don't await - let it run in background
      learnPromise.catch((e) => console.error("Background learning failed:", e));
    }

    return new Response(responseBody, {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-itinerary error:", e);
    return new Response(
      JSON.stringify({
        error: e instanceof Error ? e.message : "Failed to generate itinerary. Please try again.",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

async function learnNewPlaces(
  newPlaces: { title: string; type: string }[],
  newHotel: any | null,
  destination: string,
  aiUrl: string,
  aiHeaders: Record<string, string>
) {
  console.log(`Learning ${newPlaces.length} new places and ${newHotel ? 1 : 0} new hotel for ${destination}`);

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const researchItems = [
    ...newPlaces.map((p) => `${p.title} (type: ${p.type})`),
    ...(newHotel ? [`${newHotel.name} (type: hotel)`] : []),
  ];

  const researchResponse = await fetch(aiUrl, {
    method: "POST",
    headers: aiHeaders,
    body: JSON.stringify({
      model: "google/gemini-2.5-flash-lite",
      messages: [
        { role: "system", content: "Research assistant. Provide concise details for each place/hotel: description, area, halal status, tags, cost range, GPS. Be factual." },
        { role: "user", content: `Research these places/hotels in ${destination}:\n${researchItems.join("\n")}` },
      ],
      tools: [{
        type: "function",
        function: {
          name: "save_researched_places",
          description: "Save researched place and hotel details",
          parameters: {
            type: "object",
            properties: {
              places: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    description: { type: "string" },
                    type: { type: "string", enum: ["activity", "food", "prayer", "transport", "hotel"] },
                    area: { type: "string" },
                    halal_status: { type: "string", enum: ["verified", "muslim-friendly", "needs-check"] },
                    badges: { type: "array", items: { type: "string" } },
                    tags: { type: "array", items: { type: "string" } },
                    confidence_score: { type: "number" },
                    cost_range: { type: "string" },
                    latitude: { type: "number" },
                    longitude: { type: "number" },
                  },
                  required: ["name", "description", "type", "area", "halal_status", "badges", "tags", "confidence_score"],
                  additionalProperties: false,
                },
              },
              hotels: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    description: { type: "string" },
                    area: { type: "string" },
                    halal_status: { type: "string", enum: ["verified", "muslim-friendly", "needs-check"] },
                    badges: { type: "array", items: { type: "string" } },
                    tags: { type: "array", items: { type: "string" } },
                    confidence_score: { type: "number" },
                    price_range: { type: "string" },
                    star_rating: { type: "number" },
                  },
                  required: ["name", "description", "area", "halal_status", "badges", "tags", "confidence_score", "price_range"],
                  additionalProperties: false,
                },
              },
            },
            required: ["places", "hotels"],
            additionalProperties: false,
          },
        },
      }],
      tool_choice: { type: "function", function: { name: "save_researched_places" } },
    }),
  });

  if (!researchResponse.ok) {
    console.error("Research AI call failed:", researchResponse.status);
    return;
  }

  const researchData = await researchResponse.json();
  const toolCall = researchData.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall?.function?.arguments) return;

  const learned = JSON.parse(toolCall.function.arguments);

  if (learned.places?.length > 0) {
    const placesToInsert = learned.places.map((p: any) => ({
      name: p.name, description: p.description, type: p.type, destination,
      area: p.area || null, halal_status: p.halal_status || "needs-check",
      badges: p.badges || [], tags: p.tags || [],
      confidence_score: Math.round(Number(p.confidence_score) || 60),
      cost_range: p.cost_range || null,
      latitude: p.latitude || null, longitude: p.longitude || null,
    }));
    const { error } = await supabaseAdmin.from("places").upsert(placesToInsert, { onConflict: "name,destination", ignoreDuplicates: true });
    if (error) console.error("Failed to insert places:", error);
    else console.log(`Learned ${placesToInsert.length} new places`);
  }

  if (learned.hotels?.length > 0) {
    const hotelsToInsert = learned.hotels.map((h: any) => ({
      name: h.name, description: h.description, destination,
      area: h.area || null, halal_status: h.halal_status || "needs-check",
      badges: h.badges || [], tags: h.tags || [],
      confidence_score: Math.round(Number(h.confidence_score) || 60),
      price_range: h.price_range || null, star_rating: h.star_rating ? Math.round(Number(h.star_rating)) : null,
    }));
    const { error } = await supabaseAdmin.from("hotels").upsert(hotelsToInsert, { onConflict: "name,destination", ignoreDuplicates: true });
    if (error) console.error("Failed to insert hotels:", error);
    else console.log(`Learned ${hotelsToInsert.length} new hotels`);
  }
}
