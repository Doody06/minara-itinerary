import { describe, it, expect } from "vitest";
import { destinationMetadata } from "../data/dummyData";
import { buildPrayerTimesUrl, buildPrayerCacheKey } from "../lib/utils";

describe("destinationMetadata", () => {
  it("Istanbul uses Diyanet method 13", () => {
    const meta = destinationMetadata.find(m => m.value === "istanbul");
    expect(meta?.prayerMethod).toBe(13);
  });

  it("Dubai uses Gulf method 8", () => {
    const meta = destinationMetadata.find(m => m.value === "dubai");
    expect(meta?.prayerMethod).toBe(8);
  });

  it("Kuala Lumpur uses JAKIM method 11", () => {
    const meta = destinationMetadata.find(m => m.value === "kuala-lumpur");
    expect(meta?.prayerMethod).toBe(11);
  });

  it("unknown destination returns undefined", () => {
    const meta = destinationMetadata.find(m => m.value === "unknown-city");
    expect(meta).toBeUndefined();
  });
});

describe("buildPrayerTimesUrl", () => {
  it("includes the correct method query param in the URL", () => {
    const url = buildPrayerTimesUrl(41.0082, 28.9784, "2026-05-25", 13);
    expect(url).toContain("method=13");
  });
});

describe("buildPrayerCacheKey", () => {
  it("returns prayer_{dest}_{date}_{method} format", () => {
    expect(buildPrayerCacheKey("istanbul", "2026-05-25", 13)).toBe("prayer_istanbul_2026-05-25_13");
  });
});
