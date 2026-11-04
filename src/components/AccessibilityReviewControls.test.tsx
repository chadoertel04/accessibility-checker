// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { afterEach, describe, expect, test, vi } from "vitest";
import type { AccessibilityReview, FeatureReviewSummary } from "@/types/reviews";
import AccessibilityReviewControls from "./AccessibilityReviewControls";

afterEach(cleanup);

const review = (overrides: Partial<AccessibilityReview> = {}): AccessibilityReview => ({
  id: "r1",
  googlePlaceId: "place-1",
  featureKey: "hearingLoop",
  sentiment: "like",
  comment: "Loop works at the counter",
  authorName: "Sam",
  createdAt: "2026-11-01T00:00:00.000Z",
  updatedAt: "2026-11-01T00:00:00.000Z",
  ownedByViewer: false,
  hidden: false,
  ...overrides,
});

const summary = (overrides: Partial<FeatureReviewSummary> = {}): FeatureReviewSummary => ({
  featureKey: "hearingLoop",
  likes: 4,
  dislikes: 1,
  comments: [review()],
  commentCount: 3,
  nextCursor: "cursor-1",
  viewerReview: null,
  ...overrides,
});

function setup(props: Partial<ComponentProps<typeof AccessibilityReviewControls>> = {}) {
  const handlers = {
    onVote: vi.fn(),
    onRemoveVote: vi.fn(),
    onRequestSignIn: vi.fn(),
    onLoadMore: vi.fn(),
    onReport: vi.fn(),
  };
  render(
    <AccessibilityReviewControls
      featureKey="hearingLoop"
      featureLabel="Hearing Loop"
      summary={summary()}
      isAuthenticated
      isPending={false}
      {...handlers}
      {...props}
    />,
  );
  return handlers;
}

describe("AccessibilityReviewControls", () => {
  test("shows the vote counts", () => {
    setup();
    expect(screen.getByRole("button", { name: "Mark Hearing Loop as accessible" }).textContent).toContain("4");
    expect(screen.getByRole("button", { name: "Mark Hearing Loop as not accessible" }).textContent).toContain("1");
  });

  test("clicking your current vote again removes it", () => {
    const { onRemoveVote, onVote } = setup({
      summary: summary({ viewerReview: review({ id: "own", ownedByViewer: true, comment: null }) }),
    });

    const yes = screen.getByRole("button", { name: "Mark Hearing Loop as accessible" });
    expect(yes.getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(yes);

    expect(onRemoveVote).toHaveBeenCalledWith("hearingLoop");
    expect(onVote).not.toHaveBeenCalled();
  });

  test("signed-out visitors are sent to sign in when they vote", () => {
    const { onRequestSignIn, onVote } = setup({ isAuthenticated: false });

    fireEvent.click(screen.getByRole("button", { name: "Sign in to mark Hearing Loop as accessible" }));

    expect(onRequestSignIn).toHaveBeenCalled();
    expect(onVote).not.toHaveBeenCalled();
  });

  test("saving a note keeps the current vote", () => {
    const { onVote } = setup({
      summary: summary({ viewerReview: review({ id: "own", ownedByViewer: true, sentiment: "dislike", comment: null }) }),
    });

    fireEvent.click(screen.getByRole("button", { name: "Add a note" }));
    fireEvent.change(screen.getByLabelText("Your note about hearing loop"), {
      target: { value: "Loop is switched off" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save note" }));

    expect(onVote).toHaveBeenCalledWith("hearingLoop", "dislike", "Loop is switched off");
  });

  test("'Show more notes' loads the next page and shows how many are left", () => {
    const { onLoadMore } = setup();

    fireEvent.click(screen.getByRole("button", { name: "Show more notes (2 left)" }));

    expect(onLoadMore).toHaveBeenCalledWith("hearingLoop");
  });

  test("no 'Show more notes' once every note is loaded", () => {
    setup({ summary: summary({ nextCursor: null, commentCount: 1 }) });
    expect(screen.queryByRole("button", { name: /Show more notes/ })).toBeNull();
  });

  test("reporting a note sends the chosen reason and details", () => {
    const { onReport } = setup();

    fireEvent.click(screen.getByRole("button", { name: "Report note by Sam" }));
    fireEvent.change(screen.getByLabelText("Why are you reporting this note?"), {
      target: { value: "offensive" },
    });
    fireEvent.change(screen.getByLabelText("Details (optional)"), { target: { value: "insults" } });
    fireEvent.click(screen.getByRole("button", { name: "Send report" }));

    expect(onReport).toHaveBeenCalledWith("hearingLoop", "r1", "offensive", "insults");
  });

  test("reported notes say so instead of offering Report again", () => {
    setup({ reportedReviewIds: new Set(["r1"]) });

    expect(screen.getByText("Reported, thank you")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Report note by Sam" })).toBeNull();
  });

  test("signed-out visitors are sent to sign in when they report", () => {
    const { onRequestSignIn } = setup({ isAuthenticated: false });

    fireEvent.click(screen.getByRole("button", { name: "Report note by Sam" }));

    expect(onRequestSignIn).toHaveBeenCalled();
    expect(screen.queryByLabelText("Why are you reporting this note?")).toBeNull();
  });

  test("tells authors when their review is hidden", () => {
    setup({
      summary: summary({ viewerReview: review({ id: "own", ownedByViewer: true, hidden: true }) }),
    });

    expect(screen.getByRole("status").textContent).toContain("hidden from other visitors");
  });
});
