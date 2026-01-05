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
      className={`p-2 rounded-lg transition-all duration-200 ${
        copied
          ? "bg-green-600 text-white scale-95"
          : "bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white"
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
    <div className="bg-gray-800 rounded-lg p-4 md:p-6">
      <h2 className="text-lg md:text-xl font-bold mb-4 md:mb-6">How to Connect</h2>

      <div className="space-y-4 md:space-y-6">
        {/* Stratum URL */}
        <div>
          <h3 className="text-xs md:text-sm font-medium text-gray-400 mb-2 uppercase tracking-wide">
            Stratum URL
          </h3>
          <div className="flex items-center gap-2 md:gap-3 bg-gray-900 rounded-lg p-3 md:p-4">
            <code className="flex-1 text-green-400 font-mono text-sm md:text-lg break-all">{stratumUrl}</code>
            <CopyButton text={stratumUrl} />
          </div>
        </div>

        {/* Miner Settings */}
        <div>
          <h3 className="text-xs md:text-sm font-medium text-gray-400 mb-2 uppercase tracking-wide">
            Miner Settings
          </h3>
          <div className="bg-gray-900 rounded-lg divide-y divide-gray-800">
            {/* Username */}
            <div className="p-3 md:p-4">
              <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-4">
                <span className="text-gray-500 text-xs md:text-sm md:w-20">Username</span>
                <code className="text-yellow-400 font-mono text-sm break-all">YOUR_TETSUO_ADDRESS</code>
              </div>
              <p className="text-gray-500 text-xs mt-2">
                Your wallet address where payouts will be sent
              </p>
            </div>

            {/* Password */}
            <div className="p-3 md:p-4">
              <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-4">
                <span className="text-gray-500 text-xs md:text-sm md:w-20">Password</span>
                <div className="flex items-center gap-2">
                  <code className="text-yellow-400 font-mono text-sm">x</code>
                  <span className="text-gray-500 text-xs">(any value)</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Example */}
        <div>
          <h3 className="text-xs md:text-sm font-medium text-gray-400 mb-2 md:mb-3 uppercase tracking-wide">
            Example
          </h3>
          <div className="bg-gray-900 rounded-lg p-3 md:p-4">
            <div className="bg-gray-950 rounded p-2 md:p-3 font-mono text-xs md:text-sm space-y-1">
              <div className="break-all"><span className="text-gray-500">Pool URL:</span> <span className="text-green-400">{stratumUrl}</span></div>
              <div><span className="text-gray-500">Worker:</span> <span className="text-yellow-400">TYourWalletAddress</span></div>
              <div><span className="text-gray-500">Password:</span> <span className="text-yellow-400">x</span></div>
            </div>
          </div>
        </div>

        {/* Worker Name Tip */}
        <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-3 md:p-4">
          <div className="flex items-start gap-2 md:gap-3">
            <div className="text-gray-400 mt-0.5 shrink-0">
              <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div className="text-xs md:text-sm">
              <p className="text-gray-300 font-medium">Tip: Multiple rigs?</p>
              <p className="text-gray-400 mt-1">
                Add worker name: <code className="text-yellow-400 bg-gray-800 px-1 rounded text-xs">TAddress.rig1</code>
              </p>
              <p className="text-gray-500 mt-1 text-xs">
                Payouts go to your address. Worker name is for tracking.
              </p>
            </div>
          </div>
        </div>

        {/* Info Banner */}
        <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-3 md:p-4 flex items-start gap-2 md:gap-3">
          <div className="text-blue-400 mt-0.5 shrink-0">
            <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="text-xs md:text-sm">
            <p className="text-blue-300 font-medium">No registration required!</p>
            <p className="text-blue-300/80 mt-1">
              Use your wallet address as username. Auto-payout at {minPayout} TETSUO.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
