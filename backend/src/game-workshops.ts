import { ContentDatabase } from "./database";
import { knowledgeSchema } from "../../shared/cms";
import previous from "./content/game-expansion.json";
import workshops from "./content/game-workshops.json";
export function upgradeGameWorkshops(store: ContentDatabase) {
  if (store.meta("gameWorkshops20260920")) return;
  store.transaction(() => {
    const updated: string[] = [],
      skipped: string[] = [];
    for (const entry of workshops) {
      const row = store.db
        .prepare("SELECT * FROM documents WHERE kind='knowledge' AND id=?")
        .get(entry.slug);
      const old = previous.knowledge.find((x) => x.slug === entry.slug);
      if (
        !row?.published ||
        !old ||
        JSON.stringify(
          knowledgeSchema.parse(JSON.parse(String(row.published))),
        ) !== JSON.stringify(knowledgeSchema.parse(old))
      ) {
        skipped.push(entry.slug);
        continue;
      }
      const raw = JSON.stringify(knowledgeSchema.parse(entry)),
        at = new Date().toISOString();
      store.db
        .prepare(
          "UPDATE documents SET published=?,draft=?,revision=revision+1,updated_at=? WHERE kind='knowledge' AND id=?",
        )
        .run(
          raw,
          row.draft === row.published ? raw : row.draft,
          at,
          entry.slug,
        );
      store.db
        .prepare(
          "INSERT INTO history(kind,entity_id,action,actor,payload,at) VALUES('knowledge',?,'publish','game-workshops-20260920',?,?)",
        )
        .run(entry.slug, raw, at);
      updated.push(entry.slug);
    }
    store.setMeta("gameWorkshops20260920", { updated, skipped });
    if (updated.length)
      store.setMeta(
        "contentVersion",
        (store.meta<number>("contentVersion") || 0) + 1,
      );
  });
}
