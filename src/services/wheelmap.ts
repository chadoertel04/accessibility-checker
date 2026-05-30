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
  "https://overpass.kumi.systems/api/interpreter",
];

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
    wheelchair?: OSMWheelchairStatus;
    "wheelchair:description"?: string;
    "toilets:wheelchair"?: OSMWheelchairStatus;
    [key: string]: string | undefined;
  };
}

/** Overpass API response */
interface OverpassResponse {
  elements: OSMElement[];
}

/** Result of accessibility data lookup */
export interface WheelmapAccessibilityResult {
  /** Whether a matching place was found */
  found: boolean;
  /** Accessibility options extracted from OSM data */
  accessibilityOptions: AccessibilityOptions;
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
 * Convert OSM wheelchair status to our AccessibilityOptions format.
 */
function convertOSMStatus(element: OSMElement): AccessibilityOptions {
  const wheelchair = element.tags?.wheelchair;
  const toiletWheelchair = element.tags?.["toilets:wheelchair"];

  const entranceAccessible =
    wheelchair === "yes" || wheelchair === "designated"
      ? true
      : wheelchair === "no"
        ? false
        : wheelchair === "limited"
          ? true // Limited counts as partially accessible
          : null;

  const restroomAccessible =
    toiletWheelchair === "yes"
      ? true
      : toiletWheelchair === "no"
        ? false
        : null;

  return {
    wheelchairAccessibleEntrance: entranceAccessible,
    wheelchairAccessibleRestroom: restroomAccessible,
    wheelchairAccessibleParking: null,
    wheelchairAccessibleSeating: null,
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
 * Build Overpass QL query to find places with wheelchair tags near a location.
 */
function buildOverpassQuery(lat: number, lng: number, radiusMeters: number = 100): string {
  // Search for nodes and ways with name tags that have wheelchair info
  // within the specified radius
  return `
    [out:json][timeout:10];
    (
      node["wheelchair"](around:${radiusMeters},${lat},${lng});
      way["wheelchair"](around:${radiusMeters},${lat},${lng});
      node["name"](around:${radiusMeters},${lat},${lng});
      way["name"](around:${radiusMeters},${lat},${lng});
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

  const query = buildOverpassQuery(lat, lng, 150);

  // Try each endpoint until one succeeds
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      console.log(`[OSM] Querying Overpass API at ${endpoint}...`);

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: `data=${encodeURIComponent(query)}`,
      });

      if (!response.ok) {
        console.warn(`[OSM] Overpass API returned ${response.status}:`, response.statusText);
        continue;
      }

      const data: OverpassResponse = await response.json();
      console.log(`[OSM] Found ${data.elements.length} elements near location`);

      if (!data.elements || data.elements.length === 0) {
        return emptyResult;
      }

      // Find elements with wheelchair tags first
      const withWheelchairTag = data.elements.filter(
        (el) => el.tags?.wheelchair !== undefined,
      );

      // Try to match against elements with wheelchair data first
      let matchedElement = findBestMatch(
        withWheelchairTag.length > 0 ? withWheelchairTag : data.elements,
        name,
        lat,
        lng,
      );

      // If we matched something without wheelchair data, look for any wheelchair data nearby
      if (matchedElement && !matchedElement.tags?.wheelchair && withWheelchairTag.length > 0) {
        // Use the first wheelchair-tagged element that's close
        const coords = getElementCoords(matchedElement);
        if (coords) {
          const nearbyWithWheelchair = withWheelchairTag.find((el) => {
            const elCoords = getElementCoords(el);
            return elCoords && calculateDistance(coords.lat, coords.lon, elCoords.lat, elCoords.lon) < 50;
          });
          if (nearbyWithWheelchair) {
            // Use wheelchair data from nearby element
            matchedElement = {
              ...matchedElement,
              tags: {
                ...matchedElement.tags,
                wheelchair: nearbyWithWheelchair.tags?.wheelchair,
                "toilets:wheelchair": nearbyWithWheelchair.tags?.["toilets:wheelchair"],
                "wheelchair:description": nearbyWithWheelchair.tags?.["wheelchair:description"],
              },
            };
          }
        }
      }

      if (!matchedElement) {
        console.log("[OSM] No matching element found for:", name);
        return emptyResult;
      }

      console.log("[OSM] Found matching element:", matchedElement.tags?.name, matchedElement);

      return {
        found: true,
        accessibilityOptions: convertOSMStatus(matchedElement),
        wheelchairStatus: matchedElement.tags?.wheelchair,
        wheelchairDescription: matchedElement.tags?.["wheelchair:description"],
        matchedElement,
        attribution,
      };
    } catch (error) {
      console.warn(`[OSM] Failed to fetch from ${endpoint}:`, error);
      // Try next endpoint
    }
  }

  console.warn("[OSM] All Overpass endpoints failed");
  return emptyResult;
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
