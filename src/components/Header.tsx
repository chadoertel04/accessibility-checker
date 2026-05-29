import { useState } from "react";
import { Link, NavLink } from "react-router-dom";

const NAV_LINKS = [
  { to: "/", label: "Home", end: true },
  { to: "/about", label: "About", end: false },
];

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

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
            </ul>
          </nav>
        </div>
      )}
    </header>
  );
}
