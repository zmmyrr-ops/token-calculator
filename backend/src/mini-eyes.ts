import { Router, type Request } from "express";
import { requireMiniModule } from "./mini-settings";
import { z } from "zod";
import { ContentDatabase, CmsError } from "./database";
import { mobileResultSchema } from "../../shared/ai-eyes-mobile";
import { eyesCatalog } from "../../shared/ai-eyes";
import {
  matchMobileBehavior,
  mobileMatcherVersion,
} from "./ai-eyes-mobile-match";
export function initMiniEyes(store: ContentDatabase) {
  store.db.exec(
    "CREATE TABLE IF NOT EXISTS mini_eyes_results(user_id TEXT PRIMARY KEY REFERENCES community_users(id),payload TEXT NOT NULL,expires INTEGER NOT NULL);",
  );
}
export function pruneMiniEyes(store: ContentDatabase) {
  store.db
    .prepare("DELETE FROM mini_eyes_results WHERE expires<=?")
    .run(Date.now());
}
export function miniEyesRouter(
  store: ContentDatabase,
  auth: (req: Request) => { id: string },
  limit: (key: string, max: number, ms: number) => void,
) {
  initMiniEyes(store);
  const r = Router();
  r.use((req, res, next) => {
    res.set("Cache-Control", "no-store");
    if (req.method !== "DELETE") requireMiniModule(store, "eyes");
    res.locals.userId = auth(req).id;
    store.db
      .prepare("DELETE FROM mini_eyes_results WHERE expires<=?")
      .run(Date.now());
    next();
  });
  const read = (id: string) => {
    const row = store.db
      .prepare("SELECT payload,expires FROM mini_eyes_results WHERE user_id=?")
      .get(id);
    if (!row) return null;
    const value = JSON.parse(String(row.payload));
    const p = eyesCatalog.items.find((p) => p.id === value.result.persona_id)!;
    return {
      ...value,
      expires: row.expires,
      persona: {
        id: p.id,
        name: p.name,
        keyword: p.keyword,
        blocks: p.blocks.map((b) => ({
          kind: b.kind,
          text: b.runs.map((r) => r.text).join(""),
        })),
      },
      cover: "/ai-eyes-art/" + p.id + "-cover-v4.png",
    };
  };
  r.get("/", (_req, res) => res.json({ result: read(res.locals.userId) }));
  r.post("/", (req, res) => {
    if (
      !store.db.prepare("SELECT enabled FROM ai_eyes_settings").get()?.enabled
    )
      throw new CmsError(503, "功能维护中，稍后再来");
    const data = z
      .object({
        result: mobileResultSchema,
        platform: z.enum(["豆包", "DeepSeek", "其他 AI"]),
        confirmed: z.literal(true),
      })
      .strict()
      .parse(req.body);
    limit("mini-eyes:" + res.locals.userId, 6, 3600000);
    const value = {
      result: matchMobileBehavior(data.result),
      basis: data.result.basis,
      platform: data.platform,
      matcherVersion: mobileMatcherVersion,
      created: Date.now(),
    };
    store.db
      .prepare(
        "INSERT INTO mini_eyes_results VALUES(?,?,?) ON CONFLICT(user_id) DO UPDATE SET payload=excluded.payload,expires=excluded.expires",
      )
      .run(
        res.locals.userId,
        JSON.stringify(value),
        Date.now() + 30 * 86400000,
      );
    res.status(201).json({ result: read(res.locals.userId) });
  });
  r.delete("/", (_req, res) => {
    store.db
      .prepare("DELETE FROM mini_eyes_results WHERE user_id=?")
      .run(res.locals.userId);
    res.json({ ok: true });
  });
  return r;
}
