import { it, expect } from "vitest";
import express from "express";
import { ContentDatabase, CmsError } from "../../backend/src/database";
import { initEyes, eyesRouter } from "../../backend/src/ai-eyes";
import { parseMobileResult, mobilePrompt } from "../../shared/ai-eyes-mobile";
import { eyesCatalog } from "../../shared/ai-eyes";
const result = {
  format: "AI_EYES_MOBILE_1",
  persona_id: "one_line_ceo",
  basis: "questions",
  match_notes: ["习惯先给目标，再逐步补充要求。"],
};
it("provides complete mobile instructions and accepts only minimal structured results", () => {
  for (const mode of ["conversation", "questions"] as const) {
    const p = mobilePrompt(mode);
    for (const item of eyesCatalog.items) expect(p).toContain(item.id);
    expect(p).not.toContain("submit_token");
  }
  expect(
    parseMobileResult("```json\n" + JSON.stringify(result) + "\n```"),
  ).toEqual(result);
  for (const bad of [
    { ...result, persona_id: "fake" },
    { ...result, basis: "all_history" },
    { ...result, chat: "private" },
    { ...result, match_notes: ["contact@example.com"] },
  ])
    expect(() => parseMobileResult(JSON.stringify(bad))).toThrow();
});
it("imports private completed results, enforces origins, ownership, provenance and maintenance", async () => {
  const db = new ContentDatabase(":memory:");
  initEyes(db);
  const app = express();
  app.use(express.json());
  app.use("/eyes", eyesRouter(db));
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
  const a = s.address();
  if (!a || typeof a === "string") throw Error("port");
  const base = `http://127.0.0.1:${a.port}/eyes`;
  const post = (
    path: string,
    body: unknown,
    cookie = "",
    origin = process.env.SITE_URL || "https://ruming.top",
  ) =>
    fetch(base + path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: origin,
        Cookie: cookie,
      },
      body: JSON.stringify(body),
    });
  try {
    const body = { result, platform: "豆包", confirmed: true };
    expect(
      (await post("/mobile-results", body, "", "https://evil.example")).status,
    ).toBe(403);
    expect(
      (await post("/mobile-results", { ...body, confirmed: false })).status,
    ).toBe(400);
    const r = await post("/mobile-results", body);
    expect(r.status).toBe(201);
    const cookie = r.headers.get("set-cookie")!.split(";")[0];
    const { run } = await r.json();
    expect(run.status).toBe("completed");
    expect(run.scope.source).toBe("mobile_import");
    expect(run.scope.basis).toBe("questions");
    expect((await fetch(base + "/runs/" + run.id)).status).toBe(401);
    expect(
      (await fetch(base + "/runs/" + run.id, { headers: { Cookie: cookie } }))
        .status,
    ).toBe(200);
    const share = await post(
      "/runs/" + run.id + "/share",
      {
        confirmed: true,
        selection: { personaId: "one_line_ceo", nickname: "我" },
      },
      cookie,
    );
    expect(share.status).toBe(201);
    const snap = await (
      await fetch(base + "/shares/" + (await share.json()).id)
    ).json();
    expect(snap.source).toBe("mobile_import");
    expect(snap.match_notes).toBeUndefined();
    db.db.prepare("UPDATE ai_eyes_settings SET enabled=0").run();
    expect((await post("/mobile-results", body, cookie)).status).toBe(503);
  } finally {
    await new Promise<void>((r) => s.close(() => r()));
    db.db.close();
  }
});
