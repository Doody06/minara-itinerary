import React from "react";
import { MapPin } from "lucide-react";
import { fetchPrayerTimes, buildPrayerCacheKey } from "@/lib/utils";
import { destinationMetadata } from "@/data/dummyData";

export function PrayerTimesSidebar({ destination, date, label }: { destination?: string; date?: string; label?: string }) {
  const [prayerTimes, setPrayerTimes] = React.useState<Record<string, string> | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!destination) return;
    let cancelled = false;

    let useDate = date;
    if (!useDate || !/^\d{4}-\d{2}-\d{2}$/.test(useDate)) {
      useDate = new Date().toISOString().slice(0, 10);
    }

    setLoading(true);
    setError(null);
    setPrayerTimes(null);

    const meta = destinationMetadata.find(m => m.value === destination);
    if (!meta) {
      setError("Prayer times unavailable for this destination.");
      setLoading(false);
      return;
    }

    const cacheKey = buildPrayerCacheKey(destination, useDate, meta.prayerMethod);
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      setPrayerTimes(JSON.parse(cached));
      setLoading(false);
      return;
    }

    (async () => {
      const times = await fetchPrayerTimes({
        latitude: meta.latitude,
        longitude: meta.longitude,
        date: useDate,
        method: meta.prayerMethod,
      });
      if (cancelled) return;
      if (times) {
        localStorage.setItem(cacheKey, JSON.stringify(times));
        setPrayerTimes(times);
      } else {
        setError("Could not fetch prayer times");
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
