import { ContentDatabase } from "./database";
import { knowledgeSchema } from "../../shared/cms";
import { depthArticles } from "./content/learning-depth";

/** Add once; never replace edited drafts or republish withdrawn content. */
export function seedDepthArticles(store: ContentDatabase) {
  const key = "learningDepth20260928";
  if (store.meta(key)) return;
  store.transaction(() => {
    let position = Number(
      store.db
        .prepare("SELECT COALESCE(MAX(position),0) n FROM documents")
        .get()!.n,
    );
    const added: string[] = [];
    for (const item of depthArticles) {
      const article = knowledgeSchema.parse(item);
      const raw = JSON.stringify(article),
        at = new Date().toISOString();
      const result = store.db
        .prepare("INSERT OR IGNORE INTO documents VALUES(?,?,?,?,?,?,?)")
        .run("knowledge", article.slug, raw, raw, 1, ++position, at);
      if (result.changes) {
        added.push(article.slug);
        store.db
          .prepare(
            "INSERT INTO history(kind,entity_id,action,actor,payload,at) VALUES('knowledge',?,'import','learning-depth-20260928',?,?)",
          )
          .run(article.slug, raw, at);
      }
    }
    store.setMeta(key, { added });
    if (added.length)
      store.setMeta(
        "contentVersion",
        (store.meta<number>("contentVersion") || 0) + 1,
      );
  });
}
