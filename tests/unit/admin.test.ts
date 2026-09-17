import { it, expect } from "vitest";
import express from "express";
import { ContentDatabase, CmsError } from "../../backend/src/database";
import { adminRouter, hashPassword } from "../../backend/src/admin";

it("enforces origin, initial password change and session revocation over HTTP", async () => {
  const store = new ContentDatabase(":memory:");
  store.db
    .prepare("INSERT INTO admins VALUES(?,?,1)")
    .run("admin", await hashPassword("initial-password-test"));
  const app = express();
  app.use(express.json());
  app.use("/api/admin", adminRouter(store));
  app.use(
    (
      e: Error,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      res
        .status(e instanceof CmsError ? e.status : 400)
        .json({ error: e.message });
    },
  );
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address() as { port: number };
  let cookie = "";
  const call = (
    path: string,
    body?: unknown,
    origin = "http://127.0.0.1:3000",
  ) =>
    fetch(`http://127.0.0.1:${address.port}/api/admin${path}`, {
      method: body ? "POST" : "GET",
      headers: { origin, cookie, "content-type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
  try {
    expect((await call("/overview")).status).toBe(401);
    expect((await call("/analytics")).status).toBe(401);
    expect((await call("/baidu")).status).toBe(401);
    expect((await call("/baidu/config", {} ,"https://evil.example")).status).toBe(403);
    expect(
      (
        await call(
          "/login",
          { username: "admin", password: "initial-password-test" },
          "https://evil.example",
        )
      ).status,
    ).toBe(403);
    const login = await call("/login", {
      username: "admin",
      password: "initial-password-test",
    });
    expect(login.status).toBe(200);
    expect(login.headers.get("set-cookie")).toContain("HttpOnly");
    expect(login.headers.get("set-cookie")).toContain("SameSite=Strict");
    cookie = login.headers.get("set-cookie")!.split(";")[0];
    expect((await login.json()).mustChange).toBe(true);
    expect((await call("/overview")).status).toBe(403);
    expect(
      (
        await call("/password", {
          current: "initial-password-test",
          password: "changed-password-test",
        })
      ).status,
    ).toBe(200);
    expect((await call("/session")).status).toBe(401);
    expect(
      (
        await call("/login", {
          username: "admin",
          password: "initial-password-test",
        })
      ).status,
    ).toBe(401);
    const again = await call("/login", {
      username: "admin",
      password: "changed-password-test",
    });
    cookie = again.headers.get("set-cookie")!.split(";")[0];
    expect((await again.json()).mustChange).toBe(false);
    expect((await call("/overview")).status).toBe(200);
    expect((await call("/logout", {})).status).toBe(200);
    expect((await call("/session")).status).toBe(401);
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((e) => (e ? reject(e) : resolve())),
    );
    store.close();
  }
});
