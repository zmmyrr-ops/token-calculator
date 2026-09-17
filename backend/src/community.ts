import { Router, type Request, type Response } from "express";
import { randomUUID, randomBytes, createHash } from "node:crypto";
import { z } from "zod";
import { ContentDatabase, CmsError } from "./database";
import { hashPassword, verifyPassword } from "./admin";
import { forumCategories, type CommunityUser } from "../../shared/community";
const username = z
  .string()
  .regex(/^[a-zA-Z0-9_]{4,32}$/, "账号需为 4–32 位字母、数字或下划线")
  .transform((s) => s.toLowerCase());
const password = z.string().min(12, "密码至少 12 位").max(128);
const nickname = z.string().trim().min(1).max(24);
const postInput = z.object({
  title: z.string().trim().min(6).max(120),
  body: z.string().trim().min(10).max(20000),
  category: z.enum(forumCategories),
});
const digest = (s: string) => createHash("sha256").update(s).digest("hex");
type UserRow = {
  id: string;
  username: string;
  nickname: string;
  password: string;
  avatar: Uint8Array | null;
  demo: number;
  disabled: number;
  created_at: number;
  updated_at: number;
};
type PostRow = {
  id: string;
  user_id: string;
  title: string;
  body: string;
  category: string;
  created_at: number;
  updated_at: number;
  revision: number;
  demo: number;
  status: string;
};
type ReplyRow = {
  id: string;
  user_id: string;
  post_id: string;
  body: string;
  created_at: number;
  demo: number;
  status: string;
};
export function initCommunity(store: ContentDatabase) {
  store.db
    .exec(`CREATE TABLE IF NOT EXISTS community_users(id TEXT PRIMARY KEY,username TEXT NOT NULL UNIQUE,nickname TEXT NOT NULL,password TEXT NOT NULL,avatar BLOB,demo INTEGER NOT NULL DEFAULT 0,disabled INTEGER NOT NULL DEFAULT 0,created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS community_sessions(token TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES community_users(id),expires INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS forum_posts(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES community_users(id),title TEXT NOT NULL,body TEXT NOT NULL,category TEXT NOT NULL,created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL,revision INTEGER NOT NULL DEFAULT 1,demo INTEGER NOT NULL DEFAULT 0,status TEXT NOT NULL DEFAULT 'visible');
 CREATE TABLE IF NOT EXISTS forum_replies(id TEXT PRIMARY KEY,post_id TEXT NOT NULL REFERENCES forum_posts(id),user_id TEXT NOT NULL REFERENCES community_users(id),body TEXT NOT NULL,created_at INTEGER NOT NULL,demo INTEGER NOT NULL DEFAULT 0,status TEXT NOT NULL DEFAULT 'visible');
 CREATE TABLE IF NOT EXISTS community_limits(key TEXT PRIMARY KEY,attempts INTEGER NOT NULL,expires INTEGER NOT NULL);
 CREATE INDEX IF NOT EXISTS forum_posts_status_time ON forum_posts(status,created_at);
 CREATE INDEX IF NOT EXISTS forum_replies_post_time ON forum_replies(post_id,status,created_at);
 CREATE INDEX IF NOT EXISTS community_sessions_expiry ON community_sessions(expires);
 INSERT OR IGNORE INTO migrations VALUES(3,datetime('now'));`);
}
export function readAvatar(value: unknown): Buffer | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const text = z.string().max(360000).parse(value);
  if (!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(text))
    throw new CmsError(400, "头像需为 PNG 图片");
  const b = Buffer.from(text.slice(22), "base64");
  if (
    b.length < 33 ||
    b.length > 256 * 1024 ||
    b.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a" ||
    b.toString("ascii", 12, 16) !== "IHDR" ||
    b.readUInt32BE(16) < 1 ||
    b.readUInt32BE(20) < 1 ||
    b.readUInt32BE(16) > 512 ||
    b.readUInt32BE(20) > 512
  )
    throw new CmsError(400, "头像最大 512×512、256 KB");
  return b;
}
function publicUser(row: UserRow): CommunityUser {
  return {
    id: row.id,
    username: row.username,
    nickname: row.nickname,
    avatar: row.avatar
      ? `/api/community/avatars/${row.id}?v=${row.updated_at}`
      : null,
    demo: !!row.demo,
    createdAt: row.created_at,
  };
}
export function communityService(store: ContentDatabase) {
  const user = (id: string) =>
    store.db.prepare("SELECT * FROM community_users WHERE id=?").get(id) as
      | UserRow
      | undefined;
  const author = (id: string) => ({ ...publicUser(user(id)!), username: "" });
  const post = (row: PostRow) => ({
    ...row,
    user_id: undefined,
    created_at: undefined,
    updated_at: undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    demo: !!row.demo,
    author: author(row.user_id),
    replies: Number(
      store.db
        .prepare(
          "SELECT count(*) n FROM forum_replies WHERE post_id=? AND status='visible'",
        )
        .get(row.id)?.n,
    ),
  });
  const reply = (row: ReplyRow) => ({
    id: row.id,
    body: row.body,
    createdAt: row.created_at,
    demo: !!row.demo,
    status: row.status,
    author: author(row.user_id),
  });
  return { user, author, post, reply };
}
function paging(req: Request, size = 12) {
  const page = Number(req.query.page ?? 1);
  if (!Number.isSafeInteger(page) || page < 1 || page > 100000)
    throw new CmsError(400, "无效页码");
  return { page, pageSize: size, offset: (page - 1) * size };
}
export function communityRouter(store: ContentDatabase) {
  const router = Router(),
    service = communityService(store);
  const name =
    process.env.APP_ENV === "staging" ? "mendao_staging_user" : "mendao_user";
  const cookie = (res: Response, value: string, maxAge: number) =>
    res.cookie(name, value, {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      path: (process.env.APP_BASE_PATH || "") + "/api/community",
      maxAge,
    });
  const token = (req: Request) =>
    req.headers.cookie
      ?.split(";")
      .map((s) => s.trim())
      .find((s) => s.startsWith(name + "="))
      ?.slice(name.length + 1) || "";
  function current(req: Request) {
    return store.db
      .prepare(
        "SELECT u.* FROM community_users u JOIN community_sessions s ON s.user_id=u.id WHERE s.token=? AND s.expires>? AND u.disabled=0 AND u.demo=0",
      )
      .get(digest(token(req)), Date.now()) as UserRow | undefined;
  }
  function auth(req: Request) {
    const u = current(req);
    if (!u) throw new CmsError(401, "请先登录");
    return u;
  }
  function session(res: Response, id: string) {
    const secret = randomBytes(32).toString("hex");
    store.db
      .prepare("DELETE FROM community_sessions WHERE expires<?")
      .run(Date.now());
    store.db
      .prepare("INSERT INTO community_sessions VALUES(?,?,?)")
      .run(digest(secret), id, Date.now() + 7 * 86400000);
    cookie(res, secret, 7 * 86400000);
  }
  function limit(key: string, max: number, ms: number) {
    const now = Date.now();
    store.db.prepare("DELETE FROM community_limits WHERE expires<?").run(now);
    const row = store.db
      .prepare("SELECT attempts FROM community_limits WHERE key=?")
      .get(key);
    if (Number(row?.attempts || 0) >= max)
      throw new CmsError(429, "操作过于频繁，请稍后再试");
    store.db
      .prepare(
        "INSERT INTO community_limits VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET attempts=attempts+1",
      )
      .run(key, now + ms);
  }
  router.use((req, _res, next) => {
    if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
      const allowed = [process.env.SITE_URL || "https://ruming.top"];
      if (process.env.NODE_ENV !== "production")
        allowed.push("http://127.0.0.1:3000", "http://localhost:3000");
      if (!req.headers.origin || !allowed.includes(req.headers.origin))
        return next(new CmsError(403, "请求来源不被允许"));
    }
    next();
  });
  router.get("/session", (req, res) => {
    const u = current(req);
    res.json({ user: u ? publicUser(u) : null });
  });
  router.post("/register", async (req, res) => {
    limit("register-global", 20, 3600000);
    const d = z
      .object({ username, password, nickname, avatar: z.unknown().optional() })
      .strict()
      .parse(req.body);
    const avatar = readAvatar(d.avatar);
    const hash = await hashPassword(d.password),
      id = randomUUID(),
      now = Date.now();
    if (
      store.db
        .prepare("SELECT 1 FROM community_users WHERE username=?")
        .get(d.username)
    )
      throw new CmsError(409, "账号已被使用");
    store.transaction(() => {
      store.db
        .prepare("INSERT INTO community_users VALUES(?,?,?,?,?,0,0,?,?)")
        .run(id, d.username, d.nickname, hash, avatar ?? null, now, now);
      session(res, id);
    });
    res.status(201).json({ user: publicUser(service.user(id)!) });
  });
  const dummy = hashPassword(randomBytes(32).toString("hex"));
  router.post("/login", async (req, res) => {
    limit("login-global", 120, 60000);
    const d = z
      .object({ username, password: z.string().min(1).max(128) })
      .parse(req.body);
    limit("login:" + d.username, 10, 15 * 60000);
    const u = store.db
      .prepare("SELECT * FROM community_users WHERE username=?")
      .get(d.username) as UserRow | undefined;
    const ok = await verifyPassword(
      d.password,
      u && !u.demo ? u.password : await dummy,
    );
    if (!u || u.disabled || u.demo || !ok)
      throw new CmsError(401, "账号或密码错误，或账号不可用");
    store.db
      .prepare("DELETE FROM community_limits WHERE key=?")
      .run("login:" + d.username);
    session(res, u.id);
    res.json({ user: publicUser(u) });
  });
  router.post("/logout", (req, res) => {
    store.db
      .prepare("DELETE FROM community_sessions WHERE token=?")
      .run(digest(token(req)));
    cookie(res, "", 0);
    res.json({ ok: true });
  });
  router.put("/profile", (req, res) => {
    const u = auth(req);
    limit("profile:" + u.id, 30, 3600000);
    const d = z
      .object({ nickname, avatar: z.unknown().optional() })
      .strict()
      .parse(req.body);
    const avatar = readAvatar(d.avatar);
    store.db
      .prepare(
        "UPDATE community_users SET nickname=?,avatar=?,updated_at=? WHERE id=?",
      )
      .run(
        d.nickname,
        avatar === undefined ? u.avatar : avatar,
        Date.now(),
        u.id,
      );
    res.json({ user: publicUser(service.user(u.id)!) });
  });
  router.post("/password", async (req, res) => {
    const u = auth(req);
    limit("password:" + u.id, 10, 3600000);
    const d = z
      .object({ oldPassword: z.string().max(128), password })
      .parse(req.body);
    if (!(await verifyPassword(d.oldPassword, u.password)))
      throw new CmsError(400, "当前密码不正确");
    const hash = await hashPassword(d.password);
    store.transaction(() => {
      store.db
        .prepare("UPDATE community_users SET password=? WHERE id=?")
        .run(hash, u.id);
      store.db
        .prepare("DELETE FROM community_sessions WHERE user_id=?")
        .run(u.id);
    });
    cookie(res, "", 0);
    res.json({ ok: true });
  });
  router.get("/avatars/:id", (req, res) => {
    const u = service.user(String(req.params.id));
    if (!u?.avatar) return res.status(404).end();
    res
      .set({
        "Cache-Control": "public, max-age=600",
        "Content-Security-Policy": "default-src 'none'",
        "X-Content-Type-Options": "nosniff",
      })
      .type("png")
      .send(Buffer.from(u.avatar));
  });
  router.get("/posts", (req, res) => {
    const p = paging(req);
    const q = z
      .string()
      .max(100)
      .parse(req.query.q ?? "");
    const category = z
      .union([z.enum(forumCategories), z.literal("")])
      .parse(req.query.category ?? "");
    const where =
      "status='visible' AND (?='' OR category=?) AND (?='' OR instr(lower(title||' '||body),lower(?))>0)";
    const args = [category, category, q, q];
    const total = Number(
      store.db
        .prepare(`SELECT count(*) n FROM forum_posts WHERE ${where}`)
        .get(...args)?.n,
    );
    const items = (
      store.db
        .prepare(
          `SELECT * FROM forum_posts WHERE ${where} ORDER BY created_at DESC,id DESC LIMIT ? OFFSET ?`,
        )
        .all(...args, p.pageSize, p.offset) as PostRow[]
    ).map((r) => {
      const x = service.post(r);
      return { ...x, body: r.body.slice(0, 180) };
    });
    res.json({ ...p, items, total });
  });
  router.post("/posts", (req, res) => {
    const u = auth(req),
      d = postInput.parse(req.body);
    limit("post-minute:" + u.id, 1, 60000);
    limit("post-day:" + u.id, 10, 86400000);
    const id = randomUUID(),
      now = Date.now();
    store.db
      .prepare("INSERT INTO forum_posts VALUES(?,?,?,?,?,?,?,1,0,'visible')")
      .run(id, u.id, d.title, d.body, d.category, now, now);
    res.status(201).json({ id });
  });
  router.get("/posts/:id", (req, res) => {
    const id = String(req.params.id);
    const row = store.db
      .prepare("SELECT * FROM forum_posts WHERE id=? AND status='visible'")
      .get(id) as PostRow | undefined;
    if (!row) throw new CmsError(404, "帖子不存在或已下架");
    const p = paging(req, 20);
    const total = Number(
      store.db
        .prepare(
          "SELECT count(*) n FROM forum_replies WHERE post_id=? AND status='visible'",
        )
        .get(id)?.n,
    );
    const replies = (
      store.db
        .prepare(
          "SELECT * FROM forum_replies WHERE post_id=? AND status='visible' ORDER BY created_at,id LIMIT ? OFFSET ?",
        )
        .all(id, p.pageSize, p.offset) as ReplyRow[]
    ).map(service.reply);
    res.json({ post: service.post(row), replies, total, ...p });
  });
  router.put("/posts/:id", (req, res) => {
    const u = auth(req),
      d = postInput
        .extend({ revision: z.number().int().positive() })
        .parse(req.body);
    const row = store.db
      .prepare("SELECT * FROM forum_posts WHERE id=? AND status='visible'")
      .get(String(req.params.id)) as PostRow | undefined;
    if (!row || row.user_id !== u.id)
      throw new CmsError(403, "只能编辑自己的可见帖子");
    if (row.revision !== d.revision)
      throw new CmsError(409, "帖子已更新，请刷新后再编辑");
    store.db
      .prepare(
        "UPDATE forum_posts SET title=?,body=?,category=?,revision=revision+1,updated_at=? WHERE id=?",
      )
      .run(d.title, d.body, d.category, Date.now(), row.id);
    res.json({ ok: true });
  });
  router.delete("/posts/:id", (req, res) => {
    const u = auth(req);
    const r = store.db
      .prepare(
        "UPDATE forum_posts SET status='deleted',revision=revision+1 WHERE id=? AND user_id=? AND status='visible'",
      )
      .run(String(req.params.id), u.id);
    if (!r.changes) throw new CmsError(403, "只能删除自己的可见帖子");
    res.json({ ok: true });
  });
  router.post("/posts/:id/replies", (req, res) => {
    const u = auth(req),
      id = String(req.params.id);
    const body = z.string().trim().min(2).max(5000).parse(req.body.body);
    if (
      !store.db
        .prepare("SELECT 1 FROM forum_posts WHERE id=? AND status='visible'")
        .get(id)
    )
      throw new CmsError(404, "帖子不存在或已下架");
    limit("reply-minute:" + u.id, 3, 60000);
    limit("reply-day:" + u.id, 100, 86400000);
    const rid = randomUUID();
    store.db
      .prepare("INSERT INTO forum_replies VALUES(?,?,?,?,?,0,'visible')")
      .run(rid, id, u.id, body, Date.now());
    res.status(201).json({ id: rid });
  });
  router.delete("/replies/:id", (req, res) => {
    const u = auth(req);
    const r = store.db
      .prepare(
        "UPDATE forum_replies SET status='deleted' WHERE id=? AND user_id=? AND status='visible'",
      )
      .run(String(req.params.id), u.id);
    if (!r.changes) throw new CmsError(403, "只能删除自己的回复");
    res.json({ ok: true });
  });
  return router;
}
export function communityAdminRouter(store: ContentDatabase) {
  const router = Router(),
    s = communityService(store);
  router.get("/posts", (req, res) => {
    const p = paging(req, 20);
    res.json({
      ...p,
      total: Number(
        store.db.prepare("SELECT count(*) n FROM forum_posts").get()?.n,
      ),
      items: (
        store.db
          .prepare(
            "SELECT * FROM forum_posts ORDER BY created_at DESC LIMIT ? OFFSET ?",
          )
          .all(p.pageSize, p.offset) as PostRow[]
      ).map(s.post),
    });
  });
  router.get("/replies", (req, res) => {
    const p = paging(req, 20);
    res.json({
      ...p,
      total: Number(
        store.db.prepare("SELECT count(*) n FROM forum_replies").get()?.n,
      ),
      items: (
        store.db
          .prepare(
            "SELECT * FROM forum_replies ORDER BY created_at DESC LIMIT ? OFFSET ?",
          )
          .all(p.pageSize, p.offset) as ReplyRow[]
      ).map(s.reply),
    });
  });
  router.get("/users", (req, res) => {
    const p = paging(req, 20);
    const q = z
      .string()
      .max(100)
      .parse(req.query.q ?? "");
    const type = z
      .enum(["", "preset", "registered"])
      .parse(req.query.type ?? "");
    const state = z
      .enum(["", "active", "disabled"])
      .parse(req.query.state ?? "");
    const where =
      "WHERE (instr(lower(username),lower(?))>0 OR instr(lower(nickname),lower(?))>0) AND (?='' OR demo=?) AND (?='' OR disabled=?)";
    const args = [
      q,
      q,
      type,
      type === "preset" ? 1 : 0,
      state,
      state === "disabled" ? 1 : 0,
    ];
    res.json({
      ...p,
      total: Number(
        store.db
          .prepare(`SELECT count(*) n FROM community_users ${where}`)
          .get(...args)?.n,
      ),
      items: (
        store.db
          .prepare(
            `SELECT * FROM community_users ${where} ORDER BY created_at DESC,id LIMIT ? OFFSET ?`,
          )
          .all(...args, p.pageSize, p.offset) as UserRow[]
      ).map((u) => ({ ...publicUser(u), disabled: !!u.disabled })),
    });
  });
  router.post("/:kind/:id/status", (req, res) => {
    const kind = z.enum(["posts", "replies", "users"]).parse(req.params.kind),
      id = String(req.params.id);
    const enabled = z.boolean().parse(req.body.enabled);
    store.transaction(() => {
      const row = store.db
        .prepare(
          `SELECT * FROM ${kind === "posts" ? "forum_posts" : kind === "replies" ? "forum_replies" : "community_users"} WHERE id=?`,
        )
        .get(id);
      if (!row) throw new CmsError(404, "记录不存在");
      if (kind === "users") {
        if (enabled && row.demo) throw new CmsError(400, "预置账号不开放登录");
        store.db
          .prepare("UPDATE community_users SET disabled=? WHERE id=?")
          .run(enabled ? 0 : 1, id);
        if (!enabled)
          store.db
            .prepare("DELETE FROM community_sessions WHERE user_id=?")
            .run(id);
      } else {
        if (row.status === "deleted")
          throw new CmsError(400, "用户已删除的内容不能恢复");
        store.db
          .prepare(
            `UPDATE ${kind === "posts" ? "forum_posts" : "forum_replies"} SET status=? ${kind === "posts" ? ",revision=revision+1" : ""} WHERE id=?`,
          )
          .run(enabled ? "visible" : "hidden", id);
      }
      store.db
        .prepare(
          "INSERT INTO history(kind,entity_id,action,actor,payload,at) VALUES(?,?,?,?,?,?)",
        )
        .run(
          "community_" + kind,
          id,
          enabled ? "enable" : "disable",
          String(res.locals.adminUsername),
          null,
          new Date().toISOString(),
        );
    });
    res.json({ ok: true });
  });
  return router;
}
