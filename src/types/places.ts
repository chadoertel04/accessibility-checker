/**
 * Type definitions for Google Places API data used throughout the app.
 * These types represent the subset of place data relevant to accessibility features.
 */

/** Accessibility options available for a place */
export interface AccessibilityOptions {
  wheelchairAccessibleEntrance?: boolean | null;
  wheelchairAccessibleParking?: boolean | null;
  wheelchairAccessibleRestroom?: boolean | null;
  wheelchairAccessibleSeating?: boolean | null;
}

/** Source of accessibility data */
export type AccessibilityDataSource = "google" | "wheelmap" | "manual" | "unknown";

/** Additional accessibility features beyond wheelchair access */
export interface AdditionalAccessibilityOptions {
  /** Hearing loop/induction loop available */
  hearingLoop?: boolean;
  /** Tactile paving for visually impaired */
  tactilePaving?: boolean | "contrasted" | "incorrect";
  /** Accessible for blind visitors */
  blindAccessible?: boolean | null;
  /** Accessible for deaf visitors */
  deafAccessible?: boolean | null;
}

/** Accessibility data with source attribution */
export interface AccessibilityData {
  options: AccessibilityOptions;
  /** Additional non-wheelchair accessibility features */
  additionalOptions?: AdditionalAccessibilityOptions;
  /** Primary source of the accessibility data */
  source: AccessibilityDataSource;
  /** Attribution text (e.g., "Data from Wheelmap.org") */
  attribution?: string;
  /** Additional description from the data source */
  description?: string;
}

/** Opening hours period for a single day */
export interface OpeningHoursPeriod {
  open: { day: number; hour: number; minute: number };
  close?: { day: number; hour: number; minute: number };
}

/** Place opening hours */
export interface PlaceOpeningHours {
  isOpen?: () => boolean | undefined;
  periods?: OpeningHoursPeriod[];
  weekdayDescriptions?: string[];
}

/** Place photo reference */
export interface PlacePhoto {
  getUrl: (opts?: { maxWidth?: number; maxHeight?: number }) => string;
  attributions?: string[];
}

/** Place review */
export interface PlaceReview {
  authorName?: string;
  rating?: number;
  text?: string;
  relativeTimeDescription?: string;
}

/** Normalized venue data extracted from Google Places API response */
export interface VenueData {
  /** Google Place ID */
  placeId: string;
  /** Venue name */
  name: string;
  /** Full formatted address */
  address?: string;
  /** Overall rating (1-5) */
  rating?: number;
  /** Number of user ratings */
  userRatingsTotal?: number;
  /** Formatted phone number */
  phoneNumber?: string;
  /** Website URL */
  website?: string;
  /** Opening hours information */
  openingHours?: PlaceOpeningHours;
  /** Whether the place is currently open */
  isOpen?: boolean;
  /** Place photos */
  photos?: PlacePhoto[];
  /** Place types/categories */
  types?: string[];
  /** Primary type display name */
  primaryType?: string;
  /** Accessibility options (merged from all sources) */
  accessibilityOptions?: AccessibilityOptions;
  /** Detailed accessibility data with source attribution */
  accessibilityData?: AccessibilityData;
  /** Price level (0-4) */
  priceLevel?: number;
  /** Geographic coordinates */
  location: {
    lat: number;
    lng: number;
  };
  /** Place reviews */
  reviews?: PlaceReview[];
  /** Business status */
  businessStatus?: string;
}

/** Icon types for accessibility features */
export type AccessibilityIconType = 
  | "entrance" 
  | "parking" 
  | "restroom" 
  | "seating"
  | "hearing" 
  | "tactile" 
  | "blind" 
  | "deaf";

/** Accessibility feature definition for display */
export interface AccessibilityFeature {
  /** Unique key for the feature */
  key: keyof AccessibilityOptions;
  /** Display label */
  label: string;
  /** Short description */
  description: string;
  /** Icon name/identifier */
  icon: AccessibilityIconType;
  /** Current status */
  status: "available" | "unavailable" | "unknown";
}

/** Additional accessibility feature definition (non-wheelchair) */
export interface AdditionalAccessibilityFeature {
  /** Unique key for the feature */
  key: keyof AdditionalAccessibilityOptions;
  /** Display label */
  label: string;
  /** Short description */
  description: string;
  /** Icon name/identifier */
  icon: AccessibilityIconType;
  /** Current status */
  status: "available" | "unavailable" | "unknown";
  /** Additional status info (e.g., "contrasted" for tactile paving) */
  statusDetail?: string;
}

/** Props for venue selection callback */
export interface VenueSelectionEvent {
  venue: VenueData;
  source: "search" | "marker" | "map";
}
