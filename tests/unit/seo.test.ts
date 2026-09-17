import { describe, it, expect } from "vitest";
import { resolveSeo, indexablePaths } from "../../shared/seo";
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
describe("SEO routing policies", () => {
  it("keeps paginated canonicals distinct and strips tracking", () => {
    expect(resolveSeo("/news", "?page=2&utm_source=rss", data)).toMatchObject({
      canonical: "https://ruming.top/news?page=2",
      robots: "index, follow",
    });
    expect(resolveSeo("/news", "?page=1", data).canonical).toBe(
      "https://ruming.top/news",
    );
  });
  it("excludes searches, filters and personal pages", () => {
    for (const [p, q] of [
      ["/saved", ""],
      ["/search", "?q=ai"],
      ["/compare", "?ids=meshy"],
      ["/models", "?provider=openai"],
      ["/news", "?page=bad"],
    ])
      expect(resolveSeo(p, q, data).robots).toBe("noindex, follow");
  });
  it("rejects missing and malformed detail routes", () => {
    for (const p of [
      "/missing",
      "/models/unknown",
      "/learn/nope/tokens",
      "/learn/%E0%A4",
    ])
      expect(resolveSeo(p, "", data)).toMatchObject({
        known: false,
        robots: "noindex, follow",
      });
  });
  it("uses actual article metadata and restores normal indexability", () => {
    expect(resolveSeo("/learn/tokens", "", data)).toMatchObject({
      title: expect.stringContaining("Token 是什么"),
      description: knowledge[0].summary,
      robots: "index, follow",
    });
  });
  it("publishes only unique, valid sitemap routes", () => {
    const paths = indexablePaths(data);
    expect(new Set(paths).size).toBe(paths.length);
    expect(paths).not.toContain("/saved");
    for (const path of paths)
      expect(resolveSeo(path, "", data).robots).toBe("index, follow");
  });
});
