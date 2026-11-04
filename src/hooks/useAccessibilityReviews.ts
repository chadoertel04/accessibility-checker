import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/auth/AuthContext";
import {
  deleteReview,
  fetchPlaceReviews,
  submitReview,
} from "@/services/reviews";
import type {
  FeatureReviewSummary,
  PlaceReviewSummary,
  ReviewFeatureKey,
  ReviewSentiment,
} from "@/types/reviews";

export interface AccessibilityReviewsState {
  summaryByFeature: Partial<Record<ReviewFeatureKey, FeatureReviewSummary>>;
  isLoading: boolean;
  error: string | null;
  pendingFeature: ReviewFeatureKey | null;
  isAuthenticated: boolean;
  /** Sends the user to Keycloak so they can sign in and then review. */
  requestSignIn: () => void;
  vote: (
    featureKey: ReviewFeatureKey,
    sentiment: ReviewSentiment,
    comment?: string | null,
  ) => Promise<void>;
  removeVote: (featureKey: ReviewFeatureKey) => Promise<void>;
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

/**
 * Loads and mutates the community accessibility reviews for a Google Maps place.
 * Unauthenticated users can read reviews but are sent to sign in when voting.
 */
export function useAccessibilityReviews(
  googlePlaceId?: string,
): AccessibilityReviewsState {
  const { isAuthenticated, getValidToken, login } = useAuth();
  const [summary, setSummary] = useState<PlaceReviewSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingFeature, setPendingFeature] = useState<ReviewFeatureKey | null>(
    null,
  );

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
        setError("Unable to load community reviews right now.");
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
      } catch {
        setError("Unable to save your review. Please try again.");
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
      } catch {
        setError("Unable to remove your review. Please try again.");
      } finally {
        setPendingFeature(null);
      }
    },
    [googlePlaceId, getValidToken, isAuthenticated, load, requestSignIn],
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
    isAuthenticated,
    requestSignIn,
    vote,
    removeVote,
  };
}
