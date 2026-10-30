import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  BookOpen,
  Calendar,
  Clock,
  Layers,
  Newspaper,
  RefreshCw,
  Search,
  Sparkles,
  User,
  Wrench,
  X,
} from "lucide-react";
import { SiteFooter, SiteHeader } from "@/components/revv/chrome";
import { fetchNewsArticles, type NewsArticle } from "@/lib/api";

export const Route = createFileRoute("/news")({
  head: () => ({
    meta: [
      { title: "Motorcycle News & Tech Hub — REVV- Web" },
      {
        name: "description",
        content:
          "Official motorcycle news, maintenance checklists, safety protocols, and riding craft from the REVV Garage Desk. Powered by REVV Backend services.",
      },
      { property: "og:title", content: "Motorcycle News & Tech Hub — REVV- Web" },
      {
        property: "og:description",
        content:
          "Motorcycle maintenance checklists, group ride comms, and riding craft written for two-wheel riders.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://revv.asteralabs.digital/news" },
      { name: "twitter:card", content: "summary_large_image" },
      {
        name: "keywords",
        content:
          "motorcycle news, bike maintenance, motorcycle touring checklist, rider intercom etiquette, REVV riding companion, asteralabs digital",
      },
    ],
    links: [{ rel: "canonical", href: "https://revv.asteralabs.digital/news" }],
  }),
  component: NewsPage,
});

export function NewsPage() {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLiveBackend, setIsLiveBackend] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeArticle, setActiveArticle] = useState<NewsArticle | null>(null);

  const loadArticles = async () => {
    setLoading(true);
    try {
      const res = await fetchNewsArticles({ page: 1, limit: 30 });
      setArticles(res.articles);
      setIsLiveBackend(!res.fromFallback);
    } catch (err) {
      console.error("Error loading news articles:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadArticles();
  }, []);

  const categories = [
    "ALL",
    ...Array.from(new Set(articles.map((a) => a.category?.toUpperCase()).filter(Boolean))),
  ];

  const filteredArticles = articles.filter((art) => {
    const matchesCategory =
      selectedCategory === "ALL" || art.category?.toUpperCase() === selectedCategory;
    const matchesSearch =
      !searchQuery.trim() ||
      art.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      art.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      art.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const highlightArticle = filteredArticles.find((a) => a.is_highlight) || filteredArticles[0];
  const listArticles = highlightArticle
    ? filteredArticles.filter((a) => a.id !== highlightArticle.id)
    : filteredArticles;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />

      <main className="panel flex-1">
        <div className="mx-auto w-full max-w-6xl px-6 pb-24 pt-32">
          {/* Section Breadcrumb & Status */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="eyebrow-panel">REVV- Web / Garage Desk News</p>
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-xs font-semibold uppercase tracking-wider ${
                  isLiveBackend
                    ? "border border-success/30 bg-success/10 text-success"
                    : "border border-panel-border bg-panel-card text-panel-muted"
                }`}
              >
                <span
                  className={`size-2 rounded-full ${
                    isLiveBackend ? "bg-success animate-pulse" : "bg-panel-muted"
                  }`}
                />
                {isLiveBackend ? "Backend Connected" : "Local Sync Mode"}
              </span>
              <button
                onClick={loadArticles}
                disabled={loading}
                title="Refresh news from backend"
                className="flex size-8 items-center justify-center rounded-lg border border-panel-border bg-panel-card text-panel-muted transition-colors hover:text-panel-fg disabled:opacity-50"
              >
                <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>

          {/* Heading */}
          <div className="mt-4 flex flex-wrap items-baseline justify-between gap-4">
            <div>
              <h1 className="display-heading-panel text-[clamp(2.5rem,5vw,4rem)]">
                Motorcycle News
              </h1>
              <p className="mt-2 text-lg text-panel-muted">
                Fresh technical dispatches, maintenance guides, and riding craft from the REVV Garage Desk.
              </p>
            </div>
            <p className="font-mono text-sm uppercase tracking-[0.25em] text-panel-muted">
              {filteredArticles.length} {filteredArticles.length === 1 ? "Article" : "Articles"}
            </p>
          </div>

          {/* Search & Categories Bar */}
          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            {/* Category Chips */}
            <div className="flex flex-wrap gap-2" aria-label="Categories">
              {categories.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setSelectedCategory(category)}
                  className={
                    selectedCategory === category
                      ? "rounded-md bg-primary px-4 py-2 font-mono text-xs font-semibold uppercase tracking-[0.15em] text-primary-foreground transition-colors"
                      : "rounded-md border border-panel-border bg-panel-card px-4 py-2 font-mono text-xs uppercase tracking-[0.15em] text-panel-muted transition-colors hover:border-panel-fg hover:text-panel-fg"
                  }
                >
                  {category}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative min-w-[240px]">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-panel-muted" />
              <input
                type="text"
                placeholder="Search articles…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-panel-border bg-panel-card py-2 pl-9 pr-4 text-sm text-panel-fg outline-none transition-colors placeholder:text-panel-muted focus:border-primary"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-panel-muted hover:text-panel-fg"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>
          </div>

          {/* Loading Indicator */}
          {loading && (
            <div className="mt-16 flex items-center justify-center gap-3 py-20 text-center">
              <RefreshCw className="size-6 animate-spin text-primary" />
              <p className="font-mono text-sm uppercase tracking-widest text-panel-muted">
                Loading dispatches from REVV Backend…
              </p>
            </div>
          )}

          {/* Empty State */}
          {!loading && filteredArticles.length === 0 && (
            <div className="mt-12 flex flex-col items-center rounded-2xl border border-dashed border-panel-border bg-panel-card px-6 py-20 text-center">
              <div className="flex size-16 items-center justify-center rounded-xl bg-panel">
                <Wrench className="size-7 text-primary" strokeWidth={2} />
              </div>
              <h2 className="display-heading-panel mt-6 text-3xl">No stories found</h2>
              <p className="mt-3 max-w-lg text-lg leading-relaxed text-panel-muted">
                No articles matched your criteria. Clear your search or check back soon for new dispatches from the garage desk.
              </p>
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedCategory("ALL");
                  }}
                  className="mt-6 rounded-lg bg-primary px-5 py-2.5 font-display text-sm font-bold uppercase tracking-wide text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  Reset filters
                </button>
              )}
            </div>
          )}

          {/* Highlight Article */}
          {!loading && highlightArticle && (
            <div className="mt-12 overflow-hidden rounded-2xl border border-panel-border bg-panel-card p-6 shadow-sm transition-shadow hover:shadow-md md:p-8">
              <div className="flex flex-wrap items-center gap-3">
                <span className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 font-mono text-xs font-bold uppercase tracking-wider text-primary">
                  <Sparkles className="size-3.5" />
                  Featured Dispatch
                </span>
                <span className="font-mono text-xs uppercase tracking-wider text-panel-muted">
                  {highlightArticle.category}
                </span>
                <span className="text-panel-muted">•</span>
                <span className="flex items-center gap-1 font-mono text-xs text-panel-muted">
                  <Clock className="size-3.5" />
                  {highlightArticle.reading_time_minutes} min read
                </span>
              </div>

              <h2
                onClick={() => setActiveArticle(highlightArticle)}
                className="display-heading-panel mt-4 cursor-pointer text-2xl transition-colors hover:text-primary md:text-3xl"
              >
                {highlightArticle.title}
              </h2>
              <p className="mt-3 text-lg leading-relaxed text-panel-muted">
                {highlightArticle.summary}
              </p>

              <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-panel-border/60 pt-4">
                <div className="flex items-center gap-2">
                  <User className="size-4 text-primary" />
                  <span className="font-mono text-xs font-semibold uppercase tracking-wider text-panel-fg">
                    {highlightArticle.author_name}
                  </span>
                  <span className="text-panel-muted">/</span>
                  <span className="flex items-center gap-1 text-xs text-panel-muted">
                    <Calendar className="size-3.5" />
                    {new Date(highlightArticle.published_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveArticle(highlightArticle)}
                  className="flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wide text-primary transition-opacity hover:opacity-80"
                >
                  <BookOpen className="size-4" />
                  Read Full Article
                </button>
              </div>
            </div>
          )}

          {/* Articles Grid */}
          {!loading && listArticles.length > 0 && (
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {listArticles.map((article) => (
                <article
                  key={article.id}
                  onClick={() => setActiveArticle(article)}
                  className="group flex cursor-pointer flex-col justify-between rounded-xl border border-panel-border bg-panel-card p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="rounded bg-panel px-2.5 py-1 font-mono text-[11px] font-semibold uppercase tracking-wider text-panel-foreground">
                        {article.category}
                      </span>
                      <span className="flex items-center gap-1 font-mono text-xs text-panel-muted">
                        <Clock className="size-3" />
                        {article.reading_time_minutes}m
                      </span>
                    </div>

                    <h3 className="display-heading-panel mt-4 text-xl leading-tight transition-colors group-hover:text-primary">
                      {article.title}
                    </h3>

                    <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-panel-muted">
                      {article.summary}
                    </p>
                  </div>

                  <div className="mt-6 flex items-center justify-between border-t border-panel-border/50 pt-4 text-xs text-panel-muted">
                    <span className="font-mono uppercase tracking-wider">{article.author_name}</span>
                    <span>
                      {new Date(article.published_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Article Modal */}
      {activeArticle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
          <div className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-border bg-[#141A20] p-6 text-foreground shadow-2xl md:p-10">
            <button
              onClick={() => setActiveArticle(null)}
              className="absolute right-5 top-5 rounded-lg border border-border/80 bg-secondary/50 p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              aria-label="Close article"
            >
              <X className="size-5" />
            </button>

            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded bg-primary px-3 py-1 font-mono text-xs font-bold uppercase tracking-wider text-primary-foreground">
                {activeArticle.category}
              </span>
              <span className="flex items-center gap-1 font-mono text-xs text-muted-foreground">
                <Clock className="size-3.5" />
                {activeArticle.reading_time_minutes} min read
              </span>
            </div>

            <h2 className="display-heading mt-4 text-2xl text-foreground md:text-3xl">
              {activeArticle.title}
            </h2>

            <div className="mt-3 flex items-center gap-3 border-b border-border/60 pb-4 font-mono text-xs text-muted-foreground">
              <span>By <strong className="text-foreground">{activeArticle.author_name}</strong></span>
              <span>•</span>
              <span>
                {new Date(activeArticle.published_at).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </div>

            <div className="mt-6 space-y-4 text-base leading-relaxed text-foreground/90 whitespace-pre-line">
              {activeArticle.content}
            </div>

            <div className="mt-8 flex justify-end border-t border-border/60 pt-4">
              <button
                onClick={() => setActiveArticle(null)}
                className="btn-primary"
              >
                Close Dispatch
              </button>
            </div>
          </div>
        </div>
      )}

      <SiteFooter />
    </div>
  );
}
