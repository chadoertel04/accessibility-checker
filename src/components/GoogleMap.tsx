import { useEffect, useRef, useState, useCallback } from "react";
import { Loader } from "@googlemaps/js-api-loader";
import type { VenueData } from "@/types/places";
import {
  fetchWheelmapAccessibility,
  mergeAccessibilityOptions,
} from "@/services/wheelmap";

export interface GoogleMapProps {
  /** Callback when a venue is selected from search results */
  onVenueSelect?: (venue: VenueData) => void;
  /** Callback when venue loading state changes */
  onLoadingChange?: (isLoading: boolean) => void;
}

// Defined outside the component so the array is not recreated on every render.
const DARK_MODE_STYLES: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
  {
    featureType: "administrative.locality",
    elementType: "labels.text.fill",
    stylers: [{ color: "#d59563" }],
  },
  {
    featureType: "poi",
    elementType: "labels.text.fill",
    stylers: [{ color: "#d59563" }],
  },
  {
    featureType: "poi.park",
    elementType: "geometry",
    stylers: [{ color: "#263c3f" }],
  },
  {
    featureType: "poi.park",
    elementType: "labels.text.fill",
    stylers: [{ color: "#6b9a76" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#38414e" }],
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#212a37" }],
  },
  {
    featureType: "road",
    elementType: "labels.text.fill",
    stylers: [{ color: "#9ca5b3" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#746855" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry.stroke",
    stylers: [{ color: "#1f2835" }],
  },
  {
    featureType: "road.highway",
    elementType: "labels.text.fill",
    stylers: [{ color: "#f3d19c" }],
  },
  {
    featureType: "transit",
    elementType: "geometry",
    stylers: [{ color: "#2f3948" }],
  },
  {
    featureType: "transit.station",
    elementType: "labels.text.fill",
    stylers: [{ color: "#d59563" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#17263c" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [{ color: "#515c6d" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.stroke",
    stylers: [{ color: "#17263c" }],
  },
];

// Read once at module level — the map only initialises once, and re-reading on
// every render would not make it reactive to system-theme changes anyway.
const IS_DARK_MODE = window.matchMedia("(prefers-color-scheme: dark)").matches;

/** Extract VenueData from a Google PlaceResult */
function extractVenueData(
  place: google.maps.places.PlaceResult,
): VenueData | null {
  if (!place.place_id || !place.geometry?.location) return null;

  const location = place.geometry.location;

  return {
    placeId: place.place_id,
    name: place.name ?? "Unknown Place",
    address: place.formatted_address ?? place.vicinity,
    rating: place.rating,
    userRatingsTotal: place.user_ratings_total,
    phoneNumber: place.formatted_phone_number ?? place.international_phone_number,
    website: place.website,
    openingHours: place.opening_hours
      ? {
          isOpen: place.opening_hours.isOpen?.bind(place.opening_hours),
          weekdayDescriptions: place.opening_hours.weekday_text,
        }
      : undefined,
    isOpen: place.opening_hours?.isOpen?.(),
    photos: place.photos,
    types: place.types,
    primaryType: place.types?.[0],
    // Google Places API returns accessibility options in the `accessibilityOptions` field
    // for the Places API (new) or we need to check for specific fields
    accessibilityOptions: (place as google.maps.places.PlaceResult & {
      accessibilityOptions?: VenueData["accessibilityOptions"];
      wheelchair_accessible_entrance?: boolean;
    }).accessibilityOptions ?? {
      wheelchairAccessibleEntrance: (place as google.maps.places.PlaceResult & {
        wheelchair_accessible_entrance?: boolean;
      }).wheelchair_accessible_entrance,
    },
    priceLevel: place.price_level,
    location: {
      lat: location.lat(),
      lng: location.lng(),
    },
    reviews: place.reviews?.map((r) => ({
      authorName: r.author_name,
      rating: r.rating,
      text: r.text,
      relativeTimeDescription: r.relative_time_description,
    })),
    businessStatus: place.business_status,
  };
}

/** Fields to request from Places API for detailed venue info */
const PLACE_DETAILS_FIELDS = [
  "place_id",
  "name",
  "formatted_address",
  "geometry",
  "rating",
  "user_ratings_total",
  "formatted_phone_number",
  "international_phone_number",
  "website",
  "opening_hours",
  "photos",
  "types",
  "price_level",
  "reviews",
  "business_status",
  // Accessibility fields - these may vary by API version
  "wheelchair_accessible_entrance",
];

export default function GoogleMap({
  onVenueSelect,
  onLoadingChange,
}: GoogleMapProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /** Clear all markers from the map */
  const clearMarkers = useCallback(() => {
    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];
  }, []);

  /** Add a marker to the map */
  const addMarker = useCallback(
    (
      place: google.maps.places.PlaceResult,
      map: google.maps.Map,
    ): google.maps.Marker | null => {
      if (!place.geometry?.location) return null;

      const marker = new google.maps.Marker({
        map,
        position: place.geometry.location,
        title: place.name,
        animation: google.maps.Animation.DROP,
        icon: {
          url: "data:image/svg+xml," + encodeURIComponent(`
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40">
              <path fill="${IS_DARK_MODE ? "#818cf8" : "#4f46e5"}" d="M16 0C7.163 0 0 7.163 0 16c0 12 16 24 16 24s16-12 16-24c0-8.837-7.163-16-16-16z"/>
              <circle fill="white" cx="16" cy="16" r="6"/>
            </svg>
          `),
          scaledSize: new google.maps.Size(32, 40),
          anchor: new google.maps.Point(16, 40),
        },
      });

      markersRef.current.push(marker);
      return marker;
    },
    [],
  );

  /** Fetch detailed place information and notify parent */
  const fetchPlaceDetails = useCallback(
    (placeId: string, map: google.maps.Map) => {
      if (!placesServiceRef.current) {
        placesServiceRef.current = new google.maps.places.PlacesService(map);
      }

      onLoadingChange?.(true);

      placesServiceRef.current.getDetails(
        {
          placeId,
          fields: PLACE_DETAILS_FIELDS,
        },
        async (place, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && place) {
            const venueData = extractVenueData(place);
            if (venueData) {
              // Fetch accessibility data from Wheelmap (free alternative source)
              try {
                const wheelmapResult = await fetchWheelmapAccessibility(
                  venueData.location.lat,
                  venueData.location.lng,
                  venueData.name,
                );

                // Merge accessibility data from both sources
                // Wheelmap data takes precedence since Google legacy API doesn't return it
                const mergedAccessibility = mergeAccessibilityOptions(
                  venueData.accessibilityOptions,
                  wheelmapResult.accessibilityOptions,
                );

                venueData.accessibilityOptions = mergedAccessibility;
                venueData.accessibilityData = {
                  options: mergedAccessibility,
                  additionalOptions: wheelmapResult.additionalAccessibility,
                  source: wheelmapResult.found ? "wheelmap" : "unknown",
                  attribution: wheelmapResult.attribution,
                  description: wheelmapResult.wheelchairDescription,
                };
              } catch (error) {
                console.warn(
                  "[GoogleMap] Failed to fetch Wheelmap accessibility data:",
                  error,
                );
              }

              onLoadingChange?.(false);
              onVenueSelect?.(venueData);
            } else {
              onLoadingChange?.(false);
            }
          } else {
            onLoadingChange?.(false);
            console.warn("[GoogleMap] Failed to fetch place details:", status);
          }
        },
      );
    },
    [onVenueSelect, onLoadingChange],
  );

  useEffect(() => {
    if (!inputRef.current || !mapRef.current) return;

    const apiKey = import.meta.env.VITE_GOOGLE_API_KEY;

    if (!apiKey && import.meta.env.DEV) {
      console.warn(
        "[GoogleMap] VITE_GOOGLE_API_KEY is not set. Map will not load.",
      );
    }

    const loader = new Loader({
      apiKey: apiKey ?? "",
      version: "weekly",
      libraries: ["places"],
    });

    loader
      .importLibrary("maps")
      .then(({ Map }) => {
        const map = new Map(mapRef.current as HTMLElement, {
          center: { lat: 53.8008, lng: -1.5 },
          zoom: 10,
          styles: IS_DARK_MODE ? DARK_MODE_STYLES : [],
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
        });

        mapInstanceRef.current = map;

        const inputElement = inputRef.current as HTMLInputElement;
        const searchBox = new google.maps.places.SearchBox(inputElement);

        // Transfer the input into a Google Maps control slot so it renders
        // inside the map canvas at the top-left position.
        map.controls[google.maps.ControlPosition.TOP_LEFT].push(inputElement);

        map.addListener("bounds_changed", () => {
          searchBox.setBounds(map.getBounds() as google.maps.LatLngBounds);
        });

        // Handle place selection from search
        searchBox.addListener("places_changed", () => {
          const places = searchBox.getPlaces();
          if (!places || places.length === 0) return;

          // Clear existing markers
          clearMarkers();

          // Get bounds to fit all results
          const bounds = new google.maps.LatLngBounds();

          places.forEach((place) => {
            if (!place.geometry?.location) return;

            // Add marker for each place
            const marker = addMarker(place, map);

            if (marker && place.place_id) {
              // Add click listener to fetch details
              marker.addListener("click", () => {
                fetchPlaceDetails(place.place_id!, map);
              });
            }

            // Extend bounds
            if (place.geometry.viewport) {
              bounds.union(place.geometry.viewport);
            } else {
              bounds.extend(place.geometry.location);
            }
          });

          // Fit map to bounds
          map.fitBounds(bounds);

          // If only one place, fetch its details automatically
          if (places.length === 1 && places[0].place_id) {
            fetchPlaceDetails(places[0].place_id, map);
          }
        });

        setIsLoading(false);
      })
      .catch(() => {
        setError(
          "Failed to load the map. Please check your connection and try again.",
        );
        setIsLoading(false);
      });

    // Cleanup
    return () => {
      clearMarkers();
    };
  }, [clearMarkers, addMarker, fetchPlaceDetails]);

  if (error) {
    return (
      <div
        role="alert"
        className="flex flex-col items-center justify-center w-full h-[520px] bg-slate-50 dark:bg-slate-800 gap-3"
      >
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-red-50 dark:bg-red-950 text-red-500 dark:text-red-400">
          <svg
            aria-hidden="true"
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
            />
          </svg>
        </div>
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
          {error}
        </p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-[520px]">
      {isLoading && (
        <div
          role="status"
          aria-label="Loading map"
          className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-800 z-20 gap-3"
        >
          <div
            aria-hidden="true"
            className="w-8 h-8 rounded-full border-2 border-slate-200 dark:border-slate-600 border-t-indigo-600 dark:border-t-indigo-400 animate-spin"
          />
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Loading map…
          </p>
        </div>
      )}
      {/* Label is visually hidden (sr-only) but keeps the input accessible to
          screen readers. The element is later moved into a map control slot by
          the Google Maps API, so positioning classes here have no effect. */}
      <label htmlFor="map-search" className="sr-only">
        Search for accessible places
      </label>
      <input
        id="map-search"
        ref={inputRef}
        type="text"
        placeholder="Search for places…"
        className="absolute top-4 left-4 z-10 m-2 w-72 px-4 py-2.5 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow duration-150"
      />
      <div
        ref={mapRef}
        className="w-full h-full"
        role="application"
        aria-label="Interactive map for finding accessible places"
      />
    </div>
  );
}
