import assert from "node:assert/strict";
import { test } from "vitest";
import { fetchWheelmapAccessibility, findBestMatch, parseWheelchairStatus } from "./wheelmap";

const venue = { lat: 51.5, lng: -0.1 };
// ~0.00018° latitude ≈ 20 m
const element = (id: number, name: string | undefined, dLat = 0) => ({
  type: "node" as const,
  id,
  lat: venue.lat + dLat,
  lon: venue.lng,
  tags: { name, wheelchair: "yes" as const },
});

test("non-Latin names do not match a different place", () => {
  const neighbour = element(1, "渋谷カフェ", 0.0006); // ~65 m away, different name
  assert.equal(findBestMatch([neighbour], "東京駅", venue.lat, venue.lng), null);
});

test("non-Latin names still match the same place", () => {
  const same = element(1, "東京駅", 0.0006);
  assert.equal(findBestMatch([same], "東京駅", venue.lat, venue.lng)?.id, 1);
});

test("accented names match their own entry", () => {
  const cafe = element(1, "Café Müller", 0.0006);
  assert.equal(findBestMatch([cafe], "Café Müller", venue.lat, venue.lng)?.id, 1);
});

test("tags from a named neighbour are not merged into the venue", async () => {
  // The service uses window.setTimeout; Node has the same function on globalThis.
  (globalThis as { window?: unknown }).window ??= globalThis;
  const elements = [
    { type: "node", id: 1, lat: venue.lat, lon: venue.lng, tags: { name: "Venue", "toilets:wheelchair": "yes" } },
    { type: "node", id: 2, lat: venue.lat + 0.00018, lon: venue.lng, tags: { name: "Cafe Next Door", wheelchair: "yes" } },
    { type: "node", id: 3, lat: venue.lat + 0.00009, lon: venue.lng, tags: { hearing_loop: "yes" } },
  ];
  const realFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ elements }));
  try {
    const result = await fetchWheelmapAccessibility(venue.lat, venue.lng, "Venue");
    assert.equal(result.accessibilityOptions.wheelchairAccessibleRestroom, true);
    assert.equal(result.accessibilityOptions.wheelchairAccessibleEntrance, null);
    assert.equal(result.additionalAccessibility?.hearingLoop, true); // unnamed part still merges
  } finally {
    globalThis.fetch = realFetch;
  }
});

test("limited wheelchair access is not reported as accessible", () => {
  assert.equal(parseWheelchairStatus("limited"), null);
  assert.equal(parseWheelchairStatus("yes"), true);
  assert.equal(parseWheelchairStatus("designated"), true);
  assert.equal(parseWheelchairStatus("no"), false);
});
