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
  /** True when moderation hid it. Only ever true on the viewer's own review. */
  hidden: boolean;
}

export interface FeatureReviewSummary {
  featureKey: ReviewFeatureKey;
  likes: number;
  dislikes: number;
  /** Other visitors' notes loaded so far, newest first (the first page, plus any loaded with "Show more"). */
  comments: AccessibilityReview[];
  /** Number of other visitors' notes across all pages. */
  commentCount: number;
  /** Cursor for the next page of notes; null when everything is loaded. */
  nextCursor: string | null;
  /** The signed-in user's review for this category, if any (also when hidden). */
  viewerReview: AccessibilityReview | null;
}

export interface CommentPage {
  comments: AccessibilityReview[];
  nextCursor: string | null;
}

export type ReportReason = "spam" | "offensive" | "inaccurate" | "other";

export interface PlaceReviewSummary {
  googlePlaceId: string;
  totalReviews: number;
  features: FeatureReviewSummary[];
}
