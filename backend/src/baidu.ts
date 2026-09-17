import { Router } from "express";
import { createHash } from "node:crypto";
import {
  chmodSync,
  existsSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { z } from "zod";
import { ContentDatabase, CmsError } from "./database";
import { indexablePaths, resolveSeo } from "../../shared/seo";

type Config = {
  endpoint: string;
  automatic: boolean;
  batchSize: number;
  dailyLimit: number;
};
type Row = {
  url: string;
  fingerprint: string;
  state: string;
  attempts: number;
  next_at: number;
  submitted_at: number | null;
  updated_at: number;
  error: string | null;
};
const day = () => new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 10);
const hash = (v: unknown) =>
  createHash("sha256").update(JSON.stringify(v)).digest("hex");
export function parseBaiduEndpoint(value: string, origin: string) {
  let u: URL;
  try {
    u = new URL(value);
  } catch {
    throw new CmsError(400, "接口地址格式不正确");
  }
  if (
    !["http:", "https:"].includes(u.protocol) ||
    u.hostname !== "data.zz.baidu.com" ||
    u.port ||
    u.pathname !== "/urls" ||
    u.username ||
    u.password ||
    u.hash ||
    [...u.searchParams.keys()].some((k) => !["site", "token"].includes(k)) ||
    u.searchParams.getAll("site").length !== 1 ||
    u.searchParams.getAll("token").length !== 1
  )
    throw new CmsError(400, "请使用百度普通收录的官方 /urls 接口地址");
  const token = u.searchParams.get("token") || "";
  if (!/^[a-zA-Z0-9_-]{8,128}$/.test(token))
    throw new CmsError(400, "接口地址缺少有效 token");
  const raw = u.searchParams.get("site") || "";
  let site: URL;
  try {
    site = new URL(raw.includes("://") ? raw : "https://" + raw);
  } catch {
    throw new CmsError(400, "站点参数不正确");
  }
  if (
    site.origin !== origin ||
    site.pathname !== "/" ||
    site.search ||
    site.hash ||
    site.username ||
    site.password
  )
    throw new CmsError(
      400,
      `请选择并验证 ${origin} 的百度站点；www 域名与主域不能混用`,
    );
  return u.href;
}
export function baiduCandidates(store: ContentDatabase) {
  const data = store.publicContent();
  const origin = new URL(data.site.url).origin;
  const news = (store.loadNews()?.items || []) as {
    id: string;
    publishedAt?: string;
  }[];
  const recent = news
    .slice()
    .sort((a, b) => (b.publishedAt || "").localeCompare(a.publishedAt || ""))
    .slice(0, 20)
    .map((x) => x.id);
  return [...new Set(indexablePaths(data))]
    .filter(
      (p) =>
        !["/tutorials", "/scenarios"].includes(p) &&
        resolveSeo(p, "", data).robots.startsWith("index"),
    )
    .map((p) => {
      const slug = p.split("/").slice(2).join("/");
      const entity = p.startsWith("/learn/")
        ? data.knowledge.find((x) => x.slug === slug)
        : p.startsWith("/tools/")
          ? data.resources.find((x) => x.id === slug)
          : p.startsWith("/scenarios/")
            ? data.scenarios.find((x) => x.id === slug)
            : p.startsWith("/models/")
              ? data.catalog.models.find((x) => x.id === slug)
              : undefined;
      return {
        url: origin + p,
        fingerprint: hash(
          entity || {
            p,
            version: data.catalog.version,
            recent: ["/", "/news"].includes(p) ? recent : undefined,
          },
        ),
      };
    });
}
export class BaiduService {
  private busy = false;
  private timer: ReturnType<typeof setInterval> | null = null;
  private job: Promise<unknown> | null = null;
  readonly configFile: string;
  constructor(
    private store: ContentDatabase,
    private environment = process.env.APP_ENV || "development",
    private request: typeof fetch = fetch,
    configFile?: string,
  ) {
    this.configFile =
      configFile || path.join(path.dirname(store.file), "baidu-config.json");
    store.db
      .exec(`CREATE TABLE IF NOT EXISTS baidu_queue(url TEXT PRIMARY KEY,fingerprint TEXT NOT NULL,state TEXT NOT NULL,attempts INTEGER NOT NULL DEFAULT 0,next_at INTEGER NOT NULL DEFAULT 0,submitted_at INTEGER,updated_at INTEGER NOT NULL,error TEXT);
      CREATE TABLE IF NOT EXISTS baidu_runs(id INTEGER PRIMARY KEY AUTOINCREMENT,at INTEGER NOT NULL,actor TEXT NOT NULL,requested INTEGER NOT NULL,accepted INTEGER,remaining INTEGER,outcome TEXT NOT NULL,message TEXT NOT NULL);
      INSERT OR IGNORE INTO migrations VALUES(4,datetime('now'));`);
    store.db
      .prepare(
        "UPDATE baidu_queue SET state='uncertain',error='服务在提交期间重启，请核对百度记录后手动重试' WHERE state='sending'",
      )
      .run();
  }
  private config(): Config | null {
    if (!existsSync(this.configFile)) return null;
    try {
      return JSON.parse(readFileSync(this.configFile, "utf8")) as Config;
    } catch {
      throw new CmsError(500, "百度配置文件无法读取，请联系管理员");
    }
  }
  save(input: unknown) {
    if (this.busy) throw new CmsError(409, "提交进行中，请稍后修改设置");
    const body = z
      .object({
        endpoint: z.string().max(1000).optional(),
        automatic: z.boolean(),
        batchSize: z.number().int().min(1).max(100),
        dailyLimit: z.number().int().min(1).max(10000),
      })
      .parse(input);
    const origin = new URL(this.store.publicContent().site.url).origin;
    const endpoint = parseBaiduEndpoint(
      body.endpoint?.trim() || this.config()?.endpoint || "",
      origin,
    );
    const value = { ...body, endpoint };
    writeFileSync(this.configFile + ".tmp", JSON.stringify(value), {
      mode: 0o600,
    });
    chmodSync(this.configFile + ".tmp", 0o600);
    renameSync(this.configFile + ".tmp", this.configFile);
    this.store.setMeta("baiduBlocked", null);
    return this.status();
  }
  sync() {
    const candidates = baiduCandidates(this.store),
      eligible = new Set(candidates.map((x) => x.url));
    this.store.transaction(() => {
      const upsert = this.store.db.prepare(
        `INSERT INTO baidu_queue VALUES(?,?,'pending',0,0,NULL,?,NULL) ON CONFLICT(url) DO UPDATE SET fingerprint=excluded.fingerprint,state='pending',attempts=0,next_at=0,error=NULL,updated_at=excluded.updated_at WHERE baidu_queue.fingerprint<>excluded.fingerprint`,
      );
      for (const c of candidates) upsert.run(c.url, c.fingerprint, Date.now());
      for (const r of this.store.db
        .prepare("SELECT url FROM baidu_queue")
        .all())
        if (!eligible.has(String(r.url)))
          this.store.db
            .prepare("DELETE FROM baidu_queue WHERE url=?")
            .run(r.url);
    });
    return candidates;
  }
  status(page = 1) {
    this.sync();
    const c = this.config();
    const origin = new URL(this.store.publicContent().site.url).origin;
    const total = Number(
      this.store.db.prepare("SELECT count(*) n FROM baidu_queue").get()?.n,
    );
    const quota = this.store.meta<{ date: string; remaining: number }>(
      "baiduQuota",
    );
    return {
      configured: !!c,
      production: this.environment === "production",
      origin,
      sitemap: origin + "/sitemap.xml",
      automatic: c?.automatic || false,
      batchSize: c?.batchSize || 10,
      dailyLimit: c?.dailyLimit || 100,
      protocol: c ? new URL(c.endpoint).protocol : null,
      busy: this.busy,
      total,
      page,
      pageSize: 20,
      counts: Object.fromEntries(
        this.store.db
          .prepare("SELECT state,count(*) n FROM baidu_queue GROUP BY state")
          .all()
          .map((r) => [String(r.state), Number(r.n)]),
      ),
      remaining: quota?.date === day() ? quota.remaining : null,
      blocked: this.store.meta("baiduBlocked") || null,
      items: this.store.db
        .prepare(
          "SELECT url,state,attempts,submitted_at,error FROM baidu_queue ORDER BY CASE state WHEN 'pending' THEN 0 WHEN 'failed' THEN 1 WHEN 'uncertain' THEN 2 ELSE 3 END,updated_at DESC,url LIMIT 20 OFFSET ?",
        )
        .all((page - 1) * 20),
      runs: this.store.db
        .prepare("SELECT * FROM baidu_runs ORDER BY id DESC LIMIT 20")
        .all(),
    };
  }
  retry() {
    if (this.busy) throw new CmsError(409, "正在提交，请稍后重试");
    this.store.db
      .prepare(
        "UPDATE baidu_queue SET state='pending',attempts=0,next_at=0,error=NULL WHERE state IN ('failed','uncertain')",
      )
      .run();
    return this.status();
  }
  start() {
    if (this.environment !== "production") return;
    const tick = () => {
      try {
        if (this.config()?.automatic && !this.busy) {
          this.job = this.submit("automatic").catch(() => undefined);
        }
      } catch {
        /* Invalid configuration must not stop the server. */
      }
    };
    tick();
    this.timer = setInterval(tick, 15 * 60000);
    this.timer.unref();
  }
  async stop() {
    if (this.timer) clearInterval(this.timer);
    await this.job;
  }
  async submit(actor = "admin") {
    if (this.environment !== "production")
      throw new CmsError(403, "只有生产环境可以向百度推送");
    if (this.busy) throw new CmsError(409, "已有提交正在进行");
    const c = this.config();
    if (!c) throw new CmsError(400, "请先配置百度 API 地址");
    parseBaiduEndpoint(
      c.endpoint,
      new URL(this.store.publicContent().site.url).origin,
    );
    if (this.store.meta("baiduBlocked"))
      throw new CmsError(
        400,
        "百度接口配置被拒绝，请检查站点/token 后重新保存",
      );
    this.sync();
    const quota = this.store.meta<{ date: string; remaining: number }>(
      "baiduQuota",
    );
    const daily = this.store.meta<{ date: string; used: number }>("baiduDaily");
    const used = daily?.date === day() ? daily.used : 0;
    const size = Math.min(
      c.batchSize,
      c.dailyLimit - used,
      quota?.date === day() ? quota.remaining : 100,
    );
    if (size <= 0) throw new CmsError(429, "今日提交额度已用完，次日自动继续");
    const rows = this.store.db
      .prepare(
        "SELECT * FROM baidu_queue WHERE state IN ('pending','failed') AND attempts<5 AND next_at<=? ORDER BY updated_at,url LIMIT ?",
      )
      .all(Date.now(), size) as Row[];
    if (!rows.length) return { message: "没有待提交的新链接", accepted: 0 };
    this.busy = true;
    this.store.transaction(() => {
      this.store.setMeta("baiduDaily", {
        date: day(),
        used: used + rows.length,
      });
      for (const r of rows)
        this.store.db
          .prepare(
            "UPDATE baidu_queue SET state='sending',attempts=attempts+1 WHERE url=?",
          )
          .run(r.url);
    });
    let accepted: number | null = null,
      remaining: number | null = null,
      outcome = "uncertain",
      message = "请求结果未知；请核对百度记录后手动重试";
    try {
      const response = await this.request(c.endpoint, {
        method: "POST",
        headers: { "Content-Type": "text/plain; charset=utf-8" },
        body: rows.map((r) => r.url).join("\n"),
        redirect: "error",
        signal: AbortSignal.timeout(15000),
      });
      const reader = response.body?.getReader();
      if (!reader) throw Error("empty response");
      const chunks: Uint8Array[] = [];
      let length = 0;
      try {
        while (true) {
          const part = await reader.read();
          if (part.done) break;
          length += part.value.length;
          if (length > 65536) {
            await reader.cancel();
            throw Error("response too large");
          }
          chunks.push(part.value);
        }
      } finally {
        reader.releaseLock();
      }
      const text = Buffer.concat(chunks).toString("utf8");
      const result = JSON.parse(text);
      if (!response.ok || result.error) {
        outcome = "failed";
        message = `百度返回错误 ${Number(result.error) || response.status}，请检查站点、token 或配额`;
        if ([400, 401, 403].includes(Number(result.error) || response.status))
          this.store.setMeta("baiduBlocked", message);
      } else if (
        Number.isInteger(result.success) &&
        result.success >= 0 &&
        result.success <= rows.length
      ) {
        accepted = result.success;
        remaining =
          Number.isInteger(result.remain) && result.remain >= 0
            ? result.remain
            : null;
        if (remaining !== null)
          this.store.setMeta("baiduQuota", { date: day(), remaining });
        const rejected = new Set<string>(
          [
            ...(Array.isArray(result.not_same_site)
              ? result.not_same_site
              : []),
            ...(Array.isArray(result.not_valid) ? result.not_valid : []),
          ].filter(
            (u: unknown) =>
              typeof u === "string" && rows.some((r) => r.url === u),
          ),
        );
        outcome =
          accepted === rows.length - rejected.size ? "accepted" : "uncertain";
        message =
          outcome === "accepted"
            ? `百度接收 ${accepted} 条（不等于已收录）`
            : "百度仅返回部分成功数量，无法判断具体链接；请人工核对";
        for (const r of rows) {
          const state = rejected.has(r.url)
            ? "failed"
            : outcome === "accepted"
              ? "sent"
              : "uncertain";
          this.store.db
            .prepare(
              "UPDATE baidu_queue SET state=?,submitted_at=?,error=?,next_at=? WHERE url=? AND fingerprint=? AND state='sending'",
            )
            .run(
              state,
              state === "sent" ? Date.now() : null,
              state === "sent"
                ? null
                : rejected.has(r.url)
                  ? "百度拒绝此链接"
                  : message,
              Date.now() + 3600000,
              r.url,
              r.fingerprint,
            );
        }
      }
    } catch {
      /* Never expose the request URL/token via error messages or logs. */
    } finally {
      this.store.transaction(() => {
        for (const r of rows)
          this.store.db
            .prepare(
              "UPDATE baidu_queue SET state=?,error=?,next_at=? WHERE url=? AND fingerprint=? AND state='sending'",
            )
            .run(
              outcome === "failed" ? "failed" : "uncertain",
              message,
              Date.now() + Math.min(86400000, 300000 * 2 ** r.attempts),
              r.url,
              r.fingerprint,
            );
        this.store.db
          .prepare(
            "INSERT INTO baidu_runs(at,actor,requested,accepted,remaining,outcome,message) VALUES(?,?,?,?,?,?,?)",
          )
          .run(
            Date.now(),
            actor,
            rows.length,
            accepted,
            remaining,
            outcome,
            message,
          );
        this.store.db.exec(
          "DELETE FROM baidu_runs WHERE id NOT IN (SELECT id FROM baidu_runs ORDER BY id DESC LIMIT 500)",
        );
      });
      this.busy = false;
    }
    return { accepted, remaining, outcome, message };
  }
}
export function baiduAdminRouter(service: BaiduService) {
  const router = Router();
  router.get("/", (req, res) =>
    res.json(
      service.status(
        z.coerce
          .number()
          .int()
          .min(1)
          .max(100000)
          .parse(req.query.page || 1),
      ),
    ),
  );
  router.put("/config", (req, res) => res.json(service.save(req.body)));
  router.post("/submit", async (_req, res) => res.json(await service.submit()));
  router.post("/retry", (_req, res) => res.json(service.retry()));
  router.get("/urls.txt", (_req, res) =>
    res
      .type("text/plain")
      .attachment("baidu-urls.txt")
      .send(
        service
          .sync()
          .map((x) => x.url)
          .join("\n"),
      ),
  );
  return router;
}
