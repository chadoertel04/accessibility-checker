-- ============================================================================
-- Accessibility review storage
--
-- Reviews are keyed by the Google Maps Place ID so that a review left for a
-- venue can be retrieved again the next time that venue is looked up through
-- Google Maps. Each review targets one accessibility category (the categories
-- derived from the OpenStreetMap/Wheelmap Overpass data) and is a like or a
-- dislike with an optional free-text comment.
--
-- This file is idempotent: it runs on first container start via
-- docker-entrypoint-initdb.d and is re-applied by the API service on boot so
-- existing database volumes pick up the schema too.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
    CREATE TYPE accessibility_feature_key AS ENUM (
        'wheelchairAccessibleEntrance',
        'wheelchairAccessibleParking',
        'wheelchairAccessibleRestroom',
        'wheelchairAccessibleSeating',
        'hearingLoop',
        'tactilePaving',
        'blindAccessible',
        'deafAccessible'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
    CREATE TYPE review_sentiment AS ENUM ('like', 'dislike');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END
$$;

CREATE TABLE IF NOT EXISTS accessibility_reviews (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Google Maps Place ID: the stable identifier used to look the venue up again.
    google_place_id text NOT NULL
        CHECK (char_length(google_place_id) BETWEEN 1 AND 512),
    feature_key accessibility_feature_key NOT NULL,
    -- Keycloak subject claim of the reviewer.
    user_id text NOT NULL CHECK (char_length(user_id) BETWEEN 1 AND 255),
    author_name text CHECK (author_name IS NULL OR char_length(author_name) <= 255),
    sentiment review_sentiment NOT NULL,
    comment text CHECK (comment IS NULL OR char_length(comment) <= 1000),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    -- One review per user, per venue, per accessibility category.
    CONSTRAINT accessibility_reviews_one_per_user
        UNIQUE (google_place_id, feature_key, user_id)
);

-- Moderation: hidden reviews are left out of public counts and notes.
-- hidden_by is a moderator's Keycloak subject, or 'auto' after too many reports.
ALTER TABLE accessibility_reviews
    ADD COLUMN IF NOT EXISTS hidden_at timestamptz,
    ADD COLUMN IF NOT EXISTS hidden_by text;

-- The unique constraint's index (google_place_id, feature_key, user_id) serves
-- lookups by place and by place + feature. This one serves the newest-first
-- note feed, which pages on (updated_at, id).
CREATE INDEX IF NOT EXISTS accessibility_reviews_feed_idx
    ON accessibility_reviews (google_place_id, feature_key, updated_at DESC, id DESC)
    WHERE comment IS NOT NULL AND hidden_at IS NULL;

DO $$
BEGIN
    CREATE TYPE review_report_reason AS ENUM ('spam', 'offensive', 'inaccurate', 'other');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END
$$;

-- Visitor reports against a review. Open reports have resolved_at IS NULL.
CREATE TABLE IF NOT EXISTS review_reports (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    review_id uuid NOT NULL REFERENCES accessibility_reviews (id) ON DELETE CASCADE,
    reporter_id text NOT NULL CHECK (char_length(reporter_id) BETWEEN 1 AND 255),
    reason review_report_reason NOT NULL,
    details text CHECK (details IS NULL OR char_length(details) <= 500),
    created_at timestamptz NOT NULL DEFAULT now(),
    resolved_at timestamptz,
    -- One report per visitor per review.
    CONSTRAINT review_reports_one_per_reporter UNIQUE (review_id, reporter_id)
);

CREATE INDEX IF NOT EXISTS review_reports_open_idx
    ON review_reports (review_id) WHERE resolved_at IS NULL;

-- Only content changes count as an update: hiding or unhiding a review must not
-- move it to the top of the newest-first feed or change its shown date.
CREATE OR REPLACE FUNCTION accessibility_reviews_set_updated_at()
RETURNS trigger AS $$
BEGIN
    IF (NEW.sentiment, NEW.comment, NEW.author_name)
        IS DISTINCT FROM (OLD.sentiment, OLD.comment, OLD.author_name) THEN
        NEW.updated_at := now();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS accessibility_reviews_updated_at ON accessibility_reviews;

CREATE TRIGGER accessibility_reviews_updated_at
    BEFORE UPDATE ON accessibility_reviews
    FOR EACH ROW
    EXECUTE FUNCTION accessibility_reviews_set_updated_at();
