import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { HalalBadge } from "@/components/HalalBadge";
import { MapPin, Clock, DollarSign, Utensils, Landmark, Bus, Hotel, ExternalLink } from "lucide-react";

import type { ItineraryItem } from "@/data/dummyData";

const typeLabels: Record<string, { label: string; icon: React.ElementType }> = {
  food: { label: "Restaurant / Food", icon: Utensils },
  activity: { label: "Activity / Attraction", icon: Landmark },
  prayer: { label: "Prayer / Mosque", icon: MapPin },
  transport: { label: "Transport", icon: Bus },
  hotel: { label: "Hotel / Accommodation", icon: Hotel },
};

function openMaps(url: string) {
  // Attempt a new tab first (preferred UX)
  const popup = window.open(url, "_blank", "noopener,noreferrer");

  // If popups/new tabs are blocked (common in embedded previews),
  // try top-level navigation.
  if (!popup) {
    // You can set location of window.top without reading its properties.
    window.top?.location.assign(url);
  }
}

function getMapEmbedUrl(title: string, destination?: string, lat?: number, lng?: number): string {
  if (lat && lng) {
    return `https://www.google.com/maps?q=${lat},${lng}&output=embed`;
  }
  const query = encodeURIComponent(`${title}${destination ? ` ${destination}` : ""}`);
  return `https://www.google.com/maps?q=${query}&output=embed`;
}

function getGoogleMapsUrl(title: string, destination?: string, lat?: number, lng?: number): string {
  if (lat && lng) {
    return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  }
  const query = encodeURIComponent(`${title}${destination ? ` ${destination}` : ""}`);
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

interface PlaceDetailDialogProps {
  item: ItineraryItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  destination?: string;
}

export function PlaceDetailDialog({ item, open, onOpenChange, destination }: PlaceDetailDialogProps) {
  if (!item) return null;

  const typeInfo = typeLabels[item.type] || typeLabels.activity;
  const mapsUrl = getGoogleMapsUrl(item.title, destination, item.latitude, item.longitude);
  const TypeIcon = typeInfo.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden rounded-xl">
        {/* Embedded Google Map */}
        <div className="relative h-52 w-full bg-muted overflow-hidden">
          <iframe
            src={getMapEmbedUrl(item.title, destination, item.latitude, item.longitude)}
            className="w-full h-full border-0 pointer-events-none"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title={`Map of ${item.title}`}
          />
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-background/80 to-transparent h-12" />
          <div className="absolute bottom-2 left-4 flex items-center gap-2 text-xs text-muted-foreground">
            <TypeIcon className="w-3.5 h-3.5" />
            <span>{typeInfo.label}</span>
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

          {/* Low confidence note */}
          {item.confidenceScore && item.confidenceScore < 70 && item.explanation && (
            <div className="bg-muted rounded-lg p-3 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Note: </span>
              {item.explanation}
            </div>
          )}

          {/* Open in Google Maps button */}
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 w-full rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
          >
            <ExternalLink className="w-4 h-4" />
            Open in Google Maps
          </a>
        </div>
      </DialogContent>
    </Dialog>
  );
}
