import { Link, NavLink } from "react-router-dom";

export default function Header() {
  return (
    <header className="bg-gray-100 dark:bg-gray-800 px-8 py-4">
      <div className="flex flex-col md:flex-row items-center justify-between">
        <Link to="/" aria-label="Go to homepage">
          <img
            className="logo"
            src="/images/accessibility.png"
            alt="Accessibility App logo"
            width={40}
            height={40}
          />
        </Link>
        <nav aria-label="Main navigation">
          <ul className="flex space-x-4">
            <li>
              <NavLink
                to="/"
                end
                className={({ isActive }) =>
                  isActive
                    ? "text-gray-900 dark:text-white font-semibold"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                }
              >
                Home
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/about"
                className={({ isActive }) =>
                  isActive
                    ? "text-gray-900 dark:text-white font-semibold"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                }
              >
                About
              </NavLink>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
