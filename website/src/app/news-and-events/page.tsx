import Link from "next/link";
import articles from "../data/articles.json";

export default function NewsAndEventsPage() {
  return (
    <div data-testid="news-and-events-page" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 data-testid="news-heading" className="text-3xl font-bold text-[--color-accent] mb-8">
        News & Events
      </h1>

      <div data-testid="article-list" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {articles.map((article) => (
          <Link
            key={article.slug}
            href={`/news-and-events/articles/${article.slug}`}
            data-testid={`article-card-${article.slug}`}
            className="block bg-[--color-surface] rounded-lg border border-[--color-border] hover:border-[--color-accent] transition-all overflow-hidden group"
          >
            <div className="p-6">
              <div className="flex items-center gap-2 mb-3">
                {article.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs px-2 py-1 rounded bg-[--color-primary] text-[--color-accent] font-medium"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <h2 className="text-lg font-semibold text-[--color-text-primary] group-hover:text-[--color-accent] transition-colors mb-2">
                {article.title}
              </h2>
              <p className="text-sm text-[--color-text-secondary] mb-3">{article.summary}</p>
              <time className="text-xs text-[--color-text-secondary]">{article.date}</time>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
