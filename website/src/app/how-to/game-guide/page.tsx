"use client";

import { useEffect, useState } from "react";
import sections from "../../data/game-guide-sections.json";
import { GameGuideSection } from "./__blocks/GameGuideSection";

const defaultSectionId = sections[0].id;

function getSectionIdFromHash() {
  if (typeof window === "undefined") {
    return defaultSectionId;
  }

  const hash = window.location.hash.replace("#", "");
  return hash && sections.some((section) => section.id === hash) ? hash : defaultSectionId;
}

export default function GameGuidePage() {
  const [activeSection, setActiveSection] = useState(defaultSectionId);

  useEffect(() => {
    const syncSectionFromHash = () => {
      setActiveSection(getSectionIdFromHash());
    };

    syncSectionFromHash();
    window.addEventListener("hashchange", syncSectionFromHash);
    window.addEventListener("popstate", syncSectionFromHash);

    return () => {
      window.removeEventListener("hashchange", syncSectionFromHash);
      window.removeEventListener("popstate", syncSectionFromHash);
    };
  }, []);

  const handleSectionClick = (id: string) => {
    window.history.pushState(null, "", `#${id}`);
    window.dispatchEvent(new Event("hashchange"));
  };

  return (
    <div data-testid="game-guide-page" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 data-testid="game-guide-heading" className="text-3xl font-bold text-[--color-accent] mb-8">
        Game Guide
      </h1>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar */}
        <aside data-testid="game-guide-sidebar" className="lg:w-64 shrink-0">   
          <nav className="sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto space-y-0.5 bg-[#0a1820]/60 p-2.5 rounded-xl border border-[--color-border] shadow-sm [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#1e3a52] [&::-webkit-scrollbar-thumb]:rounded-full">
            {sections.map((section) => (
              <button
                key={section.id}
                data-testid={`guide-nav-${section.id}`}
                onClick={() => handleSectionClick(section.id)}
                className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2.5 ${
                  activeSection === section.id
                    ? "bg-[#1e3a52] text-[#f9c701]"
                    : "text-gray-400 hover:text-white hover:bg-[#1e3a52]/50"
                }`}
              >

                <span>{section.title}</span>
              </button>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <div data-testid="game-guide-content" className="flex-1 min-w-0">
          {sections.map((section) => (
            <div
              key={section.id}
              data-testid={`guide-section-${section.id}`}
              className={activeSection === section.id ? "block" : "hidden"}
            >
              <GameGuideSection sectionId={section.id} sourceFile={section.sourceFile} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
