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
  /** True when moderation hid it. Only ever true on the caller's own review. */
  hidden: boolean;
}

/** Like/dislike tally and the first page of notes for one accessibility category. */
export interface FeatureReviewSummary {
  featureKey: AccessibilityFeatureKey;
  likes: number;
  dislikes: number;
  /** First page of other visitors' notes, newest first. */
  comments: AccessibilityReview[];
  /** Number of other visitors' notes across all pages. */
  commentCount: number;
  /** Pass to the comments endpoint for the next page; null when there is none. */
  nextCursor: string | null;
  /** The authenticated caller's own review, if any (also when hidden). */
  viewerReview: AccessibilityReview | null;
}

/** Full review payload for a venue. Hidden reviews are not counted. */
export interface PlaceReviewSummary {
  googlePlaceId: string;
  totalReviews: number;
  features: FeatureReviewSummary[];
}

/** One page of notes from the comments endpoint. */
export interface CommentPage {
  comments: AccessibilityReview[];
  nextCursor: string | null;
}

export const REPORT_REASONS = ["spam", "offensive", "inaccurate", "other"] as const;

export type ReportReason = (typeof REPORT_REASONS)[number];

export interface ReportResult {
  /** True when this report pushed the review over the auto-hide threshold (or it was hidden already). */
  hidden: boolean;
}

export const MODERATION_ACTIONS = ["hide", "unhide", "dismiss"] as const;

export type ModerationAction = (typeof MODERATION_ACTIONS)[number];

/** A review with open reports, as listed for moderators. */
export interface ReportedReview {
  review: AccessibilityReview & { userId: string; hiddenBy: string | null };
  openReports: number;
  reports: { reason: ReportReason; details: string | null; createdAt: string }[];
}
