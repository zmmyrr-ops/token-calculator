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
    expect(personaRows(db).find((p) => p.id === data.id)?.name).toBe(data.name);
    const published = await (await fetch(base + "/public")).json();
    expect(published.items).toHaveLength(personaSeeds.length - 1);
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
    expect(migrated.instructions).toContain("性格内核");
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

it("archives only legacy official personas atomically, retains recovery data and never reruns migration", () => {
  const db = new ContentDatabase(":memory:");
  try {
    db.db.exec(
      "CREATE TABLE personas(id TEXT PRIMARY KEY,data TEXT NOT NULL,revision INTEGER NOT NULL DEFAULT 1,updated_at TEXT NOT NULL)",
    );
    const old = {
      ...personaSeeds[0],
      id: "spark",
      name: "管理员改过的旧人格",
      published: true,
    };
    delete old.voice;
    for (const p of [old, { ...old, id: "custom-character" }])
      db.db
        .prepare("INSERT INTO personas VALUES(?,?,?,?)")
        .run(p.id, JSON.stringify(p), 8, "2026-09-01");
    initPersonas(db);
    const rows = personaRows(db);
    expect(rows.find((p) => p.id === "spark")).toMatchObject({
      published: false,
      revision: 9,
      name: old.name,
    });
    expect(rows.find((p) => p.id === "custom-character")).toMatchObject({
      published: true,
      revision: 8,
    });
    expect(rows.filter((p) => p.voice)).toHaveLength(personaSeeds.length);
    const record = db.db
      .prepare("SELECT snapshot FROM persona_content_migrations")
      .get()!;
    expect(JSON.parse(String(record.snapshot))[0]).toMatchObject({
      id: "spark",
      revision: 8,
    });
    expect(
      JSON.parse(JSON.parse(String(record.snapshot))[0].data).published,
    ).toBe(true);
    db.db
      .prepare(
        "UPDATE personas SET data=json_set(data,'$.published',json('false')) WHERE id=?",
      )
      .run(personaSeeds[0].id);
    initPersonas(db);
    expect(
      personaRows(db).find((p) => p.id === personaSeeds[0].id)?.published,
    ).toBe(false);
    expect(
      db.db.prepare("SELECT count(*) n FROM persona_content_migrations").get()
        ?.n,
    ).toBe(1);
    expect(personaRows(db).find((p) => p.id === "spark")?.revision).toBe(9);
  } finally {
    db.close();
  }
});
it("exports strength-specific scenes and a bounded custom address without leaving placeholders", () => {
  const p = personaSeeds[0];
  const light = personaArtifact(p, "light", "session", "小林");
  const strong = personaArtifact(p, "strong", "session", "小林");
  expect(strong).not.toEqual(light);
  expect(strong).toContain("小林");
  expect(strong).not.toContain("{{称呼}}");
  expect(strong).toContain(p.voice!.directions.strong);
  expect(light).toContain(p.voice!.directions.light);
  const card = personaCard(
    p,
    "strong",
    "https://ruming.top/personas",
    "",
    "<img>",
  );
  expect(card).not.toContain("<img>");
});
