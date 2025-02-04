import { useEffect, useRef } from "react";
import { Loader } from "@googlemaps/js-api-loader";
import React from "react";

export default function GoogleMap() {
  const inputRef = useRef<HTMLInputElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);

  const isDarkMode = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const darkModeStyles: google.maps.MapTypeStyle[] = [
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

  useEffect(() => {
    if (!inputRef.current || !mapRef.current) return;

    const loader = new Loader({
      apiKey: import.meta.env.VITE_GOOGLE_API_KEY ?? "",
      version: "weekly",
      libraries: ["places"],
    });

    loader.importLibrary("maps").then(({ Map }) => {
      const map = new Map(mapRef.current as HTMLElement, {
        center: { lat: 53.8008, lng: -1.5 },
        zoom: 10,
        styles: isDarkMode ? darkModeStyles : [],
      });
      const inputElement = inputRef.current as HTMLInputElement;
      const searchBox = new google.maps.places.SearchBox(inputElement);

      // Add the input element to the map
      map.controls[google.maps.ControlPosition.TOP_LEFT].push(inputElement);

      // Bias the SearchBox results towards the current map bounds
      map.addListener("bounds_changed", () => {
        searchBox.setBounds(map.getBounds() as google.maps.LatLngBounds);
      });
    });
  }, []);

  return (
    <div className="relative w-full h-[500px]">
      <input
        ref={inputRef}
        type="text"
        placeholder="Search for places"
        className="absolute top-4 left-4 z-10 p-2 m-2 w-64 bg-white dark:bg-gray-700 dark:text-gray-100 rounded-md"
      />
      <div ref={mapRef} className="w-full h-full" />
    </div>
  );
}
