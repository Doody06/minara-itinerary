// Fetch prayer times from Aladhan API
// location: { latitude: number, longitude: number }, date: YYYY-MM-DD string
export async function fetchPrayerTimes({ latitude, longitude, date }) {
  // Aladhan API expects date as DD-MM-YYYY
  const [year, month, day] = date.split("-");
  const formattedDate = `${day}-${month}-${year}`;
  const url = `https://api.aladhan.com/v1/timings/${formattedDate}?latitude=${latitude}&longitude=${longitude}&method=2`;
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
