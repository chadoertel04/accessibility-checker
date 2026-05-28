import { useEffect, useRef, useState } from "react";
import { Loader } from "@googlemaps/js-api-loader";

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

export default function GoogleMap() {
  const inputRef = useRef<HTMLInputElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        });

        const inputElement = inputRef.current as HTMLInputElement;
        const searchBox = new google.maps.places.SearchBox(inputElement);

        // Transfer the input into a Google Maps control slot so it renders
        // inside the map canvas at the top-left position.
        map.controls[google.maps.ControlPosition.TOP_LEFT].push(inputElement);

        map.addListener("bounds_changed", () => {
          searchBox.setBounds(map.getBounds() as google.maps.LatLngBounds);
        });

        setIsLoading(false);
      })
      .catch(() => {
        setError(
          "Failed to load the map. Please check your connection and try again.",
        );
        setIsLoading(false);
      });
  }, []);

  if (error) {
    return (
      <div
        role="alert"
        className="flex items-center justify-center w-full h-[500px] bg-gray-100 dark:bg-gray-800 rounded-md"
      >
        <p className="text-gray-600 dark:text-gray-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-[500px]">
      {isLoading && (
        <div
          role="status"
          aria-label="Loading map"
          className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-md z-20"
        >
          <p className="text-gray-500 dark:text-gray-400">Loading map…</p>
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
        placeholder="Search for places"
        className="absolute top-4 left-4 z-10 p-2 m-2 w-64 bg-white dark:bg-gray-700 dark:text-gray-100 rounded-md shadow-sm border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
