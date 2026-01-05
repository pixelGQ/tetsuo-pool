"use client";

import { useState } from "react";

function CopyButton({ text }: { text: string }) {
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
      className={`p-2 border-2 border-[--border] transition-all duration-200 ${
        copied
          ? "bg-[--accent] text-[--bg-primary]"
          : "bg-[--bg-primary] hover:bg-[--bg-secondary]"
      }`}
      title={copied ? "Copied!" : "Copy"}
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

interface ConnectSectionProps {
  minPayout: number;
}

export function ConnectSection({ minPayout }: ConnectSectionProps) {
  const stratumUrl = "stratum+tcp://tetsuo.ink:3333";

  return (
    <div className="manga-card p-4 md:p-6">
      <h2 className="text-lg md:text-xl font-black uppercase tracking-wide mb-4 md:mb-6">How to Connect</h2>

      <div className="space-y-4 md:space-y-6">
        {/* Stratum URL */}
        <div>
          <h3 className="text-xs md:text-sm font-bold text-[--text-muted] mb-2 uppercase tracking-wide">
            Stratum URL
          </h3>
          <div className="flex items-center gap-2 md:gap-3 bg-[--bg-secondary] border-2 border-[--border] p-3 md:p-4">
            <code className="flex-1 font-mono text-sm md:text-lg break-all font-bold">{stratumUrl}</code>
            <CopyButton text={stratumUrl} />
          </div>
        </div>

        {/* Miner Settings */}
        <div>
          <h3 className="text-xs md:text-sm font-bold text-[--text-muted] mb-2 uppercase tracking-wide">
            Miner Settings
          </h3>
          <div className="border-2 border-[--border] divide-y-2 divide-[--border]">
            {/* Username */}
            <div className="p-3 md:p-4 bg-[--bg-secondary]">
              <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-4">
                <span className="text-[--text-muted] text-xs md:text-sm md:w-20 uppercase font-bold">Username</span>
                <code className="font-mono text-sm break-all font-bold">YOUR_TETSUO_ADDRESS</code>
              </div>
              <p className="text-[--text-muted] text-xs mt-2">
                Your wallet address where payouts will be sent
              </p>
            </div>

            {/* Password */}
            <div className="p-3 md:p-4 bg-[--bg-secondary]">
              <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-4">
                <span className="text-[--text-muted] text-xs md:text-sm md:w-20 uppercase font-bold">Password</span>
                <div className="flex items-center gap-2">
                  <code className="font-mono text-sm font-bold">x</code>
                  <span className="text-[--text-muted] text-xs">(any value)</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Example */}
        <div>
          <h3 className="text-xs md:text-sm font-bold text-[--text-muted] mb-2 md:mb-3 uppercase tracking-wide">
            Example
          </h3>
          <div className="border-2 border-[--border] p-3 md:p-4 bg-[--bg-secondary]">
            <div className="font-mono text-xs md:text-sm space-y-1">
              <div className="break-all"><span className="text-[--text-muted]">Pool URL:</span> <span className="font-bold">{stratumUrl}</span></div>
              <div><span className="text-[--text-muted]">Worker:</span> <span className="font-bold">TYourWalletAddress</span></div>
              <div><span className="text-[--text-muted]">Password:</span> <span className="font-bold">x</span></div>
            </div>
          </div>
        </div>

        {/* Worker Name Tip */}
        <div className="border-2 border-[--border] p-3 md:p-4">
          <div className="flex items-start gap-2 md:gap-3">
            <div className="text-[--text-muted] mt-0.5 shrink-0">
              <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div className="text-xs md:text-sm">
              <p className="font-bold uppercase">Tip: Multiple rigs?</p>
              <p className="text-[--text-muted] mt-1">
                Add worker name: <code className="font-bold bg-[--bg-secondary] px-1 border border-[--border] text-xs">TAddress.rig1</code>
              </p>
              <p className="text-[--text-muted] mt-1 text-xs">
                Payouts go to your address. Worker name is for tracking.
              </p>
            </div>
          </div>
        </div>

        {/* Info Banner */}
        <div className="border-2 border-[--border] bg-[--accent] text-[--bg-primary] p-3 md:p-4 flex items-start gap-2 md:gap-3">
          <div className="mt-0.5 shrink-0">
            <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="text-xs md:text-sm">
            <p className="font-black uppercase">No registration required!</p>
            <p className="mt-1 opacity-90">
              Use your wallet address as username. Auto-payout at {minPayout} TETSUO.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
