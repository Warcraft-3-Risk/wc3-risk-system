import articles from "../../../data/articles.json";
import { ArticleContent } from "./__blocks/ArticleContent";

interface ArticlePageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return articles.map((article) => ({
    slug: article.slug,
  }));
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params;
  const article = articles.find((a) => a.slug === slug);

  if (!article) {
    return (
      <div data-testid="article-not-found" className="max-w-3xl mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold text-[--color-text-primary]">Article not found</h1>
      </div>
    );
  }

  return <ArticleContent article={article} />;
}
