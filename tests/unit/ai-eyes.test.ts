import { it, expect } from "vitest";
import express from "express";
import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { ContentDatabase, CmsError } from "../../backend/src/database";
import { initEyes, eyesRouter, pruneEyes } from "../../backend/src/ai-eyes";
import { eyesCatalog, matchSchema } from "../../shared/ai-eyes";
import { execFileSync } from "node:child_process";
const match = {
  schema_version: "4",
  catalog_version: "user-original-1",
  persona_id: "one_line_ceo",
  alternative_persona_id: null,
  match_notes: ["偏好先给方向，再根据结果完善。"],
  sample_scope: "limited",
};
it("preserves every original persona and source hash", () => {
  const raw = readFileSync("data/ai-eyes/original.md", "utf8");
  expect(createHash("sha256").update(raw).digest("hex")).toBe(
    eyesCatalog.sha256,
  );
  expect(eyesCatalog.items).toHaveLength(16);
  for (const p of eyesCatalog.items) {
    expect(raw).toContain(p.markdown);
    const actual = p.blocks
      .map((b) => b.runs.map((x) => x.text).join(""))
      .join("\n\n");
    expect(actual).toBe(
      p.markdown
        .replace(/^#{2,3} /gm, "")
        .replaceAll("**", "")
        .replace(/\n\s*\n/g, "\n\n"),
    );
    expect(p.blocks.filter((b) => b.kind === "h3")).toHaveLength(5);
  }
  expect(() => matchSchema.parse({ ...match, chat: "private text" })).toThrow();
  expect(() =>
    matchSchema.parse({ ...match, match_notes: ["contact@example.com"] }),
  ).toThrow();
});
it("isolates owner / submit / claim grants, enforces terminal states, snapshots and expiry", async () => {
  const db = new ContentDatabase(":memory:");
  initEyes(db);
  const app = express();
  app.use(express.json({ limit: "16kb" }));
  app.use("/eyes", eyesRouter(db));
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
  const address = server.address();
  if (!address || typeof address === "string") throw Error("listen");
  const base = `http://127.0.0.1:${address.port}/eyes`;
  const request = (
    path: string,
    method = "GET",
    body?: unknown,
    headers: Record<string, string> = {},
  ) =>
    fetch(base + path, {
      method,
      headers: {
        "Content-Type": "application/json",
        Origin: process.env.SITE_URL || "https://ruming.top",
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  try {
    const created = await request("/runs", "POST", {
      days: 7,
      timeZone: "Asia/Shanghai",
    });
    expect(created.status).toBe(201);
    const cookie = created.headers.get("set-cookie")!.split(";")[0],
      a = await created.json(),
      id = a.run.id,
      auth = { Authorization: "Bearer " + a.submitToken };
    expect((await request("/runs/" + id)).status).toBe(401);
    expect((await request("/runs/" + id, "GET", undefined, auth)).status).toBe(
      401,
    );
    expect(
      (await request("/runs/" + id + "/execution", "GET", undefined, auth))
        .status,
    ).toBe(200);
    expect(
      (
        await request(
          "/runs/" + id + "/progress",
          "POST",
          { phase: "matching" },
          auth,
        )
      ).status,
    ).toBe(200);
    expect(
      (
        await request(
          "/runs/" + id + "/progress",
          "POST",
          { phase: "collecting" },
          auth,
        )
      ).status,
    ).toBe(409);
    expect(
      (await request("/runs/" + id + "/result", "POST", match, auth)).status,
    ).toBe(200);
    expect(
      (await request("/runs/" + id + "/result", "POST", match, auth)).status,
    ).toBe(200);
    expect(
      (
        await request(
          "/runs/" + id + "/result",
          "POST",
          { ...match, persona_id: "ai_tamer" },
          auth,
        )
      ).status,
    ).toBe(409);
    expect(
      (await request("/runs/" + id + "/cancel", "POST", {}, { Cookie: cookie }))
        .status,
    ).toBe(409);
    const selection = { personaId: "ai_tamer", nickname: "我" };
    const published = await request(
      "/runs/" + id + "/share",
      "POST",
      { confirmed: true, selection },
      { Cookie: cookie },
    );
    expect(published.status).toBe(201);
    const share = await published.json();
    const snapshot = await (await request("/shares/" + share.id)).json();
    expect(snapshot.selectionMode).toBe("self_selected");
    expect(snapshot.match_notes).toBeUndefined();
    expect(snapshot.run_id).toBeUndefined();
    const claim = await request("/claims/redeem", "POST", {
      token: a.claimToken,
    });
    expect(claim.status).toBe(200);
    const claimedCookie = claim.headers.get("set-cookie")!.split(";")[0];
    expect(
      (
        await request(
          "/claims/redeem",
          "POST",
          { token: a.claimToken },
          { Cookie: claimedCookie },
        )
      ).status,
    ).toBe(200);
    expect(
      (await request("/claims/redeem", "POST", { token: a.claimToken })).status,
    ).toBe(409);
    expect(
      (
        await request("/runs/" + id, "GET", undefined, {
          Cookie: claimedCookie,
        })
      ).status,
    ).toBe(200);
    await request("/runs/" + id + "/share", "DELETE", undefined, {
      Cookie: cookie,
    });
    expect((await request("/shares/" + share.id)).status).toBe(404);
    const cancelled = await (
      await request(
        "/runs",
        "POST",
        { days: 7, timeZone: "UTC" },
        { Cookie: cookie },
      )
    ).json();
    await request(
      "/runs/" + cancelled.run.id + "/cancel",
      "POST",
      {},
      { Cookie: cookie },
    );
    expect(
      (
        await request("/runs/" + cancelled.run.id + "/result", "POST", match, {
          Authorization: "Bearer " + cancelled.submitToken,
        })
      ).status,
    ).toBe(409);
    pruneEyes(db, Date.now() + 32 * 86400000);
    expect(
      (await request("/runs/" + id, "GET", undefined, { Cookie: cookie }))
        .status,
    ).toBe(404);
    expect(
      db.db.prepare("SELECT count(*) n FROM ai_eyes_grants").get()?.n,
    ).toBe(0);
  } finally {
    await new Promise<void>((r) => server.close(() => r()));
    db.close();
  }
});
it("collector fixture enforces date range, duplicate removal and immutable input", () => {
  expect(
    execFileSync("python3", ["tests/fixtures/eyes-collector-test.py"], {
      encoding: "utf8",
    }),
  ).toContain("passed");
});

it("replays deletion journal before restored data becomes available", async () => {
  const { recordEyesDeletion, replayEyesDeletions } =
    await import("../../backend/src/ai-eyes-deletions");
  const dir = mkdtempSync("/tmp/eyes-restore-");
  const db = new ContentDatabase(dir + "/test.sqlite");
  try {
    initEyes(db);
    const id = "a".repeat(24),
      sid = "b".repeat(24);
    db.db
      .prepare(
        "INSERT INTO ai_eyes_runs(id,owner,submit_hash,claim_hash,state,phase,created,deadline,expires,scope,share_id) VALUES(?,?,?,?,'completed','completed',?,?,?,?,?)",
      )
      .run(
        id,
        "owner",
        "submit",
        "claim",
        Date.now(),
        Date.now() + 1000,
        Date.now() + 10000,
        "{}",
        sid,
      );
    db.db
      .prepare("INSERT INTO ai_eyes_shares VALUES(?,?,?,?)")
      .run(sid, id, "{}", Date.now() + 10000);
    recordEyesDeletion(db, "share", sid);
    replayEyesDeletions(db);
    expect(
      db.db.prepare("SELECT count(*) n FROM ai_eyes_shares").get()?.n,
    ).toBe(0);
    expect(
      db.db.prepare("SELECT share_id FROM ai_eyes_runs").get()?.share_id,
    ).toBeNull();
    recordEyesDeletion(db, "run", id);
    replayEyesDeletions(db);
    replayEyesDeletions(db);
    expect(db.db.prepare("SELECT count(*) n FROM ai_eyes_runs").get()?.n).toBe(
      0,
    );
  } finally {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
