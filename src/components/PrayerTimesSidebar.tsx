import React from "react";
import { MapPin } from "lucide-react";
import { fetchPrayerTimes } from "@/lib/utils";

// Geocode a destination name to coordinates using OpenStreetMap Nominatim (free, no API key)
async function geocodeDestination(destination: string): Promise<{ latitude: number; longitude: number } | null> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(destination)}&format=json&limit=1`,
      { headers: { "User-Agent": "HalalTravelApp/1.0" } }
    );
    if (!response.ok) return null;
    const results = await response.json();
    if (results.length === 0) return null;
    return {
      latitude: parseFloat(results[0].lat),
      longitude: parseFloat(results[0].lon),
    };
  } catch {
    return null;
  }
}

export function PrayerTimesSidebar({ destination, date, label }: { destination?: string; date?: string; label?: string }) {
  const [prayerTimes, setPrayerTimes] = React.useState<Record<string, string> | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!destination) return;
    let cancelled = false;

    // Use today if date is missing or invalid
    let useDate = date;
    if (!useDate || !/^\d{4}-\d{2}-\d{2}$/.test(useDate)) {
      useDate = new Date().toISOString().slice(0, 10);
    }

    setLoading(true);
    setError(null);

    (async () => {
      const coords = await geocodeDestination(destination);
      if (cancelled) return;
      if (!coords) {
        setError("Could not find location for this destination");
        setLoading(false);
        return;
      }
      const times = await fetchPrayerTimes({ ...coords, date: useDate });
      if (cancelled) return;
      if (!times) {
        setError("Could not fetch prayer times");
      } else {
        setPrayerTimes(times);
      }
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [destination, date]);

  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <h3 className="font-display font-semibold mb-3 flex items-center gap-2">
        <MapPin className="w-5 h-5 text-primary" /> Prayer Times {label ? `(${label})` : ""}
      </h3>
      <div className="space-y-2 text-sm">
        {loading && <div>Loading prayer times...</div>}
        {error && <div className="text-destructive">{error}</div>}
        {prayerTimes && [
          { name: "Fajr", time: prayerTimes.Fajr },
          { name: "Dhuhr", time: prayerTimes.Dhuhr },
          { name: "Asr", time: prayerTimes.Asr },
          { name: "Maghrib", time: prayerTimes.Maghrib },
          { name: "Isha", time: prayerTimes.Isha },
        ].map((p) => (
          <div key={p.name} className="flex justify-between py-1.5 border-b border-border last:border-0">
            <span className="text-muted-foreground">{p.name}</span>
            <span className="font-medium">{p.time}</span>
          </div>
        ))}
        {!loading && !error && !prayerTimes && <div>No data available.</div>}
      </div>
    </div>
  );
}
