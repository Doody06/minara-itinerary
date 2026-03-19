import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PlaceDetailDialog } from "@/components/PlaceDetailDialog";
import type { ItineraryItem } from "@/data/dummyData";

const mockItem: ItineraryItem = {
  id: "test-1",
  time: "10:00 AM",
  title: "Blue Mosque",
  description: "Historic mosque in Istanbul",
  type: "activity",
  badges: ["verified"],
  latitude: 41.0054,
  longitude: 28.9768,
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("PlaceDetailDialog Google Maps link", () => {
  it("uses official Maps Search URL and opens in a new tab", () => {
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => window);

    render(
      <PlaceDetailDialog
        item={mockItem}
        open
        onOpenChange={() => {}}
        destination="istanbul"
      />
    );

    const mapsLink = screen.getByRole("link", { name: /open in google maps/i });

    expect(mapsLink).toHaveAttribute("href", expect.stringContaining("https://www.google.com/maps/search/?api=1&query=Blue%20Mosque%2C%20istanbul"));
    expect(mapsLink).toHaveAttribute("target", "_blank");
    expect(mapsLink).toHaveAttribute("rel", "noopener noreferrer");

    // The link is a native anchor — clicking it doesn't call window.open in jsdom,
    // but the href/target/rel attributes guarantee correct behaviour in a real browser.
  });
});
