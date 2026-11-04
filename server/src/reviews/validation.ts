import { config } from "../config.js";
import type { FeedCursor } from "./repository.js";
import {
  ACCESSIBILITY_FEATURE_KEYS,
  MODERATION_ACTIONS,
  REPORT_REASONS,
  REVIEW_SENTIMENTS,
  type AccessibilityFeatureKey,
  type ModerationAction,
  type ReportReason,
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

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseReviewId(value: unknown): string {
  if (typeof value !== "string" || !UUID_PATTERN.test(value)) {
    throw new ValidationError("Invalid review ID");
  }
  return value.toLowerCase();
}

/** Opaque cursor for the note feed: base64url of `[updatedAtText, id]`. */
export function encodeCursor(cursor: FeedCursor): string {
  return Buffer.from(JSON.stringify([cursor.ts, cursor.id])).toString("base64url");
}

export function parseCursor(value: unknown): FeedCursor | null {
  if (value === undefined || value === "") return null;

  let decoded: unknown;
  try {
    if (typeof value !== "string" || value.length > 200) throw new Error();
    decoded = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
  } catch {
    throw new ValidationError("Invalid cursor");
  }

  if (
    !Array.isArray(decoded) ||
    decoded.length !== 2 ||
    typeof decoded[0] !== "string" ||
    Number.isNaN(Date.parse(decoded[0])) ||
    typeof decoded[1] !== "string" ||
    !UUID_PATTERN.test(decoded[1])
  ) {
    throw new ValidationError("Invalid cursor");
  }

  return { ts: decoded[0], id: decoded[1] };
}

export const COMMENTS_DEFAULT_LIMIT = 10;
export const COMMENTS_MAX_LIMIT = 50;

/** Page size from a query string; defaults when absent, rejects junk, caps large values. */
export function parseLimit(
  value: unknown,
  fallback = COMMENTS_DEFAULT_LIMIT,
  max = COMMENTS_MAX_LIMIT,
): number {
  if (value === undefined || value === "") return fallback;
  if (typeof value !== "string" || !/^\d+$/.test(value) || Number(value) < 1) {
    throw new ValidationError("Limit must be a positive whole number");
  }
  return Math.min(Number(value), max);
}

export function parseReportReason(value: unknown): ReportReason {
  if (typeof value !== "string" || !REPORT_REASONS.includes(value as ReportReason)) {
    throw new ValidationError(`Reason must be one of: ${REPORT_REASONS.join(", ")}`);
  }
  return value as ReportReason;
}

export const REPORT_DETAILS_MAX_LENGTH = 500;

export function parseReportDetails(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") throw new ValidationError("Details must be a string");

  const details = value.trim();
  if (details.length === 0) return null;
  if (details.length > REPORT_DETAILS_MAX_LENGTH) {
    throw new ValidationError(`Details must be ${REPORT_DETAILS_MAX_LENGTH} characters or fewer`);
  }
  return details;
}

export function parseModerationAction(value: unknown): ModerationAction {
  if (typeof value !== "string" || !MODERATION_ACTIONS.includes(value as ModerationAction)) {
    throw new ValidationError(`Action must be one of: ${MODERATION_ACTIONS.join(", ")}`);
  }
  return value as ModerationAction;
}
