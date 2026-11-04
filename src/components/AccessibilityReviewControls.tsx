import { useEffect, useState } from "react";
import { REVIEW_COMMENT_MAX_LENGTH } from "@/services/reviews";
import type {
  FeatureReviewSummary,
  ReviewFeatureKey,
  ReviewSentiment,
} from "@/types/reviews";

interface AccessibilityReviewControlsProps {
  featureKey: ReviewFeatureKey;
  featureLabel: string;
  summary?: FeatureReviewSummary;
  isAuthenticated: boolean;
  isPending: boolean;
  onVote: (
    featureKey: ReviewFeatureKey,
    sentiment: ReviewSentiment,
    comment?: string | null,
  ) => void;
  onRemoveVote: (featureKey: ReviewFeatureKey) => void;
  onRequestSignIn: () => void;
}

const ThumbUpIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.8}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...props}
  >
    <path d="M7 22V11l5-9a2.5 2.5 0 0 1 2.4 3.2L13.5 9h5a2.5 2.5 0 0 1 2.4 3.1l-1.7 7A2.5 2.5 0 0 1 16.8 21H7z" />
    <path d="M7 11H4a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h3" />
  </svg>
);

const ThumbDownIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.8}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...props}
  >
    <path d="M17 2v11l-5 9a2.5 2.5 0 0 1-2.4-3.2L10.5 15h-5a2.5 2.5 0 0 1-2.4-3.1l1.7-7A2.5 2.5 0 0 1 7.2 3H17z" />
    <path d="M17 13h3a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1h-3" />
  </svg>
);

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Like / dislike controls with an optional comment for a single accessibility
 * category. Visitors who are not signed in are sent to the sign-in flow.
 */
export default function AccessibilityReviewControls({
  featureKey,
  featureLabel,
  summary,
  isAuthenticated,
  isPending,
  onVote,
  onRemoveVote,
  onRequestSignIn,
}: AccessibilityReviewControlsProps) {
  const viewerReview = summary?.viewerReview ?? null;
  const [isEditingComment, setIsEditingComment] = useState(false);
  const [draftComment, setDraftComment] = useState("");
  const [showAllComments, setShowAllComments] = useState(false);

  useEffect(() => {
    setDraftComment(viewerReview?.comment ?? "");
  }, [viewerReview?.comment, viewerReview?.id]);

  const likes = summary?.likes ?? 0;
  const dislikes = summary?.dislikes ?? 0;
  const comments = summary?.comments ?? [];
  const otherComments = comments.filter((review) => !review.ownedByViewer);
  const visibleComments = showAllComments
    ? otherComments
    : otherComments.slice(0, 2);

  const handleVote = (sentiment: ReviewSentiment) => {
    if (!isAuthenticated) {
      onRequestSignIn();
      return;
    }

    if (viewerReview?.sentiment === sentiment) {
      setIsEditingComment(false);
      onRemoveVote(featureKey);
      return;
    }

    onVote(featureKey, sentiment, viewerReview?.comment ?? null);
  };

  const handleSaveComment = () => {
    if (!viewerReview) return;
    onVote(featureKey, viewerReview.sentiment, draftComment);
    setIsEditingComment(false);
  };

  const voteButtonStyles = (isActive: boolean, tone: "like" | "dislike") => {
    if (isActive) {
      return tone === "like"
        ? "bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700"
        : "bg-rose-600 text-white border-rose-600 hover:bg-rose-700";
    }

    return "bg-white/70 dark:bg-slate-900/60 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:text-slate-900 dark:hover:text-slate-100";
  };

  return (
    <div className="mt-3 pt-3 border-t border-slate-200/80 dark:border-slate-700/80">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => handleVote("like")}
          disabled={isPending}
          aria-pressed={viewerReview?.sentiment === "like"}
          aria-label={
            isAuthenticated
              ? `Mark ${featureLabel} as accessible`
              : `Sign in to mark ${featureLabel} as accessible`
          }
          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1 dark:focus:ring-offset-slate-900 ${voteButtonStyles(viewerReview?.sentiment === "like", "like")}`}
        >
          <ThumbUpIcon className="w-4 h-4" />
          <span>Yes</span>
          <span className="tabular-nums">{likes}</span>
        </button>

        <button
          type="button"
          onClick={() => handleVote("dislike")}
          disabled={isPending}
          aria-pressed={viewerReview?.sentiment === "dislike"}
          aria-label={
            isAuthenticated
              ? `Mark ${featureLabel} as not accessible`
              : `Sign in to mark ${featureLabel} as not accessible`
          }
          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-1 dark:focus:ring-offset-slate-900 ${voteButtonStyles(viewerReview?.sentiment === "dislike", "dislike")}`}
        >
          <ThumbDownIcon className="w-4 h-4" />
          <span>No</span>
          <span className="tabular-nums">{dislikes}</span>
        </button>

        {isAuthenticated && viewerReview && !isEditingComment && (
          <button
            type="button"
            onClick={() => setIsEditingComment(true)}
            className="ml-auto text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded"
          >
            {viewerReview.comment ? "Edit note" : "Add a note"}
          </button>
        )}
      </div>

      {!isAuthenticated && (
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          <button
            type="button"
            onClick={onRequestSignIn}
            className="font-medium text-indigo-600 dark:text-indigo-400 hover:underline focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded"
          >
            Sign in
          </button>{" "}
          to share your experience of this feature.
        </p>
      )}

      {isAuthenticated && viewerReview && isEditingComment && (
        <div className="mt-2 space-y-2">
          <label
            htmlFor={`review-comment-${featureKey}`}
            className="block text-xs font-medium text-slate-600 dark:text-slate-300"
          >
            Your note about {featureLabel.toLowerCase()}
          </label>
          <textarea
            id={`review-comment-${featureKey}`}
            value={draftComment}
            onChange={(event) => setDraftComment(event.target.value)}
            maxLength={REVIEW_COMMENT_MAX_LENGTH}
            rows={3}
            placeholder="Optional: describe what you found, e.g. 'Ramp at the side entrance'."
            className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSaveComment}
              disabled={isPending}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium transition-colors disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 dark:focus:ring-offset-slate-900"
            >
              Save note
            </button>
            <button
              type="button"
              onClick={() => {
                setDraftComment(viewerReview.comment ?? "");
                setIsEditingComment(false);
              }}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400"
            >
              Cancel
            </button>
            <span className="ml-auto text-[11px] text-slate-400 dark:text-slate-500 tabular-nums">
              {draftComment.length}/{REVIEW_COMMENT_MAX_LENGTH}
            </span>
          </div>
        </div>
      )}

      {viewerReview?.comment && !isEditingComment && (
        <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
          <span className="font-medium text-slate-500 dark:text-slate-400">
            Your note:
          </span>{" "}
          {viewerReview.comment}
        </p>
      )}

      {otherComments.length > 0 && (
        <ul className="mt-2 space-y-1.5">
          {visibleComments.map((review) => (
            <li
              key={review.id}
              className="text-xs text-slate-600 dark:text-slate-300"
            >
              <span className="font-medium text-slate-700 dark:text-slate-200">
                {review.authorName ?? "Visitor"}
              </span>
              <span className="text-slate-400 dark:text-slate-500">
                {" "}
                · {review.sentiment === "like" ? "Yes" : "No"} ·{" "}
                {formatDate(review.updatedAt)}
              </span>
              <span className="block">{review.comment}</span>
            </li>
          ))}
          {otherComments.length > 2 && (
            <li>
              <button
                type="button"
                onClick={() => setShowAllComments((value) => !value)}
                className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded"
              >
                {showAllComments
                  ? "Show fewer notes"
                  : `Show ${otherComments.length - 2} more note${otherComments.length - 2 === 1 ? "" : "s"}`}
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
