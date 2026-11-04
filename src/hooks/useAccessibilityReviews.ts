import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/auth/AuthContext";
import {
  ReviewApiError,
  deleteReview,
  fetchFeatureComments,
  fetchPlaceReviews,
  reportReview,
  submitReview,
} from "@/services/reviews";
import type {
  FeatureReviewSummary,
  PlaceReviewSummary,
  ReportReason,
  ReviewFeatureKey,
  ReviewSentiment,
} from "@/types/reviews";

export interface AccessibilityReviewsState {
  summaryByFeature: Partial<Record<ReviewFeatureKey, FeatureReviewSummary>>;
  isLoading: boolean;
  error: string | null;
  pendingFeature: ReviewFeatureKey | null;
  /** Category whose next page of notes is loading. */
  loadingMoreFeature: ReviewFeatureKey | null;
  /** Notes the viewer reported in this session. */
  reportedReviewIds: ReadonlySet<string>;
  isAuthenticated: boolean;
  /** Sends the user to Keycloak so they can sign in and then review. */
  requestSignIn: () => void;
  vote: (
    featureKey: ReviewFeatureKey,
    sentiment: ReviewSentiment,
    comment?: string | null,
  ) => Promise<void>;
  removeVote: (featureKey: ReviewFeatureKey) => Promise<void>;
  loadMoreComments: (featureKey: ReviewFeatureKey) => Promise<void>;
  report: (
    featureKey: ReviewFeatureKey,
    reviewId: string,
    reason: ReportReason,
    details?: string | null,
  ) => Promise<void>;
}

export const RATE_LIMIT_MESSAGE = "You're doing that too often. Please wait a few minutes.";

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ReviewApiError && error.status === 429 ? RATE_LIMIT_MESSAGE : fallback;
}

/**
 * Loads and mutates the community accessibility reviews for a Google Maps place.
 * Unauthenticated users can read reviews but are sent to sign in when voting or reporting.
 */
export function useAccessibilityReviews(
  googlePlaceId?: string,
): AccessibilityReviewsState {
  const { isAuthenticated, getValidToken, login } = useAuth();
  const [summary, setSummary] = useState<PlaceReviewSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingFeature, setPendingFeature] = useState<ReviewFeatureKey | null>(null);
  const [loadingMoreFeature, setLoadingMoreFeature] = useState<ReviewFeatureKey | null>(null);
  const [reportedReviewIds, setReportedReviewIds] = useState<ReadonlySet<string>>(new Set());

  const load = useCallback(
    async (signal?: AbortSignal) => {
      if (!googlePlaceId) {
        setSummary(null);
        return;
      }

      setIsLoading(true);
      try {
        const token = isAuthenticated ? await getValidToken() : undefined;
        const result = await fetchPlaceReviews(googlePlaceId, { token, signal });
        if (signal?.aborted) return;
        setSummary(result);
        setError(null);
      } catch (err) {
        if (signal?.aborted || isAbortError(err)) return;
        setSummary(null);
        setError(errorMessage(err, "Unable to load community reviews right now."));
      } finally {
        if (!signal?.aborted) setIsLoading(false);
      }
    },
    [googlePlaceId, getValidToken, isAuthenticated],
  );

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  /** Changes one category of the loaded summary, if it still belongs to this place. */
  const updateFeature = useCallback(
    (featureKey: ReviewFeatureKey, change: (feature: FeatureReviewSummary) => FeatureReviewSummary) => {
      setSummary((prev) =>
        prev && prev.googlePlaceId === googlePlaceId
          ? {
              ...prev,
              features: prev.features.map((f) => (f.featureKey === featureKey ? change(f) : f)),
            }
          : prev,
      );
    },
    [googlePlaceId],
  );

  const requestSignIn = useCallback(() => {
    void login();
  }, [login]);

  const vote = useCallback(
    async (
      featureKey: ReviewFeatureKey,
      sentiment: ReviewSentiment,
      comment?: string | null,
    ) => {
      if (!googlePlaceId) return;

      setPendingFeature(featureKey);
      try {
        // Inside the try: a failed token refresh must surface as an error, not vanish.
        const token = isAuthenticated ? await getValidToken() : undefined;
        if (!token) {
          requestSignIn();
          return;
        }

        await submitReview(
          googlePlaceId,
          featureKey,
          { sentiment, comment },
          { token },
        );
        setError(null);
        await load();
      } catch (err) {
        setError(errorMessage(err, "Unable to save your review. Please try again."));
      } finally {
        setPendingFeature(null);
      }
    },
    [googlePlaceId, getValidToken, isAuthenticated, load, requestSignIn],
  );

  const removeVote = useCallback(
    async (featureKey: ReviewFeatureKey) => {
      if (!googlePlaceId) return;

      setPendingFeature(featureKey);
      try {
        const token = isAuthenticated ? await getValidToken() : undefined;
        if (!token) {
          requestSignIn();
          return;
        }

        await deleteReview(googlePlaceId, featureKey, { token });
        setError(null);
        await load();
      } catch (err) {
        setError(errorMessage(err, "Unable to remove your review. Please try again."));
      } finally {
        setPendingFeature(null);
      }
    },
    [googlePlaceId, getValidToken, isAuthenticated, load, requestSignIn],
  );

  const loadMoreComments = useCallback(
    async (featureKey: ReviewFeatureKey) => {
      const cursor = summary?.features.find((f) => f.featureKey === featureKey)?.nextCursor;
      if (!googlePlaceId || !cursor) return;

      setLoadingMoreFeature(featureKey);
      try {
        const token = isAuthenticated ? await getValidToken() : undefined;
        const page = await fetchFeatureComments(googlePlaceId, featureKey, { cursor, token });
        updateFeature(featureKey, (feature) => {
          const known = new Set(feature.comments.map((c) => c.id));
          return {
            ...feature,
            comments: [...feature.comments, ...page.comments.filter((c) => !known.has(c.id))],
            nextCursor: page.nextCursor,
          };
        });
        setError(null);
      } catch (err) {
        setError(errorMessage(err, "Unable to load more notes. Please try again."));
      } finally {
        setLoadingMoreFeature(null);
      }
    },
    [googlePlaceId, getValidToken, isAuthenticated, summary, updateFeature],
  );

  const report = useCallback(
    async (
      featureKey: ReviewFeatureKey,
      reviewId: string,
      reason: ReportReason,
      details?: string | null,
    ) => {
      try {
        const token = isAuthenticated ? await getValidToken() : undefined;
        if (!token) {
          requestSignIn();
          return;
        }

        let hidden = false;
        try {
          ({ hidden } = await reportReview(reviewId, { reason, details }, { token }));
        } catch (err) {
          // Already reported (e.g. from another tab): treat as done, not as a failure.
          if (!(err instanceof ReviewApiError && err.status === 409)) throw err;
        }

        setReportedReviewIds((prev) => new Set(prev).add(reviewId));
        if (hidden) {
          updateFeature(featureKey, (feature) => ({
            ...feature,
            comments: feature.comments.filter((c) => c.id !== reviewId),
            commentCount: Math.max(0, feature.commentCount - 1),
          }));
        }
        setError(null);
      } catch (err) {
        setError(errorMessage(err, "Unable to send your report. Please try again."));
      }
    },
    [getValidToken, isAuthenticated, requestSignIn, updateFeature],
  );

  const summaryByFeature = useMemo(() => {
    const byFeature: Partial<Record<ReviewFeatureKey, FeatureReviewSummary>> = {};
    for (const feature of summary?.features ?? []) {
      byFeature[feature.featureKey] = feature;
    }
    return byFeature;
  }, [summary]);

  return {
    summaryByFeature,
    isLoading,
    error,
    pendingFeature,
    loadingMoreFeature,
    reportedReviewIds,
    isAuthenticated,
    requestSignIn,
    vote,
    removeVote,
    loadMoreComments,
    report,
  };
}
