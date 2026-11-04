import type { AuthenticatedUser } from "../auth.js";
import {
  countVotes,
  findComments,
  findFirstCommentPages,
  findReportedReviews,
  findViewerReviews,
  moderateReview as moderateReviewRow,
  reportReview as reportReviewRow,
  upsertReview as upsertReviewRow,
  type FeedCursor,
  type FeedRecord,
  type ReportOutcome,
  type ReviewRecord,
  type VoteCountRow,
} from "./repository.js";
import {
  ACCESSIBILITY_FEATURE_KEYS,
  type AccessibilityFeatureKey,
  type AccessibilityReview,
  type CommentPage,
  type FeatureReviewSummary,
  type ModerationAction,
  type PlaceReviewSummary,
  type ReportReason,
  type ReportedReview,
  type ReviewSentiment,
} from "./types.js";
import { encodeCursor } from "./validation.js";

/** Notes in the first page of each category in the place summary. */
export const COMMENTS_PAGE_SIZE = 5;
/** Open reports that hide a review until a moderator decides. */
export const AUTO_HIDE_REPORT_THRESHOLD = 3;

function toPublicReview(
  record: ReviewRecord,
  viewerId: string | undefined,
): AccessibilityReview {
  return {
    id: record.id,
    googlePlaceId: record.googlePlaceId,
    featureKey: record.featureKey,
    sentiment: record.sentiment,
    comment: record.comment,
    authorName: record.authorName,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    ownedByViewer: viewerId !== undefined && record.userId === viewerId,
    hidden: record.hiddenAt !== null,
  };
}

/**
 * Turns `pageSize + 1` fetched notes into one page and a cursor. The extra row
 * only signals that another page exists; it is not returned.
 */
function toPage(rows: FeedRecord[], pageSize: number, viewerId?: string): CommentPage {
  const page = rows.slice(0, pageSize);
  const last = page.at(-1);
  return {
    comments: page.map((row) => toPublicReview(row, viewerId)),
    nextCursor:
      rows.length > pageSize && last ? encodeCursor({ ts: last.cursorTs, id: last.id }) : null,
  };
}

export interface PlaceReviewData {
  votes: VoteCountRow[];
  /** Up to `pageSize + 1` newest visible notes per category. */
  firstPages: FeedRecord[];
  viewerReviews: ReviewRecord[];
}

/** Pure assembly step of getPlaceReviewSummary. */
export function summarizeReviews(
  googlePlaceId: string,
  data: PlaceReviewData,
  viewerId?: string,
  pageSize = COMMENTS_PAGE_SIZE,
): PlaceReviewSummary {
  const features: FeatureReviewSummary[] = ACCESSIBILITY_FEATURE_KEYS.map((featureKey) => {
    const votes = data.votes.find((row) => row.featureKey === featureKey);
    const own = data.viewerReviews.find((row) => row.featureKey === featureKey);
    const { comments, nextCursor } = toPage(
      data.firstPages.filter((row) => row.featureKey === featureKey),
      pageSize,
      viewerId,
    );

    return {
      featureKey,
      likes: votes?.likes ?? 0,
      dislikes: votes?.dislikes ?? 0,
      comments,
      commentCount: votes?.commentCount ?? 0,
      nextCursor,
      viewerReview: own ? toPublicReview(own, viewerId) : null,
    };
  });

  return {
    googlePlaceId,
    totalReviews: features.reduce((sum, f) => sum + f.likes + f.dislikes, 0),
    features,
  };
}

/** Vote counts, the first page of notes per category, and the caller's own reviews. */
export async function getPlaceReviewSummary(
  googlePlaceId: string,
  viewerId?: string,
): Promise<PlaceReviewSummary> {
  const [votes, firstPages, viewerReviews] = await Promise.all([
    countVotes(googlePlaceId, viewerId ?? null),
    findFirstCommentPages(googlePlaceId, viewerId ?? null, COMMENTS_PAGE_SIZE + 1),
    viewerId ? findViewerReviews(googlePlaceId, viewerId) : Promise.resolve([]),
  ]);

  return summarizeReviews(googlePlaceId, { votes, firstPages, viewerReviews }, viewerId);
}

/** A further page of other visitors' notes for one category. */
export async function getFeatureComments(
  googlePlaceId: string,
  featureKey: AccessibilityFeatureKey,
  cursor: FeedCursor | null,
  limit: number,
  viewerId?: string,
): Promise<CommentPage> {
  const rows = await findComments(googlePlaceId, featureKey, viewerId ?? null, cursor, limit + 1);
  return toPage(rows, limit, viewerId);
}

export interface SubmitReviewInput {
  googlePlaceId: string;
  featureKey: AccessibilityFeatureKey;
  sentiment: ReviewSentiment;
  comment: string | null;
  user: AuthenticatedUser;
}

/** Stores (or replaces) the caller's review for one accessibility category. */
export async function submitReview(
  input: SubmitReviewInput,
): Promise<AccessibilityReview> {
  const record = await upsertReviewRow({
    googlePlaceId: input.googlePlaceId,
    featureKey: input.featureKey,
    userId: input.user.id,
    authorName: input.user.name,
    sentiment: input.sentiment,
    comment: input.comment,
  });

  return toPublicReview(record, input.user.id);
}

/** Reports another visitor's review; it is hidden once enough reports are open. */
export function reportReview(
  reviewId: string,
  reporterId: string,
  reason: ReportReason,
  details: string | null,
): Promise<ReportOutcome> {
  return reportReviewRow({
    reviewId,
    reporterId,
    reason,
    details,
    autoHideThreshold: AUTO_HIDE_REPORT_THRESHOLD,
  });
}

export async function listReportedReviews(limit: number): Promise<ReportedReview[]> {
  const records = await findReportedReviews(limit);
  return records.map((record) => ({
    review: { ...toPublicReview(record, undefined), userId: record.userId, hiddenBy: record.hiddenBy },
    openReports: record.openReports,
    reports: record.reports,
  }));
}

export function moderateReview(
  reviewId: string,
  action: ModerationAction,
  moderator: AuthenticatedUser,
): Promise<boolean> {
  return moderateReviewRow(reviewId, action, moderator.id);
}
