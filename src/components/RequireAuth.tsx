import { useEffect, type ReactNode } from "react";
import { useAuth } from "@/auth/AuthContext";

export default function RequireAuth({ children }: { children: ReactNode }) {
  const { initialized, isAuthenticated, login, error } = useAuth();

  useEffect(() => {
    if (initialized && !isAuthenticated && !error) {
      void login();
    }
  }, [initialized, isAuthenticated, login, error]);

  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <p className="text-sm text-slate-500 dark:text-slate-400">Initializing authentication...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-slate-50 dark:bg-slate-950">
        <div className="max-w-md rounded-xl bg-white dark:bg-slate-900 border border-red-200 dark:border-red-900 p-5">
          <h2 className="text-base font-semibold text-red-700 dark:text-red-400">Authentication error</h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{error}</p>
          <button
            type="button"
            className="mt-4 inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
            onClick={() => void login()}
          >
            Sign in
          </button>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <p className="text-sm text-slate-500 dark:text-slate-400">Redirecting to sign in...</p>
      </div>
    );
  }

  return <>{children}</>;
}
