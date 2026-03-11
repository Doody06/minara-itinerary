import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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
    } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Query places from DB
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!
    );

    const { data: places, error: placesError } = await supabase
      .from("places")
      .select("*")
      .eq("destination", destination);

    if (placesError) {
      console.error("Places query error:", placesError);
      throw new Error("Failed to query places database");
    }

    const { data: hotels, error: hotelsError } = await supabase
      .from("hotels")
      .select("*")
      .eq("destination", destination);

    if (hotelsError) {
      console.error("Hotels query error:", hotelsError);
      throw new Error("Failed to query hotels database");
    }

    // Calculate trip duration (inclusive of both start and end dates)
    const start = new Date(startDate);
    const end = new Date(endDate);
    const rawDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
    const days = Math.min(rawDays, 15); // Cap at 15 days max
    console.log(`Trip duration: ${rawDays} days (capped to ${days}) (${startDate} to ${endDate})`);

    // Build the system prompt
    const systemPrompt = `You are MINARA, an AI halal travel itinerary planner. You create detailed, day-by-day travel itineraries for Muslim travelers.

AVAILABLE PLACES DATABASE (prefer these, they have verified halal info):
${JSON.stringify(places, null, 2)}

AVAILABLE HOTELS:
${JSON.stringify(hotels, null, 2)}

RULES:
1. ALWAYS prefer places from the database above. They have verified halal information.
2. If you need additional places not in the database (e.g., the user wants something specific not covered), you may suggest them but mark their confidence_score lower (60-70) and halal_status as "needs-check".
3. Each day should have 5-7 items including meals, activities, and at least one prayer stop.
4. Schedule items with realistic times. Include breakfast, lunch, and dinner.
5. Group items geographically to minimize travel time.
6. Match the pace preference: relaxed (4-5 items/day), balanced (5-6), packed (6-8).
7. Consider the budget when selecting restaurants and activities.
8. Match the traveler type (solo, couple, family with kids) when selecting activities.
9. Include relevant badges from: halal-certified, muslim-friendly, no-alcohol, prayer-nearby, family-friendly, kid-friendly, budget-fit, verified.
10. Give each item a unique id like "day-itemnum" (e.g., "1-1", "1-2", "2-1").
11. Include a cost estimate for food items.
12. For items from the database, use their confidence_score and halal_status. Add an explanation for why this place was chosen.
13. Each day needs a descriptive title mentioning the area/theme.
14. CRITICAL: You MUST generate EXACTLY ${days} days. Every single day from Day 1 to Day ${days} must be present. Do NOT skip, shorten, or truncate. Generate ALL days in a single response.
15. Keep each item description concise (1-2 sentences) to fit within response limits.`;

    let userPrompt = `Create a COMPLETE ${days}-day itinerary for ${destination}. You MUST generate exactly ${days} days (Day 1 through Day ${days}). Do not skip any days.

Travel dates: ${startDate} to ${endDate} (${days} days total)
Traveler type: ${travelerType}
Budget: $${budget}
Interests: ${interests?.join(", ") || "General sightseeing"}
Halal preferences: ${halalPreferences?.join(", ") || "Standard halal"}
Pace: ${pace}
${specificNeeds ? `Specific needs: ${specificNeeds}` : ""}`;

    if (quickAdjust) {
      userPrompt += `\n\nQUICK ADJUSTMENT REQUEST: "${quickAdjust}"
The user wants to modify their existing itinerary. Here is the current itinerary:
${JSON.stringify(currentItinerary, null, 2)}

Please modify the itinerary based on the adjustment request. Keep the same structure but swap/add/remove items as needed to fulfill the request. For example:
- "More Islamic Sites" → Replace some activities with mosque visits and Islamic heritage sites
- "More Kid-Friendly" → Swap activities for kid-friendly ones like parks, aquariums
- "More Budget-Friendly" → Replace expensive restaurants with budget options
- "More Food-Focused" → Add more food experiences, food tours, street food stops
- "Less Walking" → Group items closer together, add more transport/rest stops`;
    }

    // Call Lovable AI Gateway with tool calling for structured output
    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "generate_itinerary",
                description:
                  "Generate a complete travel itinerary with day-by-day plans and hotel suggestion",
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
                                type: {
                                  type: "string",
                                  enum: [
                                    "activity",
                                    "food",
                                    "prayer",
                                    "transport",
                                    "hotel",
                                  ],
                                },
                                badges: {
                                  type: "array",
                                  items: { type: "string" },
                                },
                                halalStatus: {
                                  type: "string",
                                  enum: [
                                    "verified",
                                    "muslim-friendly",
                                    "needs-check",
                                  ],
                                },
                                confidenceScore: { type: "number" },
                                explanation: { type: "string" },
                                cost: { type: "string" },
                              },
                              required: [
                                "id",
                                "time",
                                "title",
                                "description",
                                "type",
                                "badges",
                              ],
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
                        badges: {
                          type: "array",
                          items: { type: "string" },
                        },
                        halalStatus: {
                          type: "string",
                          enum: [
                            "verified",
                            "muslim-friendly",
                            "needs-check",
                          ],
                        },
                        confidenceScore: { type: "number" },
                        priceRange: { type: "string" },
                      },
                      required: [
                        "name",
                        "description",
                        "badges",
                        "halalStatus",
                        "confidenceScore",
                        "priceRange",
                      ],
                      additionalProperties: false,
                    },
                  },
                  required: ["days", "hotel"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: {
            type: "function",
            function: { name: "generate_itinerary" },
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({
            error: "Rate limit exceeded. Please try again in a moment.",
          }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({
            error:
              "AI usage limit reached. Please add credits to your workspace.",
          }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      console.error("No tool call in response:", JSON.stringify(aiResponse));
      throw new Error("AI did not return structured itinerary data");
    }

    const itineraryData = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(itineraryData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-itinerary error:", e);
    return new Response(
      JSON.stringify({
        error: e instanceof Error ? e.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
