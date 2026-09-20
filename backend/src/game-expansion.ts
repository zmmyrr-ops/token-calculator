import { ContentDatabase } from "./database";
import { parseEntity, entityId, type Kind } from "../../shared/cms";
import { resourceCategory } from "../../shared/resource-categories";
import expansion from "./content/game-expansion.json";
import icons from "./content/platform-icons.json";
export function expandGameContent(store: ContentDatabase) {
  if (store.meta("gamePlatforms20260920")) return;
  store.transaction(() => {
    let position = Number(
      store.db
        .prepare("SELECT coalesce(max(position),0) n FROM documents")
        .get()!.n,
    );
    const at = new Date().toISOString();
    const audit = (kind: string, id: string, raw: string) =>
      store.db
        .prepare(
          "INSERT INTO history(kind,entity_id,action,actor,payload,at) VALUES(?,?,'enrich','game-platforms-20260920',?,?)",
        )
        .run(kind, id, raw, at);
    for (const [kind, items] of [
      ["knowledge", expansion.knowledge],
      ["resource", expansion.resources],
    ] as [Kind, unknown[]][]) {
      for (const item of items) {
        const parsed = parseEntity(kind, item),
          id = entityId(parsed),
          raw = JSON.stringify(parsed);
        const result = store.db
          .prepare("INSERT OR IGNORE INTO documents VALUES(?,?,?,?,?,?,?)")
          .run(kind, id, raw, raw, 1, ++position, at);
        if (result.changes) audit(kind, id, raw);
      }
    }
    const articles: Record<string, string> = { godot: "godot-ai-prototype" };
    const tags: Record<string, string[]> = {
      godot: ["完整引擎", "2D / 3D", "开源"],
      unity: ["完整引擎", "2D / 3D"],
      unreal: ["完整引擎", "3D"],
      blender: ["3D 建模", "资产制作"],
      firefly: ["图像生成", "视频生成"],
    };
    for (const row of store.db
      .prepare("SELECT * FROM documents WHERE kind='resource'")
      .all()) {
      const id = String(row.id);
      const update = (raw: unknown) => {
        if (!raw) return null;
        const value = JSON.parse(String(raw));
        value.category = resourceCategory(value.category, id);
        const icon = (icons as Record<string, { icon: string }>)[id]?.icon;
        if (!value.icon) value.icon = icon || "";
        if (!value.tags) value.tags = [];
        if (!value.tags?.length && tags[id]) value.tags = tags[id];
        if (articles[id] && value.article === "game-prototype")
          value.article = articles[id];
        return JSON.stringify(parseEntity("resource", value));
      };
      const draft = update(row.draft),
        published = update(row.published);
      if (draft !== row.draft || published !== row.published) {
        store.db
          .prepare(
            "UPDATE documents SET draft=?,published=?,revision=revision+1,updated_at=? WHERE kind='resource' AND id=?",
          )
          .run(draft, published, at, id);
        audit("resource", id, JSON.stringify({ draft, published }));
      }
    }
    store.setMeta(
      "contentVersion",
      (store.meta<number>("contentVersion") || 0) + 1,
    );
    store.setMeta("gamePlatforms20260920", true);
  });
}
