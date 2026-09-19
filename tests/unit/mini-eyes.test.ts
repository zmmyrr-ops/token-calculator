import { it, expect } from "vitest";
import express from "express";
import { ContentDatabase, CmsError } from "../../backend/src/database";
import { communityRouter, initCommunity } from "../../backend/src/community";
import { initEyes } from "../../backend/src/ai-eyes";
it("mini portrait requires native session and consent, stores only own latest result and supports deletion", async () => {
  const db = new ContentDatabase(":memory:");
  initCommunity(db);
  initEyes(db);
  const app = express();
  app.use(express.json());
  app.use("/mini", communityRouter(db, "bearer"));
  app.use("/web", communityRouter(db));
  app.use(
    (
      e: Error,
      _q: express.Request,
      r: express.Response,
      _n: express.NextFunction,
    ) =>
      r
        .status(e instanceof CmsError ? e.status : 400)
        .json({ error: e.message }),
  );
  const s = app.listen(0, "127.0.0.1");
  await new Promise<void>((r) => s.once("listening", r));
  const address = s.address();
  if (!address || typeof address === "string") throw Error("port");
  const base = `http://127.0.0.1:${address.port}`;
  const call = (
    p: string,
    method = "GET",
    body?: unknown,
    token = "",
    origin = "",
  ) =>
    fetch(base + p, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: "Bearer " + token } : {}),
        ...(origin ? { Origin: origin } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  try {
    const register = await call("/mini/register", "POST", {
      username: "mini_eyes_a",
      nickname: "读者",
      password: "MiniPortrait123!",
    });
    const { token } = await register.json();
    const other = await (
      await call("/mini/register", "POST", {
        username: "mini_eyes_b",
        nickname: "另一读者",
        password: "MiniPortrait123!",
      })
    ).json();
    const input = {
      confirmed: true,
      platform: "豆包",
      result: {
        format: "AI_EYES_BEHAVIOR_2",
        basis: "questions",
        sample_count: 5,
        keywords: [
          { keyword: "简短指令", count: 5 },
          { keyword: "委托决策", count: 1 },
        ],
      },
    };
    expect((await call("/mini/eyes", "POST", input)).status).toBe(401);
    expect(
      (await call("/mini/eyes", "POST", input, token, "https://evil.example"))
        .status,
    ).toBe(403);
    expect(
      (await call("/mini/eyes", "POST", { ...input, confirmed: false }, token))
        .status,
    ).toBe(400);
    const r = await call("/mini/eyes", "POST", input, token);
    expect(r.status).toBe(201);
    const data = await r.json();
    expect(data.result.persona.id).toBe("one_line_ceo");
    expect(data.result.cover).toMatch(/cover-v4.png$/);
    expect(JSON.stringify(data)).not.toContain("keywords");
    expect(
      (await (await call("/mini/eyes", "GET", undefined, other.token)).json())
        .result,
    ).toBeNull();
    await call("/mini/eyes", "POST", input, token);
    expect(
      db.db.prepare("SELECT count(*) n FROM mini_eyes_results").get()?.n,
    ).toBe(1);
    expect(
      (await call("/web/eyes", "POST", input, token, "https://ruming.top"))
        .status,
    ).toBe(404);
    await call("/mini/eyes", "DELETE", undefined, token);
    expect(
      (await (await call("/mini/eyes", "GET", undefined, token)).json()).result,
    ).toBeNull();
    db.db.prepare("UPDATE ai_eyes_settings SET enabled=0").run();
    expect((await call("/mini/eyes", "POST", input, token)).status).toBe(503);
  } finally {
    await new Promise<void>((r) => s.close(() => r()));
    db.close();
  }
});
