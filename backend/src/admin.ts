import { analyticsSummary, pruneEvents } from "./analytics";
import {
  Router,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import { randomBytes, createHash, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { writeFileSync, unlinkSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { kinds } from "../../shared/cms";
import { ContentDatabase, CmsError } from "./database";
const derive = promisify(scrypt);
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  return (
    salt + ":" + ((await derive(password, salt, 64)) as Buffer).toString("hex")
  );
}
export async function verifyPassword(password: string, stored: string) {
  const [salt, hex] = stored.split(":");
  const expected = Buffer.from(hex, "hex");
  const actual = (await derive(password, salt, 64)) as Buffer;
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
const digest = (s: string) => createHash("sha256").update(s).digest("hex");

export async function initializeAdmin(store: ContentDatabase) {
  if (store.db.prepare("SELECT 1 FROM admins LIMIT 1").get()) return;
  const production = process.env.NODE_ENV === "production";
  const username = process.env.ADMIN_USERNAME || "admin";
  const password =
    process.env.ADMIN_PASSWORD ||
    (!production ? randomBytes(24).toString("base64url") : "");
  if (password.length < 12 || password.length > 128)
    throw Error("首次初始化需要设置 12–128 位 ADMIN_PASSWORD");
  const hashed = await hashPassword(password);
  if (!process.env.ADMIN_PASSWORD)
    writeFileSync(
      path.join(path.dirname(store.file), "admin-initial-credentials.txt"),
      `AI 门道管理后台\n地址：http://127.0.0.1:3000/admin\n用户名：${username}\n初始密码：${password}\n首次登录后必须修改密码。此文件不要上传、提交或分享。\n`,
      { mode: 0o600 },
    );
  store.db.prepare("INSERT INTO admins VALUES(?,?,1)").run(username, hashed);
}
export function adminRouter(store: ContentDatabase) {
  const cookieName =
    process.env.APP_ENV === "staging" ? "mendao_staging_admin" : "mendao_admin";
  const router = Router();
  const production = process.env.NODE_ENV === "production";
  const dummy = hashPassword(randomBytes(24).toString("hex"));
  const cookie = (res: Response, value: string, age: number) =>
    res.cookie(cookieName, value, {
      httpOnly: true,
      sameSite: "strict",
      secure: production,
      path: (process.env.APP_BASE_PATH || "") + "/api/admin",
      maxAge: age,
    });
  const token = (req: Request) =>
    (req.headers.cookie || "")
      .split(";")
      .map((x) => x.trim())
      .find((x) => x.startsWith(cookieName + "="))
      ?.slice(cookieName.length + 1) || "";
  function session(req: Request) {
    const key = digest(token(req));
    return store.db
      .prepare(
        "SELECT admins.username,admins.must_change FROM sessions JOIN admins ON admins.username=sessions.username WHERE token=? AND expires>?",
      )
      .get(key, Date.now()) as
      | { username: string; must_change: number }
      | undefined;
  }
  const auth = (req: Request, _res: Response, next: NextFunction) => {
    const user = session(req);
    if (!user) return next(new CmsError(401, "请先登录"));
    if (user.must_change) return next(new CmsError(403, "请先修改初始密码"));
    next();
  };
  router.use((req, _res, next) => {
    if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
      const allowed = [process.env.SITE_URL || "https://ruming.top"];
      if (!production)
        allowed.push("http://127.0.0.1:3000", "http://localhost:3000");
      if (!req.headers.origin || !allowed.includes(req.headers.origin))
        return next(new CmsError(403, "请求来源不被允许"));
    }
    next();
  });
  router.get("/session", (req, res) => {
    const user = session(req);
    if (!user) {
      res.status(401).json({ error: "请先登录" });
      return;
    }
    res.json({ username: user.username, mustChange: !!user.must_change });
  });
  router.post("/login", async (req, res) => {
    const { username, password } = z
      .object({
        username: z.string().min(1).max(100),
        password: z.string().min(1).max(128),
      })
      .parse(req.body);
    store.db
      .prepare("DELETE FROM login_limits WHERE expires<?")
      .run(Date.now());
    const keys = ["ip:" + String(req.ip), "user:" + username.toLowerCase()];
    for (const key of keys) {
      const r = store.db
        .prepare("SELECT attempts FROM login_limits WHERE key=?")
        .get(key);
      if (Number(r?.attempts || 0) >= 10)
        throw new CmsError(429, "尝试过于频繁，请 15 分钟后再试");
    }
    for (const key of keys)
      store.db
        .prepare(
          "INSERT INTO login_limits VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET attempts=attempts+1",
        )
        .run(key, Date.now() + 900000);
    const row = store.db
      .prepare("SELECT * FROM admins WHERE username=?")
      .get(username) as
      | { username: string; password: string; must_change: number }
      | undefined;
    if (
      !(await verifyPassword(password, row?.password || (await dummy))) ||
      !row
    )
      throw new CmsError(401, "用户名或密码不正确");
    store.db
      .prepare("DELETE FROM login_limits WHERE key=?")
      .run("user:" + username.toLowerCase());
    const secret = randomBytes(32).toString("hex");
    store.db
      .prepare("DELETE FROM sessions WHERE expires<? OR token=?")
      .run(Date.now(), digest(token(req)));
    store.db
      .prepare("INSERT INTO sessions VALUES(?,?,?)")
      .run(digest(secret), username, Date.now() + 8 * 3600000);
    cookie(res, secret, 8 * 3600000);
    res.json({ username, mustChange: !!row.must_change });
  });
  router.post("/logout", (req, res) => {
    store.db
      .prepare("DELETE FROM sessions WHERE token=?")
      .run(digest(token(req)));
    cookie(res, "", 0);
    res.json({ ok: true });
  });
  router.post("/password", async (req, res) => {
    const user = session(req);
    if (!user) throw new CmsError(401, "请先登录");
    const body = z
      .object({
        current: z.string().min(1).max(128),
        password: z.string().min(12).max(128),
      })
      .parse(req.body);
    const row = store.db
      .prepare("SELECT password FROM admins WHERE username=?")
      .get(user.username)!;
    if (!(await verifyPassword(body.current, String(row.password))))
      throw new CmsError(400, "当前密码不正确");
    if (body.password === body.current)
      throw new CmsError(400, "新密码不能与当前密码相同");
    const hashed = await hashPassword(body.password);
    store.transaction(() => {
      store.db
        .prepare("UPDATE admins SET password=?,must_change=0 WHERE username=?")
        .run(hashed, user.username);
      store.db
        .prepare("DELETE FROM sessions WHERE username=?")
        .run(user.username);
    });
    cookie(res, "", 0);
    try {
      unlinkSync(
        path.join(path.dirname(store.file), "admin-initial-credentials.txt"),
      );
    } catch {
      /* Credential file may not exist. */
    }
    res.json({ ok: true });
  });
  router.use(auth);
  router.get("/analytics", (req, res) => {
    const days = z.enum(["7", "30", "90"]).parse(req.query.days ?? "7");
    pruneEvents(store);
    res.json(analyticsSummary(store, Number(days)));
  });
  const kind = (req: Request) => z.enum(kinds).parse(req.params.kind);
  const revision = (value: unknown) => z.number().int().positive().parse(value);
  const id = (req: Request) => String(req.params.id);
  router.get("/overview", (_req, res) =>
    res.json({
      counts: Object.fromEntries(kinds.map((k) => [k, store.list(k).length])),
      database: "SQLite",
      version: store.meta("contentVersion"),
    }),
  );
  router.get("/documents/:kind", (req, res) => res.json(store.list(kind(req))));
  router.get("/documents/:kind/:id", (req, res) =>
    res.json(store.get(kind(req), id(req))),
  );
  router.post("/documents/:kind", (req, res) =>
    res
      .status(201)
      .json(store.create(kind(req), req.body, session(req)!.username)),
  );
  router.put("/documents/:kind/:id", (req, res) =>
    res.json(
      store.save(
        kind(req),
        id(req),
        req.body.data,
        revision(req.body.revision),
        session(req)!.username,
      ),
    ),
  );
  router.post("/documents/:kind/:id/publish", (req, res) =>
    res.json(
      store.changePublication(
        kind(req),
        id(req),
        revision(req.body.revision),
        true,
        session(req)!.username,
      ),
    ),
  );
  router.post("/documents/:kind/:id/unpublish", (req, res) =>
    res.json(
      store.changePublication(
        kind(req),
        id(req),
        revision(req.body.revision),
        false,
        session(req)!.username,
      ),
    ),
  );
  router.delete("/documents/:kind/:id", (req, res) => {
    store.remove(
      kind(req),
      id(req),
      revision(req.body.revision),
      session(req)!.username,
    );
    res.json({ ok: true });
  });
  router.get("/documents/:kind/:id/history", (req, res) =>
    res.json(store.history(kind(req), id(req))),
  );
  router.post("/documents/:kind/:id/restore", (req, res) =>
    res.json(
      store.restore(
        kind(req),
        id(req),
        revision(req.body.seq),
        revision(req.body.revision),
        session(req)!.username,
      ),
    ),
  );
  router.post("/backup", async (_req, res, next) => {
    try {
      const file = await store.backupFile();
      res.download(file, path.basename(file), () => {
        try {
          unlinkSync(file);
        } catch {
          /* The backup may already be removed. */
        }
      });
    } catch (e) {
      next(e);
    }
  });
  return router;
}
