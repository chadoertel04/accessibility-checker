import { lazy, Suspense } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import ErrorBoundary from "@/components/ErrorBoundary";
import RequireAuth from "@/components/RequireAuth";

// Lazy-loaded routes produce separate chunks, so the Google Maps SDK is only
// downloaded when the user actually visits the Home page.
const Home = lazy(() => import("@/pages/Home"));
const About = lazy(() => import("@/pages/About"));
const Account = lazy(() => import("@/pages/Account"));

export default function App() {
  return (
    <Router basename={import.meta.env.BASE_URL}>
      <ErrorBoundary>
        <Suspense
          fallback={
            <div className="flex flex-col items-center justify-center min-h-screen gap-3 bg-slate-50 dark:bg-slate-950">
              <div
                aria-hidden="true"
                className="w-8 h-8 rounded-full border-2 border-slate-200 dark:border-slate-700 border-t-indigo-600 dark:border-t-indigo-400 animate-spin"
              />
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Loading…
              </p>
            </div>
          }
        >
          <Routes>
            <Route index element={<Home />} />
            <Route path="about" element={<About />} />
            <Route
              path="account"
              element={
                <RequireAuth>
                  <Account />
                </RequireAuth>
              }
            />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </Router>
  );
}
