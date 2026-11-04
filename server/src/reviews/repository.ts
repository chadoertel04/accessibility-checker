import { pool } from "../db.js";
import type {
  AccessibilityFeatureKey,
  ModerationAction,
  ReportReason,
  ReviewSentiment,
} from "./types.js";

/** Raw review row as stored in Postgres. */
export interface ReviewRecord {
  id: string;
  googlePlaceId: string;
  featureKey: AccessibilityFeatureKey;
  userId: string;
  authorName: string | null;
  sentiment: ReviewSentiment;
  comment: string | null;
  createdAt: Date;
  updatedAt: Date;
  hiddenAt: Date | null;
  hiddenBy: string | null;
}

/**
 * A review in a newest-first note feed. cursorTs is updated_at as text with
 * microseconds, which a JS Date would drop, so paging never skips or repeats.
 */
export interface FeedRecord extends ReviewRecord {
  cursorTs: string;
}

/** Keyset position: continue after the note with this timestamp and id. */
export interface FeedCursor {
  ts: string;
  id: string;
}

/** Visible vote and note counts for one category. */
export interface VoteCountRow {
  featureKey: AccessibilityFeatureKey;
  likes: number;
  dislikes: number;
  /** Notes from visitors other than the viewer. */
  commentCount: number;
}

interface ReviewRow {
  id: string;
  google_place_id: string;
  feature_key: AccessibilityFeatureKey;
  user_id: string;
  author_name: string | null;
  sentiment: ReviewSentiment;
  comment: string | null;
  created_at: Date;
  updated_at: Date;
  hidden_at: Date | null;
  hidden_by: string | null;
}

interface FeedRow extends ReviewRow {
  cursor_ts: string;
}

const SELECT_COLUMNS = `
  id,
  google_place_id,
  feature_key,
  user_id,
  author_name,
  sentiment,
  comment,
  created_at,
  updated_at,
  hidden_at,
  hidden_by
`;

/**
 * updated_at as fixed UTC ISO text with microseconds, independent of the session's
 * DateStyle/TimeZone, so a cursor always parses and casts back to the exact value.
 */
const CURSOR_TS = `to_char(updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`;

/** Notes other visitors may see: has text, not hidden, not the viewer's own ($viewer may be null). */
const VISIBLE_NOTE = (viewerParam: string) =>
  `comment IS NOT NULL AND hidden_at IS NULL AND user_id IS DISTINCT FROM ${viewerParam}`;

function toRecord(row: ReviewRow): ReviewRecord {
  return {
    id: row.id,
    googlePlaceId: row.google_place_id,
    featureKey: row.feature_key,
    userId: row.user_id,
    authorName: row.author_name,
    sentiment: row.sentiment,
    comment: row.comment,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    hiddenAt: row.hidden_at,
    hiddenBy: row.hidden_by,
  };
}

function toFeedRecord(row: FeedRow): FeedRecord {
  return { ...toRecord(row), cursorTs: row.cursor_ts };
}

/** Like/dislike/note counts per category for a place, ignoring hidden reviews. */
export async function countVotes(
  googlePlaceId: string,
  viewerId: string | null,
): Promise<VoteCountRow[]> {
  const { rows } = await pool.query<{
    feature_key: AccessibilityFeatureKey;
    likes: number;
    dislikes: number;
    comment_count: number;
  }>(
    `SELECT feature_key,
            count(*) FILTER (WHERE sentiment = 'like')::int AS likes,
            count(*) FILTER (WHERE sentiment = 'dislike')::int AS dislikes,
            count(*) FILTER (WHERE ${VISIBLE_NOTE("$2")})::int AS comment_count
       FROM accessibility_reviews
      WHERE google_place_id = $1 AND hidden_at IS NULL
      GROUP BY feature_key`,
    [googlePlaceId, viewerId],
  );

  return rows.map((row) => ({
    featureKey: row.feature_key,
    likes: row.likes,
    dislikes: row.dislikes,
    commentCount: row.comment_count,
  }));
}

/**
 * The newest `perFeature` visible notes of every category in one query.
 * Callers ask for one more than a page to learn whether another page exists.
 */
export async function findFirstCommentPages(
  googlePlaceId: string,
  viewerId: string | null,
  perFeature: number,
): Promise<FeedRecord[]> {
  const { rows } = await pool.query<FeedRow>(
    `SELECT ${SELECT_COLUMNS}, cursor_ts
       FROM (
         SELECT ${SELECT_COLUMNS},
                ${CURSOR_TS} AS cursor_ts,
                row_number() OVER (
                  PARTITION BY feature_key ORDER BY updated_at DESC, id DESC
                ) AS rn
           FROM accessibility_reviews
          WHERE google_place_id = $1 AND ${VISIBLE_NOTE("$2")}
       ) ranked
      WHERE rn <= $3
      ORDER BY feature_key, rn`,
    [googlePlaceId, viewerId, perFeature],
  );

  return rows.map(toFeedRecord);
}

/** The viewer's own reviews for a place, hidden ones included. */
export async function findViewerReviews(
  googlePlaceId: string,
  viewerId: string,
): Promise<ReviewRecord[]> {
  const { rows } = await pool.query<ReviewRow>(
    `SELECT ${SELECT_COLUMNS}
       FROM accessibility_reviews
      WHERE google_place_id = $1 AND user_id = $2`,
    [googlePlaceId, viewerId],
  );

  return rows.map(toRecord);
}

/** One page of visible notes for a category, newest first, after `cursor`. */
export async function findComments(
  googlePlaceId: string,
  featureKey: AccessibilityFeatureKey,
  viewerId: string | null,
  cursor: FeedCursor | null,
  limit: number,
): Promise<FeedRecord[]> {
  const { rows } = await pool.query<FeedRow>(
    `SELECT ${SELECT_COLUMNS}, ${CURSOR_TS} AS cursor_ts
       FROM accessibility_reviews
      WHERE google_place_id = $1
        AND feature_key = $2
        AND ${VISIBLE_NOTE("$3")}
        AND ($4::timestamptz IS NULL OR (updated_at, id) < ($4::timestamptz, $5::uuid))
      ORDER BY updated_at DESC, id DESC
      LIMIT $6`,
    [googlePlaceId, featureKey, viewerId, cursor?.ts ?? null, cursor?.id ?? null, limit],
  );

  return rows.map(toFeedRecord);
}

export interface UpsertReviewInput {
  googlePlaceId: string;
  featureKey: AccessibilityFeatureKey;
  userId: string;
  authorName: string | null;
  sentiment: ReviewSentiment;
  comment: string | null;
}

/**
 * Creates the caller's review, or replaces it if they already reviewed this category.
 * hidden_at is left alone, so editing a hidden note does not un-hide it.
 */
export async function upsertReview(input: UpsertReviewInput): Promise<ReviewRecord> {
  const { rows } = await pool.query<ReviewRow>(
    `INSERT INTO accessibility_reviews
       (google_place_id, feature_key, user_id, author_name, sentiment, comment)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT ON CONSTRAINT accessibility_reviews_one_per_user
     DO UPDATE SET
       author_name = EXCLUDED.author_name,
       sentiment = EXCLUDED.sentiment,
       comment = EXCLUDED.comment
     RETURNING ${SELECT_COLUMNS}`,
    [
      input.googlePlaceId,
      input.featureKey,
      input.userId,
      input.authorName,
      input.sentiment,
      input.comment,
    ],
  );

  return toRecord(rows[0]);
}

/** Removes the caller's own review; other users' reviews are untouched. */
export async function deleteReview(
  googlePlaceId: string,
  featureKey: AccessibilityFeatureKey,
  userId: string,
): Promise<boolean> {
  const { rowCount } = await pool.query(
    `DELETE FROM accessibility_reviews
      WHERE google_place_id = $1 AND feature_key = $2 AND user_id = $3`,
    [googlePlaceId, featureKey, userId],
  );

  return (rowCount ?? 0) > 0;
}

export interface ReportInput {
  reviewId: string;
  reporterId: string;
  reason: ReportReason;
  details: string | null;
  autoHideThreshold: number;
}

export type ReportOutcome =
  | { status: "not_found" }
  | { status: "own_review" }
  | { status: "duplicate" }
  | { status: "reported"; hidden: boolean };

/**
 * Stores a report and hides the review once it has `autoHideThreshold` open reports.
 * The review row is locked first, so concurrent reports are counted one after the
 * other and the threshold cannot be skipped.
 */
export async function reportReview(input: ReportInput): Promise<ReportOutcome> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const target = await client.query<{ user_id: string; hidden_at: Date | null }>(
      `SELECT user_id, hidden_at FROM accessibility_reviews WHERE id = $1 FOR UPDATE`,
      [input.reviewId],
    );
    if (target.rows.length === 0) {
      await client.query("ROLLBACK");
      return { status: "not_found" };
    }
    if (target.rows[0].user_id === input.reporterId) {
      await client.query("ROLLBACK");
      return { status: "own_review" };
    }

    const inserted = await client.query(
      `INSERT INTO review_reports (review_id, reporter_id, reason, details)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT ON CONSTRAINT review_reports_one_per_reporter DO NOTHING`,
      [input.reviewId, input.reporterId, input.reason, input.details],
    );
    if ((inserted.rowCount ?? 0) === 0) {
      await client.query("ROLLBACK");
      return { status: "duplicate" };
    }

    // A new statement takes a fresh snapshot, so it sees reports committed while we waited for the lock.
    const hidden = await client.query<{ hidden: boolean }>(
      `UPDATE accessibility_reviews
          SET hidden_at = now(), hidden_by = 'auto'
        WHERE id = $1
          AND hidden_at IS NULL
          AND (SELECT count(*) FROM review_reports
                WHERE review_id = $1 AND resolved_at IS NULL) >= $2
       RETURNING true AS hidden`,
      [input.reviewId, input.autoHideThreshold],
    );

    await client.query("COMMIT");
    return {
      status: "reported",
      hidden: target.rows[0].hidden_at !== null || hidden.rows.length > 0,
    };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

export interface ReportedReviewRecord extends ReviewRecord {
  openReports: number;
  reports: { reason: ReportReason; details: string | null; createdAt: string }[];
}

/** Reviews with open reports, most-reported first, then most recently reported. */
export async function findReportedReviews(limit: number): Promise<ReportedReviewRecord[]> {
  const { rows } = await pool.query<
    ReviewRow & { open_reports: number; reports: ReportedReviewRecord["reports"] }
  >(
    `SELECT r.*,
            count(*)::int AS open_reports,
            json_agg(
              json_build_object('reason', rep.reason, 'details', rep.details, 'createdAt', rep.created_at)
              ORDER BY rep.created_at DESC
            ) AS reports
       FROM accessibility_reviews r
       JOIN review_reports rep ON rep.review_id = r.id AND rep.resolved_at IS NULL
      GROUP BY r.id
      ORDER BY open_reports DESC, max(rep.created_at) DESC
      LIMIT $1`,
    [limit],
  );

  return rows.map((row) => ({
    ...toRecord(row),
    openReports: row.open_reports,
    reports: row.reports,
  }));
}

/**
 * Applies a moderator decision and closes the review's open reports.
 * Returns false when the review does not exist.
 */
export async function moderateReview(
  reviewId: string,
  action: ModerationAction,
  moderatorId: string,
): Promise<boolean> {
  const { rows } = await pool.query<{ found: boolean }>(
    `WITH target AS (
       UPDATE accessibility_reviews
          SET hidden_at = CASE $2 WHEN 'hide' THEN coalesce(hidden_at, now())
                                  WHEN 'unhide' THEN NULL
                                  ELSE hidden_at END,
              hidden_by = CASE $2 WHEN 'hide' THEN $3
                                  WHEN 'unhide' THEN NULL
                                  ELSE hidden_by END
        WHERE id = $1
       RETURNING id
     ), resolved AS (
       UPDATE review_reports SET resolved_at = now()
        WHERE review_id IN (SELECT id FROM target) AND resolved_at IS NULL
     )
     SELECT EXISTS (SELECT 1 FROM target) AS found`,
    [reviewId, action, moderatorId],
  );

  return rows[0]?.found ?? false;
}
