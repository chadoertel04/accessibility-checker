import { lazy, Suspense } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import ErrorBoundary from "@/components/ErrorBoundary";

// Lazy-loaded routes produce separate chunks, so the Google Maps SDK is only
// downloaded when the user actually visits the Home page.
const Home = lazy(() => import("@/pages/Home"));
const About = lazy(() => import("@/pages/About"));

export default function App() {
  return (
    <Router>
      <ErrorBoundary>
        <Suspense
          fallback={
            <div className="flex items-center justify-center min-h-screen">
              <p className="text-gray-500 dark:text-gray-400">Loading…</p>
            </div>
          }
        >
          <Routes>
            <Route index element={<Home />} />
            <Route path="about" element={<About />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </Router>
  );
}
