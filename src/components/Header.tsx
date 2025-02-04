import React from "react";

export default function Header() {
  return (
    <header className="bg-gray-100 dark:bg-gray-800 px-8 py-4">
      <div className="flex flex-col md:flex-row items-center justify-between">
        <a href="/">
          <img
            className="logo"
            src="/images/accessibility.png"
            width={40}
            height={40}
          />
        </a>
        <nav>
          <ul className="flex space-x-4">
            <li>
              <a
                href="/"
                className="text-gray-600 dark:text-gray-400 hover:text-gray-900"
              >
                Home
              </a>
            </li>
            <li>
              <a
                href="/about"
                className="text-gray-600 dark:text-gray-400 hover:text-gray-900"
              >
                About
              </a>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
