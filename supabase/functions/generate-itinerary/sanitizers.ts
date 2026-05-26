// Remove leaked structured fields from title/description strings
// e.g. "Place Name,type:food,badges:[,halalStatus:verified,id:2-3,latitude:51..."
export const LEAKED_FIELD_PATTERN = /[,;]\s*(?:type|badges|halalStatus|id|latitude|longitude|time|title|description|confidenceScore|explanation|cost|day)\s*[:=].*/gi;

// Strip LLM artifacts while preserving letters, numbers, punctuation, separators,
// currency symbols, and combining marks across all Unicode scripts.
export function sanitizeStrings(obj: any): any {
  if (typeof obj === "string") {
    return obj
      .replace(/\}\}.*finish_reason.*$/gi, "")
      .replace(/[^\p{L}\p{N}\p{P}\p{Z}\p{Sc}\p{M}]/gu, "")
      .trim();
  }
  if (Array.isArray(obj)) return obj.map(sanitizeStrings);
  if (obj && typeof obj === "object") {
    const out: any = {};
    for (const [k, v] of Object.entries(obj)) out[k] = sanitizeStrings(v);
    return out;
  }
  return obj;
}

export function sanitizeItineraryItem(item: any): any {
  if (!item || typeof item !== "object") return item;
  const stringFields = ["title", "description", "time", "cost", "explanation"];
  for (const field of stringFields) {
    if (typeof item[field] === "string") {
      item[field] = item[field]
        .replace(LEAKED_FIELD_PATTERN, "")
        .replace(/\{[^}]*$/, "")       // trailing partial JSON
        .replace(/^[^{]*\}/, "")       // leading closing brace junk
        .replace(/\[[^\]]*$/, "")      // trailing partial array
        .replace(/^[^\[]*\]/, "")      // leading closing bracket junk
        .replace(/,\s*$/, "")          // trailing comma
        .replace(/(?:Base)+\s*$/g, "") // strip trailing "Base" repetitions leaked by LLM
        .replace(/(?:Base){2,}/g, "")  // strip inline "BaseBase..." repetitions
        .trim();
    }
  }
  return item;
}

export function sanitizeItinerary(data: any): any {
  if (!data) return data;
  if (data.days && Array.isArray(data.days)) {
    for (const day of data.days) {
      if (typeof day.title === "string") {
        day.title = day.title
          .replace(LEAKED_FIELD_PATTERN, "")
          .replace(/\{[^}]*$/, "")
          .replace(/^[^{]*\}/, "")
          .replace(/\[[^\]]*$/, "")
          .replace(/^[^\[]*\]/, "")
          .replace(/,\s*$/, "")
          .trim();
      }
      if (day.items && Array.isArray(day.items)) {
        day.items = day.items.map(sanitizeItineraryItem);
      }
    }
  }
  return data;
}

// Clean hotel price range to just "$X-Y/night" format
export function sanitizeHotel(hotel: any): any {
  if (!hotel) return hotel;
  if (hotel.name) {
    hotel.name = hotel.name.replace(/[,;]?\s*priceRange\s*:.*$/i, "").trim();
  }
  if (hotel.priceRange) {
    const match = hotel.priceRange.match(/\$?\s*(\d+)\s*[-–]\s*\$?\s*(\d+)/);
    hotel.priceRange = match ? `$${match[1]}-${match[2]}/night` : hotel.priceRange;
  }
  return hotel;
}
