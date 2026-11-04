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

-- The unique constraint's index (google_place_id, feature_key, user_id) also
-- serves lookups by place and by place + feature, so no extra indexes.

CREATE OR REPLACE FUNCTION accessibility_reviews_set_updated_at()
RETURNS trigger AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS accessibility_reviews_updated_at ON accessibility_reviews;

CREATE TRIGGER accessibility_reviews_updated_at
    BEFORE UPDATE ON accessibility_reviews
    FOR EACH ROW
    EXECUTE FUNCTION accessibility_reviews_set_updated_at();
