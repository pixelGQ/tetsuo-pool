import type { Metadata } from "next";
import "./globals.css";
import { MobileNav } from "./components/MobileNav";
import { ThemeToggle } from "./components/ThemeToggle";

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
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="min-h-screen">
        <nav className="manga-nav">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex justify-between items-center">
              <a href="/" className="flex items-center gap-2 text-xl md:text-2xl font-black tracking-tight uppercase">
                <img src="/icon.png" alt="TETSUO" className="w-8 h-8 md:w-10 md:h-10 rounded-lg" />
                TETSUO Pool
              </a>
              {/* Desktop menu */}
              <div className="hidden md:flex items-center gap-6">
                <a href="/" className="manga-nav-link">
                  Home
                </a>
                <a href="/network" className="manga-nav-link">
                  Network
                </a>
                <a href="/stats" className="manga-nav-link">
                  Stats
                </a>
                <a href="/blocks" className="manga-nav-link">
                  Blocks
                </a>
                <a href="/dashboard" className="manga-nav-link">
                  Dashboard
                </a>
                <ThemeToggle />
              </div>
              {/* Mobile menu */}
              <div className="flex md:hidden items-center gap-2">
                <ThemeToggle />
                <MobileNav />
              </div>
            </div>
          </div>
        </nav>
        <main className="max-w-7xl mx-auto px-4 py-6 md:py-8">{children}</main>
        <footer className="border-t-2 border-[--border] mt-12">
          <div className="max-w-7xl mx-auto px-4 py-6 text-center text-[--text-muted] text-sm">
            <p className="font-semibold uppercase tracking-wide">TETSUO Mining Pool</p>
            <p className="mt-1">Stratum: stratum+tcp://tetsuo.ink:3333</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
