import { it, expect } from "vitest";
import express from "express";
import { ContentDatabase, CmsError } from "../../backend/src/database";
import { seoAdminRouter } from "../../backend/src/seo-admin";
import { seedSeoTutorials } from "../../backend/src/seo-tutorials";
import { PublicSnapshots } from "../../backend/src/prerender";
import { indexablePaths, resolveSeo } from "../../shared/seo";
import { catalog } from "../../backend/src/content/catalog";
import { knowledge } from "../../backend/src/content/knowledge";
import {
  resources,
  scenarios,
  tutorialSlugs,
} from "../../backend/src/content/resources";
import { site } from "../../backend/src/content/site";
import coverage from "../../data/coverage.json";
const shell =
  '<html><head><title>old</title><meta name="description" content="old"></head><body><div id="root"></div></body></html>';
it("publishes safe SEO overrides, refreshes HTML, blocks private pages and preserves tutorial edits", async () => {
  const db = new ContentDatabase(":memory:");
  db.seed({
    catalog,
    knowledge,
    resources,
    scenarios,
    tutorialSlugs,
    site,
    coverage,
  });
  seedSeoTutorials(db);
  const snapshots = new PublicSnapshots(db, shell, false);
  const app = express();
  app.use(express.json());
  app.use(seoAdminRouter(db));
  app.use(
    (
      e: Error,
      _q: express.Request,
      r: express.Response,
      _n: express.NextFunction,
    ) =>
      r
        .status(e instanceof CmsError ? e.status : 400)
        .json({ error: e.message }),
  );
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((r) => server.once("listening", r));
  const addr = server.address();
  if (!addr || typeof addr === "string") throw Error();
  const url = `http://127.0.0.1:${addr.port}/`;
  const put = (body: unknown) =>
    fetch(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  try {
    expect(snapshots.get("/ai-eyes").html).toContain("豆包");
    expect(snapshots.get("/ai-eyes").html).toContain("index, follow");
    expect(snapshots.get("/ai-eyes/runs/private").html).toContain("noindex");
    const values = {
      path: "/ai-eyes",
      title: "画像教程 <script>alert(1)</script>",
      description: "独立搜索摘要",
      image: "/brand/ai-door-v5.png",
      revision: 0,
    };
    expect((await put(values)).status).toBe(200);
    const html = snapshots.get("/ai-eyes").html!;
    expect(html).toContain("独立搜索摘要");
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>alert(1)");
    expect((await put(values)).status).toBe(409);
    expect(
      (await put({ ...values, path: "/ai-eyes/runs/private" })).status,
    ).toBe(400);
    expect(
      (await put({ ...values, revision: 1, image: "javascript:alert(1)" }))
        .status,
    ).toBe(400);
    const data = db.publicContent();
    expect(indexablePaths(data)).toContain("/ai-eyes");
    expect(indexablePaths(data)).not.toContain("/ai-eyes/runs/private");
    expect(resolveSeo("/ai-eyes", "?claim=secret", data).robots).toContain(
      "noindex",
    );
    expect(
      new PublicSnapshots(db, shell, true).get("/staging/ai-eyes").html,
    ).toContain("noindex");
    const before = data.knowledge.length;
    seedSeoTutorials(db);
    expect(db.publicContent().knowledge).toHaveLength(before);
    db.db
      .prepare(
        "DELETE FROM documents WHERE kind='knowledge' AND id='token-cost-practical-guide'",
      )
      .run();
    seedSeoTutorials(db);
    expect(db.publicContent().knowledge).toHaveLength(before - 1);
    expect(
      (await (await fetch(url)).json()).items.find(
        (x: { path: string }) => x.path === "/ai-eyes",
      ).custom.revision,
    ).toBe(1);
  } finally {
    snapshots.close();
    await new Promise<void>((r) => server.close(() => r()));
    db.close();
  }
});
