import Header from "../components/Header";
import Footer from "../components/Footer";
import React from "react";

export default function About() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow text-center px-8 bg-white dark:bg-gray-700">
        <div className="mt-10">
          <h2 className="text-4xl font-extrabold dark:text-gray-200">About</h2>
          <p className="mb-4 text-lg font-normal text-gray-500 dark:text-gray-400">
            Web application for getting all accessiblity information on a
            desired venue through google maps.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
