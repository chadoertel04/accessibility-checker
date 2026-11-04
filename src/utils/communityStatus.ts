import type { AccessibilityFeature } from "@/types/places";
import type { FeatureReviewSummary } from "@/types/reviews";

type FeatureStatus = AccessibilityFeature["status"];
type VoteCounts = Pick<FeatureReviewSummary, "likes" | "dislikes">;

/** Votes needed before visitor reports may decide a category. */
export const MIN_COMMUNITY_VOTES = 3;
/** Share of votes one side needs: a clear majority, not just a plurality (5-3 stays unconfirmed). */
export const MIN_AGREEMENT = 2 / 3;

/** What visitors agree on, or null while there are too few or too split votes. */
export function getCommunityVerdict(
  summary?: VoteCounts,
): "available" | "unavailable" | null {
  if (!summary) return null;
  const { likes, dislikes } = summary;
  const total = likes + dislikes;
  if (total < MIN_COMMUNITY_VOTES) return null;
  if (likes / total >= MIN_AGREEMENT) return "available";
  if (dislikes / total >= MIN_AGREEMENT) return "unavailable";
  return null;
}

/**
 * Visitor reviews resolve categories that the map data leaves unknown, once
 * enough visitors agree. Map data that says Yes or No is never overridden.
 */
export function applyCommunityStatus<T extends { status: FeatureStatus }>(
  feature: T,
  summary?: VoteCounts,
): T {
  if (feature.status !== "unknown") return feature;
  const verdict = getCommunityVerdict(summary);
  return verdict ? { ...feature, status: verdict } : feature;
}

const visitors = (n: number) => `${n} visitor${n === 1 ? "" : "s"}`;

/** Explains the visitor reports behind a category the map data leaves unknown. */
export function getCommunityNote(
  originalStatus: FeatureStatus,
  summary?: VoteCounts,
): string | undefined {
  if (originalStatus !== "unknown" || !summary) return undefined;

  const { likes, dislikes } = summary;
  const total = likes + dislikes;
  if (total === 0) return undefined;

  const verdict = getCommunityVerdict(summary);
  if (verdict === "available") return `Reported as accessible by ${likes} of ${visitors(total)}`;
  if (verdict === "unavailable") {
    return `Reported as not accessible by ${dislikes} of ${visitors(total)}`;
  }
  if (total < MIN_COMMUNITY_VOTES) {
    return `${total} visitor report${total === 1 ? "" : "s"} so far, ${MIN_COMMUNITY_VOTES} needed to confirm`;
  }
  return "Visitor reports are split on this feature";
}
