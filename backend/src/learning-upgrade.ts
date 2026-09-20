import { ContentDatabase } from "./database";
import { knowledgeSchema } from "../../shared/cms";
import { learningCategory } from "../../shared/learning";
import { knowledge } from "./content/knowledge";
import expansion from "./content/expansion.json";
import revisions from "./content/learning-revision.json";

/** Upgrade untouched starter articles. Preserve edited articles and independent drafts. */
export function upgradeLearningContent(store: ContentDatabase) {
  if (store.meta("learningRevision20260920")) return;
  store.transaction(() => {
    const updated: string[] = [],
      skipped: string[] = [];
    const originals = [...knowledge, ...expansion.knowledge];
    for (const patch of revisions) {
      const row = store.db
        .prepare("SELECT * FROM documents WHERE kind='knowledge' AND id=?")
        .get(patch.slug);
      const original = originals.find((a) => a.slug === patch.slug);
      if (
        !row?.published ||
        !original ||
        JSON.stringify(
          knowledgeSchema.parse(JSON.parse(String(row.published))),
        ) !== JSON.stringify(knowledgeSchema.parse(original))
      ) {
        skipped.push(patch.slug);
        continue;
      }
      const raw = JSON.stringify(
        knowledgeSchema.parse({
          ...original,
          ...patch,
          category: learningCategory(original.category),
        }),
      );
      const at = new Date().toISOString();
      store.db
        .prepare(
          "UPDATE documents SET published=?,draft=?,revision=revision+1,updated_at=? WHERE kind='knowledge' AND id=?",
        )
        .run(
          raw,
          row.draft === row.published ? raw : row.draft,
          at,
          patch.slug,
        );
      store.db
        .prepare(
          "INSERT INTO history(kind,entity_id,action,actor,payload,at) VALUES('knowledge',?,'publish','learning-revision-20260920',?,?)",
        )
        .run(patch.slug, raw, at);
      updated.push(patch.slug);
    }
    store.setMeta("learningRevision20260920", { updated, skipped });
    // Taxonomy also changes published rendering for collected and manually edited articles.
    store.setMeta(
      "contentVersion",
      (store.meta<number>("contentVersion") || 0) + 1,
    );
  });
}
