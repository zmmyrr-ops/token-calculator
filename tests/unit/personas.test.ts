import { it, expect } from "vitest";
import express from "express";
import { ContentDatabase, CmsError } from "../../backend/src/database";
import {
  initPersonas,
  personaRows,
  personaSeeds,
  personasRouter,
} from "../../backend/src/personas";
import { personaArtifact, personaCard } from "../../shared/personas";
it("seeds without overwriting edits and preserves unpublishing with revision conflict protection", async () => {
  const db = new ContentDatabase(":memory:");
  initPersonas(db);
  const first = personaRows(db)[0];
  const app = express();
  app.use(express.json());
  app.use("/public", personasRouter(db));
  app.use("/admin", personasRouter(db, true));
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
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw Error("address");
  const base = `http://127.0.0.1:${address.port}`;
  try {
    const data = { ...personaSeeds[0], name: "编辑后的人格", published: false };
    const put = () =>
      fetch(base + "/admin/" + data.id, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data, revision: first.revision }),
      });
    expect((await put()).status).toBe(200);
    expect((await put()).status).toBe(409);
    initPersonas(db);
    expect(personaRows(db)[0].name).toBe(data.name);
    const published = await (await fetch(base + "/public")).json();
    expect(published.items).toHaveLength(11);
    expect(published.items.some((p: { id: string }) => p.id === data.id)).toBe(
      false,
    );
  } finally {
    await new Promise<void>((r) => server.close(() => r()));
    db.close();
  }
});
it("exports explicit skills and scoped instructions and escapes share card content", () => {
  for (const p of personaSeeds) {
    expect(personaArtifact(p, "light", "skill")).toContain(
      `name: mendao-${p.id}`,
    );
    expect(personaArtifact(p, "balanced", "session")).toContain(
      "不要写入长期记忆",
    );
    expect(personaArtifact(p, "strong", "global")).toContain(
      "<!-- mendao-persona:start -->",
    );
    expect(personaArtifact(p, "strong", "project")).toContain("不改变工具权限");
  }
  const card = personaCard(
    { ...personaSeeds[0], name: "<script>alert(1)</script>" },
    "balanced",
    "https://ruming.top/personas?a=1&b=2",
  );
  expect(card).not.toContain("<script>");
  expect(card).toContain("&lt;script&gt;");
  expect(card).toContain("&amp;b=2");
});
it("backfills detailed instructions once without replacing existing editor content", () => {
  const db = new ContentDatabase(":memory:");
  try {
    initPersonas(db);
    const legacy = { ...personaSeeds[0] };
    delete legacy.instructions;
    db.db
      .prepare("UPDATE personas SET data=? WHERE id=?")
      .run(
        JSON.stringify({ ...legacy, name: "保留编辑名称", published: false }),
        legacy.id,
      );
    initPersonas(db);
    const migrated = personaRows(db)[0];
    expect(migrated.instructions).toContain("多场景对话示范");
    expect(migrated.name).toBe("保留编辑名称");
    expect(migrated.published).toBe(false);
    initPersonas(db);
    expect(personaRows(db)[0].revision).toBe(migrated.revision);
    const custom = "这是管理员自定义的完整指令。".repeat(20);
    expect(
      personaArtifact(
        { ...personaSeeds[0], instructions: custom },
        "balanced",
        "skill",
      ),
    ).toContain(custom);
    for (const p of personaSeeds) {
      const content = personaArtifact(p, "balanced", "skill");
      expect(content).toContain("角色定位");
      expect(content).toContain("代码报错");
      expect(content).toContain("第一版想同时做五个功能");
      expect(content).toContain("回答前检查");
    }
  } finally {
    db.close();
  }
});
it("embeds only safe image data in standalone share cards", () => {
  expect(
    personaCard(
      personaSeeds[0],
      "balanced",
      "https://ruming.top",
      "data:image/webp;base64,AAAA",
    ),
  ).toContain('<image href="data:image/webp;base64,AAAA"');
  expect(
    personaCard(
      personaSeeds[0],
      "balanced",
      "https://ruming.top",
      "javascript:alert(1)",
    ),
  ).not.toContain("javascript:");
});
