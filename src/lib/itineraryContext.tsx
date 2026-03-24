import { createContext, useContext, useState, useRef, type ReactNode } from "react";
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
  isLoadingRemainingDays: boolean;
  totalExpectedDays: number;
  error: string | null;
  progressStep: number;
  setPreferences: (prefs: TripPreferences) => void;
  generateItinerary: (prefs: TripPreferences) => Promise<boolean>;
  quickAdjust: (adjustment: string) => Promise<void>;
  detailedAdjust: (instruction: string, dayNumber?: number, itemId?: string) => Promise<void>;
  regenerate: () => Promise<void>;
}

const ItineraryContext = createContext<ItineraryState | null>(null);

function calcTripDays(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return Math.min(
    Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1),
    15
  );
}

export function ItineraryProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<TripPreferences | null>(null);
  const [itinerary, setItinerary] = useState<DayPlan[] | null>(null);
  const [hotel, setHotel] = useState<HotelSuggestion | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDetailedAdjusting, setIsDetailedAdjusting] = useState(false);
  const [isLoadingRemainingDays, setIsLoadingRemainingDays] = useState(false);
  const [totalExpectedDays, setTotalExpectedDays] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [progressStep, setProgressStep] = useState(0);
  const remainingAbortRef = useRef<AbortController | null>(null);
  const progressTimeouts = useRef<ReturnType<typeof setTimeout>[]>([]);

  const invokeGenerate = async (
    prefs: TripPreferences,
    extra?: Record<string, any>
  ) => {
    setIsGenerating(true);
    setError(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000);

    try {
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
            ...extra,
          },
        }
      );

      if (fnError) {
        const errorMsg = data?.error || fnError.message || "Failed to generate itinerary";
        throw new Error(errorMsg);
      }
      if (data?.error) throw new Error(data.error);
      return data;
    } finally {
      clearTimeout(timeoutId);
    }
  };

  const generateItinerary = async (prefs: TripPreferences) => {
    setPreferences(prefs);
    setIsGenerating(true);
    setError(null);
    setItinerary(null);
    setHotel(null);

    const totalDays = calcTripDays(prefs.startDate, prefs.endDate);
    setTotalExpectedDays(totalDays);
    const firstBatchEnd = Math.min(3, totalDays);
    const hasRemainingDays = totalDays > firstBatchEnd;

    try {
      // Phase 1: generate first 3 days (or fewer if trip is short)
      const firstData = await invokeGenerate(prefs, {
        dayRange: { from: 1, to: firstBatchEnd },
      });

      setItinerary(firstData.days);
      setHotel(firstData.hotel);
      setIsGenerating(false);

      // Phase 2: generate remaining days in background
      if (hasRemainingDays) {
        setIsLoadingRemainingDays(true);
        const abortCtrl = new AbortController();
        remainingAbortRef.current = abortCtrl;

        invokeGenerate(prefs, {
          dayRange: { from: firstBatchEnd + 1, to: totalDays },
        })
          .then((restData) => {
            if (!abortCtrl.signal.aborted) {
              setItinerary((prev) => [...(prev || []), ...(restData.days || [])]);
              // Update hotel if the second batch returns one (keep first if not)
              if (restData.hotel) setHotel(restData.hotel);
            }
          })
          .catch((e) => {
            if (!abortCtrl.signal.aborted) {
              console.error("Remaining days failed:", e);
              toast({
                title: "Partial generation",
                description: "Some days couldn't be generated. Try regenerating.",
                variant: "destructive",
              });
            }
          })
          .finally(() => {
            if (!abortCtrl.signal.aborted) setIsLoadingRemainingDays(false);
          });
      }

      return true;
    } catch (e: any) {
      const msg =
        e?.name === "AbortError"
          ? "Generation timed out. Try a shorter trip or simpler preferences."
          : e?.message || "Failed to generate itinerary";
      setError(msg);
      toast({ title: "Generation failed", description: msg, variant: "destructive" });
      setIsGenerating(false);
      return false;
    }
  };

  const callGenerateFunction = async (
    prefs: TripPreferences,
    quickAdjustLabel?: string,
    currentItinerary?: DayPlan[]
  ) => {
    // Cancel any in-flight remaining-days request
    remainingAbortRef.current?.abort();
    setIsLoadingRemainingDays(false);
    setIsGenerating(true);
    setError(null);

    try {
      const data = await invokeGenerate(prefs, {
        quickAdjust: quickAdjustLabel || undefined,
        currentItinerary: currentItinerary || undefined,
      });

      setItinerary(data.days);
      setHotel(data.hotel);
      return true;
    } catch (e: any) {
      const msg =
        e?.name === "AbortError"
          ? "Generation timed out. Try a shorter trip or simpler preferences."
          : e?.message || "Failed to generate itinerary";
      setError(msg);
      toast({
        title: "Generation failed",
        description: msg,
        variant: "destructive",
      });
      return false;
    } finally {
      // Clear all progress timeouts
      progressTimeouts.current.forEach(clearTimeout);
      progressTimeouts.current = [];
      setIsGenerating(false);
    }
  };

  const quickAdjustFn = async (adjustment: string) => {
    if (!preferences || !itinerary) return;
    await callGenerateFunction(preferences, adjustment, itinerary);
  };

  const regenerate = async () => {
    if (!preferences) return;
    await generateItinerary(preferences);
  };

  const detailedAdjustFn = async (instruction: string, dayNumber?: number, itemId?: string) => {
    if (!preferences || !itinerary) return;
    setIsDetailedAdjusting(true);
    setError(null);

    try {
      const targetDay = dayNumber ? itinerary.find((d) => d.day === dayNumber) : undefined;

      const data = await invokeGenerate(preferences, {
        detailedAdjust: {
          instruction,
          targetDayNumber: dayNumber || undefined,
          targetItemId: itemId || undefined,
          targetDay: targetDay || undefined,
        },
      });

      if (dayNumber && data.adjustedDay) {
        setItinerary((prev) => (prev || []).map((d) => (d.day === dayNumber ? data.adjustedDay : d)));
      } else if (data.days) {
        setItinerary(data.days);
      }
      if (data.hotel) setHotel(data.hotel);
    } catch (e: any) {
      const msg =
        e?.name === "AbortError"
          ? "Adjustment timed out. Try a simpler request."
          : e?.message || "Failed to adjust itinerary";
      setError(msg);
      toast({ title: "Adjustment failed", description: msg, variant: "destructive" });
    } finally {
      setIsDetailedAdjusting(false);
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
        isLoadingRemainingDays,
        totalExpectedDays,
        error,
        progressStep,
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
