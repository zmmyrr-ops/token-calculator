import { it, expect } from "vitest";
import { ContentDatabase } from "../../backend/src/database";
import { expandGameContent } from "../../backend/src/game-expansion";
import { expandContent } from "../../backend/src/content-expansion";
import {
  resourceCategories,
  resourceCategoryMatches,
} from "../../shared/resource-categories";
import { catalog } from "../../backend/src/content/catalog";
import { knowledge } from "../../backend/src/content/knowledge";
import {
  resources,
  scenarios,
  tutorialSlugs,
} from "../../backend/src/content/resources";
import { site } from "../../backend/src/content/site";
import coverage from "../../data/coverage.json";
it("consolidates the directory, preserves drafts and does not recreate removed content", () => {
  const db = new ContentDatabase(":memory:");
  try {
    db.seed({
      catalog,
      knowledge,
      resources,
      scenarios,
      tutorialSlugs,
      site,
      coverage,
    });
    expandContent(db);
    const before = db.db
      .prepare("SELECT * FROM documents WHERE kind='resource' AND id='godot'")
      .get()!;
    const draft = {
      ...JSON.parse(String(before.draft)),
      summary: "管理员尚未发布的修改",
    };
    db.db
      .prepare(
        "UPDATE documents SET draft=? WHERE kind='resource' AND id='godot'",
      )
      .run(JSON.stringify(draft));
    expandGameContent(db);
    const data = db.publicContent(),
      g = data.resources.find((x) => x.id === "godot")!;
    expect(g.category).toBe("游戏引擎与渲染");
    expect(g.summary).not.toBe(draft.summary);
    expect(
      JSON.parse(
        String(
          db.db
            .prepare(
              "SELECT draft FROM documents WHERE kind='resource' AND id='godot'",
            )
            .get()!.draft,
        ),
      ).summary,
    ).toBe(draft.summary);
    expect(new Set(data.resources.map((r) => r.category)).size).toBe(8);
    for (const r of data.resources) {
      expect(resourceCategories).toContain(r.category);
      expect(data.knowledge.some((a) => a.slug === r.article)).toBe(true);
    }
    for (const id of [
      "cocos-creator",
      "layaair",
      "pixijs",
      "threejs",
      "phaser",
      "babylonjs",
      "playcanvas",
    ])
      expect(data.resources.some((r) => r.id === id)).toBe(true);
    expect(resourceCategoryMatches(g.category, "游戏引擎")).toBe(true);
    const v = db.meta("contentVersion");
    db.db.prepare("DELETE FROM documents WHERE id='pixijs'").run();
    expandGameContent(db);
    expect(db.meta("contentVersion")).toBe(v);
    expect(db.publicContent().resources.some((r) => r.id === "pixijs")).toBe(
      false,
    );
  } finally {
    db.close();
  }
});
