/**
 * Types for user-submitted accessibility reviews.
 * Mirrors the contract exposed by the review API in `server/`.
 * Keep in sync with server/src/reviews/types.ts and the accessibility_feature_key
 * enum in init-db/01-create-accessibility-reviews.sql.
 */

import type {
  AccessibilityOptions,
  AdditionalAccessibilityOptions,
} from "@/types/places";

/** Accessibility category a review can target. */
export type ReviewFeatureKey =
  | keyof AccessibilityOptions
  | keyof AdditionalAccessibilityOptions;

/** A review is a like or a dislike. */
export type ReviewSentiment = "like" | "dislike";

export interface AccessibilityReview {
  id: string;
  /** Google Maps Place ID the review belongs to. */
  googlePlaceId: string;
  featureKey: ReviewFeatureKey;
  sentiment: ReviewSentiment;
  comment: string | null;
  authorName: string | null;
  createdAt: string;
  updatedAt: string;
  /** True when the signed-in user is the author. */
  ownedByViewer: boolean;
}

export interface FeatureReviewSummary {
  featureKey: ReviewFeatureKey;
  likes: number;
  dislikes: number;
  /** Reviews that include a comment, newest first. */
  comments: AccessibilityReview[];
  /** The signed-in user's review for this category, if any. */
  viewerReview: AccessibilityReview | null;
}

export interface PlaceReviewSummary {
  googlePlaceId: string;
  totalReviews: number;
  features: FeatureReviewSummary[];
}
