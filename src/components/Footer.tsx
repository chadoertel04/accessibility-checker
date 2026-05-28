import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="bg-gray-100 dark:bg-gray-800 px-8 py-4">
      <div className="flex flex-col md:flex-row items-center justify-between">
        <div className="flex items-center mb-4 md:mb-0">
          <Link to="/" aria-label="Go to homepage">
            <img
              src="/images/accessibility.png"
              alt="Accessibility App logo"
              width={40}
              height={40}
            />
          </Link>
          <span className="ml-2 text-gray-600 dark:text-gray-400">
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
            <img
              width={40}
              height={40}
              src="/images/instagram.png"
              alt="Instagram"
            />
          </a>
          <a
            href="https://linkedin.com"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="LinkedIn"
          >
            <img
              width={40}
              height={40}
              src="/images/linkedin.png"
              alt="LinkedIn"
            />
          </a>
        </div>
      </div>
    </footer>
  );
}
