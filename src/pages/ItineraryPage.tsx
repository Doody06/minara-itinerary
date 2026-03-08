import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { HalalBadge, ConfidenceIndicator } from "@/components/HalalBadge";
import { dummyItinerary, hotelSuggestion, type ItineraryItem } from "@/data/dummyData";
import {
  Utensils, MapPin, RotateCcw, ArrowLeft, ChevronDown, ChevronUp,
  Hotel, Bus, Info, Download, Share2, Sparkles, Landmark
} from "lucide-react";

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

function ItemCard({ item }: { item: ItineraryItem }) {
  const [expanded, setExpanded] = useState(false);
  const Icon = typeIcons[item.type] || Landmark;

  return (
    <div className="bg-card rounded-xl border border-border p-4 hover:shadow-md transition-all group">
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
              <h4 className="font-display font-semibold text-base">{item.title}</h4>
            </div>
            {item.cost && (
              <span className="text-sm font-medium text-gold shrink-0">{item.cost}</span>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {item.badges.map((b) => <HalalBadge key={b} badge={b} />)}
          </div>
          {(item.confidenceScore || item.explanation) && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-xs text-primary mt-2 hover:underline"
            >
              <Info className="w-3 h-3" />
              {expanded ? "Hide details" : "Why this was chosen"}
              {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          )}
          {expanded && (
            <div className="mt-2 p-3 bg-muted rounded-lg text-sm space-y-2 animate-fade-in">
              {item.confidenceScore && <ConfidenceIndicator score={item.confidenceScore} />}
              {item.explanation && <p className="text-muted-foreground">{item.explanation}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ItineraryPage() {
  const [activeDay, setActiveDay] = useState(0);

  return (
    <div className="min-h-screen bg-background pt-20 pb-12">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <Link to="/plan" className="text-sm text-primary hover:underline flex items-center gap-1 mb-2">
              <ArrowLeft className="w-4 h-4" /> Edit preferences
            </Link>
            <h1 className="text-3xl font-display font-bold">Your Istanbul Itinerary</h1>
            <p className="text-muted-foreground">4-day halal-friendly family trip · Mid-budget · Balanced pace</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-1"><Share2 className="w-4 h-4" /> Share</Button>
            <Button variant="outline" size="sm" className="gap-1"><Download className="w-4 h-4" /> Export</Button>
            <Button size="sm" className="gap-1 bg-primary text-primary-foreground"><RotateCcw className="w-4 h-4" /> Regenerate</Button>
          </div>
        </div>

        {/* Quick Edits */}
        <div className="flex flex-wrap gap-2 mb-6">
          <span className="text-sm text-muted-foreground flex items-center gap-1"><Sparkles className="w-4 h-4" /> Quick adjust:</span>
          {quickEdits.map((e) => (
            <button key={e} className="px-3 py-1 rounded-full text-xs font-medium border border-border bg-card hover:border-primary hover:bg-emerald-light transition-all">
              {e}
            </button>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2">
            {/* Day Tabs */}
            <div className="flex gap-1 mb-4 bg-muted p-1 rounded-xl overflow-x-auto">
              {dummyItinerary.map((day, i) => (
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
            </div>

            <h3 className="font-display font-semibold text-lg mb-4 text-foreground">
              {dummyItinerary[activeDay].title}
            </h3>

            <div className="space-y-3">
              {dummyItinerary[activeDay].items.map((item) => (
                <ItemCard key={item.id} item={item} />
              ))}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Hotel */}
            <div className="bg-card rounded-xl border border-border p-5">
              <h3 className="font-display font-semibold mb-3 flex items-center gap-2">
                <Hotel className="w-5 h-5 text-primary" /> Suggested Hotel
              </h3>
              <h4 className="font-semibold">{hotelSuggestion.name}</h4>
              <p className="text-sm text-muted-foreground mt-1">{hotelSuggestion.description}</p>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {hotelSuggestion.badges.map((b) => <HalalBadge key={b} badge={b} />)}
              </div>
              <div className="mt-3 flex items-center justify-between">
                <ConfidenceIndicator score={hotelSuggestion.confidenceScore} />
                <span className="text-sm font-semibold text-gold">{hotelSuggestion.priceRange}</span>
              </div>
            </div>

            {/* Prayer Times */}
            <div className="bg-card rounded-xl border border-border p-5">
              <h3 className="font-display font-semibold mb-3 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" /> Prayer Times (Istanbul)
              </h3>
              <div className="space-y-2 text-sm">
                {[
                  { name: "Fajr", time: "5:48 AM" },
                  { name: "Dhuhr", time: "1:08 PM" },
                  { name: "Asr", time: "4:32 PM" },
                  { name: "Maghrib", time: "6:51 PM" },
                  { name: "Isha", time: "8:12 PM" },
                ].map((p) => (
                  <div key={p.name} className="flex justify-between py-1.5 border-b border-border last:border-0">
                    <span className="text-muted-foreground">{p.name}</span>
                    <span className="font-medium">{p.time}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Trip Summary */}
            <div className="bg-emerald-light rounded-xl p-5 border border-emerald/20">
              <h3 className="font-display font-semibold mb-2 text-emerald">Trip Summary</h3>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Destination</span><span className="font-medium">Istanbul, Turkey</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Duration</span><span className="font-medium">4 days</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Travelers</span><span className="font-medium">Family with Kids</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Budget</span><span className="font-medium">$2,000</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Pace</span><span className="font-medium">Balanced</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
