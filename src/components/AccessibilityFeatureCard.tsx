import type { AccessibilityFeature, AccessibilityIconType, AdditionalAccessibilityFeature } from "@/types/places";

interface AccessibilityFeatureCardProps {
  feature: AccessibilityFeature | AdditionalAccessibilityFeature;
}

/** Icon components for each accessibility feature type */
const FeatureIcons = {
  entrance: (props: React.SVGProps<SVGSVGElement>) => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  ),
  parking: (props: React.SVGProps<SVGSVGElement>) => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M9 17V7h4a3 3 0 0 1 0 6H9" />
    </svg>
  ),
  restroom: (props: React.SVGProps<SVGSVGElement>) => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M12 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" />
      <path d="M12 8v6" />
      <path d="M9 21v-6a3 3 0 0 1 6 0v6" />
      <path d="M7.5 13h9" />
    </svg>
  ),
  seating: (props: React.SVGProps<SVGSVGElement>) => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M5 11a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-2z" />
      <path d="M6 15v4" />
      <path d="M18 15v4" />
      <path d="M6 11V7a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v4" />
    </svg>
  ),
  hearing: (props: React.SVGProps<SVGSVGElement>) => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {/* Ear shape */}
      <path d="M6 8.5a6 6 0 0 1 12 0c0 4-3 5.5-3 8.5a3 3 0 1 1-6 0" />
      <path d="M11 12a1 1 0 1 0 2 0c0-1-1-2-1-3" />
      {/* Sound waves indicating hearing loop */}
      <path d="M20 8c1 1 1.5 2.5 1.5 4s-.5 3-1.5 4" />
      <path d="M22 6c1.5 1.5 2 3.5 2 6s-.5 4.5-2 6" />
    </svg>
  ),
  tactile: (props: React.SVGProps<SVGSVGElement>) => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {/* Tactile paving dots pattern */}
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="7.5" cy="7.5" r="1" fill="currentColor" />
      <circle cx="12" cy="7.5" r="1" fill="currentColor" />
      <circle cx="16.5" cy="7.5" r="1" fill="currentColor" />
      <circle cx="7.5" cy="12" r="1" fill="currentColor" />
      <circle cx="12" cy="12" r="1" fill="currentColor" />
      <circle cx="16.5" cy="12" r="1" fill="currentColor" />
      <circle cx="7.5" cy="16.5" r="1" fill="currentColor" />
      <circle cx="12" cy="16.5" r="1" fill="currentColor" />
      <circle cx="16.5" cy="16.5" r="1" fill="currentColor" />
    </svg>
  ),
  blind: (props: React.SVGProps<SVGSVGElement>) => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {/* Eye with strike through */}
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  ),
  deaf: (props: React.SVGProps<SVGSVGElement>) => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {/* Ear with strike */}
      <path d="M6 8.5a6 6 0 0 1 12 0c0 4-3 5.5-3 8.5a3 3 0 1 1-6 0" />
      <path d="M11 12a1 1 0 1 0 2 0c0-1-1-2-1-3" />
      <line x1="4" y1="4" x2="20" y2="20" />
    </svg>
  ),
} satisfies Record<AccessibilityIconType, React.FC<React.SVGProps<SVGSVGElement>>>;

/** Status indicator icon - checkmark for available, X for unavailable, question for unknown */
const StatusIcon = ({ status }: { status: AccessibilityFeature["status"] }) => {
  if (status === "available") {
    return (
      <svg
        className="w-4 h-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <polyline points="20 6 9 17 4 12" />
      </svg>
    );
  }

  if (status === "unavailable") {
    return (
      <svg
        className="w-4 h-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    );
  }

  // Unknown status
  return (
    <svg
      className="w-4 h-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
};

/** Status text for screen readers */
const getStatusText = (status: AccessibilityFeature["status"]): string => {
  switch (status) {
    case "available":
      return "Available";
    case "unavailable":
      return "Not available";
    default:
      return "Information not available";
  }
};

/**
 * Card component displaying a single accessibility feature with its status.
 * Uses color and icon indicators while ensuring accessibility through
 * proper ARIA labels and not relying solely on color.
 */
export default function AccessibilityFeatureCard({
  feature,
}: AccessibilityFeatureCardProps) {
  const Icon = FeatureIcons[feature.icon];

  const statusStyles = {
    available:
      "bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800",
    unavailable:
      "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700",
    unknown:
      "bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800",
  };

  const iconContainerStyles = {
    available:
      "bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-400",
    unavailable:
      "bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400",
    unknown:
      "bg-amber-100 dark:bg-amber-900 text-amber-600 dark:text-amber-400",
  };

  const statusBadgeStyles = {
    available:
      "bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300",
    unavailable:
      "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400",
    unknown:
      "bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300",
  };

  return (
    <div
      className={`relative flex items-start gap-3 p-4 rounded-xl border overflow-hidden transition-colors ${statusStyles[feature.status]}`}
      role="listitem"
    >
      {/* Feature icon */}
      <div
        className={`flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-lg ${iconContainerStyles[feature.status]}`}
      >
        <Icon className="w-5 h-5" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-start justify-between gap-x-2 gap-y-1">
          <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {feature.label}
          </h4>
          {/* Status badge */}
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${statusBadgeStyles[feature.status]}`}
          >
            <StatusIcon status={feature.status} />
            <span className="sr-only">{getStatusText(feature.status)}</span>
            <span aria-hidden="true">
              {feature.status === "available"
                ? "Yes"
                : feature.status === "unavailable"
                  ? "No"
                  : "Unknown"}
            </span>
          </span>
        </div>
        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
          {feature.description}
        </p>
      </div>
    </div>
  );
}
