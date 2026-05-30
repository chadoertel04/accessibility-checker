import type { AccessibilityOptions, AccessibilityFeature, AccessibilityData } from "@/types/places";
import AccessibilityFeatureCard from "@/components/AccessibilityFeatureCard";

interface AccessibilitySectionProps {
  accessibilityOptions?: AccessibilityOptions;
  accessibilityData?: AccessibilityData;
}

/** Feature definitions with labels and descriptions */
const FEATURE_DEFINITIONS: Omit<AccessibilityFeature, "status">[] = [
  {
    key: "wheelchairAccessibleEntrance",
    label: "Wheelchair Accessible Entrance",
    description: "Step-free entry available at this location",
    icon: "entrance",
  },
  {
    key: "wheelchairAccessibleParking",
    label: "Accessible Parking",
    description: "Designated accessible parking spaces available",
    icon: "parking",
  },
  {
    key: "wheelchairAccessibleRestroom",
    label: "Accessible Restroom",
    description: "Wheelchair accessible restroom facilities",
    icon: "restroom",
  },
  {
    key: "wheelchairAccessibleSeating",
    label: "Accessible Seating",
    description: "Wheelchair accessible seating areas available",
    icon: "seating",
  },
];

/** Convert accessibility options to feature objects with status */
function getFeatures(
  options?: AccessibilityOptions,
): AccessibilityFeature[] {
  return FEATURE_DEFINITIONS.map((def) => {
    const value = options?.[def.key];
    let status: AccessibilityFeature["status"];

    if (value === true) {
      status = "available";
    } else if (value === false) {
      status = "unavailable";
    } else {
      status = "unknown";
    }

    return { ...def, status };
  });
}

/** Calculate accessibility summary statistics */
function getAccessibilitySummary(features: AccessibilityFeature[]) {
  const available = features.filter((f) => f.status === "available").length;
  const unavailable = features.filter((f) => f.status === "unavailable").length;
  const unknown = features.filter((f) => f.status === "unknown").length;
  const total = features.length;

  // Score is based on available features out of known features
  const knownTotal = available + unavailable;
  const score = knownTotal > 0 ? Math.round((available / knownTotal) * 100) : null;

  return { available, unavailable, unknown, total, score };
}

/** Score ring component - visual indicator of accessibility level */
function ScoreRing({ score }: { score: number | null }) {
  // If no score (all unknown), show a neutral state
  if (score === null) {
    return (
      <div className="relative flex items-center justify-center w-20 h-20">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
          <circle
            cx="18"
            cy="18"
            r="15.5"
            fill="none"
            className="stroke-slate-200 dark:stroke-slate-700"
            strokeWidth="3"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-medium text-slate-400 dark:text-slate-500">
            N/A
          </span>
        </div>
      </div>
    );
  }

  // Determine color based on score
  let strokeColor: string;
  let textColor: string;

  if (score >= 75) {
    strokeColor = "stroke-emerald-500 dark:stroke-emerald-400";
    textColor = "text-emerald-600 dark:text-emerald-400";
  } else if (score >= 50) {
    strokeColor = "stroke-amber-500 dark:stroke-amber-400";
    textColor = "text-amber-600 dark:text-amber-400";
  } else {
    strokeColor = "stroke-rose-500 dark:stroke-rose-400";
    textColor = "text-rose-600 dark:text-rose-400";
  }

  // Calculate stroke dasharray for progress ring
  const circumference = 2 * Math.PI * 15.5;
  const strokeDasharray = `${(score / 100) * circumference} ${circumference}`;

  return (
    <div
      className="relative flex items-center justify-center w-20 h-20"
      role="img"
      aria-label={`Accessibility score: ${score}%`}
    >
      <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
        {/* Background circle */}
        <circle
          cx="18"
          cy="18"
          r="15.5"
          fill="none"
          className="stroke-slate-200 dark:stroke-slate-700"
          strokeWidth="3"
        />
        {/* Progress circle */}
        <circle
          cx="18"
          cy="18"
          r="15.5"
          fill="none"
          className={strokeColor}
          strokeWidth="3"
          strokeDasharray={strokeDasharray}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`text-lg font-bold ${textColor}`} aria-hidden="true">
          {score}%
        </span>
      </div>
    </div>
  );
}

/**
 * Section displaying all accessibility information for a venue.
 * Includes a summary score and individual feature cards.
 */
export default function AccessibilitySection({
  accessibilityOptions,
  accessibilityData,
}: AccessibilitySectionProps) {
  const features = getFeatures(accessibilityOptions);
  const summary = getAccessibilitySummary(features);

  // Check if we have any accessibility data
  const hasData = features.some((f) => f.status !== "unknown");

  return (
    <section aria-labelledby="accessibility-heading" className="space-y-4">
      {/* Header with score */}
      <div className="flex items-center gap-4 p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <ScoreRing score={summary.score} />
        <div className="flex-1">
          <h3
            id="accessibility-heading"
            className="text-lg font-semibold text-slate-900 dark:text-slate-100"
          >
            Accessibility
          </h3>
          {hasData ? (
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {summary.available} of {summary.available + summary.unavailable}{" "}
              accessibility features available
              {summary.unknown > 0 && (
                <span className="text-amber-600 dark:text-amber-400">
                  {" "}
                  · {summary.unknown} unconfirmed
                </span>
              )}
            </p>
          ) : (
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              No accessibility information available for this location
            </p>
          )}
        </div>
      </div>

      {/* Feature cards */}
      <div
        role="list"
        aria-label="Accessibility features"
        className="grid gap-3 sm:grid-cols-2"
      >
        {features.map((feature) => (
          <AccessibilityFeatureCard key={feature.key} feature={feature} />
        ))}
      </div>

      {/* Disclaimer and attribution */}
      <p className="text-xs text-slate-400 dark:text-slate-500 italic">
        {accessibilityData?.attribution ? (
          <>
            {accessibilityData.attribution}.
            {accessibilityData.description && (
              <span className="block mt-1 not-italic text-slate-500 dark:text-slate-400">
                Note: {accessibilityData.description}
              </span>
            )}
          </>
        ) : (
          "Accessibility information may not be complete or up-to-date."
        )}{" "}
        We recommend contacting the venue directly for the most accurate
        information.
      </p>
    </section>
  );
}
