import { expect, it, vi } from "vitest";
import express from "express";
import { ContentDatabase, CmsError } from "../../backend/src/database";
import {
  initCommunity,
  communityRouter,
  communityAdminRouter,
} from "../../backend/src/community";
import {
  miniSettingsAdminRouter,
  miniSettings,
  requireMiniModule,
} from "../../backend/src/mini-settings";
import { exchangeWechatCode } from "../../backend/src/wechat";
it("creates one OpenID identity, records source, enforces disabled users and module controls without changing website access", async () => {
  const db = new ContentDatabase(":memory:");
  initCommunity(db);
  initCommunity(db);
  const exchange = vi.fn(async (code: string) => {
    if (code === "bad") throw new CmsError(401, "invalid code");
    return {
      appId: code === "other-app" ? "wx0000000000000000" : "wx30d01d25ba6ff5c3",
      openId: "real-provider-subject-for-test",
    };
  });
  const app = express();
  app.use(express.json());
  app.use("/mini", communityRouter(db, "bearer", exchange));
  app.use("/web", communityRouter(db));
  app.use("/admin", (req, res, next) => {
    if (req.headers.authorization !== "test-admin") {
      res.sendStatus(401);
      return;
    }
    res.locals.adminUsername = "test-admin";
    next();
  });
  app.use("/admin/settings", miniSettingsAdminRouter(db));
  app.use("/admin/users", communityAdminRouter(db));
  app.use(
    (
      e: Error,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) =>
      res
        .status(e instanceof CmsError ? e.status : 400)
        .json({ error: e.message }),
  );
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((r) => server.once("listening", r));
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  const call = (
    p: string,
    method = "GET",
    body?: unknown,
    headers: Record<string, string> = {},
  ) =>
    fetch(base + p, {
      method,
      headers: { "content-type": "application/json", ...headers },
      body: body ? JSON.stringify(body) : undefined,
    });
  try {
    expect(
      (
        await call("/mini/wechat-login", "POST", {
          code: "x",
          openid: "injected",
        })
      ).status,
    ).toBe(400);
    expect(exchange).not.toHaveBeenCalled();
    expect(
      (await call("/mini/wechat-login", "POST", { code: "bad" })).status,
    ).toBe(401);
    expect(
      db.db.prepare("SELECT count(*) n FROM community_users").get()?.n,
    ).toBe(0);
    const login = await call("/mini/wechat-login", "POST", { code: "one" });
    expect(login.status).toBe(200);
    expect(login.headers.get("set-cookie")).toBeNull();
    const first = await login.json();
    expect(first.created).toBe(true);
    expect(first.token).toMatch(/^[a-f0-9]{64}$/);
    expect(first.user.openid).toBeUndefined();
    expect(first.session_key).toBeUndefined();
    const second = await (
      await call("/mini/wechat-login", "POST", { code: "two" })
    ).json();
    expect(second.created).toBe(false);
    expect(second.user.id).toBe(first.user.id);
    expect(second.token).not.toBe(first.token);
    expect(
      db.db
        .prepare("SELECT source FROM community_users WHERE id=?")
        .get(first.user.id)?.source,
    ).toBe("miniprogram");
    const other = await (
      await call("/mini/wechat-login", "POST", { code: "other-app" })
    ).json();
    expect(other.user.id).not.toBe(first.user.id);
    const pc = await call(
      "/web/register",
      "POST",
      {
        username: "pc_reader",
        password: "long-pc-test-password",
        nickname: "PC读者",
      },
      { Origin: "https://ruming.top" },
    );
    expect(pc.status).toBe(201);
    const admin = { Authorization: "test-admin" };
    expect((await call("/admin/users/users")).status).toBe(401);
    const users = await (
      await call(
        "/admin/users/users?source=miniprogram",
        "GET",
        undefined,
        admin,
      )
    ).json();
    expect(users.total).toBe(2);
    expect(users.items[0].wechat[0].openId).toBe(
      "real-provider-subject-for-test",
    );
    expect(users.items[0].password).toBeUndefined();
    expect(
      (
        await (
          await call("/admin/users/users?source=pc", "GET", undefined, admin)
        ).json()
      ).total,
    ).toBe(1);
    expect(
      (await call("/admin/settings", "PUT", { news: false, forum: false }))
        .status,
    ).toBe(401);
    expect(
      (
        await call(
          "/admin/settings",
          "PUT",
          { news: false, forum: false, reviewMode: true },
          admin,
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await call(
          "/admin/settings",
          "PUT",
          { news: false, forum: false },
          admin,
        )
      ).status,
    ).toBe(200);
    expect(miniSettings(db).news).toBe(false);
    expect(() => requireMiniModule(db, "news")).toThrow("暂未开放");
    expect((await call("/mini/posts")).status).toBe(403);
    expect((await call("/web/posts")).status).toBe(200);
    expect((await call("/mini/session")).status).toBe(200);
    expect(
      db.db
        .prepare("SELECT actor FROM history WHERE kind='mini_settings'")
        .get()?.actor,
    ).toBe("test-admin");
    await call("/admin/settings", "PUT", { news: true, forum: true }, admin);
    expect((await call("/mini/posts")).status).toBe(200);
    await call(
      "/admin/users/users/" + first.user.id + "/status",
      "POST",
      { enabled: false },
      admin,
    );
    expect(
      (await call("/mini/wechat-login", "POST", { code: "three" })).status,
    ).toBe(403);
    expect(
      (
        await (
          await call("/mini/session", "GET", undefined, {
            Authorization: "Bearer " + first.token,
          })
        ).json()
      ).user,
    ).toBeNull();
    expect(
      db.db.prepare("SELECT count(*) n FROM community_wechat_identities").get()
        ?.n,
    ).toBe(2);
  } finally {
    await new Promise<void>((r, e) =>
      server.close((err) => (err ? e(err) : r())),
    );
    db.close();
  }
});
it("exchanges code with fixed WeChat endpoint and never exposes session_key or provider errors", async () => {
  const db = new ContentDatabase(":memory:");
  vi.stubEnv("WECHAT_APP_ID", "wx30d01d25ba6ff5c3");
  vi.stubEnv("WECHAT_APP_SECRET", "test-only-secret-123456");
  const mocked = vi.fn(
    async (_url: URL) =>
      new Response(
        JSON.stringify({
          openid: "valid-openid",
          session_key: "sensitive-key",
        }),
        { status: 200 },
      ),
  );
  vi.stubGlobal("fetch", mocked);
  try {
    expect(await exchangeWechatCode(db, "fresh-code")).toEqual({
      appId: "wx30d01d25ba6ff5c3",
      openId: "valid-openid",
    });
    const url = String(mocked.mock.calls[0]?.[0]);
    expect(
      url.startsWith("https://api.weixin.qq.com/sns/jscode2session?"),
    ).toBe(true);
    mocked.mockResolvedValue(
      new Response(
        JSON.stringify({ errcode: 40029, errmsg: "sensitive-provider-detail" }),
      ),
    );
    await expect(exchangeWechatCode(db, "bad")).rejects.toThrow("凭证已失效");
    mocked.mockRejectedValue(Error("secret in original error"));
    await expect(exchangeWechatCode(db, "network")).rejects.toThrow(
      "服务暂时不可用",
    );
  } finally {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    db.close();
  }
});

it("minimal mode consistently closes browsing modules while preserving configured switches", () => {
  const db = new ContentDatabase(":memory:");
  try {
    db.setMeta("miniModules", { news: true, forum: true, models: true, platforms: true, minimalMode: true });
    expect(miniSettings(db)).toMatchObject({ news: false, forum: false, models: false, platforms: false, eyes: false });
    for (const key of ["news", "forum", "models", "platforms", "eyes"] as const)
      expect(() => requireMiniModule(db, key)).toThrow("暂未开放");
    db.setMeta("miniModules", { news: true, forum: true, models: true, platforms: true, minimalMode: false });
    expect(miniSettings(db)).toMatchObject({ news: true, forum: true, models: true, platforms: true, eyes: true });
  } finally { db.close(); }
});
