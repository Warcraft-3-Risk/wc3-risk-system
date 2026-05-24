"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";

interface GitHubRelease {
  id: number;
  tag_name: string;
  name: string;
  body: string;
  published_at: string;
  html_url: string;
}

export default function PatchNotesPage() {
  const [releases, setReleases] = useState<GitHubRelease[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("https://api.github.com/repos/Warcraft-3-Risk/wc3-risk-system/releases?per_page=20")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch releases");
        return res.json();
      })
      .then((data: GitHubRelease[]) => {
        setReleases(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  return (
    <div data-testid="patch-notes-page" className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 data-testid="patch-notes-heading" className="text-3xl font-bold text-[--color-accent] mb-8">
        Patch Notes
      </h1>

      {loading && (
        <div data-testid="patch-notes-loading" className="text-center py-12">
          <div className="text-[--color-text-secondary]">Loading patch notes...</div>
        </div>
      )}

      {error && (
        <div data-testid="patch-notes-error" className="text-center py-12">
          <div className="text-red-400 mb-2">Failed to load patch notes</div>
          <p className="text-sm text-[--color-text-secondary]">{error}</p>
        </div>
      )}

      {!loading && !error && (
        <div data-testid="patch-notes-list" className="space-y-8">
          {releases.length === 0 ? (
            <p data-testid="patch-notes-empty" className="text-[--color-text-secondary] text-center py-8">
              No patch notes available yet.
            </p>
          ) : (
            releases.map((release) => (
              <article
                key={release.id}
                data-testid={`patch-note-${release.tag_name}`}
                className="bg-[--color-surface] rounded-lg border border-[--color-border] p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-semibold text-[--color-text-primary]">
                      {release.name || release.tag_name}
                    </h2>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs px-2 py-1 rounded bg-[--color-primary] text-[--color-accent] font-mono">
                        {release.tag_name}
                      </span>
                      <time className="text-xs text-[--color-text-secondary]">
                        {new Date(release.published_at).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </time>
                    </div>
                  </div>
                  <a
                    href={release.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-[--color-accent] hover:underline whitespace-nowrap"
                  >
                    View on GitHub
                  </a>
                </div>
                <div className="markdown-content">
                  <ReactMarkdown>{release.body}</ReactMarkdown>
                </div>
              </article>
            ))
          )}
        </div>
      )}
    </div>
  );
}
