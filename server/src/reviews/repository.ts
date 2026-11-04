import { pool } from "../db.js";
import type {
  AccessibilityFeatureKey,
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
  updated_at
`;

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
  };
}

/** All reviews left for a Google Maps place, newest first. */
export async function findReviewsByPlaceId(
  googlePlaceId: string,
): Promise<ReviewRecord[]> {
  const { rows } = await pool.query<ReviewRow>(
    `SELECT ${SELECT_COLUMNS}
       FROM accessibility_reviews
      WHERE google_place_id = $1
      ORDER BY updated_at DESC`,
    [googlePlaceId],
  );

  return rows.map(toRecord);
}

export interface UpsertReviewInput {
  googlePlaceId: string;
  featureKey: AccessibilityFeatureKey;
  userId: string;
  authorName: string | null;
  sentiment: ReviewSentiment;
  comment: string | null;
}

/** Creates the caller's review, or replaces it if they already reviewed this category. */
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
