import { Router, type NextFunction, type Request, type Response } from "express";
import { optionalAuth, requireAuth } from "../auth.js";
import { deleteReview } from "./repository.js";
import { getPlaceReviewSummary, submitReview } from "./service.js";
import {
  parseComment,
  parseFeatureKey,
  parsePlaceId,
  parseSentiment,
} from "./validation.js";

export const reviewsRouter = Router();

function asyncHandler(
  handler: (req: Request, res: Response) => Promise<void>,
): (req: Request, res: Response, next: NextFunction) => void {
  return (req, res, next) => {
    handler(req, res).catch(next);
  };
}

/** All reviews for a venue, grouped by accessibility category. */
reviewsRouter.get(
  "/places/:placeId/reviews",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const placeId = parsePlaceId(req.params.placeId);
    const summary = await getPlaceReviewSummary(placeId, req.user?.id);
    res.json(summary);
  }),
);

/** Create or replace the caller's like/dislike for one accessibility category. */
reviewsRouter.put(
  "/places/:placeId/reviews/:featureKey",
  requireAuth,
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
