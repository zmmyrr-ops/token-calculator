import { expect, it } from "vitest";
import express from "express";
import { ContentDatabase, CmsError } from "../../backend/src/database";
import { communityRouter, initCommunity } from "../../backend/src/community";
it("isolates native bearer sessions from web cookies and revokes both after password changes", async () => {
  const db = new ContentDatabase(":memory:");
  initCommunity(db);
  const app = express();
  app.use(express.json());
  app.use("/web", communityRouter(db));
  app.use("/mini", communityRouter(db, "bearer"));
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
    path: string,
    method = "GET",
    body?: unknown,
    headers: Record<string, string> = {},
  ) =>
    fetch(base + path, {
      method,
      headers: { "content-type": "application/json", ...headers },
      body: body ? JSON.stringify(body) : undefined,
    });
  const credentials = {
    username: "mini_reader",
    password: "a-long-secret-password",
    nickname: "小程序读者",
  };
  try {
    expect(
      (
        await call("/mini/register", "POST", credentials, {
          Origin: "https://ruming.top",
        })
      ).status,
    ).toBe(403);
    const register = await call("/mini/register", "POST", credentials);
    expect(register.status).toBe(201);
    expect(register.headers.get("set-cookie")).toBeNull();
    const { token, user } = await register.json();
    expect(token).toMatch(/^[a-f0-9]{64}$/);
    const auth = { Authorization: `Bearer ${token}` };
    expect(
      (await (await call("/mini/session", "GET", undefined, auth)).json()).user
        .id,
    ).toBe(user.id);
    expect(
      (
        await (
          await call("/mini/session", "GET", undefined, {
            Cookie: `mendao_user=${token}`,
          })
        ).json()
      ).user,
    ).toBeNull();
    expect(
      (
        await (
          await call("/web/session", "GET", undefined, {
            Cookie: `mendao_user=${token}`,
          })
        ).json()
      ).user,
    ).toBeNull();
    expect((await call("/web/login", "POST", credentials)).status).toBe(403);
    const login = await call(
      "/web/login",
      "POST",
      { username: credentials.username, password: credentials.password },
      { Origin: "https://ruming.top" },
    );
    const cookie = login.headers.get("set-cookie")!.split(";")[0];
    const webToken = cookie.split("=")[1];
    expect((await login.json()).token).toBeUndefined();
    expect(
      (
        await (
          await call("/mini/session", "GET", undefined, {
            Authorization: `Bearer ${webToken}`,
          })
        ).json()
      ).user,
    ).toBeNull();
    const post = await call(
      "/mini/posts",
      "POST",
      {
        title: "一个真实的测试标题",
        body: "这是仅在内存测试数据库中的讨论正文。",
        category: "综合讨论",
      },
      auth,
    );
    expect(post.status).toBe(201);
    expect(
      (
        await call(
          "/mini/password",
          "POST",
          {
            oldPassword: credentials.password,
            password: "new-long-secret-password",
          },
          auth,
        )
      ).status,
    ).toBe(200);
    expect(
      (await (await call("/mini/session", "GET", undefined, auth)).json()).user,
    ).toBeNull();
    expect(
      (
        await (
          await call("/web/session", "GET", undefined, { Cookie: cookie })
        ).json()
      ).user,
    ).toBeNull();
    expect((await call("/mini/posts", "POST", {}, auth)).status).toBe(401);
    const relogin = await call("/mini/login", "POST", {
      username: credentials.username,
      password: "new-long-secret-password",
    });
    const nextToken = (await relogin.json()).token;
    expect(nextToken).not.toBe(token);
    const nextAuth = { Authorization: `Bearer ${nextToken}` };
    expect((await call("/mini/logout", "POST", {}, nextAuth)).status).toBe(200);
    expect(
      (await (await call("/mini/session", "GET", undefined, nextAuth)).json())
        .user,
    ).toBeNull();
  } finally {
    await new Promise<void>((r, e) =>
      server.close((err) => (err ? e(err) : r())),
    );
    db.close();
  }
});
