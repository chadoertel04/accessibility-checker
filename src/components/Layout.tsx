import type { ReactNode } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

interface LayoutProps {
  children: ReactNode;
  /** Additional classes applied to the <main> element. */
  mainClassName?: string;
}

/**
 * Shared page shell: skip-to-content link, Header, <main>, Footer.
 * Every page should be wrapped in this component.
 */
export default function Layout({ children, mainClassName = "" }: LayoutProps) {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Skip-to-content: WCAG 2.4.1 — bypasses repetitive navigation for keyboard/AT users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-4 focus:left-4 px-4 py-2 bg-blue-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        Skip to main content
      </a>
      <Header />
      <main
        id="main-content"
        className={`flex-grow px-8 bg-white dark:bg-gray-700 ${mainClassName}`}
      >
        {children}
      </main>
      <Footer />
    </div>
  );
}
