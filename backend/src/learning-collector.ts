import Parser from "rss-parser";
import { createHash, randomUUID } from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import { ContentDatabase, CmsError } from "./database";
import { knowledgeSchema } from "../../shared/cms";
export const learningSources = [
  {
    id: "kexue",
    name: "科学空间",
    feed: "https://kexue.fm/feed",
    host: "kexue.fm",
    home: "https://kexue.fm/",
    language: "中文",
  },
  {
    id: "huggingface",
    name: "Hugging Face 社区",
    feed: "https://huggingface.co/blog/feed.xml",
    host: "huggingface.co",
    home: "https://huggingface.co/blog",
    language: "英文",
  },
  {
    id: "lilianweng",
    name: "Lil’Log · Lilian Weng",
    feed: "https://lilianweng.github.io/index.xml",
    host: "lilianweng.github.io",
    home: "https://lilianweng.github.io/",
    language: "英文",
  },
  {
    id: "simonwillison",
    name: "Simon Willison",
    feed: "https://simonwillison.net/atom/everything/",
    host: "simonwillison.net",
    home: "https://simonwillison.net/",
    language: "英文",
  },
];
const EVERY = 6 * 3600000;
const strip = (s: string) =>
  s
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]*>/g, " ")
    .replace(
      /&(?:nbsp|amp|lt|gt|quot|apos);/g,
      (s) =>
        ({
          "&nbsp;": " ",
          "&amp;": "&",
          "&lt;": "<",
          "&gt;": ">",
          "&quot;": '"',
          "&apos;": "'",
        })[s] || "",
    )
    .replace(/\s+/g, " ")
    .trim();
export function learningEntry(
  item: Parser.Item,
  source: (typeof learningSources)[number],
  now = new Date(),
) {
  const title = strip(item.title || "").slice(0, 280);
  if (!title || !item.link) return null;
  let url: URL;
  try {
    url = new URL(item.link);
  } catch {
    return null;
  }
  if (
    url.protocol !== "https:" ||
    url.hostname !== source.host ||
    url.username ||
    url.password
  )
    return null;
  url.hash = "";
  for (const key of [...url.searchParams.keys()])
    if (/^utm_|^fbclid$|^gclid$/i.test(key)) url.searchParams.delete(key);
  const raw = strip(item.contentSnippet || item.summary || item.content || "");
  if (
    !/\b(ai|llm|agents?|models?|prompt|diffusion|transformers?|rag|embedding|fine.?tun|inference|machine learning|deep learning|training|claude|gpt|gemini|qwen)\b|人工智能|模型|智能体|提示词|机器学习|训练|梯度|学习率|注意力/i.test(
      title + " " + raw.slice(0, 500),
    )
  )
    return null;
  const category = /diffusion|image|video|3d|图像|视频/i.test(title)
    ? "图像与视频"
    : /agent|tool|coding|code|智能体/i.test(title)
      ? "智能体与开发"
      : /prompt|rag|embedding|检索/i.test(title)
        ? "提示词与知识库"
        : "模型原理与实践";
  if (
    source.id === "simonwillison" &&
    !/how|build|guide|tutorial|prompt|llm|agent|python|code|coding|tool|embedding|rag/i.test(
      title,
    )
  )
    return null;
  const slug =
    "shared-" +
    createHash("sha256").update(url.href).digest("hex").slice(0, 20);
  const author = strip(
    String(
      item.creator || (item as Parser.Item & { author?: string }).author || "",
    ),
  ).slice(0, 120);
  const date = Date.parse(item.isoDate || item.pubDate || "");
  const publishedAt =
    Number.isFinite(date) && date <= now.getTime() + 86400000
      ? new Date(date).toISOString()
      : "";
  const summary = raw
    ? raw.slice(0, 200) + (raw.length > 200 ? "…" : "")
    : "来自" + source.name + "的AI知识分享。请前往原文阅读完整方法和示例。";
  return knowledgeSchema.parse({
    slug,
    title,
    category,
    summary,
    keywords: category + " " + title + " " + source.name + " " + author,
    curation: {
      publisher: source.name,
      author,
      url: url.href,
      publishedAt,
      collectedAt: now.toISOString(),
      language: source.language,
    },
    sections: [
      {
        title: "来源与阅读说明",
        body: `发布方：${source.name}${author ? "；作者：" + author : ""}。${publishedAt ? "原文发布时间：" + publishedAt.slice(0, 10) + "。" : ""}本文为外部知识索引，仅提供订阅源短摘要，不转载全文。完整论证、代码、图片和使用许可请查阅原文。`,
      },
      { title: "订阅源摘要", body: summary },
      {
        title: "建议如何学习",
        body: "先确认原文使用的模型、工具版本与前置知识，再选择一个最小示例动手复现。记录输入、输出和失败原因；涉及效果或性能结论时，检查其评测条件是否适合你的场景。完成后将可复用步骤记入工作台。",
      },
    ],
    sources: [{ title: "阅读原文 · " + source.name, url: url.href }],
  });
}
async function feedText(url: string) {
  const res = await fetch(url, {
    redirect: "error",
    signal: AbortSignal.timeout(15000),
    headers: {
      "User-Agent": "AI-Mendao-Learning/1.0 (+https://ruming.top/about)",
      Accept:
        "application/rss+xml, application/atom+xml, application/xml, text/xml",
    },
  });
  if (!res.ok) throw Error("HTTP " + res.status);
  const reader = res.body?.getReader();
  if (!reader) throw Error("订阅源为空");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 4 * 1024 * 1024) throw Error("订阅源超过4MB");
      chunks.push(value);
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
  return Buffer.concat(chunks).toString("utf8");
}
export class LearningCollector {
  private timer?: ReturnType<typeof setInterval>;
  private task?: Promise<void>;
  constructor(
    private store: ContentDatabase,
    private fetchFeed = feedText,
  ) {
    store.db.exec(
      "CREATE TABLE IF NOT EXISTS learning_imports(url TEXT PRIMARY KEY,slug TEXT NOT NULL,source TEXT NOT NULL,created INTEGER NOT NULL); CREATE TABLE IF NOT EXISTS learning_collect_lock(id INTEGER PRIMARY KEY,token TEXT NOT NULL,expires INTEGER NOT NULL);",
    );
  }
  status() {
    return {
      enabled: this.store.meta<boolean>("learningEnabled") ?? true,
      intervalHours: 6,
      running: !!this.store.db
        .prepare("SELECT 1 FROM learning_collect_lock WHERE id=1 AND expires>?")
        .get(Date.now()),
      count: Number(
        this.store.db.prepare("SELECT count(*) n FROM learning_imports").get()
          ?.n,
      ),
      last: this.store.meta("learningLast") || null,
      sources: learningSources.map(({ feed: _feed, ...s }) => s),
    };
  }
  setEnabled(value: boolean) {
    this.store.setMeta("learningEnabled", value);
  }
  start() {
    const tick = () => {
      const last = this.store.meta<{ startedAt: number }>("learningLast");
      if (
        this.status().enabled &&
        (!last || Date.now() - last.startedAt >= EVERY)
      )
        void this.refresh().catch((e) =>
          console.error("Learning collector:", e.message),
        );
    };
    this.timer = setInterval(tick, 60000);
    this.timer.unref();
    tick();
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
      this.task = undefined;
    }
  }
  private async collect() {
    const token = randomUUID(),
      now = Date.now();
    const claimed = this.store.transaction(() => {
      const row = this.store.db
        .prepare("SELECT expires FROM learning_collect_lock WHERE id=1")
        .get();
      if (row && Number(row.expires) > now) return false;
      this.store.db
        .prepare(
          "INSERT INTO learning_collect_lock VALUES(1,?,?) ON CONFLICT(id) DO UPDATE SET token=excluded.token,expires=excluded.expires",
        )
        .run(token, now + 10 * 60000);
      return true;
    });
    if (!claimed) throw new CmsError(409, "采集任务正在运行");
    const result = {
      startedAt: now,
      finishedAt: 0,
      added: 0,
      sources: [] as {
        id: string;
        added: number;
        skipped: number;
        error: string | null;
      }[],
    };
    this.store.setMeta("learningLast", result);
    try {
      for (const source of learningSources) {
        const status = {
          id: source.id,
          added: 0,
          skipped: 0,
          error: null as string | null,
        };
        try {
          const xml = await this.fetchFeed(source.feed);
          if (/<!DOCTYPE|<!ENTITY/i.test(xml)) throw Error("不支持的XML声明");
          const feed = await new Parser().parseString(xml);
          for (const item of feed.items.slice(0, 80)) {
            const entry = learningEntry(item, source);
            if (!entry) {
              status.skipped++;
              continue;
            }
            if (
              status.added >= 10 ||
              Number(
                this.store.db
                  .prepare(
                    "SELECT count(*) n FROM documents d JOIN learning_imports i ON d.id=i.slug WHERE d.kind='knowledge'",
                  )
                  .get()?.n,
              ) >= 500
            )
              break;
            const url = entry.curation!.url;
            if (
              this.store.db
                .prepare("SELECT 1 FROM learning_imports WHERE url=?")
                .get(url) ||
              this.store.db
                .prepare(
                  "SELECT 1 FROM documents WHERE kind='knowledge' AND id=?",
                )
                .get(entry.slug)
            ) {
              status.skipped++;
              continue;
            }
            // One transaction publishes a new validated index and records its URL tombstone; never updates previously imported articles.
            this.store.transaction(() => {
              const stamp = new Date().toISOString(),
                payload = JSON.stringify(entry);
              this.store.db
                .prepare(
                  "INSERT INTO documents VALUES('knowledge',?,?,?,1,?,?)",
                )
                .run(
                  entry.slug,
                  payload,
                  payload,
                  Number(
                    this.store.db
                      .prepare(
                        "SELECT COALESCE(MAX(position),0)+1 n FROM documents",
                      )
                      .get()!.n,
                  ),
                  stamp,
                );
              this.store.db
                .prepare("INSERT INTO learning_imports VALUES(?,?,?,?)")
                .run(url, entry.slug, source.id, Date.now());
              this.store.db
                .prepare(
                  "INSERT INTO history(kind,entity_id,action,actor,payload,at) VALUES('knowledge',?,'import_publish','learning-collector',?,?)",
                )
                .run(entry.slug, payload, stamp);
              this.store.setMeta(
                "contentVersion",
                (this.store.meta<number>("contentVersion") || 0) + 1,
              );
            });
            status.added++;
            result.added++;
          }
        } catch (e) {
          status.error = (e as Error).message.slice(0, 180);
        }
        result.sources.push(status);
        this.store.setMeta("learningLast", result);
      }
    } finally {
      result.finishedAt = Date.now();
      this.store.setMeta("learningLast", result);
      this.store.db
        .prepare("DELETE FROM learning_collect_lock WHERE id=1 AND token=?")
        .run(token);
    }
  }
}
export function learningAdminRouter(service: LearningCollector) {
  const r = Router();
  r.get("/", (_q, res) => res.json(service.status()));
  r.put("/", (req, res) => {
    service.setEnabled(
      z.object({ enabled: z.boolean() }).strict().parse(req.body).enabled,
    );
    res.json(service.status());
  });
  r.post("/refresh", (_q, res) => {
    if (service.status().running) throw new CmsError(409, "采集任务正在运行");
    void service
      .refresh()
      .catch((e) => console.error("Learning refresh:", e.message));
    res.status(202).json(service.status());
  });
  return r;
}
