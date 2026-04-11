"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";

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
        // Fix relative image paths from docs to website public paths
        const fixed = text
          .replace(/\.\.\/.\.\/assets\/icons\/small-icons\//g, "/icons/small-icons/")
          .replace(/\.\.\/.\.\/assets\/icons\/characters\//g, "/icons/characters/")
          .replace(/\.\.\/.\.\/assets\/icons\/skills\//g, "/icons/skills/")
          // Remove mermaid code blocks (render as text description instead)
          .replace(/```mermaid[\s\S]*?```/g, "*(Diagram)*");
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
      <div data-testid={`guide-loading-${sectionId}`} className="text-[--color-text-secondary] py-8">
        Loading...
      </div>
    );
  }

  return (
    <div data-testid={`guide-content-${sectionId}`} className="markdown-content">
      <ReactMarkdown
        components={{
          img: ({ src, alt, ...props }) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={src} alt={alt || ""} className="inline-block max-h-8 align-middle" {...props} />
          ),
        }}
      >
        {content || ""}
      </ReactMarkdown>
    </div>
  );
}
