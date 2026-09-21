import { personaPlaybooks } from "../../shared/persona-playbooks";
import { Router } from "express";
import { z } from "zod";
import { ContentDatabase, CmsError } from "./database";
import { personaSchema, type Persona } from "../../shared/personas";
import { personasV2 } from "./personas-v2";
export const personaSeeds: Persona[] = personasV2;
export const legacyPersonaIds = [
  "spark",
  "velvet",
  "soft-cloud",
  "mentor",
  "roast",
  "butler",
  "coach",
  "detective",
  "captain",
  "poet",
  "peer",
  "sunny",
];
export function initPersonas(db: ContentDatabase) {
  db.db.exec(
    "CREATE TABLE IF NOT EXISTS personas(id TEXT PRIMARY KEY,data TEXT NOT NULL,revision INTEGER NOT NULL DEFAULT 1,updated_at TEXT NOT NULL)",
  );
  db.db.exec(
    "CREATE TABLE IF NOT EXISTS persona_content_migrations(version TEXT PRIMARY KEY, snapshot TEXT NOT NULL, applied_at TEXT NOT NULL)",
  );
  db.transaction(() => {
    const version = "personas-v2-20260921";
    if (
      !db.db
        .prepare("SELECT 1 FROM persona_content_migrations WHERE version=?")
        .get(version)
    ) {
      const now = new Date().toISOString();
      const oldRows = db.db
        .prepare("SELECT id,data,revision,updated_at FROM personas")
        .all()
        .filter((row) => legacyPersonaIds.includes(String(row.id)));
      for (const row of oldRows) {
        const before = JSON.parse(String(row.data));
        db.db
          .prepare(
            "UPDATE personas SET data=?,revision=revision+1,updated_at=? WHERE id=?",
          )
          .run(JSON.stringify({ ...before, published: false }), now, row.id);
        db.db
          .prepare(
            "INSERT INTO history(kind,entity_id,action,actor,payload,at) VALUES(?,?,?,?,?,?)",
          )
          .run(
            "persona",
            row.id,
            "archive",
            "migration:personas-v2",
            String(row.data),
            now,
          );
      }
      db.db
        .prepare(
          "INSERT INTO persona_content_migrations(version,snapshot,applied_at) VALUES(?,?,?)",
        )
        .run(version, JSON.stringify(oldRows), now);
    }
    for (const p of personaSeeds)
      db.db
        .prepare(
          "INSERT OR IGNORE INTO personas(id,data,updated_at) VALUES(?,?,?)",
        )
        .run(p.id, JSON.stringify(p), new Date().toISOString());
    for (const row of db.db.prepare("SELECT id,data FROM personas").all()) {
      const data = JSON.parse(String(row.data));
      const instructions =
        personaSeeds.find((p) => p.id === String(row.id))?.instructions ||
        personaPlaybooks[String(row.id)];
      if (!data.instructions && instructions) {
        db.db
          .prepare(
            "UPDATE personas SET data=?,revision=revision+1,updated_at=? WHERE id=?",
          )
          .run(
            JSON.stringify({ ...data, instructions }),
            new Date().toISOString(),
            row.id,
          );
      }
    }
  });
}
export function personaRows(db: ContentDatabase) {
  return db.db
    .prepare("SELECT data,revision,updated_at FROM personas ORDER BY rowid")
    .all()
    .map((r) => ({
      ...personaSchema.parse(JSON.parse(String(r.data))),
      revision: Number(r.revision),
      updatedAt: String(r.updated_at),
    }));
}
export function personasRouter(db: ContentDatabase, admin = false) {
  const router = Router();
  router.get("/", (_req, res) =>
    res.json({ items: personaRows(db).filter((p) => admin || p.published) }),
  );
  if (admin)
    router.put("/:id", (req, res) => {
      const { data, revision } = z
        .object({ data: personaSchema, revision: z.number().int().positive() })
        .strict()
        .parse(req.body);
      if (data.id !== req.params.id)
        throw new CmsError(400, "人格 ID 不可修改");
      db.transaction(() => {
        const now = new Date().toISOString();
        const result = db.db
          .prepare(
            "UPDATE personas SET data=?,revision=revision+1,updated_at=? WHERE id=? AND revision=?",
          )
          .run(JSON.stringify(data), now, data.id, revision);
        if (!result.changes)
          throw new CmsError(409, "内容已被修改，请重新加载后编辑");
        db.db
          .prepare(
            "INSERT INTO history(kind,entity_id,action,actor,payload,at) VALUES(?,?,?,?,?,?)",
          )
          .run(
            "persona",
            data.id,
            "update",
            String(res.locals.adminUsername),
            JSON.stringify(data),
            now,
          );
      });
      res.json({ ok: true });
    });
  return router;
}
