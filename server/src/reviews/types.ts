/**
 * Shared contract for the accessibility review API.
 *
 * Feature keys mirror the accessibility categories the app derives from the
 * OpenStreetMap/Overpass (Wheelmap) data, so a review always targets one
 * concrete accessibility category of a venue.
 *
 * Keep in sync with src/types/reviews.ts (frontend) and the
 * accessibility_feature_key enum in init-db/01-create-accessibility-reviews.sql.
 */

export const ACCESSIBILITY_FEATURE_KEYS = [
  "wheelchairAccessibleEntrance",
  "wheelchairAccessibleParking",
  "wheelchairAccessibleRestroom",
  "wheelchairAccessibleSeating",
  "hearingLoop",
  "tactilePaving",
  "blindAccessible",
  "deafAccessible",
] as const;

export type AccessibilityFeatureKey = (typeof ACCESSIBILITY_FEATURE_KEYS)[number];

export const REVIEW_SENTIMENTS = ["like", "dislike"] as const;

export type ReviewSentiment = (typeof REVIEW_SENTIMENTS)[number];

/** A single stored review, as returned to clients. */
export interface AccessibilityReview {
  id: string;
  googlePlaceId: string;
  featureKey: AccessibilityFeatureKey;
  sentiment: ReviewSentiment;
  comment: string | null;
  authorName: string | null;
  createdAt: string;
  updatedAt: string;
  /** True when the review belongs to the authenticated caller. */
  ownedByViewer: boolean;
}

/** Like/dislike tally and comments for one accessibility category. */
export interface FeatureReviewSummary {
  featureKey: AccessibilityFeatureKey;
  likes: number;
  dislikes: number;
  /** Reviews that carry a comment, newest first. */
  comments: AccessibilityReview[];
  /** The authenticated caller's own review, if any. */
  viewerReview: AccessibilityReview | null;
}

/** Full review payload for a venue. */
export interface PlaceReviewSummary {
  googlePlaceId: string;
  totalReviews: number;
  features: FeatureReviewSummary[];
}
