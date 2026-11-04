// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { useAuth } from "@/auth/AuthContext";
import {
  ReviewApiError,
  fetchFeatureComments,
  fetchPlaceReviews,
  reportReview,
  submitReview,
} from "@/services/reviews";
import type { AccessibilityReview, PlaceReviewSummary } from "@/types/reviews";
import { RATE_LIMIT_MESSAGE, useAccessibilityReviews } from "./useAccessibilityReviews";

vi.mock("@/auth/AuthContext", () => ({ useAuth: vi.fn() }));
vi.mock("@/services/reviews", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/reviews")>()),
  fetchPlaceReviews: vi.fn(),
  fetchFeatureComments: vi.fn(),
  submitReview: vi.fn(),
  deleteReview: vi.fn(),
  reportReview: vi.fn(),
}));

const note = (id: string): AccessibilityReview => ({
  id,
  googlePlaceId: "place-1",
  featureKey: "hearingLoop",
  sentiment: "like",
  comment: `note ${id}`,
  authorName: "Sam",
  createdAt: "2026-11-01T00:00:00.000Z",
  updatedAt: "2026-11-01T00:00:00.000Z",
  ownedByViewer: false,
  hidden: false,
});

const summary = (): PlaceReviewSummary => ({
  googlePlaceId: "place-1",
  totalReviews: 3,
  features: [
    {
      featureKey: "hearingLoop",
      likes: 2,
      dislikes: 1,
      comments: [note("a"), note("b")],
      commentCount: 3,
      nextCursor: "cursor-1",
      viewerReview: null,
    },
  ],
});

// Stable function identities, like the real AuthProvider's useCallback values,
// so the hook's load effect does not re-run on every render.
const auth = {
  isAuthenticated: true,
  getValidToken: vi.fn(),
  login: vi.fn(),
};

function setup(isAuthenticated = true) {
  auth.isAuthenticated = isAuthenticated;
  vi.mocked(useAuth).mockReturnValue(auth as unknown as ReturnType<typeof useAuth>);
  return renderHook(() => useAccessibilityReviews("place-1"));
}

async function loaded(isAuthenticated = true) {
  const hook = setup(isAuthenticated);
  await waitFor(() => expect(hook.result.current.summaryByFeature.hearingLoop).toBeDefined());
  return hook;
}

beforeEach(() => {
  vi.clearAllMocks();
  auth.getValidToken.mockResolvedValue("token-1");
  vi.mocked(fetchPlaceReviews).mockResolvedValue(summary());
});

describe("useAccessibilityReviews", () => {
  test("loads the place summary, keyed by feature, with the viewer's token", async () => {
    const { result } = await loaded();

    expect(result.current.summaryByFeature.hearingLoop?.likes).toBe(2);
    expect(fetchPlaceReviews).toHaveBeenCalledWith("place-1", expect.objectContaining({ token: "token-1" }));
    expect(result.current.error).toBeNull();
  });

  test("a signed-out vote sends the user to sign in and saves nothing", async () => {
    const { result } = await loaded(false);

    await act(() => result.current.vote("hearingLoop", "like"));

    expect(auth.login).toHaveBeenCalled();
    expect(submitReview).not.toHaveBeenCalled();
  });

  test("a failed token refresh shows a save error instead of failing silently", async () => {
    const { result } = await loaded();
    auth.getValidToken.mockRejectedValueOnce(new Error("refresh failed"));

    await act(() => result.current.vote("hearingLoop", "like"));

    expect(result.current.error).toBe("Unable to save your review. Please try again.");
    expect(result.current.pendingFeature).toBeNull();
  });

  test("a 429 from the API shows the rate-limit message", async () => {
    const { result } = await loaded();
    vi.mocked(submitReview).mockRejectedValueOnce(new ReviewApiError("Too many requests", 429));

    await act(() => result.current.vote("hearingLoop", "dislike", "Steps at entrance"));

    expect(result.current.error).toBe(RATE_LIMIT_MESSAGE);
  });

  test("loadMoreComments appends the next page and moves the cursor", async () => {
    const { result } = await loaded();
    vi.mocked(fetchFeatureComments).mockResolvedValueOnce({
      comments: [note("b"), note("c")], // "b" overlaps: shown once
      nextCursor: null,
    });

    await act(() => result.current.loadMoreComments("hearingLoop"));

    expect(fetchFeatureComments).toHaveBeenCalledWith("place-1", "hearingLoop", {
      cursor: "cursor-1",
      token: "token-1",
    });
    const feature = result.current.summaryByFeature.hearingLoop!;
    expect(feature.comments.map((c) => c.id)).toEqual(["a", "b", "c"]);
    expect(feature.nextCursor).toBeNull();
    expect(result.current.loadingMoreFeature).toBeNull();
  });

  test("a report that hides the note removes it from the list", async () => {
    const { result } = await loaded();
    vi.mocked(reportReview).mockResolvedValueOnce({ hidden: true });

    await act(() => result.current.report("hearingLoop", "a", "offensive", "insults"));

    expect(reportReview).toHaveBeenCalledWith("a", { reason: "offensive", details: "insults" }, { token: "token-1" });
    const feature = result.current.summaryByFeature.hearingLoop!;
    expect(feature.comments.map((c) => c.id)).toEqual(["b"]);
    expect(feature.commentCount).toBe(2);
    expect(result.current.reportedReviewIds.has("a")).toBe(true);
  });

  test("reporting a note twice counts as reported, not as an error", async () => {
    const { result } = await loaded();
    vi.mocked(reportReview).mockRejectedValueOnce(new ReviewApiError("Already reported", 409));

    await act(() => result.current.report("hearingLoop", "b", "spam"));

    expect(result.current.reportedReviewIds.has("b")).toBe(true);
    expect(result.current.error).toBeNull();
    expect(result.current.summaryByFeature.hearingLoop!.comments).toHaveLength(2);
  });
});
