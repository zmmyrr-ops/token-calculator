import express from "express";
import { ZodError } from "zod";
import { ContentDatabase, CmsError } from "./database";
import { adminRouter, initializeAdmin } from "./admin";
import { catalog } from "./content/catalog";
import { knowledge } from "./content/knowledge";
import { resources, scenarios, tutorialSlugs } from "./content/resources";
import { site } from "./content/site";
import coverage from "../../data/coverage.json";
import { NewsService, sources } from "./news";
import { newsCategories } from "../../shared/news";
import { indexablePaths } from "../../shared/seo";
const app = express();
app.disable("x-powered-by");
app.set("query parser", "simple");
app.use((_req, res, next) => {
  res.set({
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Cache-Control": "no-store",
  });
  if (_req.path.startsWith("/api/")) res.set("X-Robots-Tag", "noindex");
  next();
});
const store = new ContentDatabase();
store.seed({
  catalog,
  knowledge,
  resources,
  scenarios,
  tutorialSlugs,
  site,
  coverage,
});
await initializeAdmin(store);
app.use(express.json({ limit: "512kb" }));
app.use("/api/admin", adminRouter(store));
const news = new NewsService(store);
await news.init();
app.get("/api/health/live", (_req, res) => res.json({ status: "ok" }));
app.get("/api/health/ready", (_req, res) =>
  res.json({
    status: "ready",
    version: store.publicContent().catalog.version,
    database: "SQLite",
    news: news.status(),
  }),
);
app.get("/api/v1/bootstrap", (_req, res) => {
  res.json(store.publicContent());
});
function query(req: express.Request) {
  return Object.fromEntries(
    Object.entries(req.query).map(([k, v]) => {
      if (typeof v !== "string") throw Error("INVALID_QUERY");
      return [k, v];
    }),
  );
}
function pagination(p: Record<string, string>, defaultSize = 20) {
  const page = Number(p.page ?? 1),
    pageSize = Number(p.pageSize ?? defaultSize);
  if (
    !Number.isSafeInteger(page) ||
    page < 1 ||
    page > 100000 ||
    !Number.isSafeInteger(pageSize) ||
    pageSize < 1 ||
    pageSize > 100 ||
    (p.q?.length || 0) > 200
  )
    throw Error("INVALID_QUERY");
  return { page, pageSize };
}
app.get("/api/v1/catalog", (req, res) => {
  const p = query(req),
    { page, pageSize } = pagination(p);
  const data = store.publicContent().catalog;
  const result = data.models.filter(
    (m) =>
      (!p.q ||
        `${m.name} ${m.providerName} ${m.canonicalId}`
          .toLowerCase()
          .includes(p.q.toLowerCase())) &&
      (!p.provider || m.provider === p.provider) &&
      (!p.access || m.access === p.access) &&
      (!p.support ||
        (p.support === "price"
          ? !!m.price
          : p.support === "reasoning"
            ? m.reasoning
            : !m.price)),
  );
  res.json({
    version: data.version,
    fetchedAt: data.fetchedAt,
    total: result.length,
    page,
    pageSize,
    models: result.slice((page - 1) * pageSize, page * pageSize),
  });
});
app.get("/api/v1/catalog/:id", (req, res) => {
  const model = store
    .publicContent()
    .catalog.models.find((m) => m.id === String(req.params.id));
  res.status(model ? 200 : 404).json(model || { error: "NOT_FOUND" });
});
app.get("/api/v1/news", (req, res) => {
  const p = query(req),
    paging = pagination(p, 18);
  if (
    (p.category && !newsCategories.some((c) => c === p.category)) ||
    (p.source && !sources.some((s) => s.id === p.source))
  )
    throw Error("INVALID_QUERY");
  res.json(news.list({ ...p, ...paging }));
});
app.get("/api/v1/news/sources", (_req, res) =>
  res.json({ sources: news.status() }),
);
app.get("/robots.txt", (_req, res) =>
  res
    .type("text/plain")
    .send(
      `User-agent: *\nAllow: /\nDisallow: /staging/\nDisallow: /admin\nDisallow: /api/\nAllow: /api/v1/bootstrap\nAllow: /api/v1/catalog\nAllow: /api/v1/news\nSitemap: ${site.url}/sitemap.xml\n`,
    ),
);
app.get("/sitemap.xml", (_req, res) => {
  const routes = indexablePaths(store.publicContent());
  res
    .type("application/xml")
    .send(
      `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${routes.map((route) => `<url><loc>${site.url}${route}</loc></url>`).join("")}</urlset>`,
    );
});
app.use((_req, res) => res.status(404).json({ error: "NOT_FOUND" }));
app.use(
  (
    error: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    if (error instanceof CmsError) {
      res.status(error.status).json({ error: error.message });
      return;
    }
    if (error instanceof ZodError) {
      res.status(400).json({
        error: error.issues
          .slice(0, 5)
          .map((i) => i.path.join(".") + ": " + i.message)
          .join("；"),
      });
      return;
    }
    if (
      "type" in error &&
      ["entity.too.large", "entity.parse.failed"].includes(String(error.type))
    ) {
      res
        .status(error.type === "entity.too.large" ? 413 : 400)
        .json({ error: "请求内容过大或格式不正确" });
      return;
    }
    if (error.message === "INVALID_QUERY") {
      res.status(400).json({ error: "INVALID_QUERY" });
      return;
    }
    console.error(error);
    res.status(500).json({ error: "INTERNAL_ERROR" });
  },
);
const server = app.listen(
  Number(process.env.PORT || 4000),
  process.env.HOST || "127.0.0.1",
  () => {
    console.log("Node.js API listening on " + (process.env.PORT || 4000));
    news.start();
  },
);
async function stop() {
  server.close();
  await news.stop();
  store.close();
  process.exit(0);
}
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
