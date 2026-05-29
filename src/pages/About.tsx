import Layout from "@/components/Layout";

const FEATURES = [
  {
    title: "Search & Discover",
    description:
      "Use the interactive map to search any location and find venues with accessibility information powered by Google Maps.",
    icon: (
      <svg
        aria-hidden="true"
        className="w-5 h-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
        />
      </svg>
    ),
  },
  {
    title: "Accessibility Data",
    description:
      "Get up-to-date accessibility details for venues — including wheelchair access, parking, restrooms, and more.",
    icon: (
      <svg
        aria-hidden="true"
        className="w-5 h-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
        />
      </svg>
    ),
  },
  {
    title: "Plan with Confidence",
    description:
      "Before you visit, know exactly what to expect. Plan outings confidently with reliable, community-validated data.",
    icon: (
      <svg
        aria-hidden="true"
        className="w-5 h-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 6.75V15m6-6v8.25m.503 3.498 4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 0 0-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0Z"
        />
      </svg>
    ),
  },
];

export default function About() {
  return (
    <Layout>
      {/* Hero */}
      <section className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 sm:py-14 text-center">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50">
            About AccessMap
          </h1>
          <p className="mt-4 text-base sm:text-lg text-slate-500 dark:text-slate-400 leading-relaxed max-w-2xl mx-auto">
            A web application for getting all accessibility information on a
            desired venue through Google Maps. Built to help everyone explore
            the world with confidence.
          </p>
        </div>
      </section>

      {/* Feature cards */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {FEATURES.map(({ title, description, icon }) => (
            <div
              key={title}
              className="rounded-2xl bg-white dark:bg-slate-900 p-6 ring-1 ring-slate-200 dark:ring-slate-700 shadow-sm hover:shadow-md transition-shadow duration-200"
            >
              <div className="mb-4 inline-flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 ring-1 ring-inset ring-indigo-200 dark:ring-indigo-900">
                {icon}
              </div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50 mb-2">
                {title}
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                {description}
              </p>
            </div>
          ))}
        </div>
      </section>
    </Layout>
  );
}
