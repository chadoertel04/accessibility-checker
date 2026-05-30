import { useState, useCallback } from "react";
import GoogleMap from "@/components/GoogleMap";
import Layout from "@/components/Layout";
import VenueDetailsPanel from "@/components/VenueDetailsPanel";
import type { VenueData } from "@/types/places";

export default function Home() {
  const [selectedVenue, setSelectedVenue] = useState<VenueData | null>(null);
  const [isLoadingVenue, setIsLoadingVenue] = useState(false);

  const handleVenueSelect = useCallback((venue: VenueData) => {
    setSelectedVenue(venue);
  }, []);

  const handleLoadingChange = useCallback((loading: boolean) => {
    setIsLoadingVenue(loading);
  }, []);

  const handleClosePanel = useCallback(() => {
    setSelectedVenue(null);
  }, []);

  return (
    <Layout>
      {/* Hero */}
      <section className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 ring-1 ring-inset ring-indigo-200 dark:ring-indigo-900 mb-4">
              <svg
                aria-hidden="true"
                className="w-3 h-3"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M9.69 18.933l.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 00.281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 15.205 17 12.56 17 9A7 7 0 103 9c0 3.56 1.698 6.205 3.354 7.585.829.799 1.654 1.38 2.274 1.765.311.193.571.337.757.433a5.741 5.741 0 00.281.14l.018.008.006.003zM10 11.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z"
                  clipRule="evenodd"
                />
              </svg>
              Accessibility Finder
            </span>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50">
              Find accessible places near you
            </h1>
            <p className="mt-3 text-base sm:text-lg text-slate-500 dark:text-slate-400 leading-relaxed">
              Search the map to discover venues with detailed accessibility
              information — helping everyone explore with confidence.
            </p>
          </div>
        </div>
      </section>

      {/* Map section */}
      <section
        aria-label="Interactive map"
        className="mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 py-8"
      >
        <div className="rounded-2xl overflow-hidden shadow-lg ring-1 ring-slate-200 dark:ring-slate-700">
          <GoogleMap
            onVenueSelect={handleVenueSelect}
            onLoadingChange={handleLoadingChange}
          />
        </div>
      </section>

      {/* Venue Details Panel */}
      <VenueDetailsPanel
        venue={selectedVenue}
        onClose={handleClosePanel}
        isLoading={isLoadingVenue}
      />
    </Layout>
  );
}
