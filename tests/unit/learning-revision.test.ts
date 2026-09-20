import { it, expect } from "vitest";
import { ContentDatabase } from "../../backend/src/database";
import { expandContent } from "../../backend/src/content-expansion";
import { upgradeLearningContent } from "../../backend/src/learning-upgrade";
import { knowledge } from "../../backend/src/content/knowledge";
import { catalog } from "../../backend/src/content/catalog";
import {
  resources,
  scenarios,
  tutorialSlugs,
} from "../../backend/src/content/resources";
import { site } from "../../backend/src/content/site";
import coverage from "../../data/coverage.json";
import {
  learningCategories,
  learningCategoryFilter,
  learningMatchesFormat,
} from "../../shared/learning";
function setup() {
  const db = new ContentDatabase(":memory:");
  db.seed({
    knowledge,
    catalog,
    resources,
    scenarios,
    tutorialSlugs,
    site,
    coverage,
  });
  expandContent(db);
  return db;
}
it("upgrades all starter lessons once and retains published links and practices", () => {
  const db = setup();
  try {
    const ids = db.publicContent().knowledge.map((a) => a.slug);
    upgradeLearningContent(db);
    expect(
      db.meta<{ updated: string[] }>("learningRevision20260920")!.updated,
    ).toHaveLength(17);
    const data = db.publicContent();
    expect(data.knowledge.map((a) => a.slug)).toEqual(ids);
    for (const a of data.knowledge)
      expect(learningCategories).toContain(a.category);
    expect(
      data.knowledge
        .find((a) => a.slug === "tokens")!
        .sections.some((s) => s.body.includes("0.036")),
    ).toBe(true);
    expect(
      data.knowledge.find((a) => a.slug === "image-to-3d")!.practice!.steps,
    ).toHaveLength(4);
    const token = db.get("knowledge", "tokens");
    const saved = db.save(
      "knowledge",
      "tokens",
      { ...token.draft, title: "发布回归验证" },
      token.revision,
      "test",
    );
    expect(() =>
      db.changePublication("knowledge", "tokens", saved.revision, true, "test"),
    ).not.toThrow();
    const version = db.meta("contentVersion");
    upgradeLearningContent(db);
    expect(db.meta("contentVersion")).toBe(version);
  } finally {
    db.close();
  }
});
it("preserves edited published articles, independent drafts and deletions", () => {
  const db = setup();
  try {
    const read = (id: string) =>
      db.db
        .prepare("SELECT * FROM documents WHERE kind='knowledge' AND id=?")
        .get(id)!;
    const edited = JSON.stringify({
      ...JSON.parse(String(read("tokens").published)),
      summary: "管理员修改",
    });
    db.db
      .prepare("UPDATE documents SET published=?,draft=? WHERE id='tokens'")
      .run(edited, edited);
    const draft = JSON.stringify({
      ...JSON.parse(String(read("rag-starter").draft)),
      summary: "未发布的编辑",
    });
    db.db
      .prepare("UPDATE documents SET draft=? WHERE id='rag-starter'")
      .run(draft);
    db.db.prepare("DELETE FROM documents WHERE id='video-budget'").run();
    upgradeLearningContent(db);
    expect(read("tokens").published).toBe(edited);
    expect(read("rag-starter").draft).toBe(draft);
    expect(
      JSON.parse(String(read("rag-starter").published)).sections,
    ).toHaveLength(6);
    expect(read("video-budget")).toBeUndefined();
  } finally {
    db.close();
  }
});
it("supports legacy categories and honest content groups without broadening unknown filters", () => {
  expect(learningCategoryFilter("游戏开发实战")).toBe("游戏开发");
  expect(learningCategoryFilter("不存在")).toBe("不存在");
  expect(learningMatchesFormat("practice", "internal")).toBe(true);
  expect(learningMatchesFormat("curated", "internal")).toBe(false);
  expect(learningMatchesFormat("video", "external")).toBe(true);
  expect(learningMatchesFormat("article", "external")).toBe(false);
});
