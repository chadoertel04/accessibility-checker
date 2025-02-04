import GoogleMap from "../components/GoogleMap";
import Header from "../components/Header";
import Footer from "../components/Footer";
import React from "react";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow px-8 bg-white dark:bg-gray-700">
        <h1 className="text-4xl font-extrabold dark:text-gray-400 py-2">
          Accessibility App
        </h1>
        <GoogleMap />
      </main>
      <Footer />
    </div>
  );
}
