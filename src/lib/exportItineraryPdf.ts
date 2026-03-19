import jsPDF from "jspdf";
import type { DayPlan } from "@/data/dummyData";
import type { TripPreferences, HotelSuggestion } from "@/lib/itineraryContext";

// Strip characters outside jsPDF's WinAnsi/CP1252 range to prevent garbled rendering
function sanitize(text: string): string {
  // Keep printable ASCII + common Latin-1 Supplement (accented chars, currency symbols)
  return text.replace(/[^\x20-\x7E\u00A0-\u00FF]/g, "").trim();
}

export function exportItineraryPdf(
  itinerary: DayPlan[],
  preferences: TripPreferences,
  hotel: HotelSuggestion | null
) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = 210;
  const pageH = 297;
  const marginX = 18;
  const contentW = pageW - marginX * 2;

  const destination =
    preferences.destination.charAt(0).toUpperCase() +
    preferences.destination.slice(1);

  // ── Colours ──
  const emerald = [16, 124, 65] as const;
  const dark = [30, 30, 30] as const;
  const muted = [120, 120, 120] as const;
  const gold = [180, 130, 20] as const;
  const lightBg = [245, 248, 245] as const;

  // ── Helpers ──
  const setColor = (c: readonly [number, number, number]) =>
    doc.setTextColor(c[0], c[1], c[2]);

  // ── Cover / Summary Page ──
  doc.setFillColor(emerald[0], emerald[1], emerald[2]);
  doc.rect(0, 0, pageW, 60, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.setTextColor(255, 255, 255);
  doc.text(sanitize(`${destination} Itinerary`), marginX, 35);

  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text(
    sanitize(`${itinerary.length}-day halal-friendly ${preferences.travelerType} trip · ${preferences.pace} pace`),
    marginX,
    48
  );

  // Trip details
  let y = 75;
  setColor(dark);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Trip Details", marginX, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  setColor(muted);
  const details = [
    ["Dates", `${preferences.startDate} - ${preferences.endDate}`],
    ["Travelers", preferences.travelerType],
    ["Budget", `$${preferences.budget.toLocaleString()}`],
    ["Pace", preferences.pace],
    ["Interests", preferences.selectedInterests.join(", ")],
  ];
  for (const [label, value] of details) {
    doc.text(sanitize(`${label}:`), marginX, y);
    setColor(dark);
    doc.text(sanitize(value), marginX + 30, y);
    setColor(muted);
    y += 6;
  }

  // Hotel
  if (hotel) {
    y += 6;
    setColor(dark);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("Suggested Hotel", marginX, y);
    y += 8;
    doc.setFontSize(11);
    doc.text(sanitize(hotel.name), marginX, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    setColor(muted);
    const hotelDesc = doc.splitTextToSize(sanitize(hotel.description), contentW);
    doc.text(hotelDesc.slice(0, 3), marginX, y);
    y += hotelDesc.slice(0, 3).length * 4 + 2;
    setColor(gold as unknown as readonly [number, number, number]);
    doc.setFont("helvetica", "bold");
    doc.text(sanitize(hotel.priceRange), marginX, y);
  }

  // ── One page per day ──
  for (const day of itinerary) {
    doc.addPage();
    let y = 20;

    // Day header bar
    doc.setFillColor(emerald[0], emerald[1], emerald[2]);
    doc.roundedRect(marginX, y - 6, contentW, 14, 3, 3, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    doc.text(sanitize(`Day ${day.day}: ${day.title}`), marginX + 5, y + 3);
    y += 16;

    for (const item of day.items) {
      if (y > pageH - 20) break;

      // Time + Type tag
      setColor(emerald as unknown as readonly [number, number, number]);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text(sanitize(item.time), marginX, y);

      const typeLabel = item.type.charAt(0).toUpperCase() + item.type.slice(1);
      doc.setFontSize(7);
      setColor(muted);
      doc.text(sanitize(`[${typeLabel}]`), marginX + 22, y);

      // Title
      setColor(dark);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text(sanitize(item.title), marginX + 40, y);

      // Cost on right
      if (item.cost) {
        setColor(gold as unknown as readonly [number, number, number]);
        doc.setFontSize(9);
        doc.text(sanitize(item.cost), pageW - marginX, y, { align: "right" });
      }

      y += 5;

      // Description (1-2 lines max)
      setColor(muted);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      const desc = doc.splitTextToSize(sanitize(item.description), contentW - 42);
      doc.text(desc.slice(0, 2), marginX + 40, y);
      y += desc.slice(0, 2).length * 3.5;

      // Badges inline
      if (item.badges.length > 0) {
        doc.setFontSize(7);
        setColor(emerald as unknown as readonly [number, number, number]);
        doc.text(sanitize(item.badges.join("  ·  ")), marginX + 40, y + 1);
        y += 4;
      }

      // Separator line
      y += 2;
      doc.setDrawColor(230, 230, 230);
      doc.line(marginX, y, pageW - marginX, y);
      y += 4;
    }

    // Footer
    doc.setFontSize(7);
    setColor(muted);
    doc.text(sanitize(`HalalTrip Planner - Day ${day.day} of ${itinerary.length}`), pageW / 2, pageH - 10, {
      align: "center",
    });
  }

  doc.save(`${destination}-Itinerary.pdf`);
}
