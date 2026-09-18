import { it, expect } from "vitest";
import express from "express";
import { ZodError } from "zod";
import { ContentDatabase, CmsError } from "../../backend/src/database";
import { initCommunity, communityRouter } from "../../backend/src/community";
it("isolates workspace accounts, protects revisions and validates private project data", async () => {
  const db = new ContentDatabase(":memory:");
  initCommunity(db);
  initCommunity(db);
  const app = express();
  app.use(express.json({ limit: "512kb" }));
  app.use("/api/community", communityRouter(db));
  app.use(
    (
      e: Error,
      _q: express.Request,
      r: express.Response,
      _n: express.NextFunction,
    ) =>
      r
        .status(
          e instanceof CmsError ? e.status : e instanceof ZodError ? 400 : 500,
        )
        .json({ error: e.message }),
  );
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((r) => server.once("listening", r));
  const address = server.address();
  if (!address || typeof address === "string") throw Error("server");
  const base = `http://127.0.0.1:${address.port}/api/community`;
  const origin = process.env.SITE_URL || "https://ruming.top";
  const req = (
    path: string,
    cookie = "",
    method = "GET",
    body?: unknown,
    source = origin,
  ) =>
    fetch(base + path, {
      method,
      headers: { cookie, origin: source, "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  try {
    const register = async (username: string) => {
      const r = await req("/register", "", "POST", {
        username,
        password: "WorkspacePass123!",
        nickname: username,
      });
      expect(r.status).toBe(201);
      return r.headers.get("set-cookie")!.split(";")[0];
    };
    const a = await register("workspace_a"),
      b = await register("workspace_b");
    expect((await req("/workspace")).status).toBe(401);
    expect((await req("/workspace/packs")).status).toBe(200);
    expect(
      (await req("/workspace/items", a, "POST", {}, "https://evil.test"))
        .status,
    ).toBe(403);
    const item = {
      title: "我的工具",
      href: "/tools/blender",
      kind: "工具",
      category: "3D",
      note: "private note",
    };
    const itemResp = await req("/workspace/items", a, "POST", item);
    expect(itemResp.status).toBe(201);
    const itemId = (await itemResp.json()).id;
    expect((await req("/workspace/items/" + itemId, b, "DELETE")).status).toBe(
      404,
    );
    expect(
      (
        await req("/workspace/items", a, "POST", {
          ...item,
          href: "//evil.test",
        })
      ).status,
    ).toBe(400);
    const p = await (
      await req("/workspace/prompts", a, "POST", {
        title: "Prompt",
        body: "secret text",
        category: "test",
      })
    ).json();
    expect(p.id).toBeTruthy();
    expect((await req("/workspace/prompts/" + p.id, b)).status).toBe(404);
    expect(
      (await req("/workspace/prompts/" + p.id + "/versions", b)).status,
    ).toBe(404);
    expect(
      (
        await req("/workspace/prompts/" + p.id, a, "PUT", {
          title: "Prompt 2",
          body: "updated text",
          category: "test",
          revision: 1,
        })
      ).status,
    ).toBe(200);
    expect(
      (
        await req("/workspace/prompts/" + p.id, a, "PUT", {
          title: "stale",
          body: "lost",
          category: "test",
          revision: 1,
        })
      ).status,
    ).toBe(409);
    const history = await (
      await req("/workspace/prompts/" + p.id + "/versions", a)
    ).json();
    expect(history.items.map((v: { body: string }) => v.body)).toEqual([
      "updated text",
      "secret text",
    ]);
    const project = await (
      await req("/workspace/projects", a, "POST", { packId: "game-character" })
    ).json();
    expect((await req("/workspace/projects/" + project.id, b)).status).toBe(
      404,
    );
    const state = {
      title: "My project",
      completed: ["brief"],
      notes: "private notes",
      outcome: "result",
      url: "",
      image: "",
      revision: 1,
    };
    expect(
      (
        await req("/workspace/projects/" + project.id, a, "PUT", {
          ...state,
          completed: ["fake"],
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await req("/workspace/projects/" + project.id, a, "PUT", {
          ...state,
          url: "javascript:alert(1)",
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await req("/workspace/projects/" + project.id, a, "PUT", {
          ...state,
          image: "data:image/svg+xml;base64,PHN2Zz4=",
        })
      ).status,
    ).toBe(400);
    expect(
      (await req("/workspace/projects/" + project.id, a, "PUT", state)).status,
    ).toBe(200);
    expect(
      (await req("/workspace/projects/" + project.id, a, "PUT", state)).status,
    ).toBe(409);
    const summary = await (await req("/workspace", a)).json();
    expect(summary.projects[0].done).toBe(1);
    expect(summary.prompts[0].body).toBeUndefined();
    expect(summary.projects[0].notes).toBeUndefined();
    const filtered = await (
      await req("/workspace/items?q=private&kind=工具", a)
    ).json();
    expect(filtered.total).toBe(1);
    expect(filtered.items[0].id).toBe(itemId);
    expect((await req("/workspace/items?page=0", a)).status).toBe(400);
    const other = await (await req("/workspace", b)).json();
    expect(other).toEqual({ itemCount: 0, prompts: [], projects: [] });
    const exported = await (await req("/workspace/export", a)).json();
    expect(exported.projects[0].notes).toBe("private notes");
    expect(exported.prompts[0].versions).toHaveLength(2);
    expect((await req("/workspace/prompts/" + p.id, a, "DELETE")).status).toBe(
      200,
    );
    expect(
      db.db.prepare("SELECT count(*) n FROM workspace_prompt_versions").get()
        ?.n,
    ).toBe(0);
    expect(
      (await req("/workspace/projects/" + project.id, a, "DELETE")).status,
    ).toBe(200);
    expect((await req("/workspace/projects/" + project.id, a)).status).toBe(
      404,
    );
    await req("/logout", a, "POST");
    expect((await req("/workspace", a)).status).toBe(401);
  } finally {
    await new Promise<void>((r) => server.close(() => r()));
    db.close();
  }
});
