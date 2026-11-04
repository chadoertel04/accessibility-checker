import { config } from "../config.js";
import {
  ACCESSIBILITY_FEATURE_KEYS,
  REVIEW_SENTIMENTS,
  type AccessibilityFeatureKey,
  type ReviewSentiment,
} from "./types.js";

export class ValidationError extends Error {
  readonly status = 400;
}

/** Google Place IDs are URL-safe tokens; reject anything else outright. */
const PLACE_ID_PATTERN = /^[A-Za-z0-9_:-]+$/;

export function parsePlaceId(value: unknown): string {
  if (typeof value !== "string") {
    throw new ValidationError("A Google Place ID is required");
  }

  const placeId = value.trim();
  if (
    placeId.length === 0 ||
    placeId.length > config.limits.placeIdMaxLength ||
    !PLACE_ID_PATTERN.test(placeId)
  ) {
    throw new ValidationError("Invalid Google Place ID");
  }

  return placeId;
}

export function parseFeatureKey(value: unknown): AccessibilityFeatureKey {
  if (
    typeof value !== "string" ||
    !ACCESSIBILITY_FEATURE_KEYS.includes(value as AccessibilityFeatureKey)
  ) {
    throw new ValidationError(
      `Feature key must be one of: ${ACCESSIBILITY_FEATURE_KEYS.join(", ")}`,
    );
  }

  return value as AccessibilityFeatureKey;
}

export function parseSentiment(value: unknown): ReviewSentiment {
  if (
    typeof value !== "string" ||
    !REVIEW_SENTIMENTS.includes(value as ReviewSentiment)
  ) {
    throw new ValidationError(
      `Sentiment must be one of: ${REVIEW_SENTIMENTS.join(", ")}`,
    );
  }

  return value as ReviewSentiment;
}

export function parseComment(value: unknown): string | null {
  if (value === undefined || value === null) return null;

  if (typeof value !== "string") {
    throw new ValidationError("Comment must be a string");
  }

  const comment = value.trim();
  if (comment.length === 0) return null;

  if (comment.length > config.limits.commentMaxLength) {
    throw new ValidationError(
      `Comment must be ${config.limits.commentMaxLength} characters or fewer`,
    );
  }

  return comment;
}
