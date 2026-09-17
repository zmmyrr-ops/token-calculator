import { describe, it, expect } from "vitest";
import express from "express";
import { ZodError } from "zod";
import { ContentDatabase, CmsError } from "../../backend/src/database";
import {
  initCommunity,
  communityRouter,
  readAvatar,
  communityAdminRouter,
} from "../../backend/src/community";
import { seedCommunity } from "../../backend/src/community-seed";

describe("community", () => {
  it("seeds 120 marked accounts, 48 original posts and 96 replies idempotently", () => {
    const db = new ContentDatabase(":memory:");
    try {
      initCommunity(db);
      seedCommunity(db);
      seedCommunity(db);
      initCommunity(db);
      expect(
        db.db
          .prepare(
            "SELECT count(*) n FROM community_users WHERE demo=1 AND disabled=1",
          )
          .get()?.n,
      ).toBe(120);
      expect(
        db.db.prepare("SELECT count(*) n FROM forum_posts WHERE demo=1").get()
          ?.n,
      ).toBe(48);
      expect(
        db.db.prepare("SELECT count(*) n FROM forum_replies WHERE demo=1").get()
          ?.n,
      ).toBe(96);
      expect(
        db.db.prepare("SELECT count(DISTINCT title) n FROM forum_posts").get()
          ?.n,
      ).toBe(48);
      expect(db.db.prepare("PRAGMA foreign_key_check").all()).toHaveLength(0);
      expect(
        db.db
          .prepare(
            "SELECT count(*) n FROM (SELECT user_id FROM forum_posts UNION SELECT user_id FROM forum_replies)",
          )
          .get()?.n,
      ).toBe(120);
    } finally {
      db.close();
    }
  });
  it("rejects unsupported and excessive avatar uploads", () => {
    expect(readAvatar(null)).toBe(null);
    expect(() => readAvatar("data:image/svg+xml;base64,PHN2Zz4=")).toThrow();
    const b = Buffer.alloc(33);
    Buffer.from("89504e470d0a1a0a", "hex").copy(b);
    b.write("IHDR", 12);
    b.writeUInt32BE(9999, 16);
    b.writeUInt32BE(128, 20);
    expect(() =>
      readAvatar("data:image/png;base64," + b.toString("base64")),
    ).toThrow();
  });
  it("isolates accounts, enforces ownership, moderation, paging and revoked sessions", async () => {
    const store = new ContentDatabase(":memory:");
    initCommunity(store);
    seedCommunity(store);
    const app = express();
    app.use(express.json({ limit: "512kb" }));
    app.use("/api/community", communityRouter(store));
    // The actual admin router mounts this only after administrator authentication.
    app.use(
      "/test-moderator",
      (req, res, next) => {
        if (req.headers.authorization !== "test-only") {
          res.sendStatus(401);
          return;
        }
        res.locals.adminUsername = "test-admin";
        next();
      },
      communityAdminRouter(store),
    );
    app.use(
      (
        e: Error,
        _req: express.Request,
        res: express.Response,
        _next: express.NextFunction,
      ) => {
        res
          .status(
            e instanceof CmsError
              ? e.status
              : e instanceof ZodError
                ? 400
                : 500,
          )
          .json({ error: e.message });
      },
    );
    const server = app.listen(0, "127.0.0.1");
    await new Promise<void>((r) => server.once("listening", r));
    const base = `http://127.0.0.1:${(server.address() as { port: number }).port}/api/community`;
    let cookie = "";
    const call = (
      path: string,
      method = "GET",
      body?: unknown,
      origin = "http://127.0.0.1:3000",
    ) =>
      fetch(base + path, {
        method,
        headers: { origin, cookie, "content-type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
    try {
      expect((await call("/posts", "POST", {})).status).toBe(401);
      expect(
        (await call("/register", "POST", {}, "https://evil.example")).status,
      ).toBe(403);
      const register = await call("/register", "POST", {
        username: "reader_one",
        nickname: "测试读者",
        password: "test-long-password",
      });
      expect(register.status).toBe(201);
      cookie = register.headers.get("set-cookie")!.split(";")[0];
      const owner = (await register.json()).user;
      expect(owner.username).toBe("reader_one");
      expect(owner.password).toBeUndefined();
      const adminBase = base.replace("/api/community", "/test-moderator");
      const listUsers = async (query: string) =>
        (
          await fetch(adminBase + "/users?" + query, {
            headers: { authorization: "test-only" },
          })
        ).json();
      expect((await fetch(adminBase + "/users")).status).toBe(401);
      const registered = await listUsers(
        "type=registered&q=reader_one&state=active",
      );
      expect(registered.total).toBe(1);
      expect(registered.items[0].password).toBeUndefined();
      expect((await listUsers("type=preset&state=disabled")).total).toBe(120);
      expect((await listUsers("q=%25")).total).toBe(0);
      expect(
        (
          await fetch(adminBase + "/users?type=bad", {
            headers: { authorization: "test-only" },
          })
        ).status,
      ).toBe(400);
      const presetId = (await listUsers("type=preset")).items[0].id;
      expect(
        (
          await fetch(adminBase + "/users/" + presetId + "/status", {
            method: "POST",
            headers: {
              authorization: "test-only",
              "content-type": "application/json",
            },
            body: JSON.stringify({ enabled: true }),
          })
        ).status,
      ).toBe(400);

      expect(register.headers.get("set-cookie")).toContain("HttpOnly");
      const hash = store.db
        .prepare("SELECT password FROM community_users WHERE id=?")
        .get(owner.id)?.password;
      expect(hash).not.toBe("test-long-password");
      expect(
        (
          await call("/register", "POST", {
            username: "reader_one",
            nickname: "重复",
            password: "test-long-password",
          })
        ).status,
      ).toBe(409);
      const input = {
        title: "如何为自己的测试项目整理素材",
        body: "这是一个隔离测试帖子，确保内容按纯文本保存 <script>alert(1)</script>",
        category: "综合讨论",
      };
      const created = await call("/posts", "POST", input);
      expect(created.status).toBe(201);
      const { id } = await created.json();
      expect((await call("/posts", "POST", input)).status).toBe(429);
      const ownCookie = cookie;
      const second = await call("/register", "POST", {
        username: "reader_two",
        nickname: "第二位读者",
        password: "test-long-password",
      });
      cookie = second.headers.get("set-cookie")!.split(";")[0];
      expect(
        (await call("/posts/" + id, "PUT", { ...input, revision: 1 })).status,
      ).toBe(403);
      expect((await call("/posts/" + id, "DELETE")).status).toBe(403);
      const reply = await call("/posts/" + id + "/replies", "POST", {
        body: "真实存储的测试回复",
      });
      expect(reply.status).toBe(201);
      let detail = await (await call("/posts/" + id)).json();
      expect(detail.total).toBe(1);
      expect(detail.post.author.username).toBe("");
      expect(detail.post.body).toContain("<script>");
      cookie = ownCookie;
      expect(
        (await call("/posts/" + id, "PUT", { ...input, revision: 99 })).status,
      ).toBe(409);
      expect(
        (await call("/posts/" + id, "PUT", { ...input, revision: 1 })).status,
      ).toBe(200);
      const listed = await (await call("/posts?page=2")).json();
      expect(listed.items).toHaveLength(12);
      expect(listed.total).toBe(49);
      expect((await call("/posts?page=0")).status).toBe(400);
      const moderation = await fetch(
        base.replace("/api/community", "/test-moderator") +
          "/posts/" +
          id +
          "/status",
        {
          method: "POST",
          headers: {
            authorization: "test-only",
            "content-type": "application/json",
          },
          body: JSON.stringify({ enabled: false }),
        },
      );
      expect(moderation.status).toBe(200);
      expect((await call("/posts/" + id)).status).toBe(404);
      expect(
        (
          await call("/password", "POST", {
            oldPassword: "wrong",
            password: "another-long-password",
          })
        ).status,
      ).toBe(400);
      expect(
        (
          await call("/password", "POST", {
            oldPassword: "test-long-password",
            password: "another-long-password",
          })
        ).status,
      ).toBe(200);
      expect((await (await call("/session")).json()).user).toBe(null);
      expect(
        (
          await call("/login", "POST", {
            username: "example_v2_001",
            password: "whateverpassword",
          })
        ).status,
      ).toBe(401);
      detail = await (await call("/posts?q=not-a-real-query-zzzzz")).json();
      expect(detail.total).toBe(0);
    } finally {
      await new Promise<void>((r) => server.close(() => r()));
      store.close();
    }
  });
});
