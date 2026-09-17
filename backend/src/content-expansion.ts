import { ContentDatabase } from "./database";
import { parseEntity, entityId, type Kind } from "../../shared/cms";
import expansion from "./content/expansion.json";

// One-time additive editorial import. Never republish removed or edited entries.
export function expandContent(store: ContentDatabase) {
  if (store.meta("learningExpansion20260917")) return;
  store.transaction(() => {
    let position = Number(
      store.db
        .prepare("SELECT coalesce(max(position),0) n FROM documents")
        .get()?.n,
    );
    for (const [kind, items] of [
      ["knowledge", expansion.knowledge],
      ["resource", expansion.resources],
    ] as [Kind, unknown[]][]) {
      for (const item of items) {
        const parsed = parseEntity(kind, item),
          id = entityId(parsed);
        const json = JSON.stringify(parsed),
          at = new Date().toISOString();
        const result = store.db
          .prepare("INSERT OR IGNORE INTO documents VALUES(?,?,?,?,?,?,?)")
          .run(kind, id, json, json, 1, ++position, at);
        if (result.changes)
          store.db
            .prepare(
              "INSERT INTO history(kind,entity_id,action,actor,payload,at) VALUES(?,?,?,?,?,?)",
            )
            .run(kind, id, "import", "editorial-expansion-20260917", json, at);
      }
    }
    const routes: Record<string, { articles: string[]; tools: string[] }> = {
      games: {
        articles: [
          "game-ai-npc",
          "visual-style-guide",
          "unity-essentials-video",
          "unreal-first-hour-video",
        ],
        tools: ["claude", "deepseek", "unity", "unreal"],
      },
      "3d": {
        articles: ["blender-fundamentals-video", "visual-style-guide"],
        tools: ["recraft", "flux"],
      },
      video: {
        articles: [
          "ai-video-shotlist",
          "voice-production",
          "runway-chat-video",
          "runway-academy-video",
          "davinci-training-video",
        ],
        tools: ["firefly", "elevenlabs", "suno", "davinci"],
      },
      image: {
        articles: ["visual-style-guide", "multimodal-brief"],
        tools: ["midjourney", "recraft", "ideogram", "flux"],
      },
      automation: {
        articles: [
          "rag-starter",
          "local-model-checklist",
          "model-selection-benchmark",
        ],
        tools: ["dify", "ollama", "lmstudio", "huggingface"],
      },
    };
    for (const [id, links] of Object.entries(routes)) {
      const row = store.db
        .prepare("SELECT * FROM documents WHERE kind='scenario' AND id=?")
        .get(id);
      // Preserve any CMS work, including unpublished drafts.
      if (!row || row.revision !== 1 || row.draft !== row.published) continue;
      const value = JSON.parse(String(row.published));
      value.articles = [...new Set([...value.articles, ...links.articles])];
      value.tools = [...new Set([...value.tools, ...links.tools])];
      const json = JSON.stringify(parseEntity("scenario", value));
      const at = new Date().toISOString();
      store.db
        .prepare(
          "UPDATE documents SET draft=?,published=?,revision=revision+1,updated_at=? WHERE kind='scenario' AND id=?",
        )
        .run(json, json, at, id);
      store.db
        .prepare(
          "INSERT INTO history(kind,entity_id,action,actor,payload,at) VALUES(?,?,?,?,?,?)",
        )
        .run(
          "scenario",
          id,
          "enrich",
          "editorial-expansion-20260917",
          json,
          at,
        );
    }
    store.setMeta(
      "contentVersion",
      (store.meta<number>("contentVersion") || 0) + 1,
    );
    store.setMeta("learningExpansion20260917", true);
  });
}

export function simplifyStarterPresentation(store: ContentDatabase) {
  if (store.meta("starterPresentation20260917")) return;
  const replacements: [string, string][] = [
    ["这是站点预置的原创示例话题，用于开启讨论。\n\n", ""],
    ["这是一个用于开启讨论的示例话题。\n\n", ""],
    ["这是一份示例检查清单，欢迎补充。", "整理了一份检查清单，欢迎补充。"],
    ["这是一个示例讨论，不是模型排名。", "讨论一下模型比较的方法。"],
    [
      "这个示例话题用于交流预算方法，不提供任何实时价格承诺。",
      "交流一下预算方法，具体价格以所用渠道为准。",
    ],
    ["示例讨论：", ""],
    ["均带有明确标记。", "来源在社区规则中说明。"],
  ];
  store.transaction(() => {
    for (const table of ["forum_posts", "forum_replies"]) {
      const rows = store.db
        .prepare(`SELECT id,body FROM ${table} WHERE demo=1`)
        .all();
      for (const row of rows) {
        let body = String(row.body);
        for (const [from, to] of replacements) body = body.replaceAll(from, to);
        if (body !== row.body)
          store.db
            .prepare(`UPDATE ${table} SET body=? WHERE id=? AND demo=1`)
            .run(body, row.id);
      }
    }
    store.setMeta("starterPresentation20260917", true);
  });
}
