"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import mermaid from "mermaid";

mermaid.initialize({
  startOnLoad: false,
  theme: "dark",
  fontFamily: "var(--font-sans)",
});

function MermaidChart({ chart }: { chart: string }) {
  const [svg, setSvg] = useState<string>("");
  const id = "mermaid-svg-" + Math.round(Math.random() * 10000000);

  useEffect(() => {
    mermaid.render(id, chart).then((v) => setSvg(v.svg)).catch((e) => console.error(e));
  }, [chart, id]);

  return <div className="mermaid-chart flex justify-center my-6" dangerouslySetInnerHTML={{ __html: svg }} />;
}

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
        const fixed = text
          .replace(/\.\.\/.\.\/assets\/icons\/small-icons\//g, "/icons/small-icons/")
          .replace(/\.\.\/.\.\/assets\/icons\/characters\//g, "/icons/characters/")
          .replace(/\.\.\/.\.\/assets\/icons\/skills\//g, "/icons/skills/");
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
        remarkPlugins={[remarkGfm]}
        components={{
          img: ({ src, alt, ...props }) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={src} alt={alt || ""} className="inline-block max-h-8 align-middle" {...props} />
          ),
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || "");
            if (match && match[1] === "mermaid") {
              return <MermaidChart chart={String(children).replace(/\n$/, "")} />;
            }
            return (
              <code className={className} {...props}>
                {children}
              </code>
            );
          },
        }}
      >
        {content || ""}
      </ReactMarkdown>
    </div>
  );
}
