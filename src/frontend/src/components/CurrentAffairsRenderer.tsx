import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Globe,
  Leaf,
  Loader2,
  Microscope,
  Newspaper,
  RefreshCw,
  Shield,
  TrendingUp,
  Trophy,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Article {
  category: string;
  headline: string;
  summary: string;
  importance: "HIGH" | "MEDIUM" | "LOW" | string;
}

interface DateSection {
  date: string;
  articles: Article[];
}

interface ParsedCurrentAffairs {
  title: string;
  sections: DateSection[];
}

// ─── Category Config ──────────────────────────────────────────────────────────

const CATEGORY_CONFIG: Record<string, { chip: string; icon: React.ReactNode }> =
  {
    Economy: {
      chip: "bg-blue-100 text-blue-700 border-blue-200",
      icon: <TrendingUp className="h-3 w-3" />,
    },
    Politics: {
      chip: "bg-red-100 text-red-700 border-red-200",
      icon: <Newspaper className="h-3 w-3" />,
    },
    Sports: {
      chip: "bg-green-100 text-green-700 border-green-200",
      icon: <Trophy className="h-3 w-3" />,
    },
    Science: {
      chip: "bg-purple-100 text-purple-700 border-purple-200",
      icon: <Microscope className="h-3 w-3" />,
    },
    International: {
      chip: "bg-orange-100 text-orange-700 border-orange-200",
      icon: <Globe className="h-3 w-3" />,
    },
    Defence: {
      chip: "bg-slate-100 text-slate-700 border-slate-200",
      icon: <Shield className="h-3 w-3" />,
    },
    Environment: {
      chip: "bg-teal-100 text-teal-700 border-teal-200",
      icon: <Leaf className="h-3 w-3" />,
    },
  };

function getCategoryStyle(cat: string) {
  return (
    CATEGORY_CONFIG[cat] ?? {
      chip: "bg-gray-100 text-gray-700 border-gray-200",
      icon: <Newspaper className="h-3 w-3" />,
    }
  );
}

const IMPORTANCE_CONFIG = {
  HIGH: { cls: "bg-red-100 text-red-700", label: "HIGH" },
  MEDIUM: { cls: "bg-amber-100 text-amber-700", label: "MED" },
  LOW: { cls: "bg-gray-100 text-gray-500", label: "LOW" },
};

function getImportance(imp: string) {
  const key = imp?.toUpperCase();
  return (
    IMPORTANCE_CONFIG[key as keyof typeof IMPORTANCE_CONFIG] ??
    IMPORTANCE_CONFIG.LOW
  );
}

// ─── Inline Formatter ─────────────────────────────────────────────────────────

function formatInline(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    const boldIdx = remaining.indexOf("*");
    const italicIdx = remaining.indexOf("_");

    // Find nearest special char
    const nearest = [boldIdx, italicIdx].filter((i) => i !== -1);
    if (nearest.length === 0) {
      parts.push(<span key={key++}>{remaining}</span>);
      break;
    }
    const first = Math.min(...nearest);

    if (first > 0) {
      parts.push(<span key={key++}>{remaining.slice(0, first)}</span>);
      remaining = remaining.slice(first);
      continue;
    }

    // Bold *text*
    if (remaining.startsWith("*")) {
      const end = remaining.indexOf("*", 1);
      if (end !== -1) {
        parts.push(<strong key={key++}>{remaining.slice(1, end)}</strong>);
        remaining = remaining.slice(end + 1);
        continue;
      }
    }

    // Italic _text_
    if (remaining.startsWith("_")) {
      const end = remaining.indexOf("_", 1);
      if (end !== -1) {
        parts.push(<em key={key++}>{remaining.slice(1, end)}</em>);
        remaining = remaining.slice(end + 1);
        continue;
      }
    }

    parts.push(<span key={key++}>{remaining[0]}</span>);
    remaining = remaining.slice(1);
  }
  return parts;
}

// ─── Parser ───────────────────────────────────────────────────────────────────

function parseCurrentAffairs(raw: string): ParsedCurrentAffairs {
  const lines = raw.split("\n").map((l) => l.trimEnd());
  let title = "Current Affairs";
  const sections: DateSection[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();

    // @title:
    const titleMatch = line.match(/^@title:\s*(.+)/i);
    if (titleMatch) {
      title = titleMatch[1].trim();
      i++;
      continue;
    }

    // [DATE]...[/DATE]
    const dateMatch = line.match(/^\[DATE\]\s*(.+?)\s*\[\/DATE\]/i);
    if (dateMatch) {
      sections.push({ date: dateMatch[1].trim(), articles: [] });
      i++;
      continue;
    }

    // [ARTICLE]...[/ARTICLE]
    if (line === "[ARTICLE]") {
      i++;
      let category = "General";
      let headline = "";
      let summary = "";
      let importance = "LOW";

      while (i < lines.length && lines[i].trim() !== "[/ARTICLE]") {
        const l = lines[i].trim();
        const catM = l.match(/^CATEGORY:\s*(.+)/i);
        const headM = l.match(/^HEADLINE:\s*(.+)/i);
        const sumM = l.match(/^SUMMARY:\s*(.+)/i);
        const impM = l.match(/^IMPORTANCE:\s*(.+)/i);

        if (catM) category = catM[1].trim();
        else if (headM) headline = headM[1].trim();
        else if (sumM) summary = sumM[1].trim();
        else if (impM) importance = impM[1].trim().toUpperCase();
        i++;
      }

      // Attach to last section, or create a default one
      if (sections.length === 0) {
        sections.push({ date: "Recent", articles: [] });
      }
      sections[sections.length - 1].articles.push({
        category,
        headline,
        summary,
        importance,
      });
      i++; // skip [/ARTICLE]
      continue;
    }

    i++;
  }

  return { title, sections };
}

// ─── Article Card (collapsible) ───────────────────────────────────────────────

function ArticleCard({ article }: { article: Article }) {
  const [expanded, setExpanded] = useState(false);
  const catStyle = getCategoryStyle(article.category);
  const impStyle = getImportance(article.importance);
  const hasDetails = !!(
    article.summary ||
    article.category ||
    article.importance
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
      data-ocid="current_affairs.card"
    >
      {/* Always visible: headline row */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-gray-50 transition-colors"
        data-ocid="current_affairs.tab"
      >
        <div className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0 mt-0.5" />
        <h3 className="text-sm font-semibold text-gray-900 leading-snug flex-1">
          {article.headline}
        </h3>
        {hasDetails &&
          (expanded ? (
            <ChevronUp className="h-4 w-4 text-gray-400 shrink-0" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
          ))}
      </button>

      {/* Expandable details */}
      {expanded && hasDetails && (
        <div className="px-4 pb-4 pt-1 space-y-2 border-t border-gray-50">
          <div className="flex items-center gap-2 flex-wrap">
            {article.category && (
              <span
                className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full border ${catStyle.chip}`}
              >
                {catStyle.icon}
                {article.category}
              </span>
            )}
            {article.importance && (
              <span
                className={`text-[10px] font-bold px-2 py-1 rounded-full ${impStyle.cls}`}
              >
                {impStyle.label}
              </span>
            )}
          </div>
          {article.summary && (
            <p className="text-xs text-gray-600 leading-relaxed">
              {formatInline(article.summary)}
            </p>
          )}
        </div>
      )}
    </motion.div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export interface CurrentAffairsRendererProps {
  url: string;
  onBack: () => void;
}

export default function CurrentAffairsRenderer({
  url,
  onBack,
}: CurrentAffairsRendererProps) {
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>("All");

  const [fetchKey, setFetchKey] = useState(0);

  // biome-ignore lint/correctness/useExhaustiveDependencies: fetchKey triggers re-fetch intentionally
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const doFetch = async () => {
      try {
        let res: Response;
        try {
          res = await fetch(url);
          if (!res.ok) throw new Error(`Status ${res.status}`);
        } catch {
          const proxy = `https://corsproxy.io/?${encodeURIComponent(url)}`;
          res = await fetch(proxy);
          if (!res.ok)
            throw new Error(`Proxy failed with status ${res.status}`);
        }
        const text = await res.text();
        if (!cancelled) setContent(text);
      } catch (err) {
        if (!cancelled)
          setError(
            err instanceof Error ? err.message : "Failed to load content",
          );
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void doFetch();
    return () => {
      cancelled = true;
    };
  }, [url, fetchKey]);

  const fetchContent = () => setFetchKey((k) => k + 1);

  const parsed = useMemo(() => {
    if (!content) return null;
    return parseCurrentAffairs(content);
  }, [content]);

  // All unique categories across all sections
  const allCategories = useMemo(() => {
    if (!parsed) return [];
    const cats = new Set<string>();
    for (const sec of parsed.sections) {
      for (const a of sec.articles) cats.add(a.category);
    }
    return ["All", ...Array.from(cats).sort()];
  }, [parsed]);

  // Filtered sections
  const filteredSections = useMemo(() => {
    if (!parsed) return [];
    if (activeCategory === "All") return parsed.sections;
    return parsed.sections
      .map((sec) => ({
        ...sec,
        articles: sec.articles.filter((a) => a.category === activeCategory),
      }))
      .filter((sec) => sec.articles.length > 0);
  }, [parsed, activeCategory]);

  const totalArticles = useMemo(() => {
    return filteredSections.reduce((sum, s) => sum + s.articles.length, 0);
  }, [filteredSections]);

  // ── Loading ──
  if (loading) {
    return (
      <div
        className="min-h-screen bg-gray-50 flex flex-col"
        data-ocid="current_affairs.loading_state"
      >
        <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="p-1.5 rounded-xl hover:bg-gray-100"
            data-ocid="current_affairs.close_button"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </button>
          <h1 className="font-semibold text-gray-900 text-base">
            Current Affairs
          </h1>
        </div>
        <div className="flex-1 flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3 text-gray-400">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <p className="text-sm">Loading articles...</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Error ──
  if (error) {
    return (
      <div
        className="min-h-screen bg-gray-50 flex flex-col"
        data-ocid="current_affairs.error_state"
      >
        <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="p-1.5 rounded-xl hover:bg-gray-100"
            data-ocid="current_affairs.close_button"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </button>
          <h1 className="font-semibold text-gray-900 text-base">
            Current Affairs
          </h1>
        </div>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl border border-red-100 shadow-sm p-6 max-w-sm w-full text-center">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-3">
              <X className="h-6 w-6 text-red-500" />
            </div>
            <p className="text-sm font-semibold text-gray-900 mb-1">
              Could not load content
            </p>
            <p className="text-xs text-gray-500 mb-4 break-all">{error}</p>
            <button
              type="button"
              onClick={fetchContent}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-700 text-white text-sm font-medium hover:bg-blue-800 transition-colors"
              data-ocid="current_affairs.primary_button"
            >
              <RefreshCw className="h-4 w-4" /> Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Main View ──
  return (
    <div
      className="min-h-screen bg-gray-50 pb-24"
      data-ocid="current_affairs.panel"
    >
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 shadow-sm">
        <div className="px-4 py-3 flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="p-1.5 rounded-xl hover:bg-gray-100 shrink-0"
            data-ocid="current_affairs.close_button"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-gray-900 text-base truncate">
              {parsed?.title ?? "Current Affairs"}
            </h1>
            <p className="text-xs text-gray-400">
              {totalArticles} article{totalArticles !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {/* Category filter chips */}
        {allCategories.length > 1 && (
          <div className="px-4 pb-3 overflow-x-auto">
            <div className="flex gap-2 w-max">
              {allCategories.map((cat) => {
                const isActive = cat === activeCategory;
                const catStyle = cat !== "All" ? getCategoryStyle(cat) : null;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setActiveCategory(cat)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all shrink-0 ${
                      isActive
                        ? "bg-blue-700 text-white border-blue-700 shadow-sm"
                        : catStyle
                          ? `${catStyle.chip} hover:opacity-80`
                          : "bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200"
                    }`}
                    data-ocid="current_affairs.tab"
                  >
                    {cat !== "All" && catStyle && !isActive && catStyle.icon}
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="px-4 pt-4 space-y-6">
        <AnimatePresence mode="wait">
          {filteredSections.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16 text-gray-400"
              data-ocid="current_affairs.empty_state"
            >
              <Newspaper className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No articles found</p>
            </motion.div>
          ) : (
            filteredSections.map((section) => (
              <motion.div
                key={section.date}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                {/* Date header */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-1 h-5 rounded-full bg-blue-700 shrink-0" />
                  <h2 className="text-sm font-bold text-gray-800">
                    {section.date}
                  </h2>
                  <span className="text-xs text-gray-400 ml-auto">
                    {section.articles.length} article
                    {section.articles.length !== 1 ? "s" : ""}
                  </span>
                </div>

                {/* Articles */}
                <div className="space-y-3">
                  {section.articles.map((article, idx) => (
                    <ArticleCard
                      key={`${section.date}-${idx}`}
                      article={article}
                    />
                  ))}
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
