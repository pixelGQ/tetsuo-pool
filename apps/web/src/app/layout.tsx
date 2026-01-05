import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TETSUO Mining Pool",
  description: "Public mining pool for TETSUO cryptocurrency",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-900 text-gray-100 min-h-screen">
        <nav className="bg-gray-800 border-b border-gray-700">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex justify-between items-center">
              <a href="/" className="text-xl font-bold text-white">
                TETSUO Pool
              </a>
              <div className="flex gap-6">
                <a href="/" className="text-gray-300 hover:text-white">
                  Home
                </a>
                <a href="/network" className="text-gray-300 hover:text-white">
                  Network
                </a>
                <a href="/stats" className="text-gray-300 hover:text-white">
                  Stats
                </a>
                <a href="/blocks" className="text-gray-300 hover:text-white">
                  Blocks
                </a>
                <a href="/dashboard" className="text-gray-300 hover:text-white">
                  Dashboard
                </a>
              </div>
            </div>
          </div>
        </nav>
        <main className="max-w-7xl mx-auto px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
