/**
 * OpenStreetMap Overpass API integration for free accessibility data.
 * Uses OSM wheelchair accessibility tags which power Wheelmap.org.
 * 
 * This approach is:
 * - Completely free with no API key required
 * - No CORS restrictions (public Overpass servers allow browser requests)
 * - Same underlying data as Wheelmap (both use OSM)
 *
 * @see https://wiki.openstreetmap.org/wiki/Key:wheelchair
 */

import type { AccessibilityOptions } from "@/types/places";

/** Overpass API endpoints (public, free, no auth required) */
const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://lz4.overpass-api.de/api/interpreter",
  "https://z.overpass-api.de/api/interpreter",
];

const OVERPASS_TIMEOUT_MS = 7000;
const OVERPASS_RADIUS_METERS = 80;
const OVERPASS_QUERY_TIMEOUT_SECONDS = 8;
const CACHE_TTL_MS = 5 * 60 * 1000;

/** OSM wheelchair accessibility values */
type OSMWheelchairStatus = "yes" | "limited" | "no" | "designated" | undefined;

/** OSM node/way with wheelchair tags */
interface OSMElement {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: {
    name?: string;
    amenity?: string;
    wheelchair?: OSMWheelchairStatus;
    "wheelchair:description"?: string;
    // Restroom accessibility
    "toilets:wheelchair"?: OSMWheelchairStatus;
    // Parking accessibility
    "parking:wheelchair"?: OSMWheelchairStatus;
    "capacity:disabled"?: string;
    // Seating accessibility
    "wheelchair:seating"?: OSMWheelchairStatus;
    "seating:wheelchair"?: OSMWheelchairStatus;
    // Other accessibility features
    hearing_loop?: "yes" | "no";
    tactile_paving?: "yes" | "no" | "contrasted" | "incorrect";
    blind?: OSMWheelchairStatus;
    deaf?: OSMWheelchairStatus;
    [key: string]: string | undefined;
  };
}

/** Overpass API response */
interface OverpassResponse {
  elements: OSMElement[];
}

interface CachedResult {
  expiresAt: number;
  result: WheelmapAccessibilityResult;
}

const resultCache = new Map<string, CachedResult>();
const inflightRequests = new Map<string, Promise<WheelmapAccessibilityResult>>();

/** Result of accessibility data lookup */
export interface WheelmapAccessibilityResult {
  /** Whether a matching place was found */
  found: boolean;
  /** Accessibility options extracted from OSM data */
  accessibilityOptions: AccessibilityOptions;
  /** Additional accessibility features (hearing, tactile, etc.) */
  additionalAccessibility?: AdditionalAccessibilityInfo;
  /** Original OSM wheelchair status */
  wheelchairStatus?: OSMWheelchairStatus;
  /** Optional description of wheelchair accessibility */
  wheelchairDescription?: string;
  /** The matched OSM element, if found */
  matchedElement?: OSMElement;
  /** Data source attribution */
  attribution: string;
}

/**
 * Calculate distance between two coordinates in meters using Haversine formula.
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Normalize a string for fuzzy matching (lowercase, remove punctuation, trim).
 */
function normalizeForMatching(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function buildCacheKey(lat: number, lng: number, name: string): string {
  return `${lat.toFixed(5)}:${lng.toFixed(5)}:${normalizeForMatching(name)}`;
}

/**
 * Calculate similarity score between two strings (0-1).
 */
function calculateSimilarity(str1: string, str2: string): number {
  const norm1 = normalizeForMatching(str1);
  const norm2 = normalizeForMatching(str2);

  if (norm1 === norm2) return 1;

  if (norm1.includes(norm2) || norm2.includes(norm1)) {
    const shorter = norm1.length < norm2.length ? norm1 : norm2;
    const longer = norm1.length < norm2.length ? norm2 : norm1;
    return shorter.length / longer.length;
  }

  const words1 = new Set(norm1.split(" "));
  const words2 = new Set(norm2.split(" "));
  const intersection = [...words1].filter((w) => words2.has(w));
  const union = new Set([...words1, ...words2]);

  return intersection.length / union.size;
}

/**
 * Get coordinates from an OSM element (handles both nodes and ways).
 */
function getElementCoords(element: OSMElement): { lat: number; lon: number } | null {
  if (element.lat !== undefined && element.lon !== undefined) {
    return { lat: element.lat, lon: element.lon };
  }
  if (element.center) {
    return element.center;
  }
  return null;
}

/**
 * Convert an OSM wheelchair status value to a boolean.
 */
function parseWheelchairStatus(status: OSMWheelchairStatus): boolean | null {
  if (status === "yes" || status === "designated") return true;
  if (status === "no") return false;
  if (status === "limited") return true; // Limited counts as partially accessible
  return null;
}

/**
 * Convert OSM wheelchair status to our AccessibilityOptions format.
 */
function convertOSMStatus(element: OSMElement): AccessibilityOptions {
  const wheelchair = element.tags?.wheelchair;
  const toiletWheelchair = element.tags?.["toilets:wheelchair"];
  const parkingWheelchair = element.tags?.["parking:wheelchair"];
  const seatingWheelchair = element.tags?.["wheelchair:seating"] ?? element.tags?.["seating:wheelchair"];
  const hasDisabledParking = element.tags?.["capacity:disabled"];

  const entranceAccessible = parseWheelchairStatus(wheelchair);

  const restroomAccessible = parseWheelchairStatus(toiletWheelchair);

  // Parking: check dedicated tag or capacity:disabled indicator
  let parkingAccessible = parseWheelchairStatus(parkingWheelchair as OSMWheelchairStatus);
  if (parkingAccessible === null && hasDisabledParking) {
    // If there's a capacity:disabled tag with a number > 0, parking exists
    const capacity = parseInt(hasDisabledParking, 10);
    if (!isNaN(capacity) && capacity > 0) parkingAccessible = true;
  }

  const seatingAccessible = parseWheelchairStatus(seatingWheelchair as OSMWheelchairStatus);

  return {
    wheelchairAccessibleEntrance: entranceAccessible,
    wheelchairAccessibleRestroom: restroomAccessible,
    wheelchairAccessibleParking: parkingAccessible,
    wheelchairAccessibleSeating: seatingAccessible,
  };
}

/** Additional accessibility features beyond wheelchair access */
export interface AdditionalAccessibilityInfo {
  hearingLoop?: boolean;
  tactilePaving?: boolean | "contrasted" | "incorrect";
  blindAccessible?: boolean | null;
  deafAccessible?: boolean | null;
}

/**
 * Extract additional accessibility features from OSM element.
 */
function extractAdditionalAccessibility(element: OSMElement): AdditionalAccessibilityInfo {
  const tags = element.tags;
  if (!tags) return {};

  return {
    hearingLoop: tags.hearing_loop === "yes" ? true : tags.hearing_loop === "no" ? false : undefined,
    tactilePaving: tags.tactile_paving === "yes" ? true 
      : tags.tactile_paving === "no" ? false 
      : tags.tactile_paving === "contrasted" ? "contrasted"
      : tags.tactile_paving === "incorrect" ? "incorrect"
      : undefined,
    blindAccessible: parseWheelchairStatus(tags.blind as OSMWheelchairStatus),
    deafAccessible: parseWheelchairStatus(tags.deaf as OSMWheelchairStatus),
  };
}



/**
 * Find the best matching OSM element for a given place.
 */
function findBestMatch(
  elements: OSMElement[],
  targetName: string,
  targetLat: number,
  targetLng: number,
): OSMElement | null {
  if (elements.length === 0) return null;

  const scored = elements
    .map((element) => {
      const coords = getElementCoords(element);
      if (!coords) return null;

      const distance = calculateDistance(targetLat, targetLng, coords.lat, coords.lon);
      const name = element.tags?.name;
      const nameSimilarity = name ? calculateSimilarity(targetName, name) : 0;

      const distanceScore = Math.max(0, 1 - distance / 100);
      const combinedScore = nameSimilarity * 0.7 + distanceScore * 0.3;

      return { element, distance, nameSimilarity, combinedScore };
    })
    .filter(
      (scored): scored is NonNullable<typeof scored> =>
        scored !== null &&
        scored.distance < 100 &&
        (scored.nameSimilarity > 0.3 || scored.distance < 30),
    )
    .sort((a, b) => b.combinedScore - a.combinedScore);

  return scored.length > 0 ? scored[0].element : null;
}

/**
 * Build Overpass QL query to find places with accessibility tags near a location.
 */
function buildOverpassQuery(lat: number, lng: number, radiusMeters: number = OVERPASS_RADIUS_METERS): string {
  // Keep the query narrow to avoid server-side timeouts.
  // We only fetch accessibility-tagged features near the selected venue.
  return `
    [out:json][timeout:${OVERPASS_QUERY_TIMEOUT_SECONDS}];
    (
      // General wheelchair accessibility
      node["wheelchair"](around:${radiusMeters},${lat},${lng});
      way["wheelchair"](around:${radiusMeters},${lat},${lng});
      // Wheelchair-accessible toilets/restrooms
      node["toilets:wheelchair"](around:${radiusMeters},${lat},${lng});
      way["toilets:wheelchair"](around:${radiusMeters},${lat},${lng});
      // Disabled parking
      node["capacity:disabled"](around:${radiusMeters},${lat},${lng});
      way["capacity:disabled"](around:${radiusMeters},${lat},${lng});
      node["parking:wheelchair"](around:${radiusMeters},${lat},${lng});
      way["parking:wheelchair"](around:${radiusMeters},${lat},${lng});
      // Wheelchair seating
      node["wheelchair:seating"](around:${radiusMeters},${lat},${lng});
      way["wheelchair:seating"](around:${radiusMeters},${lat},${lng});
      // Other accessibility features
      node["hearing_loop"](around:${radiusMeters},${lat},${lng});
      way["hearing_loop"](around:${radiusMeters},${lat},${lng});
      node["tactile_paving"](around:${radiusMeters},${lat},${lng});
      way["tactile_paving"](around:${radiusMeters},${lat},${lng});
    );
    out center;
  `.trim();
}

/**
 * Fetch accessibility data from OpenStreetMap via Overpass API.
 *
 * @param lat - Latitude of the place
 * @param lng - Longitude of the place
 * @param name - Name of the place (for matching)
 * @returns Accessibility result with options and attribution
 */
export async function fetchWheelmapAccessibility(
  lat: number,
  lng: number,
  name: string,
): Promise<WheelmapAccessibilityResult> {
  const attribution = "Accessibility data from OpenStreetMap (ODbL)";
  const emptyResult: WheelmapAccessibilityResult = {
    found: false,
    accessibilityOptions: {
      wheelchairAccessibleEntrance: null,
      wheelchairAccessibleParking: null,
      wheelchairAccessibleRestroom: null,
      wheelchairAccessibleSeating: null,
    },
    attribution,
  };

  const cacheKey = buildCacheKey(lat, lng, name);
  const now = Date.now();

  const cached = resultCache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return cached.result;
  }

  const inflight = inflightRequests.get(cacheKey);
  if (inflight) {
    return inflight;
  }

  const query = buildOverpassQuery(lat, lng, OVERPASS_RADIUS_METERS);

  const requestPromise = (async (): Promise<WheelmapAccessibilityResult> => {
    // Try each endpoint until one succeeds
    for (const endpoint of OVERPASS_ENDPOINTS) {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), OVERPASS_TIMEOUT_MS);

      try {
        console.log(`[OSM] Querying Overpass API at ${endpoint}...`);

        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: `data=${encodeURIComponent(query)}`,
          signal: controller.signal,
        });

        if (!response.ok) {
          console.warn(`[OSM] Overpass API returned ${response.status}:`, response.statusText);
          continue;
        }

        const data: OverpassResponse = await response.json();
        console.log(`[OSM] Found ${data.elements.length} accessibility-tagged elements near location`);

        if (!data.elements || data.elements.length === 0) {
          resultCache.set(cacheKey, {
            result: emptyResult,
            expiresAt: Date.now() + CACHE_TTL_MS,
          });
          return emptyResult;
        }

        // Try to match against returned accessibility-tagged elements.
        let matchedElement = findBestMatch(data.elements, name, lat, lng);

        if (matchedElement) {
          const coords = getElementCoords(matchedElement);
          if (coords) {
            // Merge accessibility tags from nearby related features (e.g., entrance + separate restroom node).
            const nearbyAccessibility = data.elements.filter((el) => {
              if (el.id === matchedElement!.id) return false;
              const elCoords = getElementCoords(el);
              return (
                elCoords &&
                calculateDistance(coords.lat, coords.lon, elCoords.lat, elCoords.lon) < 40
              );
            });

            for (const nearbyEl of nearbyAccessibility) {
              matchedElement = {
                ...matchedElement,
                tags: {
                  ...matchedElement.tags,
                  wheelchair: matchedElement.tags?.wheelchair ?? nearbyEl.tags?.wheelchair,
                  "toilets:wheelchair": matchedElement.tags?.["toilets:wheelchair"] ?? nearbyEl.tags?.["toilets:wheelchair"],
                  "parking:wheelchair": matchedElement.tags?.["parking:wheelchair"] ?? nearbyEl.tags?.["parking:wheelchair"],
                  "capacity:disabled": matchedElement.tags?.["capacity:disabled"] ?? nearbyEl.tags?.["capacity:disabled"],
                  "wheelchair:seating": matchedElement.tags?.["wheelchair:seating"] ?? nearbyEl.tags?.["wheelchair:seating"],
                  "seating:wheelchair": matchedElement.tags?.["seating:wheelchair"] ?? nearbyEl.tags?.["seating:wheelchair"],
                  "wheelchair:description": matchedElement.tags?.["wheelchair:description"] ?? nearbyEl.tags?.["wheelchair:description"],
                  hearing_loop: matchedElement.tags?.hearing_loop ?? nearbyEl.tags?.hearing_loop,
                  tactile_paving: matchedElement.tags?.tactile_paving ?? nearbyEl.tags?.tactile_paving,
                  blind: matchedElement.tags?.blind ?? nearbyEl.tags?.blind,
                  deaf: matchedElement.tags?.deaf ?? nearbyEl.tags?.deaf,
                },
              };
            }
          }
        }

        if (!matchedElement) {
          console.log("[OSM] No matching accessibility-tagged element found for:", name);
          resultCache.set(cacheKey, {
            result: emptyResult,
            expiresAt: Date.now() + CACHE_TTL_MS,
          });
          return emptyResult;
        }

        console.log("[OSM] Found matching element:", matchedElement.tags?.name, matchedElement);

        const result: WheelmapAccessibilityResult = {
          found: true,
          accessibilityOptions: convertOSMStatus(matchedElement),
          additionalAccessibility: extractAdditionalAccessibility(matchedElement),
          wheelchairStatus: matchedElement.tags?.wheelchair,
          wheelchairDescription: matchedElement.tags?.["wheelchair:description"],
          matchedElement,
          attribution,
        };

        resultCache.set(cacheKey, {
          result,
          expiresAt: Date.now() + CACHE_TTL_MS,
        });

        return result;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          console.warn(`[OSM] Request timed out after ${OVERPASS_TIMEOUT_MS}ms at ${endpoint}`);
        } else {
          console.warn(`[OSM] Failed to fetch from ${endpoint}:`, error);
        }
        // Try next endpoint
      } finally {
        window.clearTimeout(timeoutId);
      }
    }

    console.warn("[OSM] All Overpass endpoints failed");
    resultCache.set(cacheKey, {
      result: emptyResult,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });
    return emptyResult;
  })();

  inflightRequests.set(cacheKey, requestPromise);

  try {
    return await requestPromise;
  } finally {
    inflightRequests.delete(cacheKey);
  }
}

/**
 * Merge accessibility data from multiple sources, preferring non-null values.
 */
export function mergeAccessibilityOptions(
  ...sources: (AccessibilityOptions | undefined)[]
): AccessibilityOptions {
  const result: AccessibilityOptions = {
    wheelchairAccessibleEntrance: null,
    wheelchairAccessibleParking: null,
    wheelchairAccessibleRestroom: null,
    wheelchairAccessibleSeating: null,
  };

  for (const source of sources) {
    if (!source) continue;

    if (source.wheelchairAccessibleEntrance != null) {
      result.wheelchairAccessibleEntrance = source.wheelchairAccessibleEntrance;
    }
    if (source.wheelchairAccessibleParking != null) {
      result.wheelchairAccessibleParking = source.wheelchairAccessibleParking;
    }
    if (source.wheelchairAccessibleRestroom != null) {
      result.wheelchairAccessibleRestroom = source.wheelchairAccessibleRestroom;
    }
    if (source.wheelchairAccessibleSeating != null) {
      result.wheelchairAccessibleSeating = source.wheelchairAccessibleSeating;
    }
  }

  return result;
}
