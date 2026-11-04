import { Router } from "express";
import { requireAuth, requireRole } from "../auth.js";
import { asyncHandler } from "../http.js";
import { listReportedReviews, moderateReview } from "../reviews/service.js";
import { parseLimit, parseModerationAction, parseReviewId } from "../reviews/validation.js";

/** Endpoints for users with the Keycloak realm role "moderator". */
export const moderationRouter = Router();

moderationRouter.use("/moderation", requireAuth, requireRole("moderator"));

/** Reviews with open reports, most-reported first. */
moderationRouter.get(
  "/moderation/reports",
  asyncHandler(async (req, res) => {
    res.json(await listReportedReviews(parseLimit(req.query.limit, 50, 100)));
  }),
);

/** Hide, unhide or dismiss: each closes the review's open reports. */
moderationRouter.post(
  "/moderation/reviews/:reviewId",
  asyncHandler(async (req, res) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const found = await moderateReview(
      parseReviewId(req.params.reviewId),
      parseModerationAction(body.action),
      req.user!,
    );

    if (!found) {
      res.status(404).json({ error: "Review not found" });
      return;
    }
    res.status(204).send();
  }),
);
