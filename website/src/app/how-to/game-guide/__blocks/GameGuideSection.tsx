"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface GameGuideSectionProps {
  sectionId: string;
  sourceFile: string;
}

export function GameGuideSection({ sectionId, sourceFile }: GameGuideSectionProps) {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/game-guide-content/${sourceFile}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load");
        return res.text();
      })
      .then((text) => {
        // Strip out mermaid blocks completely to improve performance and approachability.
        // We will replace them with an empty string or a styled '💡 Strategy Diagram Skipped' block for now.
        const fixed = text
          .replace(/\.\.\/.\.\/assets\/icons\/small-icons\//g, "/icons/small-icons/")
          .replace(/\.\.\/.\.\/assets\/icons\/characters\//g, "/icons/characters/")
          .replace(/\.\.\/.\.\/assets\/icons\/skills\//g, "/icons/skills/")     
          .replace(/```mermaid[\s\S]*?```/g, "> 💡 *Visual diagram omitted for simplicity based on your device settings.*");

        setContent(fixed);
        setLoading(false);
      })
      .catch(() => {
        setContent("Content could not be loaded.");
        setLoading(false);
      });
  }, [sourceFile]);

  if (loading) {
    return (
      <div data-testid={`guide-loading-${sectionId}`} className="text-[--color-text-secondary] py-8 flex items-center justify-center">
        <div className="animate-pulse flex items-center gap-3">
          <div className="w-6 h-6 rounded-full bg-[--color-accent] opacity-50"></div>
          <span className="font-display tracking-widest text-[#f9c701]">LOADING TOMES...</span>
        </div>
      </div>
    );
  }

  return (
    <div data-testid={`guide-content-${sectionId}`} className="markdown-content">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          img: ({ src, alt, ...props }) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={src} alt={alt || ""} className="inline-block max-h-8 align-middle rounded shadow-sm" {...props} />
          )
        }}
      >
        {content || ""}
      </ReactMarkdown>
    </div>
  );
}
