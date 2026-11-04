import { Router } from "express";
import { optionalAuth, requireAuth } from "../auth.js";
import { asyncHandler } from "../http.js";
import { rateLimit, userOrIp } from "../rateLimit.js";
import { deleteReview } from "./repository.js";
import {
  getFeatureComments,
  getPlaceReviewSummary,
  reportReview,
  submitReview,
} from "./service.js";
import {
  parseComment,
  parseCursor,
  parseFeatureKey,
  parseLimit,
  parsePlaceId,
  parseReportDetails,
  parseReportReason,
  parseReviewId,
  parseSentiment,
} from "./validation.js";

export const reviewsRouter = Router();

const readLimit = rateLimit({ windowMs: 60_000, max: 120, key: (req) => `ip:${req.ip}` });
const writeLimit = rateLimit({ windowMs: 10 * 60_000, max: 30, key: userOrIp });
const reportLimit = rateLimit({ windowMs: 60 * 60_000, max: 10, key: userOrIp });

/** Vote counts and the first page of notes for a venue, per accessibility category. */
reviewsRouter.get(
  "/places/:placeId/reviews",
  readLimit,
  optionalAuth,
  asyncHandler(async (req, res) => {
    const placeId = parsePlaceId(req.params.placeId);
    const summary = await getPlaceReviewSummary(placeId, req.user?.id);
    res.json(summary);
  }),
);

/** Further pages of notes for one category (cursor from the previous page). */
reviewsRouter.get(
  "/places/:placeId/reviews/:featureKey/comments",
  readLimit,
  optionalAuth,
  asyncHandler(async (req, res) => {
    const page = await getFeatureComments(
      parsePlaceId(req.params.placeId),
      parseFeatureKey(req.params.featureKey),
      parseCursor(req.query.cursor),
      parseLimit(req.query.limit),
      req.user?.id,
    );
    res.json(page);
  }),
);

/** Create or replace the caller's like/dislike for one accessibility category. */
reviewsRouter.put(
  "/places/:placeId/reviews/:featureKey",
  requireAuth,
  writeLimit,
  asyncHandler(async (req, res) => {
    const placeId = parsePlaceId(req.params.placeId);
    const featureKey = parseFeatureKey(req.params.featureKey);
    const body = (req.body ?? {}) as Record<string, unknown>;

    const review = await submitReview({
      googlePlaceId: placeId,
      featureKey,
      sentiment: parseSentiment(body.sentiment),
      comment: parseComment(body.comment),
      user: req.user!,
    });

    res.status(200).json(review);
  }),
);

/** Remove the caller's own review for one accessibility category. */
reviewsRouter.delete(
  "/places/:placeId/reviews/:featureKey",
  requireAuth,
  writeLimit,
  asyncHandler(async (req, res) => {
    const placeId = parsePlaceId(req.params.placeId);
    const featureKey = parseFeatureKey(req.params.featureKey);

    const removed = await deleteReview(placeId, featureKey, req.user!.id);
    if (!removed) {
      res.status(404).json({ error: "No review to remove" });
      return;
    }

    res.status(204).send();
  }),
);

/** Report another visitor's review for moderation. */
reviewsRouter.post(
  "/reviews/:reviewId/reports",
  requireAuth,
  reportLimit,
  asyncHandler(async (req, res) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const outcome = await reportReview(
      parseReviewId(req.params.reviewId),
      req.user!.id,
      parseReportReason(body.reason),
      parseReportDetails(body.details),
    );

    switch (outcome.status) {
      case "not_found":
        res.status(404).json({ error: "Review not found" });
        return;
      case "own_review":
        res.status(400).json({ error: "You cannot report your own review" });
        return;
      case "duplicate":
        res.status(409).json({ error: "You have already reported this review" });
        return;
      case "reported":
        res.status(201).json({ hidden: outcome.hidden });
        return;
    }
  }),
);
