"use client";

import { useState } from "react";
import sections from "../../data/game-guide-sections.json";
import { GameGuideSection } from "./__blocks/GameGuideSection";

export default function GameGuidePage() {
  const [activeSection, setActiveSection] = useState(sections[0].id);

  return (
    <div data-testid="game-guide-page" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 data-testid="game-guide-heading" className="text-3xl font-bold text-[--color-accent] mb-8">
        Game Guide
      </h1>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar */}
        <aside data-testid="game-guide-sidebar" className="lg:w-64 shrink-0">
          <nav className="sticky top-20 space-y-1">
            {sections.map((section) => (
              <button
                key={section.id}
                data-testid={`guide-nav-${section.id}`}
                onClick={() => setActiveSection(section.id)}
                className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeSection === section.id
                    ? "bg-[--color-accent] text-[--color-primary]"
                    : "text-[--color-text-secondary] hover:text-[--color-accent] hover:bg-[--color-surface]"
                }`}
              >
                {section.emoji} {section.title}
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
