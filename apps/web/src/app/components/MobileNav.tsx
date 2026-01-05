"use client";

import { useState } from "react";

export function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-gray-300 hover:text-white"
        aria-label="Toggle menu"
      >
        {isOpen ? (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        )}
      </button>

      {isOpen && (
        <div className="absolute top-16 left-0 right-0 bg-gray-800 border-b border-gray-700 z-50">
          <div className="flex flex-col px-4 py-2">
            <a href="/" className="py-3 text-gray-300 hover:text-white border-b border-gray-700">
              Home
            </a>
            <a href="/network" className="py-3 text-gray-300 hover:text-white border-b border-gray-700">
              Network
            </a>
            <a href="/stats" className="py-3 text-gray-300 hover:text-white border-b border-gray-700">
              Stats
            </a>
            <a href="/blocks" className="py-3 text-gray-300 hover:text-white border-b border-gray-700">
              Blocks
            </a>
            <a href="/dashboard" className="py-3 text-gray-300 hover:text-white">
              Dashboard
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
