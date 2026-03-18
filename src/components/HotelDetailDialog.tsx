import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { HalalBadge, ConfidenceIndicator } from "@/components/HalalBadge";
import { Hotel, DollarSign, ExternalLink, Star } from "lucide-react";
import type { HotelSuggestion } from "@/lib/itineraryContext";

function getMapEmbedUrl(name: string, destination?: string): string {
  const query = encodeURIComponent(`${name}${destination ? ` ${destination}` : ""}`);
  return `https://www.google.com/maps?q=${query}&output=embed`;
}

function getGoogleMapsUrl(name: string, destination?: string): string {
  const query = encodeURIComponent(`${name}${destination ? ` ${destination}` : ""}`);
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

interface HotelDetailDialogProps {
  hotel: HotelSuggestion | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  destination?: string;
}

export function HotelDetailDialog({ hotel, open, onOpenChange, destination }: HotelDetailDialogProps) {
  if (!hotel) return null;

  const mapsUrl = getGoogleMapsUrl(hotel.name, destination);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden rounded-xl">
        {/* Embedded Google Map */}
        <div className="relative h-52 w-full bg-muted overflow-hidden">
          <iframe
            src={getMapEmbedUrl(hotel.name, destination)}
            className="w-full h-full border-0 pointer-events-none"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title={`Map of ${hotel.name}`}
          />
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-background/80 to-transparent h-12" />
          <div className="absolute bottom-2 left-4 flex items-center gap-2 text-xs text-muted-foreground">
            <Hotel className="w-3.5 h-3.5" />
            <span>Hotel / Accommodation</span>
          </div>
        </div>

        <div className="px-5 pb-5 pt-2 space-y-4">
          <DialogHeader>
            <DialogTitle className="text-xl font-display">{hotel.name}</DialogTitle>
          </DialogHeader>

          <p className="text-sm text-muted-foreground leading-relaxed">{hotel.description}</p>

          {/* Info row */}
          <div className="flex flex-wrap gap-3 text-sm">
            {hotel.priceRange && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <DollarSign className="w-4 h-4 text-gold" />
                <span>{hotel.priceRange}</span>
              </div>
            )}
            {hotel.confidenceScore > 0 && (
              <ConfidenceIndicator score={hotel.confidenceScore} />
            )}
          </div>

          {/* Badges */}
          {hotel.badges.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {hotel.badges.map((b) => (
                <HalalBadge key={b} badge={b} />
              ))}
            </div>
          )}

          {/* Open in Google Maps */}
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
