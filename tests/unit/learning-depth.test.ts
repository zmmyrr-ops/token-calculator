import { expect, it } from "vitest";
import { ContentDatabase } from "../../backend/src/database";
import { seedDepthArticles } from "../../backend/src/learning-depth";
import { depthArticles } from "../../backend/src/content/learning-depth";
import { relatedLessons } from "../../shared/learning";
import { structuredData, resolveSeo, indexablePaths } from "../../shared/seo";
import { renderSnapshot } from "../../backend/src/prerender";
import { catalog } from "../../backend/src/content/catalog";
import { knowledge } from "../../backend/src/content/knowledge";
import {
  resources,
  scenarios,
  tutorialSlugs,
} from "../../backend/src/content/resources";
import { site } from "../../backend/src/content/site";
import coverage from "../../data/coverage.json";
const base = {
  catalog,
  knowledge,
  resources,
  scenarios,
  tutorialSlugs,
  site,
  coverage,
};
it("imports lessons once into the CMS, leaves existing drafts alone and does not resurrect deleted entries", () => {
  const db = new ContentDatabase(":memory:");
  try {
    db.seed(base);
    const first = depthArticles[0];
    const draft = JSON.stringify({ ...first, title: "后台独立草稿" });
    db.db
      .prepare("INSERT INTO documents VALUES(?,?,?,?,?,?,?)")
      .run(
        "knowledge",
        first.slug,
        draft,
        null,
        1,
        999,
        new Date().toISOString(),
      );
    seedDepthArticles(db);
    expect(db.get("knowledge", first.slug).draft).toMatchObject({title: "后台独立草稿"});
    expect(
      db.publicContent().knowledge.some((a) => a.slug === first.slug),
    ).toBe(false);
    expect(
      db.meta<{ added: string[] }>("learningDepth20260928")!.added,
    ).toHaveLength(2);
    const version = db.meta("contentVersion");
    db.db
      .prepare("DELETE FROM documents WHERE kind='knowledge' AND id=?")
      .run(depthArticles[1].slug);
    seedDepthArticles(db);
    expect(db.meta("contentVersion")).toBe(version);
    expect(
      db
        .publicContent()
        .knowledge.some((a) => a.slug === depthArticles[1].slug),
    ).toBe(false);
  } finally {
    db.close();
  }
});
it("publishes crawlable lessons, shared Article/breadcrumb metadata and relevant links", () => {
  const db = new ContentDatabase(":memory:");
  try {
    db.seed(base);
    seedDepthArticles(db);
    const data = db.publicContent();
    for (const entry of depthArticles) {
      const route = "/learn/" + entry.slug;
      expect(indexablePaths(data)).toContain(route);
      const seo = resolveSeo(route, "", data);
      const structured = structuredData(seo, data);
      const html = renderSnapshot(
        '<html><head><title></title><meta name="description" content=""></head><body><div id="root"></div></body></html>',
        route,
        data,
      );
      expect(html).toContain(entry.sections[0].body);
      expect(html).toContain(
        JSON.stringify(structured).replaceAll("<", "\\u003c"),
      );
      expect(JSON.stringify(structured)).toContain('"@type":"BreadcrumbList"');
      expect(JSON.stringify(structured)).not.toContain("datePublished");
      expect(html).toContain('property="og:type" content="article"');
    }
    const related = relatedLessons(depthArticles[0], data.knowledge);
    expect(related[0].slug).toBe("ai-code-acceptance-workshop");
    expect(related.some((a) => a.slug === depthArticles[0].slug)).toBe(false);
    expect(related.some((a) => a.category === "视频与音频")).toBe(false);
    const filtered = structuredData(
      resolveSeo("/learn/" + depthArticles[0].slug, "?q=x", data),
      data,
    );
    expect(JSON.stringify(filtered)).not.toContain('"@type":"Article"');
  } finally {
    db.close();
  }
});
