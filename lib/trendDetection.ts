/**
 * Trend Detection
 * ===============
 * Finds topics that MULTIPLE tracked channels converged on inside a short
 * window. That convergence is the actual trend signal.
 *
 * WHY THIS REPLACES THE OLD PAGE
 * ------------------------------
 * /dashboard/trends previously took every cached competitor video, sorted by
 * raw view count, and showed the top 8. That is a leaderboard, not a trend.
 * It told a creator that MrBeast gets a lot of views — which they knew — and
 * it surfaced the same handful of evergreen uploads every single day.
 *
 * A trend is different: it is several independent channels deciding to cover
 * the same thing at roughly the same time. One channel posting about a topic
 * is a data point. Three channels posting about it inside a week is a wave a
 * creator can still catch.
 *
 * WHY NOT EMBEDDINGS
 * ------------------
 * Semantic clustering with pgvector is the eventual answer, but it needs an
 * embedding call per video, a vector column, and enough history for cosine
 * distance to mean anything. At the current data volume (a few channels, ten
 * cached videos each) lexical overlap on meaningful terms finds the same
 * clusters for zero API cost and no new infrastructure. Revisit embeddings
 * when tracked-channel count justifies it.
 *
 * HONESTY REQUIREMENT
 * -------------------
 * With only two or three tracked channels, most days genuinely have no
 * cross-channel trend. This module returns an empty array in that case, and
 * the UI must say so plainly. Inventing a "trend" from a single channel is
 * exactly the hallucinated-data problem the trends page was rebuilt to fix.
 */

export type TrendInputVideo = {
  id: string;
  title: string;
  channel: string;
  viewCount: number;
  publishedAt: string;
  thumbnailUrl?: string | null;
};

export type TrendCluster = {
  /** Human-readable label for the shared topic, derived from the shared term. */
  topic: string;
  /** Distinct channel names that covered it. Always length >= 2. */
  channels: string[];
  /** The videos making up the cluster, newest first. */
  videos: TrendInputVideo[];
  /** Days since the earliest video in the cluster. */
  windowDays: number;
  /** Total views across the cluster — scale, not the ranking signal. */
  totalViews: number;
  /** How many distinct channels covered it. The primary ranking signal. */
  channelCount: number;
};

/**
 * Words that carry no topical meaning in a YouTube title.
 *
 * Includes ordinary English stopwords plus the packaging vocabulary that
 * shows up in nearly every title ("official", "video", "shorts", "vs") and
 * would otherwise cluster unrelated videos together.
 */
const STOPWORDS = new Set([
  'a','an','and','are','as','at','be','but','by','for','from','had','has','have','he','her','his',
  'i','if','in','into','is','it','its','me','my','of','on','or','our','out','she','so','than','that',
  'the','their','them','then','there','these','they','this','to','was','we','were','what','when',
  'where','which','while','who','why','will','with','you','your','yours','am','can','did','do','does',
  'been','being','just','now','new','get','got','how','all','not','no','yes','one','two','more','most',
  // YouTube title packaging
  'official','video','videos','shorts','short','full','part','episode','ep','vs','ft','feat','w',
  'watch','subscribe','channel','live','stream','streaming','update','updated','best','top','ultimate',
  'insane','crazy','actually','literally','finally','things','thing','stuff','made','make','makes',
  'day','days','week','weeks','year','years','time','times','first','last','ever','every','vlog',
]);

/** Terms shorter than this are almost always noise. */
const MIN_TERM_LENGTH = 4;

function normalizeTitle(title: string): string[] {
  return title
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * Meaningful terms from a title: unigrams plus adjacent bigrams.
 *
 * Bigrams matter because the real signal is usually a phrase ("elden ring",
 * "shadow of the erdtree"), and a unigram-only model would cluster every
 * souls-like video under "ring".
 */
function extractTerms(title: string): string[] {
  const words = normalizeTitle(title);
  const terms = new Set<string>();

  const meaningful = words.filter(
    (w) => w.length >= MIN_TERM_LENGTH && !STOPWORDS.has(w) && !/^\d+$/.test(w)
  );

  for (const w of meaningful) terms.add(w);

  // Bigrams from ADJACENT words in the original title, so we only join words
  // that actually sat next to each other.
  for (let i = 0; i < words.length - 1; i++) {
    const a = words[i];
    const b = words[i + 1];
    if (STOPWORDS.has(a) || STOPWORDS.has(b)) continue;
    if (a.length < 3 || b.length < 3) continue;
    if (/^\d+$/.test(a) && /^\d+$/.test(b)) continue;
    terms.add(`${a} ${b}`);
  }

  return [...terms];
}

/** Title-case a term for display without mangling acronyms. */
function displayTopic(term: string): string {
  return term
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export type DetectTrendsOptions = {
  /** Only consider videos published within this many days. */
  windowDays?: number;
  /** Minimum distinct channels required to call something a trend. */
  minChannels?: number;
  /** Maximum clusters returned. */
  limit?: number;
};

/**
 * Find topics covered by multiple distinct channels inside the window.
 *
 * Returns [] when nothing qualifies — which is the correct and common answer
 * for a creator tracking only a couple of channels.
 */
export function detectTrends(
  videos: TrendInputVideo[],
  options: DetectTrendsOptions = {}
): TrendCluster[] {
  const { windowDays = 14, minChannels = 2, limit = 6 } = options;

  const now = Date.now();
  const cutoff = now - windowDays * 24 * 60 * 60 * 1000;

  const recent = videos.filter((v) => {
    const t = new Date(v.publishedAt).getTime();
    return Number.isFinite(t) && t >= cutoff;
  });

  if (recent.length === 0) return [];

  // term -> videos containing it
  const byTerm = new Map<string, TrendInputVideo[]>();
  for (const v of recent) {
    for (const term of extractTerms(v.title)) {
      if (!byTerm.has(term)) byTerm.set(term, []);
      byTerm.get(term)!.push(v);
    }
  }

  const clusters: TrendCluster[] = [];

  for (const [term, termVideos] of byTerm) {
    const channels = [...new Set(termVideos.map((v) => v.channel))];
    if (channels.length < minChannels) continue;

    const sorted = [...termVideos].sort(
      (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    );

    const earliest = new Date(sorted[sorted.length - 1].publishedAt).getTime();

    clusters.push({
      topic: displayTopic(term),
      channels,
      videos: sorted,
      windowDays: Math.max(1, Math.round((now - earliest) / (24 * 60 * 60 * 1000))),
      totalViews: termVideos.reduce((sum, v) => sum + (v.viewCount || 0), 0),
      channelCount: channels.length,
    });
  }

  // A bigram and its component unigram usually describe the same wave
  // ("elden ring" and "elden"). Keep the more specific phrase and drop any
  // cluster whose videos are already fully covered by a longer term.
  clusters.sort((a, b) => b.topic.length - a.topic.length);
  const kept: TrendCluster[] = [];
  for (const c of clusters) {
    const ids = new Set(c.videos.map((v) => v.id));
    const isSubsumed = kept.some((k) => {
      const kIds = new Set(k.videos.map((v) => v.id));
      return [...ids].every((id) => kIds.has(id));
    });
    if (!isSubsumed) kept.push(c);
  }

  // Rank by breadth first (how many channels converged), then freshness,
  // then scale. Breadth is the signal; views are context.
  kept.sort((a, b) => {
    if (b.channelCount !== a.channelCount) return b.channelCount - a.channelCount;
    if (a.windowDays !== b.windowDays) return a.windowDays - b.windowDays;
    return b.totalViews - a.totalViews;
  });

  return kept.slice(0, limit);
}
