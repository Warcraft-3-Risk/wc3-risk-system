import Link from "next/link";
import ReactMarkdown from "react-markdown";

interface ArticleData {
  slug: string;
  title: string;
  date: string;
  summary: string;
  content: string;
  tags: string[];
}

interface ArticleContentProps {
  article: ArticleData;
}

export function ArticleContent({ article }: ArticleContentProps) {
  return (
    <div data-testid="article-page" className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Link
        href="/news-and-events"
        data-testid="article-back-link"
        className="text-sm text-[--color-accent] hover:underline mb-6 inline-block"
      >
        ← Back to News & Events
      </Link>

      <article>
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            {article.tags.map((tag) => (
              <span
                key={tag}
                className="text-xs px-2 py-1 rounded bg-[--color-surface] text-[--color-accent] font-medium"
              >
                {tag}
              </span>
            ))}
          </div>
          <h1 data-testid="article-title" className="text-3xl font-bold text-[--color-text-primary] mb-2">
            {article.title}
          </h1>
          <time data-testid="article-date" className="text-sm text-[--color-text-secondary]">
            {article.date}
          </time>
        </div>

        <div data-testid="article-body" className="markdown-content">
          <ReactMarkdown>{article.content}</ReactMarkdown>
        </div>
      </article>
    </div>
  );
}
