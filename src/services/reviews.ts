/**
 * Client for the accessibility review API.
 *
 * Reviews are keyed by Google Maps Place ID, so a venue found through Google
 * Maps always resolves to the same set of stored reviews. Each review targets
 * one accessibility category (the categories derived from the Overpass /
 * Wheelmap data) and is a like or a dislike with an optional comment.
 */

import type {
  AccessibilityReview,
  PlaceReviewSummary,
  ReviewFeatureKey,
  ReviewSentiment,
} from "@/types/reviews";

// `||` not `??`: CI sets unset repo variables to "".
const API_BASE_URL = (import.meta.env.VITE_REVIEWS_API_URL || "/api").replace(/\/+$/, "");

/** Production (static GitHub Pages) has no /api proxy, so reviews need an explicit URL there. */
export const REVIEWS_ENABLED =
  !import.meta.env.PROD || Boolean(import.meta.env.VITE_REVIEWS_API_URL);

export const REVIEW_COMMENT_MAX_LENGTH = 1000;

/** Error thrown when the review API rejects or fails a request. */
export class ReviewApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ReviewApiError";
  }
}

function emptySummary(googlePlaceId: string): PlaceReviewSummary {
  return { googlePlaceId, totalReviews: 0, features: [] };
}

async function readError(response: Response): Promise<never> {
  let message = `Review request failed with status ${response.status}`;

  try {
    const body: unknown = await response.json();
    if (
      body &&
      typeof body === "object" &&
      "error" in body &&
      typeof (body as { error: unknown }).error === "string"
    ) {
      message = (body as { error: string }).error;
    }
  } catch {
    // Response body was not JSON; keep the generic message.
  }

  throw new ReviewApiError(message, response.status);
}

function buildHeaders(token?: string, hasBody = false): HeadersInit {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (hasBody) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

function reviewPath(googlePlaceId: string, featureKey?: ReviewFeatureKey): string {
  const base = `${API_BASE_URL}/places/${encodeURIComponent(googlePlaceId)}/reviews`;
  return featureKey ? `${base}/${encodeURIComponent(featureKey)}` : base;
}

/**
 * Fetch every review left for a venue, grouped by accessibility category.
 * Passing a token additionally marks the caller's own reviews.
 */
export async function fetchPlaceReviews(
  googlePlaceId: string,
  options: { token?: string; signal?: AbortSignal } = {},
): Promise<PlaceReviewSummary> {
  if (!googlePlaceId) return emptySummary(googlePlaceId);

  const response = await fetch(reviewPath(googlePlaceId), {
    method: "GET",
    headers: buildHeaders(options.token),
    signal: options.signal,
  });

  if (!response.ok) await readError(response);

  return (await response.json()) as PlaceReviewSummary;
}

/**
 * Store the signed-in user's like/dislike for one accessibility category.
 * Re-submitting replaces their previous review for that category.
 */
export async function submitReview(
  googlePlaceId: string,
  featureKey: ReviewFeatureKey,
  input: { sentiment: ReviewSentiment; comment?: string | null },
  options: { token: string; signal?: AbortSignal },
): Promise<AccessibilityReview> {
  const comment = input.comment?.trim() ?? "";
  if (comment.length > REVIEW_COMMENT_MAX_LENGTH) {
    throw new ReviewApiError(
      `Comment must be ${REVIEW_COMMENT_MAX_LENGTH} characters or fewer`,
      400,
    );
  }

  const response = await fetch(reviewPath(googlePlaceId, featureKey), {
    method: "PUT",
    headers: buildHeaders(options.token, true),
    body: JSON.stringify({
      sentiment: input.sentiment,
      comment: comment.length > 0 ? comment : null,
    }),
    signal: options.signal,
  });

  if (!response.ok) await readError(response);

  return (await response.json()) as AccessibilityReview;
}

/** Remove the signed-in user's review for one accessibility category. */
export async function deleteReview(
  googlePlaceId: string,
  featureKey: ReviewFeatureKey,
  options: { token: string; signal?: AbortSignal },
): Promise<void> {
  const response = await fetch(reviewPath(googlePlaceId, featureKey), {
    method: "DELETE",
    headers: buildHeaders(options.token),
    signal: options.signal,
  });

  if (!response.ok && response.status !== 404) await readError(response);
}
