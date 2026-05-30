import { createClient } from "jsr:@supabase/supabase-js@2";
import { normalizeConfidenceScore } from "./learning-utils.ts";

export { normalizeConfidenceScore };

export async function learnNewPlaces(
  newPlaces: {
    title: string;
    type: string;
    latitude?: number | null;
    longitude?: number | null;
    halal_status?: string | null;
    cost?: string | null;
  }[],
  newHotel: any | null,
  destination: string,
  aiUrl: string,
  aiHeaders: Record<string, string>
): Promise<void> {
  console.log(`Learning ${newPlaces.length} new places and ${newHotel ? 1 : 0} new hotel for ${destination}`);

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const researchItems = [
    ...newPlaces.map((p) => {
      let line = `${p.title} (type: ${p.type}`;
      if (p.latitude) line += `, coords: ${p.latitude},${p.longitude}`;
      if (p.halal_status) line += `, known halal: ${p.halal_status}`;
      if (p.cost) line += `, cost: ${p.cost}`;
      return line + ")";
    }),
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
      confidence_score: normalizeConfidenceScore(p.confidence_score),
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
      confidence_score: normalizeConfidenceScore(h.confidence_score),
      price_range: h.price_range || null, star_rating: h.star_rating ? Math.round(Number(h.star_rating)) : null,
    }));
    const { error } = await supabaseAdmin.from("hotels").upsert(hotelsToInsert, { onConflict: "name,destination", ignoreDuplicates: true });
    if (error) console.error("Failed to insert hotels:", error);
    else console.log(`Learned ${hotelsToInsert.length} new hotels`);
  }
}
