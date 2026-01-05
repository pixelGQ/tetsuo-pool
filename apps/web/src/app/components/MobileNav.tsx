"use client";

import { useState } from "react";

export function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-10 h-10 flex items-center justify-center border-2 border-[--border] hover:bg-[--bg-secondary] transition-colors"
        aria-label="Toggle menu"
      >
        {isOpen ? (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        )}
      </button>

      {isOpen && (
        <div className="absolute top-16 left-0 right-0 bg-[--bg-primary] border-b-3 border-[--border] z-50" style={{ borderBottomWidth: '3px' }}>
          <div className="flex flex-col">
            <a href="/" className="px-4 py-3 manga-nav-link border-b-2 border-[--border]" onClick={() => setIsOpen(false)}>
              Home
            </a>
            <a href="/network" className="px-4 py-3 manga-nav-link border-b-2 border-[--border]" onClick={() => setIsOpen(false)}>
              Network
            </a>
            <a href="/stats" className="px-4 py-3 manga-nav-link border-b-2 border-[--border]" onClick={() => setIsOpen(false)}>
              Stats
            </a>
            <a href="/blocks" className="px-4 py-3 manga-nav-link border-b-2 border-[--border]" onClick={() => setIsOpen(false)}>
              Blocks
            </a>
            <a href="/dashboard" className="px-4 py-3 manga-nav-link" onClick={() => setIsOpen(false)}>
              Dashboard
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
