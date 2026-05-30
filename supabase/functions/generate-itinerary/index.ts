import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { sanitizeStrings, sanitizeItinerary, sanitizeHotel } from "./sanitizers.ts";
import {
  isValidFullResponse,
  isValidWholeAdjustResponse,
  isValidTargetedAdjustResponse,
  isValidHotel,
  formatAdjustResponse,
} from "./validators.ts";
import { calculateTripDays } from "./date-utils.ts";
import { buildSystemPrompt, buildUserPrompt, buildAdjustPrompt, toolSchema } from "./prompt-builder.ts";
import { learnNewPlaces } from "./learning.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Helper: call AI gateway with retry
async function callAIWithRetry(
  url: string,
  headers: Record<string, string>,
  body: unknown,
  maxRetries = 2,
  validate: (data: unknown) => boolean = () => true
): Promise<
  | { success: true; data: unknown }
  | { rateLimited: true; status: 429 }
  | { paymentRequired: true; status: 402 }
  | { invalidResponse: true }
> {
  let lastError: Error | null = null;
  let gotInvalidResponse = false;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    if (attempt > 0) {
      console.log(`Retry attempt ${attempt}...`);
      await new Promise((r) => setTimeout(r, 2000 * attempt));
    }
    try {
      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });

      if (response.status === 429) return { rateLimited: true, status: 429 };
      if (response.status === 402) return { paymentRequired: true, status: 402 };

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`AI Gateway error (attempt ${attempt}):`, response.status, errorText);
        lastError = new Error(`AI Gateway error: ${response.status}`);
        continue;
      }

      const data = await response.json();
      const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
      if (!toolCall?.function?.arguments) {
        console.error(`No tool call (attempt ${attempt}):`, JSON.stringify(data).slice(0, 500));
        lastError = new Error("AI did not return structured data");
        continue;
      }

      const parsed = JSON.parse(toolCall.function.arguments);
      if (!validate(parsed)) {
        console.warn(`Validation failed (attempt ${attempt}): AI response shape invalid`);
        gotInvalidResponse = true;
        lastError = new Error("AI response failed validation");
        continue;
      }

      return { success: true, data: parsed };
    } catch (e) {
      console.error(`Fetch error (attempt ${attempt}):`, e);
      lastError = e instanceof Error ? e : new Error(String(e));
    }
  }
  if (gotInvalidResponse) return { invalidResponse: true };
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

    // Query places from DB — prefer service-role key for RLS-bypassing reads
    const dbKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, dbKey);

    const [placesResult, hotelsResult] = await Promise.all([
      supabase.from("places").select("*").eq("destination", destination),
      supabase.from("hotels").select("*").eq("destination", destination),
    ]);

    if (placesResult.error) console.error("Places query error:", placesResult.error);
    if (hotelsResult.error) console.error("Hotels query error:", hotelsResult.error);

    const places = placesResult.data || [];
    const hotels = hotelsResult.data || [];

    const days = calculateTripDays(startDate, endDate);
    console.log(`Trip duration: ${days} days (${startDate} to ${endDate})`);

    const systemPrompt = buildSystemPrompt({ places, hotels, days });

    const isDetailedAdjust = !!detailedAdjust;
    const detailedAdjustDayNumber: number | undefined = detailedAdjust?.targetDayNumber;

    let userPrompt = buildUserPrompt({
      destination, startDate, endDate, travelerType, budget, pace,
      interests, halalPreferences, specificNeeds, days, quickAdjust, currentItinerary,
    });

    if (isDetailedAdjust) {
      userPrompt = buildAdjustPrompt({
        detailedAdjust,
        basePrompt: userPrompt,
        destination,
        travelerType,
        budget,
        pace,
        interests,
        days,
      });
    }

    // Choose validator based on request mode
    const validate = isDetailedAdjust && detailedAdjustDayNumber
      ? isValidTargetedAdjustResponse
      : isDetailedAdjust
      ? isValidWholeAdjustResponse
      : isValidFullResponse;

    const result = await callAIWithRetry(
      aiUrl,
      aiHeaders,
      {
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [toolSchema],
        tool_choice: { type: "function", function: { name: "generate_itinerary" } },
      },
      2,
      validate
    );

    if (result.rateLimited) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment.", code: "RATE_LIMITED", retryable: true }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (result.paymentRequired) {
      return new Response(
        JSON.stringify({ error: "AI usage limit reached. Please add credits.", code: "PAYMENT_REQUIRED", retryable: false }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (result.invalidResponse) {
      return new Response(
        JSON.stringify({ error: "AI did not return a valid itinerary.", code: "INVALID_RESPONSE", retryable: true }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const itineraryData = sanitizeStrings(result.data) as Record<string, unknown>;
    sanitizeItinerary(itineraryData);

    // Validate hotel separately — a malformed hotel must not block valid days
    if (itineraryData.hotel !== undefined) {
      const sanitized = sanitizeHotel(itineraryData.hotel);
      itineraryData.hotel = isValidHotel(sanitized) ? sanitized : null;
      if (!isValidHotel(sanitized)) {
        console.warn("Hotel validation failed — returning hotel: null to preserve existing hotel in client state");
      }
    }

    // For detailed adjust (targeted or whole), return explicit contract shape
    if (isDetailedAdjust) {
      const body = detailedAdjustDayNumber
        ? formatAdjustResponse("targeted", itineraryData, detailedAdjustDayNumber)
        : formatAdjustResponse("whole", itineraryData);
      return new Response(JSON.stringify(body), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Return itinerary immediately, then learn new places in background
    const usedDb = places.length > 0 || hotels.length > 0;
    const responseBody = JSON.stringify({ ...itineraryData, meta: { usedDb } });

    const existingPlaceNames = new Set(places.map((p: any) => p.name.toLowerCase()));
    const existingHotelNames = new Set(hotels.map((h: any) => h.name.toLowerCase()));

    const newPlaceItems: {
      title: string; type: string;
      latitude?: number | null; longitude?: number | null;
      halal_status?: string | null; cost?: string | null;
    }[] = [];
    for (const day of itineraryData.days || []) {
      for (const item of day.items || []) {
        if (item.type !== "transport" && !existingPlaceNames.has(item.title.toLowerCase())) {
          newPlaceItems.push({
            title: item.title,
            type: item.type,
            latitude: item.latitude ?? null,
            longitude: item.longitude ?? null,
            halal_status: item.halalStatus ?? null,
            cost: item.cost ?? null,
          });
        }
      }
    }
    const hotelIsNew = itineraryData.hotel && !existingHotelNames.has(itineraryData.hotel.name.toLowerCase());
    const uniqueNewPlaces = [...new Map(newPlaceItems.map((p) => [p.title.toLowerCase(), p])).values()];

    if (uniqueNewPlaces.length > 0 || hotelIsNew) {
      const learnPromise = learnNewPlaces(uniqueNewPlaces, hotelIsNew ? itineraryData.hotel : null, destination, aiUrl, aiHeaders);
      learnPromise.catch((e) => console.error("Background learning failed:", e));
      const runtime = (globalThis as any).EdgeRuntime;
      if (runtime?.waitUntil) {
        runtime.waitUntil(learnPromise);
      }
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
