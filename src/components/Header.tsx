import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";

const NAV_LINKS = [
  { to: "/", label: "Home", end: true },
  { to: "/about", label: "About", end: false },
];

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { isAuthenticated, username, login, logout } = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Brand */}
          <Link
            to="/"
            aria-label="Go to homepage"
            className="flex items-center gap-2.5 group"
          >
            <img
              src="/images/accessibility.png"
              alt=""
              aria-hidden="true"
              width={32}
              height={32}
              className="rounded-lg transition-transform duration-200 group-hover:scale-110"
            />
            <span className="text-base font-semibold tracking-tight text-slate-900 dark:text-slate-50">
              AccessMap
            </span>
          </Link>

          {/* Desktop nav */}
          <nav aria-label="Main navigation" className="hidden sm:flex">
            <ul className="flex items-center gap-1">
              {NAV_LINKS.map(({ to, label, end }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    end={end}
                    className={({ isActive }) =>
                      `px-3 py-1.5 text-sm font-medium rounded-lg transition-colors duration-150 ${
                        isActive
                          ? "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950"
                          : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-50 hover:bg-slate-100 dark:hover:bg-slate-800"
                      }`
                    }
                  >
                    {label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2">
              {isAuthenticated ? (
                <>
                  <Link
                    to="/account"
                    className="group inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    aria-label="Open account page"
                  >
                    <span>{username ?? "Signed in"}</span>
                    <svg
                      aria-hidden="true"
                      className="w-3.5 h-3.5 opacity-0 -translate-x-0.5 transition-all duration-150 group-hover:opacity-100 group-hover:translate-x-0 group-focus-visible:opacity-100 group-focus-visible:translate-x-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.8}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M20.25 21v-1.875a4.125 4.125 0 0 0-4.125-4.125h-8.25a4.125 4.125 0 0 0-4.125 4.125V21"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 11.25a4.125 4.125 0 1 0 0-8.25 4.125 4.125 0 0 0 0 8.25Z"
                      />
                    </svg>
                  </Link>
                  <button
                    type="button"
                    onClick={() => void logout()}
                    className="inline-flex items-center rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    Sign out
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => void login()}
                  className="inline-flex items-center rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500"
                >
                  Sign in
                </button>
              )}
            </div>

            {/* Mobile menu button */}
            <button
              type="button"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              aria-controls="mobile-nav"
              onClick={() => setMenuOpen((o) => !o)}
              className="sm:hidden flex items-center justify-center w-9 h-9 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {menuOpen ? (
                <svg
                  aria-hidden="true"
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              ) : (
                <svg
                  aria-hidden="true"
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile nav */}
      {menuOpen && (
        <div
          id="mobile-nav"
          className="sm:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 pt-2 pb-4"
        >
          <nav aria-label="Mobile navigation">
            <ul className="flex flex-col gap-1">
              {NAV_LINKS.map(({ to, label, end }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    end={end}
                    onClick={() => setMenuOpen(false)}
                    className={({ isActive }) =>
                      `block px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-150 ${
                        isActive
                          ? "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950"
                          : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-50 hover:bg-slate-100 dark:hover:bg-slate-800"
                      }`
                    }
                  >
                    {label}
                  </NavLink>
                </li>
              ))}
              <li className="pt-2 mt-2 border-t border-slate-200 dark:border-slate-800">
                {isAuthenticated ? (
                  <>
                    <Link
                      to="/account"
                      onClick={() => setMenuOpen(false)}
                      className="group w-full text-left flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                      aria-label="Open account page"
                    >
                      <span>{username ?? "My account"}</span>
                      <svg
                        aria-hidden="true"
                        className="w-4 h-4 opacity-0 translate-x-0.5 transition-all duration-150 group-hover:opacity-100 group-hover:translate-x-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={1.8}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M17.25 8.25 21 12m0 0-3.75 3.75M21 12H3"
                        />
                      </svg>
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        void logout();
                      }}
                      className="mt-1 w-full text-left block px-3 py-2 text-sm font-medium rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-50 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      Sign out
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      void login();
                    }}
                    className="w-full text-left block px-3 py-2 text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-500"
                  >
                    Sign in
                  </button>
                )}
              </li>
            </ul>
          </nav>
        </div>
      )}
    </header>
  );
}
