import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { HalalBadge } from "@/components/HalalBadge";
import { MapPin, Clock, DollarSign, Utensils, Landmark, Bus, Hotel } from "lucide-react";
import type { ItineraryItem } from "@/data/dummyData";

const typeLabels: Record<string, { label: string; icon: React.ElementType }> = {
  food: { label: "Restaurant / Food", icon: Utensils },
  activity: { label: "Activity / Attraction", icon: Landmark },
  prayer: { label: "Prayer / Mosque", icon: MapPin },
  transport: { label: "Transport", icon: Bus },
  hotel: { label: "Hotel / Accommodation", icon: Hotel },
};

// Generate a relevant Unsplash image URL based on the place title
function getPlaceImageUrl(title: string, type: string): string {
  const query = encodeURIComponent(`${title} ${type === "food" ? "restaurant" : type === "prayer" ? "mosque" : "travel landmark"}`);
  return `https://source.unsplash.com/800x400/?${query}`;
}

interface PlaceDetailDialogProps {
  item: ItineraryItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PlaceDetailDialog({ item, open, onOpenChange }: PlaceDetailDialogProps) {
  const [imgError, setImgError] = useState(false);

  if (!item) return null;

  const typeInfo = typeLabels[item.type] || typeLabels.activity;
  const TypeIcon = typeInfo.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden rounded-xl">
        {/* Image */}
        <div className="relative h-48 w-full bg-muted overflow-hidden">
          {!imgError ? (
            <img
              src={getPlaceImageUrl(item.title, item.type)}
              alt={item.title}
              className="w-full h-full object-cover"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20">
              <TypeIcon className="w-16 h-16 text-primary/40" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
          <div className="absolute bottom-3 left-4 right-4">
            <div className="flex items-center gap-2 text-xs text-primary-foreground/80 mb-1">
              <TypeIcon className="w-3.5 h-3.5" />
              <span>{typeInfo.label}</span>
            </div>
          </div>
        </div>

        <div className="px-5 pb-5 pt-2 space-y-4">
          <DialogHeader>
            <DialogTitle className="text-xl font-display">{item.title}</DialogTitle>
          </DialogHeader>

          <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>

          {/* Info row */}
          <div className="flex flex-wrap gap-3 text-sm">
            {item.time && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Clock className="w-4 h-4 text-primary" />
                <span>{item.time}</span>
              </div>
            )}
            {item.cost && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <DollarSign className="w-4 h-4 text-gold" />
                <span>{item.cost}</span>
              </div>
            )}
          </div>

          {/* Badges */}
          {item.badges.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {item.badges.map((b) => (
                <HalalBadge key={b} badge={b} />
              ))}
            </div>
          )}

          {/* Explanation */}
          {item.explanation && (
            <div className="bg-muted rounded-lg p-3 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Why this was chosen: </span>
              {item.explanation}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
