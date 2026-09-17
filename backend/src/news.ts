import { fetchQbitImage } from "./news-images";
import type { ContentDatabase } from "./database";
import Parser from "rss-parser";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile, rename } from "node:fs/promises";
import path from "node:path";
import type {
  NewsArticle,
  NewsCategory,
  NewsSource,
  NewsSourceStatus,
} from "../../shared/news";
export const sources: NewsSource[] = [
  {
    id: "qbitai",
    name: "量子位",
    url: "https://www.qbitai.com",
    feed: "https://www.qbitai.com/feed",
    category: "产业动态",
    language: "中文",
  },
  {
    id: "huggingface",
    name: "Hugging Face",
    url: "https://huggingface.co/blog",
    feed: "https://huggingface.co/blog/feed.xml",
    category: "大模型",
    language: "英文",
  },
  {
    id: "google-ai",
    name: "Google AI",
    url: "https://blog.google/innovation-and-ai/technology/ai/",
    feed: "https://blog.google/innovation-and-ai/technology/ai/rss/",
    category: "软件应用",
    language: "英文",
  },
  {
    id: "nvidia",
    name: "NVIDIA Blog",
    url: "https://blogs.nvidia.com",
    feed: "https://blogs.nvidia.com/feed/",
    category: "硬件算力",
    language: "英文",
  },
  {
    id: "microsoft-research",
    name: "Microsoft Research",
    url: "https://www.microsoft.com/en-us/research/blog/",
    feed: "https://www.microsoft.com/en-us/research/feed/",
    category: "研究进展",
    language: "英文",
  },
];
export function canonicalUrl(input: string): string | null {
  try {
    const u = new URL(input);
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    if (u.username || u.password) return null;
    u.hash = "";
    for (const key of [...u.searchParams.keys()])
      if (/^(utm_|fbclid$|gclid$)/i.test(key)) u.searchParams.delete(key);
    return u.href;
  } catch {
    return null;
  }
}
export function classify(title: string, fallback: NewsCategory): NewsCategory {
  if (
    /gpu|chip|芯片|算力|显卡|数据中心|blackwell|rubin|硬件|机器人|robot/i.test(
      title,
    )
  )
    return "硬件算力";
  if (
    /大模型|语言模型|llm|\bmodel\b|gpt|claude|gemini|deepseek|qwen|推理模型/i.test(
      title,
    )
  )
    return "大模型";
  if (/论文|研究|research|benchmark|评测/i.test(title)) return "研究进展";
  if (/软件|应用|工具|app\b|agent|智能体|视频|图像|编程/i.test(title))
    return "软件应用";
  return fallback;
}
// Extract only feed-provided images; never fetch arbitrary article pages.
export function feedImage(item: Parser.Item): string | null {
  const extra = item as Parser.Item & {
    mediaContent?: { $?: { url?: string } }[];
    mediaThumbnail?: { $?: { url?: string } }[];
    "content:encoded"?: string;
  };
  const candidates = [
    ...(extra.mediaContent || []).map((x) => x.$?.url),
    ...(extra.mediaThumbnail || []).map((x) => x.$?.url),
    item.enclosure?.type?.startsWith("image/") ? item.enclosure.url : undefined,
  ];
  const html = extra["content:encoded"] || item.content || "";
  const tags = html.match(/<img\b[^>]*>/gi) || [];
  for (const tag of tags) {
    const match = tag.match(/\b(?:data-src|src)\s*=\s*["']([^"']+)["']/i);
    if (match) candidates.push(match[1].replace(/&amp;/g, "&"));
  }
  for (const candidate of candidates) {
    if (!candidate) continue;
    try {
      const url = new URL(candidate, item.link);
      if (url.protocol !== "https:" || url.username || url.password) continue;
      if (
        !url.hostname.includes(".") ||
        /^(?:\d+\.|\[)/.test(url.hostname) ||
        /(?:\.local|\.localhost|\.internal)$/.test(url.hostname)
      )
        continue;
      if (/\.svg(?:$|\?)/i.test(url.pathname)) continue;
      return url.href;
    } catch {
      /* Invalid feed image is ignored. */
    }
  }
  return null;
}
export function normalizeItem(
  item: Parser.Item,
  source: NewsSource,
  now: string,
): NewsArticle | null {
  const url = canonicalUrl(item.link || "");
  const title = (item.title || "")
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 400);
  if (!url || !title) return null;
  const date = Date.parse(item.isoDate || item.pubDate || "");
  // Incorrect or future source dates never masquerade as publication times.
  const publishedAt =
    Number.isFinite(date) && date <= Date.parse(now) + 300000
      ? new Date(date).toISOString()
      : null;
  return {
    id: createHash("sha256").update(url).digest("hex").slice(0, 24),
    title,
    imageUrl: feedImage(item),
    url,
    sourceId: source.id,
    sourceName: source.name,
    category: classify(title, source.category),
    publishedAt,
    collectedAt: now,
  };
}
type SourceState = {
  lastAttempt: string | null;
  lastSuccess: string | null;
  error: string | null;
  etag?: string;
  modified?: string;
};
type Store = {
  version: 1;
  updatedAt: string | null;
  items: NewsArticle[];
  states: Record<string, SourceState>;
};
const parser = new Parser({
  customFields: {
    item: [
      ["media:content", "mediaContent", { keepArray: true }],
      ["media:thumbnail", "mediaThumbnail", { keepArray: true }],
    ],
  },
});
const positive = Number(process.env.NEWS_POLL_MINUTES || 15);
export const pollMinutes = Number.isFinite(positive)
  ? Math.max(5, Math.min(1440, positive))
  : 15;
export class NewsService {
  constructor(private database?: ContentDatabase) {}
  private store: Store = { version: 1, updatedAt: null, items: [], states: {} };
  private task: Promise<void> | null = null;
  private imageAttempts = new Map<string, number>();
  private timer: ReturnType<typeof setInterval> | null = null;
  readonly file = path.resolve(
    process.env.NEWS_DATA_FILE || "./storage/news.json",
  );
  get refreshing() {
    return this.task !== null;
  }
  async init() {
    try {
      const raw =
        this.database?.loadNews() ||
        JSON.parse(await readFile(this.file, "utf8"));
      if (raw.version !== 1 || !Array.isArray(raw.items) || !raw.states)
        throw Error("invalid news store");
      this.store = raw;
      // Replace prior inaccessible CDN covers through the public-site lookup.
      for (const item of this.store.items) {
        if (
          item.sourceId === "qbitai" &&
          item.imageUrl?.startsWith("https://i.qbitai.com/")
        )
          item.imageUrl = null;
      }
      this.database?.saveNews(this.store);
      // Re-fetch old title-only entries once to enrich them with feed images.
      for (const source of sources) {
        if (
          this.store.items.some(
            (item) => item.sourceId === source.id && !("imageUrl" in item),
          )
        ) {
          const state = this.store.states[source.id];
          if (state) {
            delete state.etag;
            delete state.modified;
          }
        }
      }
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
    }
  }
  start() {
    void this.refresh().catch((e) =>
      console.error("News persistence failure", e.message),
    );
    this.timer = setInterval(
      () =>
        void this.refresh().catch((e) =>
          console.error("News persistence failure", e.message),
        ),
      pollMinutes * 60000,
    );
    this.timer.unref();
  }
  async stop() {
    if (this.timer) clearInterval(this.timer);
    await this.task;
  }
  async refresh() {
    if (this.task) return this.task;
    this.task = this.collect();
    try {
      await this.task;
    } finally {
      this.task = null;
    }
  }
  private async collect() {
    await Promise.allSettled(
      sources.map(async (source) => {
        const now = new Date().toISOString();
        const prev = this.store.states[source.id];
        const state: SourceState = {
          ...prev,
          lastAttempt: now,
          lastSuccess: prev?.lastSuccess || null,
          error: null,
        };
        this.store.states[source.id] = state;
        try {
          const headers: Record<string, string> = {
            "User-Agent": "AIMendao/1.0 (+https://ruming.top)",
            Accept:
              "application/rss+xml, application/atom+xml, application/xml, text/xml",
          };
          if (prev?.etag) headers["If-None-Match"] = prev.etag;
          if (prev?.modified) headers["If-Modified-Since"] = prev.modified;
          // Fixed source allowlist. No public endpoint accepts feed URLs.
          const response = await fetch(source.feed, {
            headers,
            signal: AbortSignal.timeout(20000),
            redirect: "error",
          });
          if (response.status === 304) {
            state.lastSuccess = now;
            return;
          }
          if (!response.ok) throw Error("来源返回 HTTP " + response.status);
          const reader = response.body?.getReader();
          if (!reader) throw Error("来源内容为空");
          let size = 0;
          const chunks: Uint8Array[] = [];
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            size += value.length;
            if (size > 5 * 1024 * 1024) {
              await reader.cancel();
              throw Error("来源内容超过 5 MiB");
            }
            chunks.push(value);
          }
          const xml = Buffer.concat(chunks).toString("utf8");
          if (/<!DOCTYPE|<!ENTITY/i.test(xml)) throw Error("不支持的 XML 声明");
          const feed = await parser.parseString(xml);
          const incoming = feed.items
            .map((item) => normalizeItem(item, source, now))
            .filter((x): x is NewsArticle => x !== null);
          if (!incoming.length) throw Error("来源暂未返回有效条目");
          const map = new Map(this.store.items.map((item) => [item.id, item]));
          for (const item of incoming) {
            const existing = map.get(item.id);
            map.set(item.id, {
              ...item,
              imageUrl: item.imageUrl || existing?.imageUrl || null,
              collectedAt: existing?.collectedAt || now,
            });
          }
          this.store.items = [...map.values()];
          state.lastSuccess = now;
          state.etag = response.headers.get("etag") || undefined;
          state.modified = response.headers.get("last-modified") || undefined;
        } catch (e) {
          state.error = e instanceof Error ? e.message : "采集失败";
        }
      }),
    );
    // Runs even when RSS returns 304, including already collected title-only items.
    const pending = this.store.items
      .filter(
        (item) =>
          item.sourceId === "qbitai" &&
          !item.imageUrl &&
          Date.now() - (this.imageAttempts.get(item.id) || 0) >= 3600000,
      )
      .slice(0, 20);
    const queue = [...pending];
    await Promise.all(
      [0, 1].map(async () => {
        for (let item = queue.shift(); item; item = queue.shift()) {
          this.imageAttempts.set(item.id, Date.now());
          try {
            item.imageUrl = await fetchQbitImage(item.url);
          } catch {
            /* Image errors must not discard the article or fail the RSS source. */
          }
        }
      }),
    );
    for (const [id, at] of this.imageAttempts)
      if (Date.now() - at > 3600000) this.imageAttempts.delete(id);
    this.store.items.sort((a, b) =>
      (b.publishedAt || b.collectedAt).localeCompare(
        a.publishedAt || a.collectedAt,
      ),
    );
    this.store.items = this.store.items.slice(0, 3000);
    this.store.updatedAt = new Date().toISOString();
    if (this.database) {
      this.database.saveNews(this.store);
      return;
    }
    await mkdir(path.dirname(this.file), { recursive: true });
    const temp = this.file + ".tmp";
    await writeFile(temp, JSON.stringify(this.store, null, 2));
    await rename(temp, this.file);
  }
  list(p: {
    q?: string;
    category?: string;
    source?: string;
    page: number;
    pageSize: number;
  }) {
    const filtered = this.store.items.filter(
      (a) =>
        (!p.q ||
          `${a.title} ${a.sourceName}`
            .toLowerCase()
            .includes(p.q.toLowerCase())) &&
        (!p.category || a.category === p.category) &&
        (!p.source || a.sourceId === p.source),
    );
    return {
      items: filtered.slice((p.page - 1) * p.pageSize, p.page * p.pageSize),
      total: filtered.length,
      page: p.page,
      pageSize: p.pageSize,
      updatedAt: this.store.updatedAt,
      refreshing: this.refreshing,
      pollMinutes,
      sources: this.status(),
    };
  }
  status(): NewsSourceStatus[] {
    return sources.map((s) => ({
      ...s,
      lastAttempt: this.store.states[s.id]?.lastAttempt || null,
      lastSuccess: this.store.states[s.id]?.lastSuccess || null,
      error: this.store.states[s.id]?.error || null,
      count: this.store.items.filter((a) => a.sourceId === s.id).length,
    }));
  }
}
