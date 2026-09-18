import { recordEyesDeletion, replayEyesDeletions } from "./ai-eyes-deletions";
import { Router, type Request, type Response } from "express";
import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { ContentDatabase, CmsError } from "./database";
import {
  eyesCatalog,
  eyesCoverVersion,
  matchSchema,
  selectionSchema,
  type EyesRun,
  type EyesMatch,
} from "../../shared/ai-eyes";
const DAY = 86400000,
  hash = (s: string) => createHash("sha256").update(s).digest("hex"),
  secret = () => randomBytes(32).toString("base64url");
type Row = {
  id: string;
  owner: string;
  submit_hash: string;
  claim_hash: string;
  claim_owner: string | null;
  state: string;
  phase: string;
  created: number;
  deadline: number;
  expires: number;
  scope: string;
  result: string | null;
  result_hash: string | null;
  selection: string | null;
  share_id: string | null;
  error: string | null;
};
export function initEyes(store: ContentDatabase) {
  store.db.exec(`
 CREATE TABLE IF NOT EXISTS ai_eyes_versions(version TEXT PRIMARY KEY,hash TEXT NOT NULL,content TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS ai_eyes_runs(id TEXT PRIMARY KEY,owner TEXT NOT NULL,submit_hash TEXT NOT NULL,claim_hash TEXT NOT NULL,claim_owner TEXT,state TEXT NOT NULL,phase TEXT NOT NULL,created INTEGER NOT NULL,deadline INTEGER NOT NULL,expires INTEGER NOT NULL,scope TEXT NOT NULL,result TEXT,result_hash TEXT,selection TEXT,share_id TEXT,error TEXT);
 CREATE TABLE IF NOT EXISTS ai_eyes_grants(run_id TEXT NOT NULL REFERENCES ai_eyes_runs(id) ON DELETE CASCADE,owner TEXT NOT NULL,PRIMARY KEY(run_id,owner));
 CREATE TABLE IF NOT EXISTS ai_eyes_shares(id TEXT PRIMARY KEY,run_id TEXT NOT NULL REFERENCES ai_eyes_runs(id) ON DELETE CASCADE,snapshot TEXT NOT NULL,expires INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS ai_eyes_feedback(run_id TEXT PRIMARY KEY REFERENCES ai_eyes_runs(id) ON DELETE CASCADE,value TEXT NOT NULL,created INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS ai_eyes_limits(key TEXT PRIMARY KEY,count INTEGER NOT NULL,expires INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS ai_eyes_events(day TEXT NOT NULL,event TEXT NOT NULL,count INTEGER NOT NULL,PRIMARY KEY(day,event));
 CREATE TABLE IF NOT EXISTS ai_eyes_audit(at INTEGER NOT NULL,action TEXT NOT NULL,target TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS ai_eyes_settings(id INTEGER PRIMARY KEY CHECK(id=1),enabled INTEGER NOT NULL);
 INSERT OR IGNORE INTO ai_eyes_settings VALUES(1,1);
 CREATE INDEX IF NOT EXISTS ai_eyes_expiry ON ai_eyes_runs(expires);
`);
  replayEyesDeletions(store);
  const existing = store.db
    .prepare("SELECT hash FROM ai_eyes_versions WHERE version=?")
    .get(eyesCatalog.version);
  if (existing && existing.hash !== eyesCatalog.sha256)
    throw Error("AI eyes content version is immutable; create a new version");
  store.db
    .prepare("INSERT OR IGNORE INTO ai_eyes_versions VALUES(?,?,?)")
    .run(eyesCatalog.version, eyesCatalog.sha256, JSON.stringify(eyesCatalog));
}
export function pruneEyes(store: ContentDatabase, now = Date.now()) {
  store.db
    .prepare(
      "UPDATE ai_eyes_runs SET state='expired',error='执行已超时' WHERE state IN ('waiting','running') AND deadline<=?",
    )
    .run(now);
  store.db.prepare("DELETE FROM ai_eyes_runs WHERE expires<=?").run(now);
  store.db
    .prepare("DELETE FROM ai_eyes_events WHERE day<?")
    .run(new Date(now - 90 * DAY).toISOString().slice(0, 10));
  store.db.prepare("DELETE FROM ai_eyes_audit WHERE at<?").run(now - 90 * DAY);
  store.db.prepare("DELETE FROM ai_eyes_limits WHERE expires<=?").run(now);
  store.db.prepare("DELETE FROM ai_eyes_shares WHERE expires<=?").run(now);
}
function cookieName() {
  return process.env.APP_ENV === "staging" ? "eyes_staging" : "eyes_session";
}
function owner(req: Request, res: Response, create = false) {
  const token = req.headers.cookie
    ?.split(";")
    .map((x) => x.trim())
    .find((x) => x.startsWith(cookieName() + "="))
    ?.slice(cookieName().length + 1);
  if (token && /^[A-Za-z0-9_-]{43}$/.test(token)) return hash(token);
  if (!create)
    throw new CmsError(401, "请使用创建任务的浏览器，或打开领取链接");
  const value = secret();
  res.cookie(cookieName(), value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: process.env.APP_ENV === "staging" ? "/staging" : "/",
    maxAge: 31 * DAY,
  });
  return hash(value);
}
function dto(r: Row): EyesRun {
  return {
    id: r.id,
    status: r.state as EyesRun["status"],
    phase: r.phase,
    created: r.created,
    deadline: r.deadline,
    expires: r.expires,
    scope: JSON.parse(r.scope),
    result: r.result ? JSON.parse(r.result) : null,
    selection: r.selection ? JSON.parse(r.selection) : null,
    shareId: r.share_id,
    error: r.error,
  };
}
function browserWrite(req: Request) {
  const origins = [process.env.SITE_URL || "https://ruming.top"];
  if (process.env.NODE_ENV !== "production")
    origins.push("http://127.0.0.1:3000", "http://localhost:3000");
  if (!origins.includes(req.headers.origin || ""))
    throw new CmsError(403, "请求来源不被允许");
}
export function eyesRouter(store: ContentDatabase) {
  const r = Router();
  r.use((req, res, next) => {
    res.set({
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex",
      "Referrer-Policy": "no-referrer",
    });
    pruneEyes(store);
    if (
      !["GET", "HEAD"].includes(req.method) &&
      !/^\/runs\/[^/]+\/(progress|result|failure)$/.test(req.path)
    )
      browserWrite(req);
    if (Number(req.headers["content-length"] || 0) > 16384)
      throw new CmsError(413, "请求过大");
    next();
  });
  const read = (id: string) => {
    const row = store.db
      .prepare("SELECT * FROM ai_eyes_runs WHERE id=?")
      .get(id) as Row | undefined;
    if (!row) throw new CmsError(404, "任务不存在或已删除");
    return row;
  };
  const owned = (req: Request, res: Response) => {
    const row = read(String(req.params.id));
    const who = owner(req, res);
    if (
      row.owner !== who &&
      !store.db
        .prepare("SELECT 1 FROM ai_eyes_grants WHERE run_id=? AND owner=?")
        .get(row.id, who)
    )
      throw new CmsError(403, "无权查看此任务");
    return row;
  };
  const executor = (req: Request) => {
    const row = read(String(req.params.id));
    const value = (req.headers.authorization || "").replace(/^Bearer /, "");
    if (!value || hash(value) !== row.submit_hash)
      throw new CmsError(403, "执行凭证无效");
    if (row.deadline <= Date.now()) throw new CmsError(410, "执行凭证已到期");
    return row;
  };
  const active = (row: Row) => {
    if (!["waiting", "running"].includes(row.state))
      throw new CmsError(409, "任务已结束，不能修改");
  };
  const limit = (key: string, max: number) => {
    const n = Number(
      store.db.prepare("SELECT count FROM ai_eyes_limits WHERE key=?").get(key)
        ?.count || 0,
    );
    if (n >= max) throw new CmsError(429, "操作频繁，请一小时后再试");
    store.db
      .prepare(
        "INSERT INTO ai_eyes_limits VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1",
      )
      .run(key, Date.now() + 3600000);
  };
  r.post("/events", (req, res) => {
    const { event } = z
      .object({
        event: z.enum([
          "copy_instruction",
          "export_cover",
          "export_long",
          "export_pages",
          "download_image",
          "download_zip",
        ]),
      })
      .strict()
      .parse(req.body);
    limit("event:" + owner(req, res, true), 120);
    store.db
      .prepare(
        "INSERT INTO ai_eyes_events VALUES(?,?,1) ON CONFLICT(day,event) DO UPDATE SET count=count+1",
      )
      .run(new Date().toISOString().slice(0, 10), event);
    res.json({ ok: true });
  });
  r.get("/catalog/:version", (req, res) => {
    const row = store.db
      .prepare("SELECT content FROM ai_eyes_versions WHERE version=?")
      .get(String(req.params.version));
    if (!row) throw new CmsError(404, "原文版本不存在");
    res.json(JSON.parse(String(row.content)));
  });
  r.get("/catalog", (_q, res) => res.json(eyesCatalog));
  r.get("/config", (_q, res) =>
    res.json({
      enabled: !!store.db.prepare("SELECT enabled FROM ai_eyes_settings").get()
        ?.enabled,
    }),
  );
  r.post("/runs", (req, res) => {
    if (
      !store.db.prepare("SELECT enabled FROM ai_eyes_settings").get()?.enabled
    )
      throw new CmsError(503, "功能维护中，稍后再来");
    const { days, timeZone } = z
      .object({
        days: z.union([z.literal(7), z.literal(30)]),
        timeZone: z
          .string()
          .max(80)
          .refine((x) => {
            try {
              new Intl.DateTimeFormat("en", { timeZone: x });
              return true;
            } catch {
              return false;
            }
          }),
      })
      .strict()
      .parse(req.body);
    const who = owner(req, res, true);
    limit("owner:" + who, 6);
    limit("ip:" + hash(req.ip || req.socket.remoteAddress || "unknown"), 30);
    const id = randomBytes(18).toString("base64url"),
      submit = secret(),
      claim = secret(),
      now = Date.now();
    const scope = {
      days,
      timeZone,
      start: new Date(now - days * DAY).toISOString(),
      end: new Date(now).toISOString(),
    };
    store.db
      .prepare(
        `INSERT INTO ai_eyes_runs(id,owner,submit_hash,claim_hash,state,phase,created,deadline,expires,scope) VALUES(?,?,?,?,'waiting','waiting',?,?,?,?)`,
      )
      .run(
        id,
        who,
        hash(submit),
        hash(claim),
        now,
        now + 1800000,
        now + 30 * DAY,
        JSON.stringify(scope),
      );
    res
      .status(201)
      .json({ run: dto(read(id)), submitToken: submit, claimToken: claim });
  });
  r.get("/runs/:id", (req, res) => res.json(dto(owned(req, res))));
  r.get("/runs/:id/execution", (req, res) => {
    const row = executor(req);
    active(row);
    res.json({
      id: row.id,
      ...JSON.parse(row.scope),
      deadline: row.deadline,
      catalog_version: eyesCatalog.version,
      max_sessions: 10,
      max_messages: 15,
      max_characters: 20000,
    });
  });
  r.post("/runs/:id/progress", (req, res) => {
    const { phase } = z
      .object({ phase: z.enum(["collecting", "matching", "validating"]) })
      .strict()
      .parse(req.body);
    store.transaction(() => {
      const row = executor(req);
      active(row);
      if (
        ["waiting", "collecting", "matching", "validating"].indexOf(phase) <
        ["waiting", "collecting", "matching", "validating"].indexOf(row.phase)
      )
        throw new CmsError(409, "阶段不可倒退");
      store.db
        .prepare("UPDATE ai_eyes_runs SET state='running',phase=? WHERE id=?")
        .run(phase, row.id);
    });
    res.json({ ok: true });
  });
  r.post("/runs/:id/result", (req, res) => {
    const result = matchSchema.parse(req.body);
    store.transaction(() => {
      const row = executor(req),
        digest = hash(JSON.stringify(result));
      if (row.state === "completed" && row.result_hash === digest) return;
      active(row);
      store.db
        .prepare(
          "UPDATE ai_eyes_runs SET state='completed',phase='completed',result=?,result_hash=?,selection=?,expires=? WHERE id=?",
        )
        .run(
          JSON.stringify(result),
          digest,
          JSON.stringify({ personaId: result.persona_id, nickname: "我" }),
          Date.now() + 30 * DAY,
          row.id,
        );
    });
    res.json({ ok: true });
  });
  r.post("/runs/:id/failure", (req, res) => {
    const { code } = z
      .object({
        code: z.enum([
          "insufficient_data",
          "unsupported",
          "permission_denied",
          "collection_failed",
          "invalid_result",
        ]),
      })
      .strict()
      .parse(req.body);
    const messages = {
      insufficient_data: "样本不足，可扩大范围重试",
      unsupported: "当前环境或记录格式暂不支持",
      permission_denied: "当前环境未授予读取权限",
      collection_failed: "读取失败，请检查执行端说明",
      invalid_result: "结果校验未通过",
    };
    store.transaction(() => {
      const row = executor(req);
      active(row);
      store.db
        .prepare("UPDATE ai_eyes_runs SET state=?,error=? WHERE id=?")
        .run(
          code === "insufficient_data" ? "insufficient_data" : "failed",
          messages[code],
          row.id,
        );
    });
    res.json({ ok: true });
  });
  r.post("/runs/:id/cancel", (req, res) => {
    store.transaction(() => {
      const row = owned(req, res);
      active(row);
      store.db
        .prepare("UPDATE ai_eyes_runs SET state='cancelled' WHERE id=?")
        .run(row.id);
    });
    res.json({ ok: true });
  });
  r.post("/claims/redeem", (req, res) => {
    const { token } = z
      .object({ token: z.string().regex(/^[A-Za-z0-9_-]{43}$/) })
      .strict()
      .parse(req.body);
    const who = owner(req, res, true);
    limit("claim:" + who, 20);
    let id = "";
    store.transaction(() => {
      const row = store.db
        .prepare("SELECT * FROM ai_eyes_runs WHERE claim_hash=?")
        .get(hash(token)) as Row | undefined;
      if (!row || row.created + DAY <= Date.now())
        throw new CmsError(410, "领取链接无效或已过期");
      if (row.claim_owner && row.claim_owner !== who)
        throw new CmsError(409, "链接已在其他浏览器领取");
      store.db
        .prepare("UPDATE ai_eyes_runs SET claim_owner=? WHERE id=?")
        .run(who, row.id);
      store.db
        .prepare("INSERT OR IGNORE INTO ai_eyes_grants VALUES(?,?)")
        .run(row.id, who);
      id = row.id;
    });
    res.json({ id });
  });
  r.post("/runs/:id/selection", (req, res) => {
    const data = selectionSchema.parse(req.body),
      row = owned(req, res);
    if (row.state !== "completed") throw new CmsError(409, "任务尚未完成");
    store.db
      .prepare("UPDATE ai_eyes_runs SET selection=? WHERE id=?")
      .run(JSON.stringify(data), row.id);
    res.json(dto(read(row.id)));
  });
  r.post("/runs/:id/share", (req, res) => {
    const { confirmed, selection } = z
      .object({ confirmed: z.literal(true), selection: selectionSchema })
      .strict()
      .parse(req.body);
    void confirmed;
    let id = "";
    store.transaction(() => {
      const row = owned(req, res);
      if (row.state !== "completed") throw new CmsError(409, "任务尚未完成");
      id = randomBytes(18).toString("base64url");
      const result = JSON.parse(row.result!) as EyesMatch;
      const snapshot = {
        ...selection,
        selectionMode:
          selection.personaId === result.persona_id
            ? "recommended"
            : "self_selected",
        catalogVersion: eyesCatalog.version,
        layoutVersion: eyesCoverVersion,
      };
      if (row.share_id) recordEyesDeletion(store, "share", row.share_id);
      store.db.prepare("DELETE FROM ai_eyes_shares WHERE run_id=?").run(row.id);
      store.db
        .prepare("INSERT INTO ai_eyes_shares VALUES(?,?,?,?)")
        .run(id, row.id, JSON.stringify(snapshot), row.expires);
      store.db
        .prepare("UPDATE ai_eyes_runs SET share_id=? WHERE id=?")
        .run(id, row.id);
    });
    res.status(201).json({ id });
  });
  r.get("/shares/:id", (req, res) => {
    const row = store.db
      .prepare("SELECT snapshot FROM ai_eyes_shares WHERE id=?")
      .get(String(req.params.id));
    if (!row) throw new CmsError(404, "分享已撤销、删除或到期");
    res.json(JSON.parse(String(row.snapshot)));
  });
  r.delete("/runs/:id/share", (req, res) => {
    const row = owned(req, res);
    store.transaction(() => {
      if (row.share_id) recordEyesDeletion(store, "share", row.share_id);
      store.db.prepare("DELETE FROM ai_eyes_shares WHERE run_id=?").run(row.id);
      store.db
        .prepare("UPDATE ai_eyes_runs SET share_id=NULL WHERE id=?")
        .run(row.id);
    });
    res.json({ ok: true });
  });
  r.delete("/runs/:id", (req, res) => {
    const row = owned(req, res);
    recordEyesDeletion(store, "run", row.id);
    store.db.prepare("DELETE FROM ai_eyes_runs WHERE id=?").run(row.id);
    res.json({ ok: true });
  });
  r.post("/runs/:id/feedback", (req, res) => {
    const row = owned(req, res);
    const data = z
      .object({
        fun: z.enum(["有意思", "一般", "没感觉"]),
        recognition: z.enum(["有点像我", "不太像", "暂不评价"]),
        reading: z.enum(["舒服", "太密", "字太小"]),
      })
      .strict()
      .parse(req.body);
    store.db
      .prepare(
        "INSERT INTO ai_eyes_feedback VALUES(?,?,?) ON CONFLICT(run_id) DO UPDATE SET value=excluded.value",
      )
      .run(row.id, JSON.stringify(data), Date.now());
    res.json({ ok: true });
  });
  return r;
}
export function eyesAdminRouter(store: ContentDatabase) {
  const r = Router();
  r.get("/", (_req, res) => {
    pruneEyes(store);
    res.json({
      enabled: !!store.db.prepare("SELECT enabled FROM ai_eyes_settings").get()
        ?.enabled,
      version: eyesCatalog.version,
      hash: eyesCatalog.sha256,
      layoutVersion: eyesCoverVersion,
      types: eyesCatalog.items.length,
      counts: store.db
        .prepare("SELECT state,count(*) count FROM ai_eyes_runs GROUP BY state")
        .all(),
      runs: store.db
        .prepare(
          "SELECT id,state,phase,created,expires,error FROM ai_eyes_runs ORDER BY created DESC LIMIT 100",
        )
        .all(),
      shares: store.db
        .prepare(
          "SELECT id,expires FROM ai_eyes_shares ORDER BY rowid DESC LIMIT 100",
        )
        .all(),
      events: store.db
        .prepare(
          "SELECT event,sum(count) count FROM ai_eyes_events GROUP BY event",
        )
        .all(),
      audit: store.db
        .prepare(
          "SELECT at,action,target FROM ai_eyes_audit ORDER BY at DESC LIMIT 100",
        )
        .all(),
      feedback: store.db
        .prepare(
          "SELECT value,count(*) count FROM ai_eyes_feedback GROUP BY value",
        )
        .all(),
    });
  });
  r.put("/settings", (req, res) => {
    const { enabled } = z
      .object({ enabled: z.boolean() })
      .strict()
      .parse(req.body);
    store.db
      .prepare("UPDATE ai_eyes_settings SET enabled=?")
      .run(enabled ? 1 : 0);
    store.db
      .prepare("INSERT INTO ai_eyes_audit VALUES(?,?,?)")
      .run(Date.now(), "set_enabled", String(enabled));
    res.json({ ok: true });
  });
  r.delete("/shares/:id", (req, res) => {
    recordEyesDeletion(store, "share", String(req.params.id));
    store.db
      .prepare("INSERT INTO ai_eyes_audit VALUES(?,?,?)")
      .run(Date.now(), "revoke_share", String(req.params.id));
    store.transaction(() => {
      store.db
        .prepare("UPDATE ai_eyes_runs SET share_id=NULL WHERE share_id=?")
        .run(String(req.params.id));
      store.db
        .prepare("DELETE FROM ai_eyes_shares WHERE id=?")
        .run(String(req.params.id));
    });
    res.json({ ok: true });
  });
  return r;
}
