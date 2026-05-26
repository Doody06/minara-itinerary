// Remove leaked structured fields from title/description strings
// e.g. "Place Name,type:food,badges:[,halalStatus:verified,id:2-3,latitude:51..."
<<<<<<< HEAD
export const LEAKED_FIELD_PATTERN = /[,;]\s*(?:type|badges|halalStatus|id|latitude|longitude|time|title|description|confidenceScore|explanation|cost|day)\s*[:=].*/gi;

// Strip LLM artifacts while preserving letters, numbers, punctuation, separators,
// currency symbols, and combining marks across all Unicode scripts.
export function sanitizeStrings(obj: any): any {
  if (typeof obj === "string") {
    return obj
      .replace(/\}\}.*finish_reason.*$/gi, "")
      .replace(/[^\p{L}\p{N}\p{P}\p{Z}\p{Sc}\p{M}]/gu, "")
=======
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
>>>>>>> 7aa7f034d289cc865da9488e3003a1943641dd92
      .trim();
  }
  if (Array.isArray(obj)) return obj.map(sanitizeStrings);
  if (obj && typeof obj === "object") {
<<<<<<< HEAD
    const out: any = {};
=======
    const out: Record<string, unknown> = {};
>>>>>>> 7aa7f034d289cc865da9488e3003a1943641dd92
    for (const [k, v] of Object.entries(obj)) out[k] = sanitizeStrings(v);
    return out;
  }
  return obj;
}

<<<<<<< HEAD
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
=======
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
>>>>>>> 7aa7f034d289cc865da9488e3003a1943641dd92
        .trim();
    }
  }
  return item;
}

<<<<<<< HEAD
export function sanitizeItinerary(data: any): any {
  if (!data) return data;
  if (data.days && Array.isArray(data.days)) {
    for (const day of data.days) {
      if (typeof day.title === "string") {
        day.title = day.title
=======
export function sanitizeItinerary(data: unknown): unknown {
  if (!data || typeof data !== "object") return data;
  const record = data as Record<string, unknown>;
  if (record.days && Array.isArray(record.days)) {
    for (const day of record.days) {
      if (!day || typeof day !== "object") continue;
      const d = day as Record<string, unknown>;
      if (typeof d.title === "string") {
        d.title = d.title
>>>>>>> 7aa7f034d289cc865da9488e3003a1943641dd92
          .replace(LEAKED_FIELD_PATTERN, "")
          .replace(/\{[^}]*$/, "")
          .replace(/^[^{]*\}/, "")
          .replace(/\[[^\]]*$/, "")
          .replace(/^[^\[]*\]/, "")
          .replace(/,\s*$/, "")
          .trim();
      }
<<<<<<< HEAD
      if (day.items && Array.isArray(day.items)) {
        day.items = day.items.map(sanitizeItineraryItem);
=======
      if (d.items && Array.isArray(d.items)) {
        d.items = d.items.map(sanitizeItineraryItem);
>>>>>>> 7aa7f034d289cc865da9488e3003a1943641dd92
      }
    }
  }
  return data;
}

// Clean hotel price range to just "$X-Y/night" format
<<<<<<< HEAD
export function sanitizeHotel(hotel: any): any {
  if (!hotel) return hotel;
  if (hotel.name) {
    hotel.name = hotel.name.replace(/[,;]?\s*priceRange\s*:.*$/i, "").trim();
  }
  if (hotel.priceRange) {
    const match = hotel.priceRange.match(/\$?\s*(\d+)\s*[-–]\s*\$?\s*(\d+)/);
    hotel.priceRange = match ? `$${match[1]}-${match[2]}/night` : hotel.priceRange;
=======
export function sanitizeHotel(hotel: unknown): unknown {
  if (!hotel || typeof hotel !== "object") return hotel;
  const h = hotel as Record<string, unknown>;
  if (typeof h.name === "string") {
    h.name = h.name.replace(/[,;]?\s*priceRange\s*:.*$/i, "").trim();
  }
  if (typeof h.priceRange === "string") {
    const match = h.priceRange.match(/\$?\s*(\d+)\s*[-–]\s*\$?\s*(\d+)/);
    h.priceRange = match ? `$${match[1]}-${match[2]}/night` : h.priceRange;
>>>>>>> 7aa7f034d289cc865da9488e3003a1943641dd92
  }
  return hotel;
}
