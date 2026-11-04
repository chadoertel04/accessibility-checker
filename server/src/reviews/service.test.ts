import assert from "node:assert/strict";
import { test } from "node:test";
import type { ReviewRecord } from "./repository.js";
import { summarizeReviews } from "./service.js";
import { ValidationError, parsePlaceId } from "./validation.js";

const record = (overrides: Partial<ReviewRecord>): ReviewRecord => ({
  id: "r1",
  googlePlaceId: "place",
  featureKey: "hearingLoop",
  userId: "alice",
  authorName: null,
  sentiment: "like",
  comment: null,
  createdAt: new Date(0),
  updatedAt: new Date(0),
  ...overrides,
});

test("summarizeReviews counts votes, collects comments and marks the viewer's review", () => {
  const summary = summarizeReviews(
    "place",
    [
      record({ id: "a", userId: "alice", sentiment: "like", comment: "Loop works" }),
      record({ id: "b", userId: "bob", sentiment: "dislike" }),
      record({ id: "c", userId: "carol", sentiment: "like" }),
    ],
    "bob",
  );

  const loop = summary.features.find((f) => f.featureKey === "hearingLoop")!;
  assert.equal(summary.totalReviews, 3);
  assert.equal(summary.features.length, 8);
  assert.equal(loop.likes, 2);
  assert.equal(loop.dislikes, 1);
  assert.deepEqual(loop.comments.map((c) => c.id), ["a"]);
  assert.equal(loop.viewerReview?.id, "b");
  assert.equal(loop.comments[0].ownedByViewer, false);
});

test("summarizeReviews marks nothing as owned for anonymous viewers", () => {
  const summary = summarizeReviews("place", [record({ comment: "hi" })]);
  const loop = summary.features.find((f) => f.featureKey === "hearingLoop")!;
  assert.equal(loop.viewerReview, null);
  assert.equal(loop.comments[0].ownedByViewer, false);
});

test("parsePlaceId accepts Google Place IDs and rejects anything else", () => {
  assert.equal(parsePlaceId(" ChIJN1t_tDeuEmsRUsoyG83frY4 "), "ChIJN1t_tDeuEmsRUsoyG83frY4");
  for (const bad of ["", "a/b", "a b", "x".repeat(513), 42, undefined]) {
    assert.throws(() => parsePlaceId(bad), ValidationError, String(bad));
  }
});
