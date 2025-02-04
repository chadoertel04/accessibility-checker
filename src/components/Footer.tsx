import React from "react";

export default function Footer() {
  return (
    <footer className="bg-gray-100 dark:bg-gray-800 px-8 py-4">
      <div className="flex flex-col md:flex-row items-center justify-between">
        <div className="flex items-center mb-4 md:mb-0">
          <a href="/" aria-label="Home">
            <img
              src="/images/accessibility.png"
              alt="Logo"
              width={40}
              height={40}
            />
          </a>
          <span className="ml-2 text-gray-600">
            © {new Date().getFullYear()} Accessibility App. All rights
            reserved.
          </span>
        </div>
        <div className="flex space-x-4">
          <a
            href="https://instagram.com"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Instagram"
          >
            <img width={40} height={40} src="/images/instagram.png" />
          </a>
          <a
            href="https://twitter.com"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Twitter"
          >
            <img width={40} height={40} src="/images/linkedin.png" />
          </a>
        </div>
      </div>
    </footer>
  );
}
