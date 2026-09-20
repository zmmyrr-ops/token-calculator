import { learningCategory } from "../../shared/learning";
import { DatabaseSync, backup } from "node:sqlite";
import { mkdirSync, chmodSync } from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import type { Content } from "../../shared/content";
import {
  parseEntity,
  entityId,
  entityName,
  type Kind,
  type DocumentRecord,
  type Entity,
} from "../../shared/cms";
export class CmsError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
type Row = {
  kind: Kind;
  id: string;
  draft: string;
  published: string | null;
  revision: number;
  updated_at: string;
};
export class ContentDatabase {
  db: DatabaseSync;
  constructor(
    readonly file = path.resolve(
      process.env.DATABASE_FILE || "./storage/mendao.sqlite",
    ),
  ) {
    if (file !== ":memory:") mkdirSync(path.dirname(file), { recursive: true });
    this.db = new DatabaseSync(file);
    if (file !== ":memory:") chmodSync(file, 0o600);
    this.db
      .exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
   CREATE TABLE IF NOT EXISTS migrations(version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL);
   CREATE TABLE IF NOT EXISTS documents(kind TEXT NOT NULL,id TEXT NOT NULL,draft TEXT NOT NULL,published TEXT,revision INTEGER NOT NULL DEFAULT 1,position INTEGER NOT NULL,updated_at TEXT NOT NULL,PRIMARY KEY(kind,id));
   CREATE TABLE IF NOT EXISTS meta(key TEXT PRIMARY KEY,value TEXT NOT NULL);
   CREATE TABLE IF NOT EXISTS history(seq INTEGER PRIMARY KEY AUTOINCREMENT,kind TEXT NOT NULL,entity_id TEXT NOT NULL,action TEXT NOT NULL,actor TEXT NOT NULL,payload TEXT,at TEXT NOT NULL);
   CREATE TABLE IF NOT EXISTS admins(username TEXT PRIMARY KEY,password TEXT NOT NULL,must_change INTEGER NOT NULL DEFAULT 1);
   CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,username TEXT NOT NULL REFERENCES admins(username),expires INTEGER NOT NULL);
   CREATE TABLE IF NOT EXISTS news_items(id TEXT PRIMARY KEY,payload TEXT NOT NULL);
   CREATE TABLE IF NOT EXISTS login_limits(key TEXT PRIMARY KEY,attempts INTEGER NOT NULL,expires INTEGER NOT NULL);
   INSERT OR IGNORE INTO migrations VALUES(1,datetime('now'));
   CREATE TABLE IF NOT EXISTS analytics_events(seq INTEGER PRIMARY KEY AUTOINCREMENT,event_id TEXT NOT NULL UNIQUE,name TEXT NOT NULL,page TEXT NOT NULL,target TEXT NOT NULL,at INTEGER NOT NULL);
   CREATE INDEX IF NOT EXISTS analytics_events_at ON analytics_events(at);
   CREATE INDEX IF NOT EXISTS analytics_events_name_at ON analytics_events(name,at);
   INSERT OR IGNORE INTO migrations VALUES(2,datetime('now'));`);
    this.transaction(() => {
      const columns = this.db
        .prepare("PRAGMA table_info(analytics_events)")
        .all()
        .map((c) => c.name);
      if (!columns.includes("source"))
        this.db.exec("ALTER TABLE analytics_events ADD COLUMN source TEXT");
      if (!columns.includes("device"))
        this.db.exec("ALTER TABLE analytics_events ADD COLUMN device TEXT");
      if (!columns.includes("traffic_version"))
        this.db.exec(
          "ALTER TABLE analytics_events ADD COLUMN traffic_version INTEGER NOT NULL DEFAULT 0",
        );
      this.db.exec(
        "INSERT OR IGNORE INTO migrations VALUES(6,datetime('now'))",
      );
    });
  }
  transaction<T>(fn: () => T): T {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const value = fn();
      this.db.exec("COMMIT");
      return value;
    } catch (e) {
      this.db.exec("ROLLBACK");
      throw e;
    }
  }
  meta<T>(key: string): T | undefined {
    const row = this.db.prepare("SELECT value FROM meta WHERE key=?").get(key);
    return row ? JSON.parse(String(row.value)) : undefined;
  }
  private publicListeners = new Set<() => void>();
  private publicChangeQueued = false;
  onPublicChange(listener: () => void) {
    this.publicListeners.add(listener);
    return () => {
      this.publicListeners.delete(listener);
    };
  }
  setMeta(key: string, value: unknown) {
    this.db
      .prepare(
        "INSERT INTO meta VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
      )
      .run(key, JSON.stringify(value));
    if (
      ["contentVersion", "newsState", "base"].includes(key) &&
      this.publicListeners.size &&
      !this.publicChangeQueued
    ) {
      this.publicChangeQueued = true;
      queueMicrotask(() => {
        this.publicChangeQueued = false;
        for (const listener of this.publicListeners) listener();
      });
    }
  }
  seed(data: Content) {
    if (this.meta("seeded")) return;
    this.transaction(() => {
      const insert = this.db.prepare(
        "INSERT INTO documents VALUES(?,?,?,?,?,?,?)",
      );
      let position = 0;
      for (const [kind, items] of [
        ["knowledge", data.knowledge],
        ["resource", data.resources],
        ["scenario", data.scenarios],
        ["model", data.catalog.models],
      ] as [Kind, Entity[]][])
        for (const item of items) {
          const parsed = parseEntity(kind, item);
          insert.run(
            kind,
            entityId(parsed),
            JSON.stringify(parsed),
            JSON.stringify(parsed),
            1,
            position++,
            new Date().toISOString(),
          );
          this.audit(kind, entityId(parsed), "import", "system", parsed);
        }
      this.setMeta("base", {
        site: data.site,
        coverage: data.coverage,
        catalog: { ...data.catalog, models: [] },
      });
      this.setMeta("contentVersion", 1);
      this.setMeta("seeded", true);
    });
  }
  private decode(r: Row): DocumentRecord {
    return {
      kind: r.kind,
      id: r.id,
      draft: JSON.parse(r.draft),
      published: r.published ? JSON.parse(r.published) : null,
      revision: r.revision,
      updatedAt: r.updated_at,
    };
  }
  get(kind: Kind, id: string) {
    const r = this.db
      .prepare("SELECT * FROM documents WHERE kind=? AND id=?")
      .get(kind, id) as Row | undefined;
    if (!r) throw new CmsError(404, "内容不存在");
    return this.decode(r);
  }
  list(kind: Kind) {
    return (
      this.db
        .prepare("SELECT * FROM documents WHERE kind=? ORDER BY position")
        .all(kind) as Row[]
    ).map((r) => {
      const d = this.decode(r);
      return {
        kind,
        id: d.id,
        title: entityName(d.draft),
        revision: d.revision,
        updatedAt: d.updatedAt,
        status: d.published
          ? JSON.stringify(d.published) === JSON.stringify(d.draft)
            ? "published"
            : "changed"
          : "draft",
      };
    });
  }
  publicContent(): Content {
    const base =
      this.meta<Pick<Content, "site" | "coverage" | "catalog">>("base");
    if (!base) throw Error("Database not initialized");
    const rows = this.db
      .prepare(
        "SELECT kind,published FROM documents WHERE published IS NOT NULL ORDER BY position",
      )
      .all();
    const values = (kind: Kind) =>
      rows
        .filter((r) => r.kind === kind)
        .map((r) => JSON.parse(String(r.published)));
    const knowledge = (values("knowledge") as Content["knowledge"]).map(
      (a) => ({ ...a, category: learningCategory(a.category) }),
    );
    return {
      ...base,
      seoOverrides: this.meta<Content["seoOverrides"]>("seoOverrides") || {},
      catalog: {
        ...base.catalog,
        version:
          base.catalog.version + "-db" + this.meta<number>("contentVersion"),
        models: values("model"),
      },
      knowledge,
      resources: values("resource"),
      scenarios: values("scenario"),
      tutorialSlugs: knowledge
        .filter((a) => a.practice || a.workshop)
        .map((a) => a.slug),
    };
  }
  private audit(
    kind: Kind,
    id: string,
    action: string,
    actor: string,
    value: unknown,
  ) {
    this.db
      .prepare(
        "INSERT INTO history(kind,entity_id,action,actor,payload,at) VALUES(?,?,?,?,?,?)",
      )
      .run(
        kind,
        id,
        action,
        actor,
        JSON.stringify(value),
        new Date().toISOString(),
      );
  }
  create(kind: Kind, value: unknown, actor: string) {
    const parsed = parseEntity(kind, value),
      id = entityId(parsed);
    this.transaction(() => {
      if (
        this.db
          .prepare("SELECT 1 FROM documents WHERE kind=? AND id=?")
          .get(kind, id)
      )
        throw new CmsError(409, "标识已存在，请更换 URL 标识");
      this.db
        .prepare("INSERT INTO documents VALUES(?,?,?,NULL,1,?,?)")
        .run(
          kind,
          id,
          JSON.stringify(parsed),
          Number(
            this.db
              .prepare("SELECT COALESCE(MAX(position),0)+1 AS n FROM documents")
              .get()!.n,
          ),
          new Date().toISOString(),
        );
      this.audit(kind, id, "create", actor, parsed);
    });
    return this.get(kind, id);
  }
  save(
    kind: Kind,
    id: string,
    value: unknown,
    revision: number,
    actor: string,
  ) {
    const parsed = parseEntity(kind, value);
    if (entityId(parsed) !== id)
      throw new CmsError(400, "已创建的 URL 标识不可更改");
    this.transaction(() => {
      const current = this.get(kind, id);
      if (current.revision !== revision)
        throw new CmsError(409, "内容已被其他窗口修改，请重新加载后编辑");
      this.db
        .prepare(
          "UPDATE documents SET draft=?,revision=revision+1,updated_at=? WHERE kind=? AND id=?",
        )
        .run(JSON.stringify(parsed), new Date().toISOString(), kind, id);
      this.audit(kind, id, "save", actor, parsed);
    });
    return this.get(kind, id);
  }
  private validateGraph(data: Content) {
    const has = (items: { id: string }[], id: string) =>
      items.some((x) => x.id === id);
    const article = (id: string) => data.knowledge.some((x) => x.slug === id);
    for (const a of data.knowledge) {
      if (
        !a.title.trim() ||
        !a.summary.trim() ||
        a.sections.some((s) => !s.title.trim() || !s.body.trim())
      )
        throw new CmsError(422, `文章「${a.title}」缺少摘要或段落正文`);
      if (a.practice) {
        // Reading chapters and the companion checklist are independent sections.
        if (
          !a.practice.steps.length ||
          a.practice.steps.some(
            (s) =>
              !s.actions.length ||
              s.actions.some((action) => !action.trim()) ||
              !s.check.trim(),
          )
        )
          throw new CmsError(422, "实践清单必须包含操作项与验收条件");
        if (!has(data.scenarios, a.practice.scenario))
          throw new CmsError(
            422,
            `教程关联的场景 ${a.practice.scenario} 未发布`,
          );
        for (const t of a.practice.toolRoles)
          if (!has(data.resources, t.id))
            throw new CmsError(422, `教程关联工具 ${t.id} 未发布`);
      }
    }
    for (const r of data.resources)
      if (!article(r.article))
        throw new CmsError(
          422,
          `工具「${r.name}」关联的文章 ${r.article} 未发布或被引用中`,
        );
    for (const s of data.scenarios) {
      for (const a of s.articles)
        if (!article(a))
          throw new CmsError(
            422,
            `场景「${s.name}」引用文章 ${a}，请先发布或移除引用`,
          );
      for (const t of s.tools)
        if (!has(data.resources, t))
          throw new CmsError(
            422,
            `场景「${s.name}」引用工具 ${t}，请先发布或移除引用`,
          );
    }
  }
  changePublication(
    kind: Kind,
    id: string,
    revision: number,
    publish: boolean,
    actor: string,
  ) {
    this.transaction(() => {
      const d = this.get(kind, id);
      if (d.revision !== revision)
        throw new CmsError(409, "内容版本冲突，请重新加载");
      this.db
        .prepare(
          "UPDATE documents SET published=?,revision=revision+1,updated_at=? WHERE kind=? AND id=?",
        )
        .run(
          publish ? JSON.stringify(d.draft) : null,
          new Date().toISOString(),
          kind,
          id,
        );
      this.validateGraph(this.publicContent());
      this.setMeta(
        "contentVersion",
        (this.meta<number>("contentVersion") || 0) + 1,
      );
      this.audit(kind, id, publish ? "publish" : "unpublish", actor, d.draft);
    });
    return this.get(kind, id);
  }
  remove(kind: Kind, id: string, revision: number, actor: string) {
    this.transaction(() => {
      const d = this.get(kind, id);
      if (d.revision !== revision) throw new CmsError(409, "内容版本冲突");
      if (d.published) throw new CmsError(422, "请先撤下已发布内容");
      this.audit(kind, id, "delete", actor, d.draft);
      this.db
        .prepare("DELETE FROM documents WHERE kind=? AND id=?")
        .run(kind, id);
    });
  }
  history(kind: Kind, id: string) {
    return this.db
      .prepare(
        "SELECT seq,action,actor,at FROM history WHERE kind=? AND entity_id=? ORDER BY seq DESC LIMIT 30",
      )
      .all(kind, id);
  }
  restore(
    kind: Kind,
    id: string,
    seq: number,
    revision: number,
    actor: string,
  ) {
    const row = this.db
      .prepare(
        "SELECT payload FROM history WHERE seq=? AND kind=? AND entity_id=?",
      )
      .get(seq, kind, id);
    if (!row?.payload) throw new CmsError(404, "历史版本不存在");
    return this.save(
      kind,
      id,
      JSON.parse(String(row.payload)),
      revision,
      actor,
    );
  }
  loadNews() {
    const state = this.meta<Record<string, unknown>>("newsState");
    if (!state) return undefined;
    return {
      ...state,
      items: this.db
        .prepare("SELECT payload FROM news_items")
        .all()
        .map((x) => JSON.parse(String(x.payload))),
    };
  }
  saveNews(value: { items: { id: string }[]; [key: string]: unknown }) {
    this.transaction(() => {
      const { items, ...state } = value;
      this.setMeta("newsState", state);
      this.db.exec("DELETE FROM news_items");
      const insert = this.db.prepare("INSERT INTO news_items VALUES(?,?)");
      for (const item of items) insert.run(item.id, JSON.stringify(item));
    });
  }
  async backupFile() {
    const dir = path.dirname(this.file);
    const target = path.join(
      dir,
      "backup-" + Date.now() + "-" + randomBytes(4).toString("hex") + ".sqlite",
    );
    await backup(this.db, target);
    chmodSync(target, 0o600);
    return target;
  }
  close() {
    this.db.close();
  }
}
