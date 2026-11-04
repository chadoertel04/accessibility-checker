import { describe, expect, test } from "vitest";
import type { FeedRecord, ReviewRecord } from "./repository.js";
import { summarizeReviews } from "./service.js";
import { parseCursor } from "./validation.js";

const record = (overrides: Partial<ReviewRecord>): ReviewRecord => ({
  id: "00000000-0000-4000-8000-000000000001",
  googlePlaceId: "place",
  featureKey: "hearingLoop",
  userId: "alice",
  authorName: null,
  sentiment: "like",
  comment: null,
  createdAt: new Date(0),
  updatedAt: new Date(0),
  hiddenAt: null,
  hiddenBy: null,
  ...overrides,
});

const feed = (n: number): FeedRecord[] =>
  Array.from({ length: n }, (_, i) => ({
    ...record({ id: `00000000-0000-4000-8000-00000000000${i}`, comment: `note ${i}` }),
    // Microsecond precision that a JS Date would lose.
    cursorTs: `2026-11-04T10:00:0${9 - i}.123456Z`,
  }));

const loop = (summary: ReturnType<typeof summarizeReviews>) =>
  summary.features.find((f) => f.featureKey === "hearingLoop")!;

describe("summarizeReviews", () => {
  test("fills every category and takes counts from the vote query", () => {
    const summary = summarizeReviews("place", {
      votes: [{ featureKey: "hearingLoop", likes: 2, dislikes: 1, commentCount: 1 }],
      firstPages: feed(1),
      viewerReviews: [],
    });

    expect(summary.features).toHaveLength(8);
    expect(summary.totalReviews).toBe(3);
    expect(loop(summary)).toMatchObject({ likes: 2, dislikes: 1, commentCount: 1, nextCursor: null });
    expect(summary.features.find((f) => f.featureKey === "tactilePaving")).toMatchObject({
      likes: 0,
      dislikes: 0,
      comments: [],
      viewerReview: null,
    });
  });

  test("returns one page and a cursor pointing at its last note when more exist", () => {
    const rows = feed(4); // page size 3 + 1 lookahead row
    const summary = summarizeReviews("place", { votes: [], firstPages: rows, viewerReviews: [] }, undefined, 3);

    expect(loop(summary).comments.map((c) => c.comment)).toEqual(["note 0", "note 1", "note 2"]);
    // The cursor keeps the full-precision Postgres timestamp of the last returned note.
    expect(parseCursor(loop(summary).nextCursor)).toEqual({ ts: rows[2].cursorTs, id: rows[2].id });
  });

  test("shows the viewer their own review even when hidden, with the hidden flag", () => {
    const own = record({ userId: "bob", sentiment: "dislike", hiddenAt: new Date(1), hiddenBy: "auto" });
    const summary = summarizeReviews(
      "place",
      { votes: [], firstPages: [], viewerReviews: [own] },
      "bob",
    );

    expect(loop(summary).viewerReview).toMatchObject({ ownedByViewer: true, hidden: true });
  });

  test("other visitors' notes are never marked as owned", () => {
    const summary = summarizeReviews("place", { votes: [], firstPages: feed(1), viewerReviews: [] }, "bob");
    expect(loop(summary).comments[0]).toMatchObject({ ownedByViewer: false, hidden: false });
  });
});
