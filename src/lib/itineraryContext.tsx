import { createContext, useContext, useState, type ReactNode } from "react";
import type { DayPlan, Badge, HalalStatus } from "@/data/dummyData";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

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
  const [error, setError] = useState<string | null>(null);

  const callGenerateFunction = async (
    prefs: TripPreferences,
    quickAdjustLabel?: string,
    currentItinerary?: DayPlan[]
  ) => {
    setIsGenerating(true);
    setError(null);

    try {
      // Create an AbortController with a 120s timeout
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
        }
      );

      clearTimeout(timeoutId);

      if (fnError) {
        throw new Error(fnError.message || "Failed to generate itinerary");
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      setItinerary(data.days);
      setHotel(data.hotel);
      return true;
    } catch (e: any) {
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
      setIsGenerating(false);
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

  return (
    <ItineraryContext.Provider
      value={{
        preferences,
        itinerary,
        hotel,
        isGenerating,
        error,
        setPreferences,
        generateItinerary,
        quickAdjust: quickAdjustFn,
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
