import { describe, it, expect } from "vitest";
import { ContentDatabase } from "../../backend/src/database";
import { PublicSnapshots, renderSnapshot } from "../../backend/src/prerender";
import { catalog } from "../../backend/src/content/catalog";
import { knowledge } from "../../backend/src/content/knowledge";
import {
  resources,
  scenarios,
  tutorialSlugs,
} from "../../backend/src/content/resources";
import { site } from "../../backend/src/content/site";
import coverage from "../../data/coverage.json";
const data = {
  catalog,
  knowledge,
  resources,
  scenarios,
  tutorialSlugs,
  site,
  coverage,
};
const shell =
  '<!doctype html><html><head><title>old</title><meta name="description" content="old"></head><body><div id="root"></div><script src="/assets/app.js"></script></body></html>';
function setup(staging = false) {
  const db = new ContentDatabase(":memory:");
  db.seed(data);
  const snapshots = new PublicSnapshots(db, shell, staging);
  return {
    db,
    snapshots,
    close() {
      snapshots.close();
      db.close();
    },
  };
}
describe("Published HTML snapshots", () => {
  it("includes actual article content, distinct metadata and crawlable pagination before JavaScript", () => {
    const t = setup();
    try {
      const article = t.snapshots.get("/learn/tokens");
      expect(article.status).toBe(200);
      expect(article.html).toContain(knowledge[0].sections[0].body);
      expect(article.html).toContain("https://ruming.top/learn/tokens");
      expect(article.html).not.toContain("<title>old");
      expect(t.snapshots.get("/models?page=2").html).toContain(
        "/models/" + catalog.models[24].id,
      );
      expect(t.snapshots.get("/models").html).toContain("?page=2");
      expect(t.snapshots.get("/").html).toContain("AI门道");
    } finally {
      t.close();
    }
  });
  it("refreshes only published content and removes withdrawn pages", async () => {
    const t = setup();
    try {
      const m = t.db.get("model", catalog.models[0].id);
      const edited = t.db.save(
        "model",
        m.id,
        { ...m.draft, description: "unique published update" },
        m.revision,
        "test",
      );
      expect(t.snapshots.get("/models/" + m.id).html).not.toContain(
        "unique published update",
      );
      t.db.changePublication("model", m.id, edited.revision, true, "test");
      await Promise.resolve();
      expect(t.snapshots.get("/models/" + m.id).html).toContain(
        "unique published update",
      );
      const latest = t.db.get("model", m.id);
      t.db.changePublication("model", m.id, latest.revision, false, "test");
      await Promise.resolve();
      expect(t.snapshots.get("/models/" + m.id).status).toBe(404);
    } finally {
      t.close();
    }
  });
  it("keeps private/filter pages noindex, handles 404 and staging links", () => {
    const t = setup(),
      s = setup(true);
    try {
      expect(t.snapshots.get("/admin").html).toContain("noindex");
      expect(t.snapshots.get("/models?q=test").html).toContain("noindex");
      expect(t.snapshots.get("/models?page=99999").status).toBe(404);
      expect(t.snapshots.get("/not-found").status).toBe(404);
      expect(t.snapshots.get("/scenarios").location).toBe("/learn?format=scenarios");
      expect(s.snapshots.get("/staging/learn/tokens").html).toContain(
        'href="/staging/learn"',
      );
      expect(s.snapshots.get("/staging/").html).toContain("noindex, nofollow");
    } finally {
      t.close();
      s.close();
    }
  });
  it("escapes stored content and unsafe links without replacement-string injection", () => {
    const d = structuredClone(data);
    d.knowledge[0].title = "<script>alert(1)</script> $&";
    d.knowledge[0].sections[0].body = "<img src=x onerror=alert(1)> $&";
    d.knowledge[0].sources = [{ title: "unsafe", url: "javascript:alert(1)" }];
    const html = renderSnapshot(shell, "/learn/tokens", d);
    expect(html).not.toContain("<script>alert");
    expect(html).not.toContain("<img src=x");
    expect(html).not.toContain('href="javascript:');
    expect(html).toContain("$&amp;");
    expect(html.match(/id="root"/g)).toHaveLength(1);
  });
});
