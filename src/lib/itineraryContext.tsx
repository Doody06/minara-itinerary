import { createContext, useContext, useState, useRef, type ReactNode } from "react";
import type { DayPlan, Badge, HalalStatus, ItineraryItem } from "@/data/dummyData";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

// Client-side sanitization to strip any leaked LLM/JSON artifacts
const LEAKED_FIELDS_RE = /[,;]\s*(?:type|badges|halalStatus|id|latitude|longitude|time|title|description|confidenceScore|explanation|cost|day|items|name|priceRange)\s*[:=].*/gi;
const TRAILING_JSON_RE = /[\[{][^}\]]*$/;
const LEADING_JSON_RE = /^[^{\[]*[}\]]/;
const TRAILING_COMMA_RE = /,\s*$/;
// Strip only C0/C1 control chars (except \t=0x09, \n=0x0A, \r=0x0D).
// This preserves Arabic, Turkish, Malay, Japanese, and all other Unicode text.
const CONTROL_CHARS_RE = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g;

export function cleanString(s: string): string {
  return s
    .replace(/\}\}.*finish_reason.*$/gi, "")
    .replace(LEAKED_FIELDS_RE, "")
    .replace(TRAILING_JSON_RE, "")
    .replace(LEADING_JSON_RE, "")
    .replace(TRAILING_COMMA_RE, "")
    .replace(CONTROL_CHARS_RE, "")
    .replace(/(?:Base)+\s*$/g, "")
    .replace(/(?:Base){2,}/g, "")
    .trim();
}

function sanitizeItem(item: any): ItineraryItem {
  if (typeof item.time === "string") item.time = cleanString(item.time);
  if (typeof item.title === "string") item.title = cleanString(item.title);
  if (typeof item.description === "string") item.description = cleanString(item.description);
  if (typeof item.cost === "string") item.cost = cleanString(item.cost);
  if (typeof item.explanation === "string") item.explanation = cleanString(item.explanation);
  return item;
}

function sanitizeDays(days: any[]): DayPlan[] {
  return days.map((day) => ({
    ...day,
    title: typeof day.title === "string" ? cleanString(day.title) : day.title,
    items: Array.isArray(day.items) ? day.items.map(sanitizeItem) : day.items,
  }));
}

function sanitizeHotelData(hotel: any) {
  if (!hotel) return hotel;
  if (typeof hotel.name === "string") hotel.name = cleanString(hotel.name);
  if (typeof hotel.description === "string") hotel.description = cleanString(hotel.description);
  if (typeof hotel.priceRange === "string") hotel.priceRange = cleanString(hotel.priceRange);
  return hotel;
}

// ---------------------------------------------------------------------------
// Type guards — contract-aligned; used before every state update
// ---------------------------------------------------------------------------

export function isValidDayPlan(d: unknown): d is import("@/data/dummyData").DayPlan {
  return (
    d != null &&
    typeof d === "object" &&
    typeof (d as any).day === "number" &&
    typeof (d as any).title === "string" &&
    (d as any).title.length > 0 &&
    Array.isArray((d as any).items) &&
    (d as any).items.length > 0
  );
}

export function isValidDays(days: unknown): days is import("@/data/dummyData").DayPlan[] {
  return Array.isArray(days) && days.length > 0 && days.every(isValidDayPlan);
}

export function isValidHotel(h: unknown): h is HotelSuggestion {
  return (
    h != null &&
    typeof h === "object" &&
    typeof (h as any).name === "string" &&
    (h as any).name.length > 0 &&
    typeof (h as any).description === "string" &&
    Array.isArray((h as any).badges) &&
    typeof (h as any).halalStatus === "string" &&
    typeof (h as any).confidenceScore === "number" &&
    typeof (h as any).priceRange === "string"
  );
}

export interface TripPreferences {
  destination: string;
  startDate: string;
  endDate: string;
  travelerType: string;
  budget: number;
  selectedInterests: string[];
  selectedPreferences: string[];
  pace: string;
  specificNeeds: string;
}

export interface HotelSuggestion {
  name: string;
  description: string;
  badges: Badge[];
  halalStatus: HalalStatus;
  confidenceScore: number;
  priceRange: string;
}

interface ItineraryState {
  preferences: TripPreferences | null;
  itinerary: DayPlan[] | null;
  hotel: HotelSuggestion | null;
  isGenerating: boolean;
  isDetailedAdjusting: boolean;
  error: string | null;
  setPreferences: (prefs: TripPreferences) => void;
  generateItinerary: (prefs: TripPreferences) => Promise<boolean>;
  quickAdjust: (adjustment: string) => Promise<void>;
  detailedAdjust: (instruction: string, dayNumber?: number, itemId?: string) => Promise<void>;
  regenerate: () => Promise<void>;
}

const ItineraryContext = createContext<ItineraryState | null>(null);

export function ItineraryProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<TripPreferences | null>(null);
  const [itinerary, setItinerary] = useState<DayPlan[] | null>(null);
  const [hotel, setHotel] = useState<HotelSuggestion | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDetailedAdjusting, setIsDetailedAdjusting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Incremented on every generation/quick-adjust call. Used to discard stale responses.
  const generateTokenRef = useRef(0);
  const detailTokenRef = useRef(0);

  const callGenerateFunction = async (
    prefs: TripPreferences,
    quickAdjustLabel?: string,
    currentItinerary?: DayPlan[]
  ) => {
    const token = ++generateTokenRef.current;
    setIsGenerating(true);
    setError(null);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000);

      const { data, error: fnError } = await supabase.functions.invoke(
        "generate-itinerary",
        {
          body: {
            destination: prefs.destination,
            startDate: prefs.startDate,
            endDate: prefs.endDate,
            travelerType: prefs.travelerType,
            budget: prefs.budget,
            interests: prefs.selectedInterests,
            halalPreferences: prefs.selectedPreferences,
            pace: prefs.pace,
            specificNeeds: prefs.specificNeeds,
            quickAdjust: quickAdjustLabel || undefined,
            currentItinerary: currentItinerary || undefined,
          },
          signal: controller.signal,
        } as any
      );

      clearTimeout(timeoutId);

      // A newer call has already started — discard this response.
      if (token !== generateTokenRef.current) return false;

      // supabase.functions.invoke returns fnError for non-2xx but data may contain the real message
      if (fnError) {
        const errorMsg = data?.error || fnError.message || "Failed to generate itinerary";
        throw new Error(errorMsg);
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      if (!isValidDays(data?.days)) {
        throw new Error("AI returned an invalid itinerary. Your existing plan has been preserved.");
      }
      setItinerary(sanitizeDays(data.days));
      if (isValidHotel(data.hotel)) {
        setHotel(sanitizeHotelData(data.hotel));
      }
      return true;
    } catch (e: any) {
      if (token !== generateTokenRef.current) return false;
      const msg = e?.name === "AbortError"
        ? "Generation timed out. Try a shorter trip or simpler preferences."
        : (e?.message || "Failed to generate itinerary");
      setError(msg);
      toast({
        title: "Generation failed",
        description: msg,
        variant: "destructive",
      });
      return false;
    } finally {
      if (token === generateTokenRef.current) setIsGenerating(false);
    }
  };

  const generateItinerary = async (prefs: TripPreferences) => {
    setPreferences(prefs);
    return await callGenerateFunction(prefs);
  };

  const quickAdjustFn = async (adjustment: string) => {
    if (!preferences || !itinerary) return;
    await callGenerateFunction(preferences, adjustment, itinerary);
  };

  const regenerate = async () => {
    if (!preferences) return;
    await callGenerateFunction(preferences);
  };

  const detailedAdjustFn = async (instruction: string, dayNumber?: number, itemId?: string) => {
    if (!preferences || !itinerary) return;
    const token = ++detailTokenRef.current;
    setIsDetailedAdjusting(true);
    setError(null);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000);

      // Only send the targeted day(s) to the AI
      const targetDay = dayNumber ? itinerary.find(d => d.day === dayNumber) : undefined;

      const { data, error: fnError } = await supabase.functions.invoke(
        "generate-itinerary",
        {
          body: {
            destination: preferences.destination,
            startDate: preferences.startDate,
            endDate: preferences.endDate,
            travelerType: preferences.travelerType,
            budget: preferences.budget,
            interests: preferences.selectedInterests,
            halalPreferences: preferences.selectedPreferences,
            pace: preferences.pace,
            specificNeeds: preferences.specificNeeds,
            detailedAdjust: {
              instruction,
              targetDayNumber: dayNumber || undefined,
              targetItemId: itemId || undefined,
              targetDay: targetDay || undefined,
            },
          },
          signal: controller.signal,
        } as any
      );

      clearTimeout(timeoutId);

      if (token !== detailTokenRef.current) return;

      if (fnError) throw new Error(fnError.message || "Failed to adjust itinerary");
      if (data?.error) throw new Error(data.error);

      if (dayNumber) {
        if (!isValidDayPlan(data?.adjustedDay) || (data.adjustedDay as any).day !== dayNumber) {
          throw new Error("AI returned an invalid day adjustment. Your existing plan has been preserved.");
        }
        const sanitizedDay = sanitizeDays([data.adjustedDay])[0];
        setItinerary(prev => (prev || []).map(d => d.day === dayNumber ? sanitizedDay : d));
      } else {
        if (!isValidDays(data?.days)) {
          throw new Error("AI returned an invalid itinerary. Your existing plan has been preserved.");
        }
        setItinerary(sanitizeDays(data.days));
      }

      if (isValidHotel(data?.hotel)) {
        setHotel(sanitizeHotelData(data.hotel));
      }
    } catch (e: any) {
      if (token !== detailTokenRef.current) return;
      const msg = e?.name === "AbortError"
        ? "Adjustment timed out. Try a simpler request."
        : (e?.message || "Failed to adjust itinerary");
      setError(msg);
      toast({ title: "Adjustment failed", description: msg, variant: "destructive" });
    } finally {
      if (token === detailTokenRef.current) setIsDetailedAdjusting(false);
    }
  };

  return (
    <ItineraryContext.Provider
      value={{
        preferences,
        itinerary,
        hotel,
        isGenerating,
        isDetailedAdjusting,
        error,
        setPreferences,
        generateItinerary,
        quickAdjust: quickAdjustFn,
        detailedAdjust: detailedAdjustFn,
        regenerate,
      }}
    >
      {children}
    </ItineraryContext.Provider>
  );
}

export function useItinerary() {
  const ctx = useContext(ItineraryContext);
  if (!ctx) throw new Error("useItinerary must be used within ItineraryProvider");
  return ctx;
}
