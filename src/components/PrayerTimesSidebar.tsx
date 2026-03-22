import React from "react";
import { MapPin } from "lucide-react";
import { fetchPrayerTimes } from "@/lib/utils";

// Example coordinates for demo; in real use, map destination to coordinates

const DESTINATION_COORDS = {
  istanbul: { latitude: 41.0082, longitude: 28.9784 },
  tokyo: { latitude: 35.6895, longitude: 139.6917 },
  // Add more as needed
};


export function PrayerTimesSidebar({ destination, date, label }) {
  const [prayerTimes, setPrayerTimes] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    if (!destination) return;
    // Use today if date is missing or invalid
    let useDate = date;
    if (!useDate || !/^\d{4}-\d{2}-\d{2}$/.test(useDate)) {
      useDate = new Date().toISOString().slice(0, 10);
    }
    const key = destination.toLowerCase();
    const coords = DESTINATION_COORDS[key] || DESTINATION_COORDS["istanbul"];
    setLoading(true);
    setError(null);
    fetchPrayerTimes({ ...coords, date: useDate })
      .then((times) => {
        setPrayerTimes(times);
        setLoading(false);
      })
      .catch(() => {
        setError("Could not fetch prayer times");
        setLoading(false);
      });
  }, [destination, date]);

  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <h3 className="font-display font-semibold mb-3 flex items-center gap-2">
        <MapPin className="w-5 h-5 text-primary" /> Prayer Times ({label})
      </h3>
      <div className="space-y-2 text-sm">
        {loading && <div>Loading prayer times...</div>}
        {error && <div className="text-red-500">{error}</div>}
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
