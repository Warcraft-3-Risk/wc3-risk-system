"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, X } from "lucide-react";

interface NavLink {
  label: string;
  href: string;
  testId: string;
}

const navLinks: NavLink[] = [
  { label: "Home", href: "/", testId: "nav-link-home" },
  { label: "News & Events", href: "/news-and-events", testId: "nav-link-news-and-events" },
  { label: "Patch Notes", href: "/patch-notes", testId: "nav-link-patch-notes" },
  { label: "Game Guide", href: "/how-to/game-guide", testId: "nav-link-game-guide" },
  { label: "Units", href: "/how-to/units-page", testId: "nav-link-units-page" },
  { label: "Tournament", href: "/tournament", testId: "nav-link-tournament" },  
  { label: "About Us", href: "/about-us", testId: "nav-link-about-us" },        
];

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav data-testid="main-navbar" className="sticky top-0 z-50 bg-[#0d1f2d]/95 backdrop-blur border-b border-[--color-border] shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" data-testid="navbar-logo" className="text-[--color-accent] font-bold text-xl tracking-wide flex items-center gap-2 group">
            <Image 
              src="/icons/logo/risklogo-single-letter.svg" 
              alt="Logo" 
              width={32} 
              height={32} 
              className="group-hover:scale-110 transition-transform drop-shadow-[0_0_5px_rgba(249,199,1,0.5)]" 
            />
            Risk Reforged
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1" data-testid="desktop-nav">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                data-testid={link.testId}
                className="px-3 py-2 rounded-md text-sm font-medium text-[--color-text-primary] hover:text-[--color-accent] hover:bg-[--color-surface] transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Mobile burger */}
          <button
            data-testid="mobile-menu-toggle"
            className="md:hidden p-2 rounded-md text-[--color-text-secondary] hover:text-[--color-accent] hover:bg-[--color-surface] transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div data-testid="mobile-menu" className="md:hidden border-t border-[--color-border] bg-[#0d1f2d]">
          <div className="px-4 py-3 space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                data-testid={`mobile-${link.testId}`}
                className="block px-3 py-2 rounded-md text-base font-medium text-[--color-text-secondary] hover:text-[--color-accent] hover:bg-[--color-surface] transition-colors"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}
