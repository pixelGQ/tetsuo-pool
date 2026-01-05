"use client";

import { useState } from "react";

interface CopyButtonProps {
  text: string;
  className?: string;
}

export function CopyButton({ text, className = "" }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={`p-2 rounded transition-colors ${
        copied
          ? "bg-green-600 text-white"
          : "bg-gray-700 hover:bg-gray-600 text-gray-300"
      } ${className}`}
      title={copied ? "Copied!" : "Copy to clipboard"}
    >
      {copied ? (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      )}
    </button>
  );
}

interface CopyFieldProps {
  label: string;
  value: string;
  hint?: string;
  valueColor?: string;
}

export function CopyField({ label, value, hint, valueColor = "text-green-400" }: CopyFieldProps) {
  return (
    <div className="flex items-center justify-between bg-gray-900 rounded-lg p-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3">
          <span className="text-gray-400 text-sm w-20 shrink-0">{label}</span>
          <code className={`${valueColor} font-mono text-sm truncate`}>{value}</code>
        </div>
        {hint && <p className="text-gray-500 text-xs mt-1 ml-[92px]">{hint}</p>}
      </div>
      <CopyButton text={value} />
    </div>
  );
}
