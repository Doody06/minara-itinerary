// Remove leaked structured fields from title/description strings
// e.g. "Place Name,type:food,badges:[,halalStatus:verified,id:2-3,latitude:51..."
export const LEAKED_FIELD_PATTERN =
  /[,;]\s*(?:type|badges|halalStatus|id|latitude|longitude|time|title|description|confidenceScore|explanation|cost|day)\s*[:=].*/gi;

// Strip stray non-content characters the model occasionally injects while preserving
// Arabic, Turkish (Extended-A), Japanese, Malay, and other non-Latin scripts.
// Also strip leaked LLM artifacts like "}}finish_reason:" or field names leaking into values.
export function sanitizeStrings(obj: unknown): unknown {
  if (typeof obj === "string") {
    return obj
      .replace(/\}\}.*finish_reason.*$/gi, "") // strip leaked LLM finish artifacts
      .replace(/[^\p{L}\p{N}\p{P}\p{Z}\p{Sc}\p{M}]/gu, "") // preserve letters, numbers, punctuation, separators, currency, combining marks
      .trim();
  }
  if (Array.isArray(obj)) return obj.map(sanitizeStrings);
  if (obj && typeof obj === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) out[k] = sanitizeStrings(v);
    return out;
  }
  return obj;
}

export function sanitizeItineraryItem(item: unknown): unknown {
  if (!item || typeof item !== "object") return item;
  const record = item as Record<string, unknown>;
  const stringFields = ["title", "description", "time", "cost", "explanation"];
  for (const field of stringFields) {
    if (typeof record[field] === "string") {
      record[field] = (record[field] as string)
        .replace(LEAKED_FIELD_PATTERN, "")
        .replace(/\{[^}]*$/, "")        // trailing partial JSON
        .replace(/^[^{]*\}/, "")        // leading closing brace junk
        .replace(/\[[^\]]*$/, "")       // trailing partial array
        .replace(/^[^\[]*\]/, "")       // leading closing bracket junk
        .replace(/,\s*$/, "")           // trailing comma
        .replace(/(?:Base)+\s*$/g, "")  // strip trailing "Base" repetitions leaked by LLM
        .replace(/(?:Base){2,}/g, "")   // strip inline "BaseBase..." repetitions
        .trim();
    }
  }
  return item;
}

export function sanitizeItinerary(data: unknown): unknown {
  if (!data || typeof data !== "object") return data;
  const record = data as Record<string, unknown>;
  if (record.days && Array.isArray(record.days)) {
    for (const day of record.days) {
      if (!day || typeof day !== "object") continue;
      const d = day as Record<string, unknown>;
      if (typeof d.title === "string") {
        d.title = d.title
          .replace(LEAKED_FIELD_PATTERN, "")
          .replace(/\{[^}]*$/, "")
          .replace(/^[^{]*\}/, "")
          .replace(/\[[^\]]*$/, "")
          .replace(/^[^\[]*\]/, "")
          .replace(/,\s*$/, "")
          .trim();
      }
      if (d.items && Array.isArray(d.items)) {
        d.items = d.items.map(sanitizeItineraryItem);
      }
    }
  }
  return data;
}

// Clean hotel price range to just "$X-Y/night" format
export function sanitizeHotel(hotel: unknown): unknown {
  if (!hotel || typeof hotel !== "object") return hotel;
  const h = hotel as Record<string, unknown>;
  if (typeof h.name === "string") {
    h.name = h.name.replace(/[,;]?\s*priceRange\s*:.*$/i, "").trim();
  }
  if (typeof h.priceRange === "string") {
    const match = h.priceRange.match(/\$?\s*(\d+)\s*[-–]\s*\$?\s*(\d+)/);
    h.priceRange = match ? `$${match[1]}-${match[2]}/night` : h.priceRange;
  }
  return hotel;
}
