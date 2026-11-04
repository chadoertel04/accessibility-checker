import type { AuthenticatedUser } from "../auth.js";
import {
  findReviewsByPlaceId,
  upsertReview as upsertReviewRow,
  type ReviewRecord,
} from "./repository.js";
import {
  ACCESSIBILITY_FEATURE_KEYS,
  type AccessibilityFeatureKey,
  type AccessibilityReview,
  type FeatureReviewSummary,
  type PlaceReviewSummary,
  type ReviewSentiment,
} from "./types.js";

function toPublicReview(
  record: ReviewRecord,
  viewerId: string | undefined,
): AccessibilityReview {
  return {
    id: record.id,
    googlePlaceId: record.googlePlaceId,
    featureKey: record.featureKey,
    sentiment: record.sentiment,
    comment: record.comment,
    authorName: record.authorName,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    ownedByViewer: viewerId !== undefined && record.userId === viewerId,
  };
}

/**
 * Aggregates every review left for a venue into per-category like/dislike
 * tallies, the comments for each category, and the caller's own review.
 */
export async function getPlaceReviewSummary(
  googlePlaceId: string,
  viewerId?: string,
): Promise<PlaceReviewSummary> {
  const records = await findReviewsByPlaceId(googlePlaceId);
  return summarizeReviews(googlePlaceId, records, viewerId);
}

/** Pure aggregation step of getPlaceReviewSummary; records must be newest first. */
export function summarizeReviews(
  googlePlaceId: string,
  records: ReviewRecord[],
  viewerId?: string,
): PlaceReviewSummary {
  const features: FeatureReviewSummary[] = ACCESSIBILITY_FEATURE_KEYS.map(
    (featureKey) => ({
      featureKey,
      likes: 0,
      dislikes: 0,
      comments: [],
      viewerReview: null,
    }),
  );

  const byFeature = new Map<AccessibilityFeatureKey, FeatureReviewSummary>(
    features.map((feature) => [feature.featureKey, feature]),
  );

  for (const record of records) {
    const feature = byFeature.get(record.featureKey);
    if (!feature) continue;

    const review = toPublicReview(record, viewerId);

    if (review.sentiment === "like") {
      feature.likes += 1;
    } else {
      feature.dislikes += 1;
    }

    if (review.comment) {
      feature.comments.push(review);
    }

    if (review.ownedByViewer) {
      feature.viewerReview = review;
    }
  }

  return {
    googlePlaceId,
    totalReviews: records.length,
    features,
  };
}

export interface SubmitReviewInput {
  googlePlaceId: string;
  featureKey: AccessibilityFeatureKey;
  sentiment: ReviewSentiment;
  comment: string | null;
  user: AuthenticatedUser;
}

/** Stores (or replaces) the caller's review for one accessibility category. */
export async function submitReview(
  input: SubmitReviewInput,
): Promise<AccessibilityReview> {
  const record = await upsertReviewRow({
    googlePlaceId: input.googlePlaceId,
    featureKey: input.featureKey,
    userId: input.user.id,
    authorName: input.user.name,
    sentiment: input.sentiment,
    comment: input.comment,
  });

  return toPublicReview(record, input.user.id);
}
