import { Router, type Request } from "express";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { ContentDatabase, CmsError } from "./database";
import { taskPacks } from "../../shared/task-packs";
import {
  workspaceItemSchema,
  promptInput,
  projectInput,
  type TaskPack,
} from "../../shared/workspace";
export function initWorkspace(store: ContentDatabase) {
  store.db
    .exec(`CREATE TABLE IF NOT EXISTS workspace_items(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES community_users(id),href TEXT NOT NULL,value TEXT NOT NULL,updated INTEGER NOT NULL,UNIQUE(user_id,href));
 CREATE TABLE IF NOT EXISTS workspace_prompts(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES community_users(id),value TEXT NOT NULL,revision INTEGER NOT NULL,updated INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS workspace_prompt_versions(prompt_id TEXT NOT NULL REFERENCES workspace_prompts(id) ON DELETE CASCADE,revision INTEGER NOT NULL,value TEXT NOT NULL,created INTEGER NOT NULL,PRIMARY KEY(prompt_id,revision));
 CREATE TABLE IF NOT EXISTS workspace_projects(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES community_users(id),pack TEXT NOT NULL,value TEXT NOT NULL,revision INTEGER NOT NULL,updated INTEGER NOT NULL);
 CREATE INDEX IF NOT EXISTS workspace_items_owner ON workspace_items(user_id,updated);
 CREATE INDEX IF NOT EXISTS workspace_prompts_owner ON workspace_prompts(user_id,updated);
 CREATE INDEX IF NOT EXISTS workspace_projects_owner ON workspace_projects(user_id,updated);`);
}
type Row = {
  id: string;
  user_id: string;
  value: string;
  revision: number;
  updated: number;
  pack?: string;
};
const dto = (r: Row) => ({
  ...JSON.parse(r.value),
  id: r.id,
  revision: r.revision,
  updated: r.updated,
  ...(r.pack ? { pack: JSON.parse(r.pack) } : {}),
});
export function workspaceRouter(
  store: ContentDatabase,
  auth: (req: Request) => { id: string },
  validateImage: (v: unknown) => unknown,
) {
  const r = Router(),
    db = store.db;
  r.get("/packs", (_req, res) => res.json({ items: taskPacks }));
  r.get("/packs/:id", (req, res) => {
    const p = taskPacks.find((p) => p.id === req.params.id);
    if (!p) throw new CmsError(404, "任务包不存在");
    res.json(p);
  });
  r.use((req, res, next) => {
    res.locals.owner = auth(req).id;
    res.set("Cache-Control", "no-store");
    next();
  });
  function owned(table: string, id: unknown, user: string) {
    const row = db
      .prepare(`SELECT * FROM ${table} WHERE id=? AND user_id=?`)
      .get(String(id), user) as Row | undefined;
    if (!row) throw new CmsError(404, "内容不存在");
    return row;
  }
  function quota(table: string, user: string, max: number) {
    if (
      Number(
        db.prepare(`SELECT count(*) n FROM ${table} WHERE user_id=?`).get(user)
          ?.n,
      ) >= max
    )
      throw new CmsError(409, `最多保存 ${max} 条，请先整理`);
  }
  r.get("/", (_req, res) => {
    const user = res.locals.owner;
    res.json({
      itemCount: Number(
        db
          .prepare("SELECT count(*) n FROM workspace_items WHERE user_id=?")
          .get(user)?.n,
      ),
      prompts: (
        db
          .prepare(
            "SELECT * FROM workspace_prompts WHERE user_id=? ORDER BY updated DESC",
          )
          .all(user) as Row[]
      ).map((x) => {
        const v = dto(x);
        return { ...v, body: undefined };
      }),
      projects: (
        db
          .prepare(
            "SELECT * FROM workspace_projects WHERE user_id=? ORDER BY updated DESC",
          )
          .all(user) as Row[]
      ).map((x) => {
        const v = dto(x);
        return {
          id: x.id,
          title: v.title,
          updated: x.updated,
          revision: x.revision,
          packId: v.pack.id,
          packTitle: v.pack.title,
          total: v.pack.steps.length,
          done: v.completed.length,
        };
      }),
    });
  });
  r.get("/items", (req, res) => {
    const query = z
      .object({
        q: z.string().max(100).default(""),
        kind: z
          .union([z.literal("全部"), workspaceItemSchema.shape.kind])
          .default("全部"),
        page: z.coerce.number().int().min(1).max(10000).default(1),
      })
      .strict()
      .parse(req.query);
    const where =
      "user_id=? AND (?='全部' OR json_extract(value,'$.kind')=?) AND instr(lower(json_extract(value,'$.title')||' '||json_extract(value,'$.category')||' '||json_extract(value,'$.note')),lower(?))>0";
    const args = [res.locals.owner, query.kind, query.kind, query.q];
    const total = Number(
      db
        .prepare(`SELECT count(*) n FROM workspace_items WHERE ${where}`)
        .get(...args)?.n,
    );
    res.json({
      items: (
        db
          .prepare(
            `SELECT * FROM workspace_items WHERE ${where} ORDER BY updated DESC,id LIMIT 24 OFFSET ?`,
          )
          .all(...args, (query.page - 1) * 24) as Row[]
      ).map(dto),
      total,
      page: query.page,
      pageSize: 24,
    });
  });
  r.post("/items", (req, res) => {
    const v = workspaceItemSchema.parse(req.body),
      user = res.locals.owner;
    let id = "";
    store.transaction(() => {
      const existing = db
        .prepare(
          "SELECT id,value FROM workspace_items WHERE user_id=? AND href=?",
        )
        .get(user, v.href);
      if (!existing) quota("workspace_items", user, 500);
      id = String(existing?.id || randomUUID());
      db.prepare(
        "INSERT INTO workspace_items VALUES(?,?,?,?,?) ON CONFLICT(user_id,href) DO UPDATE SET value=excluded.value,updated=excluded.updated",
      ).run(
        id,
        user,
        v.href,
        existing ? String(existing.value) : JSON.stringify(v),
        Date.now(),
      );
    });
    res.status(201).json({ id });
  });
  r.patch("/items/:id", (req, res) => {
    const v = z
      .object({
        category: z.string().trim().max(40),
        note: z.string().max(4000),
      })
      .strict()
      .parse(req.body);
    const old = owned("workspace_items", req.params.id, res.locals.owner);
    db.prepare("UPDATE workspace_items SET value=?,updated=? WHERE id=?").run(
      JSON.stringify({ ...JSON.parse(old.value), ...v }),
      Date.now(),
      old.id,
    );
    res.json({ ok: true });
  });
  r.delete("/items/:id", (req, res) => {
    owned("workspace_items", req.params.id, res.locals.owner);
    db.prepare("DELETE FROM workspace_items WHERE id=? AND user_id=?").run(
      String(req.params.id),
      res.locals.owner,
    );
    res.json({ ok: true });
  });
  r.post("/prompts", (req, res) => {
    const v = promptInput.parse(req.body),
      user = res.locals.owner,
      id = randomUUID(),
      now = Date.now();
    store.transaction(() => {
      quota("workspace_prompts", user, 100);
      db.prepare("INSERT INTO workspace_prompts VALUES(?,?,?,1,?)").run(
        id,
        user,
        JSON.stringify(v),
        now,
      );
      db.prepare("INSERT INTO workspace_prompt_versions VALUES(?,1,?,?)").run(
        id,
        JSON.stringify(v),
        now,
      );
    });
    res.status(201).json({ id });
  });
  r.get("/prompts/:id", (req, res) =>
    res.json(dto(owned("workspace_prompts", req.params.id, res.locals.owner))),
  );
  r.get("/prompts/:id/versions", (req, res) => {
    const p = owned("workspace_prompts", req.params.id, res.locals.owner);
    res.json({
      items: db
        .prepare(
          "SELECT revision,value,created FROM workspace_prompt_versions WHERE prompt_id=? ORDER BY revision DESC",
        )
        .all(p.id)
        .map((v) => ({
          ...JSON.parse(String(v.value)),
          revision: v.revision,
          created: v.created,
        })),
    });
  });
  r.put("/prompts/:id", (req, res) => {
    const { revision, ...v } = promptInput
      .extend({ revision: z.number().int().positive() })
      .parse(req.body);
    let saved: Row;
    store.transaction(() => {
      const old = owned("workspace_prompts", req.params.id, res.locals.owner);
      if (old.revision !== revision)
        throw new CmsError(409, "内容已在其他页面更新，请重新打开后编辑");
      if (revision >= 50)
        throw new CmsError(409, "已保存50个版本，请复制为新的提示词");
      const now = Date.now();
      db.prepare(
        "UPDATE workspace_prompts SET value=?,revision=revision+1,updated=? WHERE id=?",
      ).run(JSON.stringify(v), now, old.id);
      db.prepare("INSERT INTO workspace_prompt_versions VALUES(?,?,?,?)").run(
        old.id,
        revision + 1,
        JSON.stringify(v),
        now,
      );
      saved = owned("workspace_prompts", old.id, res.locals.owner);
    });
    res.json(dto(saved!));
  });
  r.delete("/prompts/:id", (req, res) => {
    const p = owned("workspace_prompts", req.params.id, res.locals.owner);
    store.transaction(() => {
      db.prepare("DELETE FROM workspace_prompt_versions WHERE prompt_id=?").run(
        p.id,
      );
      db.prepare("DELETE FROM workspace_prompts WHERE id=?").run(p.id);
    });
    res.json({ ok: true });
  });
  r.post("/projects", (req, res) => {
    const { packId } = z
      .object({ packId: z.string() })
      .strict()
      .parse(req.body);
    const pack = taskPacks.find((p) => p.id === packId);
    if (!pack) throw new CmsError(404, "任务包不存在");
    const user = res.locals.owner,
      id = randomUUID();
    store.transaction(() => {
      quota("workspace_projects", user, 30);
      db.prepare("INSERT INTO workspace_projects VALUES(?,?,?,?,1,?)").run(
        id,
        user,
        JSON.stringify(pack),
        JSON.stringify({
          title: pack.title,
          completed: [],
          notes: "",
          outcome: "",
          url: "",
          image: "",
        }),
        Date.now(),
      );
    });
    res.status(201).json({ id });
  });
  r.get("/projects/:id", (req, res) =>
    res.json(dto(owned("workspace_projects", req.params.id, res.locals.owner))),
  );
  r.put("/projects/:id", (req, res) => {
    const { revision, ...v } = projectInput
      .extend({ revision: z.number().int().positive() })
      .parse(req.body);
    if (v.image) validateImage(v.image);
    let saved: Row;
    store.transaction(() => {
      const old = owned("workspace_projects", req.params.id, res.locals.owner),
        pack = JSON.parse(old.pack!) as TaskPack;
      if (old.revision !== revision)
        throw new CmsError(409, "项目已在其他页面更新，请重新打开后编辑");
      if (
        v.completed.some((id) => !pack.steps.some((s) => s.id === id)) ||
        new Set(v.completed).size !== v.completed.length
      )
        throw new CmsError(400, "进度包含无效步骤");
      db.prepare(
        "UPDATE workspace_projects SET value=?,revision=revision+1,updated=? WHERE id=?",
      ).run(JSON.stringify(v), Date.now(), old.id);
      saved = owned("workspace_projects", old.id, res.locals.owner);
    });
    res.json(dto(saved!));
  });
  r.delete("/projects/:id", (req, res) => {
    const p = owned("workspace_projects", req.params.id, res.locals.owner);
    db.prepare("DELETE FROM workspace_projects WHERE id=?").run(p.id);
    res.json({ ok: true });
  });
  r.get("/export", (_req, res) => {
    const u = res.locals.owner;
    res.json({
      version: 1,
      exportedAt: new Date().toISOString(),
      items: (
        db
          .prepare("SELECT * FROM workspace_items WHERE user_id=?")
          .all(u) as Row[]
      ).map(dto),
      prompts: (
        db
          .prepare("SELECT * FROM workspace_prompts WHERE user_id=?")
          .all(u) as Row[]
      ).map((p) => ({
        ...dto(p),
        versions: db
          .prepare(
            "SELECT revision,value,created FROM workspace_prompt_versions WHERE prompt_id=?",
          )
          .all(p.id)
          .map((v) => ({
            ...JSON.parse(String(v.value)),
            revision: v.revision,
            created: v.created,
          })),
      })),
      projects: (
        db
          .prepare("SELECT * FROM workspace_projects WHERE user_id=?")
          .all(u) as Row[]
      ).map(dto),
    });
  });
  return r;
}
