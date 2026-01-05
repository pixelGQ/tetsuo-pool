"use client";

import { useState } from "react";

interface AddressLinkProps {
  address: string;
  truncate?: boolean;
}

export function AddressLink({ address, truncate = false }: AddressLinkProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const displayAddress = truncate ? `${address.slice(0, 8)}...${address.slice(-6)}` : address;

  return (
    <span className="inline-flex items-center gap-1">
      <a
        href={`/dashboard?address=${address}`}
        className="font-mono text-xs hover:underline font-bold"
        title={address}
      >
        {displayAddress}
      </a>
      <button
        onClick={handleCopy}
        className={`p-1 border border-[--border] transition-all duration-200 ${
          copied
            ? "bg-[--accent] text-[--bg-primary]"
            : "bg-[--bg-primary] hover:bg-[--bg-secondary]"
        }`}
        title={copied ? "Copied!" : "Copy address"}
      >
        {copied ? (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        )}
      </button>
    </span>
  );
}
