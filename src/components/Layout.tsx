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
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Skip-to-content: WCAG 2.4.1 — bypasses repetitive navigation for keyboard/AT users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-4 focus:left-4 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all"
      >
        Skip to main content
      </a>
      <Header />
      <main
        id="main-content"
        className={`flex-grow ${mainClassName}`}
      >
        {children}
      </main>
      <Footer />
    </div>
  );
}
