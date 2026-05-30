import { useState, useRef, useEffect } from "react";
import type { VenueData } from "@/types/places";
import AccessibilitySection from "@/components/AccessibilitySection";

interface VenueDetailsPanelProps {
  venue: VenueData | null;
  onClose: () => void;
  isLoading?: boolean;
}

/** Format place type for display */
function formatPlaceType(type?: string): string {
  if (!type) return "Place";
  // Convert snake_case to Title Case
  return type
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Star rating component */
function StarRating({ rating, total }: { rating: number; total?: number }) {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

  return (
    <div className="flex items-center gap-1.5">
      <div
        className="flex items-center gap-0.5"
        role="img"
        aria-label={`${rating} out of 5 stars`}
      >
        {/* Full stars */}
        {Array.from({ length: fullStars }).map((_, i) => (
          <svg
            key={`full-${i}`}
            className="w-4 h-4 text-amber-400"
            fill="currentColor"
            viewBox="0 0 20 20"
            aria-hidden="true"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
        {/* Half star */}
        {hasHalfStar && (
          <svg
            className="w-4 h-4 text-amber-400"
            viewBox="0 0 20 20"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="half-star">
                <stop offset="50%" stopColor="currentColor" />
                <stop offset="50%" stopColor="#d1d5db" />
              </linearGradient>
            </defs>
            <path
              fill="url(#half-star)"
              d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
            />
          </svg>
        )}
        {/* Empty stars */}
        {Array.from({ length: emptyStars }).map((_, i) => (
          <svg
            key={`empty-${i}`}
            className="w-4 h-4 text-slate-300 dark:text-slate-600"
            fill="currentColor"
            viewBox="0 0 20 20"
            aria-hidden="true"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
        {rating.toFixed(1)}
      </span>
      {total !== undefined && (
        <span className="text-sm text-slate-500 dark:text-slate-400">
          ({total.toLocaleString()} reviews)
        </span>
      )}
    </div>
  );
}

/** Price level indicator */
function PriceLevel({ level }: { level: number }) {
  const labels = ["Free", "Inexpensive", "Moderate", "Expensive", "Very Expensive"];
  return (
    <span className="text-sm text-slate-600 dark:text-slate-400">
      {"$".repeat(level + 1)}{" "}
      <span className="text-slate-400 dark:text-slate-500">
        · {labels[level]}
      </span>
    </span>
  );
}

/** Opening hours display */
function OpeningHours({
  hours,
  isOpen,
}: {
  hours?: { weekdayDescriptions?: string[] };
  isOpen?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  if (!hours?.weekdayDescriptions?.length) return null;

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
        aria-expanded={expanded}
      >
        <svg
          className="w-4 h-4 text-slate-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span>
          {isOpen !== undefined && (
            <span
              className={
                isOpen
                  ? "text-emerald-600 dark:text-emerald-400 font-medium"
                  : "text-rose-600 dark:text-rose-400 font-medium"
              }
            >
              {isOpen ? "Open now" : "Closed"}
            </span>
          )}
          {isOpen !== undefined && " · "}
          See hours
        </span>
        <svg
          className={`w-4 h-4 transition-transform ${expanded ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <ul className="pl-6 space-y-1 text-sm text-slate-600 dark:text-slate-400">
          {hours.weekdayDescriptions.map((day, i) => (
            <li key={i}>{day}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Image gallery with lazy loading */
function ImageGallery({ photos }: { photos?: VenueData["photos"] }) {
  const [activeIndex, setActiveIndex] = useState(0);

  if (!photos?.length) {
    return (
      <div className="w-full h-48 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center">
        <svg
          className="w-12 h-12 text-slate-300 dark:text-slate-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
          />
        </svg>
      </div>
    );
  }

  const displayPhotos = photos.slice(0, 5);

  return (
    <div className="space-y-2">
      {/* Main image */}
      <div className="relative w-full h-48 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800">
        <img
          src={displayPhotos[activeIndex]?.getUrl({ maxWidth: 600 })}
          alt=""
          className="w-full h-full object-cover"
          loading="lazy"
        />
        {displayPhotos.length > 1 && (
          <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/60 rounded-md text-xs text-white">
            {activeIndex + 1} / {displayPhotos.length}
          </div>
        )}
      </div>

      {/* Thumbnails */}
      {displayPhotos.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {displayPhotos.map((photo, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActiveIndex(i)}
              className={`flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden ring-2 transition-all ${
                i === activeIndex
                  ? "ring-indigo-500"
                  : "ring-transparent hover:ring-slate-300 dark:hover:ring-slate-600"
              }`}
              aria-label={`View photo ${i + 1}`}
              aria-current={i === activeIndex ? "true" : undefined}
            >
              <img
                src={photo.getUrl({ maxWidth: 100 })}
                alt=""
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Loading skeleton */
function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-48 bg-slate-200 dark:bg-slate-700 rounded-xl" />
      <div className="space-y-2">
        <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
      </div>
      <div className="space-y-2">
        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded" />
        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-5/6" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 bg-slate-200 dark:bg-slate-700 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

/**
 * Panel component displaying detailed venue information with accessibility data.
 * Renders as a side panel on desktop and a bottom sheet on mobile.
 */
export default function VenueDetailsPanel({
  venue,
  onClose,
  isLoading = false,
}: VenueDetailsPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Focus trap and keyboard handling
  useEffect(() => {
    if (!venue && !isLoading) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [venue, isLoading, onClose]);

  // Focus panel when it opens
  useEffect(() => {
    if ((venue || isLoading) && panelRef.current) {
      panelRef.current.focus();
    }
  }, [venue, isLoading]);

  if (!venue && !isLoading) return null;

  return (
    <>
      {/* Backdrop for mobile */}
      <div
        className="fixed inset-0 bg-black/20 dark:bg-black/40 z-30 lg:hidden transition-opacity duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <aside
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={venue?.name ?? "Venue details"}
        className="fixed inset-x-0 bottom-0 z-40 max-h-[85vh] lg:inset-y-0 lg:left-auto lg:right-0 lg:w-[420px] lg:max-h-none bg-slate-50 dark:bg-slate-950 rounded-t-2xl lg:rounded-none shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 truncate">
            {isLoading ? "Loading..." : venue?.name ?? "Venue Details"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Close panel"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          <div className="p-4 space-y-6">
            {isLoading ? (
              <LoadingSkeleton />
            ) : venue ? (
              <>
                {/* Image gallery */}
                <ImageGallery photos={venue.photos} />

                {/* Basic info */}
                <div className="space-y-3">
                  {/* Type badge */}
                  {venue.primaryType && (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 ring-1 ring-inset ring-indigo-200 dark:ring-indigo-900">
                      {formatPlaceType(venue.primaryType)}
                    </span>
                  )}

                  {/* Name */}
                  <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                    {venue.name}
                  </h3>

                  {/* Rating */}
                  {venue.rating !== undefined && (
                    <StarRating rating={venue.rating} total={venue.userRatingsTotal} />
                  )}

                  {/* Price level */}
                  {venue.priceLevel !== undefined && (
                    <PriceLevel level={venue.priceLevel} />
                  )}

                  {/* Address */}
                  {venue.address && (
                    <div className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                      <svg
                        className="w-4 h-4 mt-0.5 flex-shrink-0 text-slate-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={1.5}
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
                        />
                      </svg>
                      <span>{venue.address}</span>
                    </div>
                  )}

                  {/* Opening hours */}
                  <OpeningHours hours={venue.openingHours} isOpen={venue.isOpen} />

                  {/* Phone */}
                  {venue.phoneNumber && (
                    <a
                      href={`tel:${venue.phoneNumber}`}
                      className="flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={1.5}
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z"
                        />
                      </svg>
                      {venue.phoneNumber}
                    </a>
                  )}

                  {/* Website */}
                  {venue.website && (
                    <a
                      href={venue.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={1.5}
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418"
                        />
                      </svg>
                      Visit website
                      <svg
                        className="w-3 h-3"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                        />
                      </svg>
                    </a>
                  )}
                </div>

                {/* Divider */}
                <hr className="border-slate-200 dark:border-slate-800" />

                {/* Accessibility section - the main feature */}
                <AccessibilitySection
                  accessibilityOptions={venue.accessibilityOptions}
                />

                {/* Actions */}
                <div className="flex gap-3">
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${venue.location.lat},${venue.location.lng}&destination_place_id=${venue.placeId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                      />
                    </svg>
                    Get Directions
                  </a>
                </div>
              </>
            ) : null}
          </div>
        </div>
      </aside>
    </>
  );
}
