export function buildPrayerTimesUrl(
  latitude: number,
  longitude: number,
  date: string,
  method: number = 2
): string {
  const [year, month, day] = date.split("-");
  return `https://api.aladhan.com/v1/timings/${day}-${month}-${year}?latitude=${latitude}&longitude=${longitude}&method=${method}`;
}

export function buildPrayerCacheKey(dest: string, date: string, method: number): string {
  return `prayer_${dest}_${date}_${method}`;
}

export async function fetchPrayerTimes({
  latitude,
  longitude,
  date,
  method = 2,
}: {
  latitude: number;
  longitude: number;
  date: string;
  method?: number;
}) {
  const url = buildPrayerTimesUrl(latitude, longitude, date, method);
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Failed to fetch prayer times");
    const data = await response.json();
    if (data.code !== 200) throw new Error("API error");
    return {
      Fajr: data.data.timings.Fajr,
      Dhuhr: data.data.timings.Dhuhr,
      Asr: data.data.timings.Asr,
      Maghrib: data.data.timings.Maghrib,
      Isha: data.data.timings.Isha,
    };
  } catch (e) {
    return null;
  }
}
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
