import { useState } from "react";
import { toast } from "sonner";
import { exportItineraryPdf } from "@/lib/exportItineraryPdf";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { HalalBadge, ConfidenceIndicator } from "@/components/HalalBadge";
import { useItinerary } from "@/lib/itineraryContext";
import { PrayerTimesSidebar } from "@/components/PrayerTimesSidebar";
import type { ItineraryItem } from "@/data/dummyData";
import {
  Utensils, MapPin, RotateCcw, ArrowLeft, ChevronDown, ChevronUp,
  Hotel, Bus, Info, Download, Share2, Sparkles, Landmark, Loader2,
  PenLine, Send, ExternalLink
} from "lucide-react";
import { PlaceDetailDialog } from "@/components/PlaceDetailDialog";
import { HotelDetailDialog } from "@/components/HotelDetailDialog";

const typeIcons: Record<string, React.ElementType> = {
  food: Utensils,
  activity: Landmark,
  prayer: MapPin,
  transport: Bus,
  hotel: Hotel,
};

const quickEdits = [
  "More Islamic Sites", "More Kid-Friendly", "More Budget-Friendly",
  "More Luxury", "Less Walking", "More Food-Focused",
];

function sanitizeUiText(value?: string, fallback = "") {
  if (!value) return fallback;

  const cleaned = value
    .replace(/\}\s*,\s*\{day:.*$/i, "")
    .replace(/[,;]?\s*(items|hotel|badges|halalStatus|confidenceScore|priceRange|type)\s*:\s*.*$/i, "")
    .trim();

  return cleaned || fallback;
}

function DetailedAdjustInput({
  placeholder,
  onSubmit,
  disabled,
}: {
  placeholder: string;
  onSubmit: (text: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");

  const handleSubmit = () => {
    if (!text.trim()) return;
    onSubmit(text.trim());
    setText("");
    setOpen(false);
  };

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-xs text-primary hover:underline font-medium"
        disabled={disabled}
      >
        <PenLine className="w-3.5 h-3.5" />
        {open ? "Cancel" : "Edit this place"}
        {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>
      {open && (
        <div className="mt-2 space-y-2 animate-fade-in">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={placeholder}
            className="text-sm min-h-[60px] resize-none"
            disabled={disabled}
          />
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={disabled || !text.trim()}
            className="gap-1.5"
          >
            <Send className="w-3.5 h-3.5" /> Apply Change
          </Button>
        </div>
      )}
    </div>
  );
}

function ItemCard({
  item,
  onSelect,
  onDetailedAdjust,
  isAdjusting,
}: {
  item: ItineraryItem;
  onSelect: (item: ItineraryItem) => void;
  onDetailedAdjust: (instruction: string, itemId: string) => void;
  isAdjusting: boolean;
}) {
  const Icon = typeIcons[item.type] || Landmark;
  const safeTitle = sanitizeUiText(item.title, "Untitled stop");
  const safeDescription = sanitizeUiText(item.description, "Details unavailable.");
  const safeCost = sanitizeUiText(item.cost);
  const safeExplanation = sanitizeUiText(item.explanation);

  return (
    <div
      className={`bg-card rounded-xl border border-border p-4 hover:shadow-md hover:border-primary/30 transition-all group cursor-pointer ${isAdjusting ? "opacity-60 pointer-events-none" : ""}`}
      onClick={() => onSelect({ ...item, title: safeTitle, description: safeDescription, cost: safeCost || item.cost })}
    >
      <div className="flex gap-4">
        <div className="flex flex-col items-center">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
            item.type === "food" ? "bg-gold-light text-gold" :
            item.type === "prayer" ? "bg-emerald-light text-emerald" :
            item.type === "transport" ? "bg-muted text-muted-foreground" :
            "bg-secondary text-secondary-foreground"
          }`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-xs font-medium text-muted-foreground">{item.time}</span>
              <h4 className="font-display font-semibold text-base group-hover:text-primary transition-colors">
                {safeTitle}
              </h4>
            </div>
            {safeCost && (
              <span className="text-sm font-medium text-gold shrink-0">{safeCost}</span>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{safeDescription}</p>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {item.badges.map((b) => <HalalBadge key={b} badge={b} />)}
          </div>
          {item.confidenceScore != null && item.confidenceScore < 70 && safeExplanation && safeExplanation.length > 10 && (
            <div className="mt-2 p-3 bg-muted rounded-lg text-sm space-y-2">
              <ConfidenceIndicator score={item.confidenceScore} />
              <p className="text-muted-foreground">{safeExplanation}</p>
            </div>
          )}
          <div className="mt-2" onClick={(e) => e.stopPropagation()}>
            <DetailedAdjustInput
              placeholder={`e.g. "Replace this with a cheaper option" or "Change to a halal-certified restaurant"`}
              onSubmit={(text) => onDetailedAdjust(text, item.id)}
              disabled={isAdjusting}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ItineraryPage() {
  const navigate = useNavigate();
  const { itinerary, hotel, isGenerating, isDetailedAdjusting, isLoadingRemainingDays, totalExpectedDays, quickAdjust, detailedAdjust, regenerate, preferences } = useItinerary();
  const [activeDay, setActiveDay] = useState(0);
  const [selectedItem, setSelectedItem] = useState<ItineraryItem | null>(null);
  const [hotelDialogOpen, setHotelDialogOpen] = useState(false);


  // If no itinerary, redirect to plan
  if (!itinerary && !isGenerating) {
    return (
      <div className="min-h-screen bg-background pt-20 pb-12 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-display font-bold mb-4">No itinerary yet</h2>
          <p className="text-muted-foreground mb-6">Plan your trip first to generate an itinerary.</p>
          <Button onClick={() => navigate("/plan")} className="gap-2">
            <Sparkles className="w-4 h-4" /> Start Planning
          </Button>
        </div>
      </div>
    );
  }

  const handleQuickAdjust = async (adjustment: string) => {
    await quickAdjust(adjustment);
    setActiveDay(0);
  };

  const handleRegenerate = async () => {
    await regenerate();
    setActiveDay(0);
  };

  const handleDayDetailedAdjust = async (instruction: string) => {
    const dayNumber = currentItinerary[activeDay]?.day;
    if (dayNumber) await detailedAdjust(instruction, dayNumber);
  };

  const handleItemDetailedAdjust = async (instruction: string, itemId: string) => {
    const dayNumber = currentItinerary[activeDay]?.day;
    if (dayNumber) await detailedAdjust(instruction, dayNumber, itemId);
  };

  const currentItinerary = itinerary || [];
  const destinationLabel = preferences?.destination
    ? preferences.destination.charAt(0).toUpperCase() + preferences.destination.slice(1)
    : "Your Trip";

  return (
    <div className="min-h-screen bg-background pt-20 pb-12 relative">
      {/* Loading overlay for quick adjust / regenerate */}
      {isGenerating && (
        <div className="fixed inset-0 z-50 bg-background/70 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-card rounded-2xl border border-border p-8 max-w-md text-center shadow-xl">
            <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto mb-4" />
            <h3 className="text-lg font-display font-bold mb-1">Updating Itinerary</h3>
            <p className="text-muted-foreground text-sm">Adjusting your plan with AI...</p>
          </div>
        </div>
      )}
      {isDetailedAdjusting && (
        <div className="fixed inset-0 z-50 bg-background/70 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-card rounded-2xl border border-border p-8 max-w-md text-center shadow-xl">
            <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto mb-4" />
            <h3 className="text-lg font-display font-bold mb-1">Applying Your Changes</h3>
            <p className="text-muted-foreground text-sm">Only updating the targeted section...</p>
          </div>
        </div>
      )}

      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <Link to="/plan?step=4" className="text-sm text-primary hover:underline flex items-center gap-1 mb-2">
              <ArrowLeft className="w-4 h-4" /> Edit preferences
            </Link>
            <h1 className="text-3xl font-display font-bold">Your {destinationLabel} Itinerary</h1>
            <p className="text-muted-foreground">
              {currentItinerary.length}-day halal-friendly {preferences?.travelerType || ""} trip · {preferences?.pace || "balanced"} pace
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1"
              onClick={async () => {
                const shareData = {
                  title: `${destinationLabel} Itinerary - MINARA`,
                  url: window.location.href,
                };
                if (navigator.share) {
                  try { await navigator.share(shareData); } catch {}
                } else {
                  await navigator.clipboard.writeText(window.location.href);
                  toast.success("Link copied!");
                }
              }}
            >
              <Share2 className="w-4 h-4" /> Share
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1"
              onClick={() => {
                if (currentItinerary.length && preferences) {
                  exportItineraryPdf(currentItinerary, preferences, hotel);
                }
              }}
              disabled={!currentItinerary.length}
            >
              <Download className="w-4 h-4" /> Export
            </Button>
            <Button
              size="sm"
              className="gap-1 bg-primary text-primary-foreground"
              onClick={handleRegenerate}
              disabled={isGenerating}
            >
              <RotateCcw className="w-4 h-4" /> Regenerate
            </Button>
          </div>
        </div>

        {/* Quick Edits */}
        <div className="flex flex-wrap gap-2 mb-6">
          <span className="text-sm text-muted-foreground flex items-center gap-1"><Sparkles className="w-4 h-4" /> Quick adjust:</span>
          {quickEdits.map((e) => (
            <button
              key={e}
              onClick={() => handleQuickAdjust(e)}
              disabled={isGenerating}
              className="px-3 py-1 rounded-full text-xs font-medium border border-border bg-card hover:border-primary hover:bg-emerald-light transition-all disabled:opacity-50"
            >
              {e}
            </button>
          ))}
        </div>

        {currentItinerary.length > 0 && (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Main content */}
            <div className="lg:col-span-2">
              {/* Day Tabs */}
              <div className="flex gap-1 mb-4 bg-muted p-1 rounded-xl overflow-x-auto">
                {currentItinerary.map((day, i) => (
                  <button
                    key={day.day}
                    onClick={() => setActiveDay(i)}
                    className={`flex-1 min-w-fit px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      activeDay === i
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Day {day.day}
                  </button>
                ))}
                {/* Placeholder tabs for days still loading */}
                {isLoadingRemainingDays &&
                  Array.from(
                    { length: totalExpectedDays - currentItinerary.length },
                    (_, i) => currentItinerary.length + i + 1
                  ).map((dayNum) => (
                    <button
                      key={`loading-${dayNum}`}
                      disabled
                      className="flex-1 min-w-fit px-4 py-2.5 rounded-lg text-sm font-medium text-muted-foreground/50 flex items-center justify-center gap-1.5 cursor-not-allowed"
                    >
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Day {dayNum}
                    </button>
                  ))}
              </div>

              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display font-semibold text-lg text-foreground">
                  {sanitizeUiText(
                    currentItinerary[activeDay]?.title,
                    currentItinerary[activeDay] ? `Day ${currentItinerary[activeDay].day}` : ""
                  )}
                </h3>
              </div>


              <div className="space-y-3">
                {currentItinerary[activeDay]?.items.map((item) => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    onSelect={setSelectedItem}
                    onDetailedAdjust={handleItemDetailedAdjust}
                    isAdjusting={isDetailedAdjusting}
                  />
                ))}
              </div>

              <PlaceDetailDialog
                item={selectedItem}
                open={!!selectedItem}
                onOpenChange={(open) => !open && setSelectedItem(null)}
                destination={preferences?.destination}
              />
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              {/* Hotel */}
              {hotel && (
                <div
                  className="bg-card rounded-xl border border-border p-5 hover:shadow-md hover:border-primary/30 transition-all cursor-pointer"
                  onClick={() => setHotelDialogOpen(true)}
                >
                  <h3 className="font-display font-semibold mb-3 flex items-center gap-2">
                    <Hotel className="w-5 h-5 text-primary" /> Suggested Hotel
                  </h3>
                  <h4 className="font-semibold">{sanitizeUiText(hotel.name, "Suggested Hotel")}</h4>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{sanitizeUiText(hotel.description)}</p>
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {hotel.badges.map((b) => <HalalBadge key={b} badge={b} />)}
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <ConfidenceIndicator score={hotel.confidenceScore} />
                    <span className="text-sm font-semibold text-gold">{sanitizeUiText(hotel.priceRange, hotel.priceRange)}</span>
                  </div>
                </div>
              )}
              <HotelDetailDialog
                hotel={hotel}
                open={hotelDialogOpen}
                onOpenChange={setHotelDialogOpen}
                destination={preferences?.destination}
              />

              {/* Prayer Times */}
              <PrayerTimesSidebar destination={preferences?.destination} date={preferences?.startDate} label={destinationLabel} />

              {/* Trip Summary */}
              <div className="bg-emerald-light rounded-xl p-5 border border-emerald/20">
                <h3 className="font-display font-semibold mb-2 text-emerald">Trip Summary</h3>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Destination</span><span className="font-medium">{destinationLabel}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Duration</span><span className="font-medium">{currentItinerary.length} days</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Travelers</span><span className="font-medium">{preferences?.travelerType || "—"}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Budget</span><span className="font-medium">${preferences?.budget?.toLocaleString() || "—"}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Pace</span><span className="font-medium capitalize">{preferences?.pace || "—"}</span></div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
