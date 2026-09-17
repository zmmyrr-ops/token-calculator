import { describe, it, expect } from "vitest";
import { ContentDatabase } from "../../backend/src/database";
import { catalog } from "../../backend/src/content/catalog";
import { knowledge } from "../../backend/src/content/knowledge";
import {
  resources,
  scenarios,
  tutorialSlugs,
} from "../../backend/src/content/resources";
import { site } from "../../backend/src/content/site";
import coverage from "../../data/coverage.json";
const seed = {
  catalog,
  knowledge,
  resources,
  scenarios,
  tutorialSlugs,
  site,
  coverage,
};
function open() {
  const db = new ContentDatabase(":memory:");
  db.seed(seed);
  return db;
}
describe("database publication boundaries", () => {
  it("imports real content once without resetting edits", () => {
    const db = open();
    try {
      const a = db.get("knowledge", "tokens");
      db.save(
        "knowledge",
        "tokens",
        { ...a.draft, title: "Edited" },
        a.revision,
        "test",
      );
      db.seed(seed);
      expect(db.get("knowledge", "tokens").draft).toMatchObject({
        title: "Edited",
      });
      expect(db.publicContent().knowledge[0].title).toBe(knowledge[0].title);
    } finally {
      db.close();
    }
  });
  it("isolates drafts, publishes atomically, detects conflicts and restores history", () => {
    const db = open();
    try {
      const a = db.get("knowledge", "tokens");
      const saved = db.save(
        "knowledge",
        "tokens",
        { ...a.draft, title: "Edited" },
        a.revision,
        "test",
      );
      expect(() =>
        db.save("knowledge", "tokens", a.draft, a.revision, "test"),
      ).toThrow("其他窗口");
      expect(db.publicContent().knowledge[0].title).toBe(knowledge[0].title);
      const pub = db.changePublication(
        "knowledge",
        "tokens",
        saved.revision,
        true,
        "test",
      );
      expect(db.publicContent().knowledge[0].title).toBe("Edited");
      const history = db.history("knowledge", "tokens");
      const restored = db.restore(
        "knowledge",
        "tokens",
        Number(history[0].seq),
        pub.revision,
        "test",
      );
      expect(restored.revision).toBe(pub.revision + 1);
    } finally {
      db.close();
    }
  });
  it("rejects dangling references and rolls back a failed unpublish", () => {
    const db = open();
    try {
      const a = db.get("resource", "meshy");
      expect(() =>
        db.changePublication("resource", "meshy", a.revision, false, "test"),
      ).toThrow();
      expect(db.get("resource", "meshy").published).not.toBeNull();
      expect(db.get("resource", "meshy").revision).toBe(a.revision);
    } finally {
      db.close();
    }
  });
  it("creates and deletes drafts without adding them to public content", () => {
    const db = open();
    try {
      const d = db.create(
        "knowledge",
        {
          slug: "unit-only",
          title: "Unit",
          category: "",
          summary: "",
          keywords: "",
          sections: [{ title: "", body: "" }],
          sources: [],
        },
        "test",
      );
      expect(
        db.publicContent().knowledge.some((x) => x.slug === "unit-only"),
      ).toBe(false);
      expect(() =>
        db.changePublication(
          "knowledge",
          "unit-only",
          d.revision,
          true,
          "test",
        ),
      ).toThrow();
      db.remove("knowledge", "unit-only", d.revision, "test");
      expect(() => db.get("knowledge", "unit-only")).toThrow();
    } finally {
      db.close();
    }
  });
  it("rejects executable source URLs", () => {
    const db = open();
    try {
      expect(() =>
        db.create(
          "knowledge",
          {
            ...knowledge[0],
            slug: "unsafe",
            sources: [{ title: "x", url: "javascript:alert(1)" }],
          },
          "test",
        ),
      ).toThrow();
    } finally {
      db.close();
    }
  });
  it("stores and reloads news in SQLite", () => {
    const db = open();
    try {
      db.saveNews({
        version: 1,
        updatedAt: null,
        states: {},
        items: [{ id: "only-unit" }],
      });
      expect(db.loadNews()).toMatchObject({ items: [{ id: "only-unit" }] });
    } finally {
      db.close();
    }
  });
});
