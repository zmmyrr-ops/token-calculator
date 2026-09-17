import { test, expect } from "@playwright/test";
import express from "express";
import path from "node:path";
import { existsSync } from "node:fs";

test("staging routes, API and resources stay under their prefix", async ({
  page,
}) => {
  const root = path.resolve("frontend/dist-staging");
  test.skip(
    !existsSync(root),
    "Build staging frontend before running this check",
  );
  const app = express();
  app.use("/staging/api", async (req, res) => {
    const upstream = await fetch("http://127.0.0.1:4000/api" + req.url);
    res
      .status(upstream.status)
      .type("json")
      .send(await upstream.text());
  });
  app.use("/staging", express.static(root));
  app.get("/staging/{*route}", (_req, res) =>
    res.sendFile(path.join(root, "index.html")),
  );
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((r) => server.once("listening", r));
  const port = (server.address() as { port: number }).port;
  const escaped: string[] = [];
  page.on("request", (r) => {
    const u = new URL(r.url());
    if (u.port === String(port) && !u.pathname.startsWith("/staging/"))
      escaped.push(u.pathname);
  });
  try {
    await page.goto(`http://127.0.0.1:${port}/staging/`);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      "noindex, nofollow",
    );
    await expect(page.locator("form.portal-search")).toHaveAttribute(
      "action",
      "/staging/search",
    );
    await page.goto(`http://127.0.0.1:${port}/staging/calculators/tokens`);
    await expect(page.locator("textarea").first()).toBeVisible();
    await page.locator("textarea").first().fill("路径隔离验收 hello");
    await expect
      .poll(() => page.locator('a[href="/staging/"]').count())
      .toBeGreaterThan(0);
    expect(escaped).toEqual([]);
    await page.goto(`http://127.0.0.1:${port}/staging/admin`);
    await expect(page.getByRole("button", { name: "登录后台" })).toBeVisible();
    expect(escaped).toEqual([]);
  } finally {
    await new Promise<void>((r) => server.close(() => r()));
  }
});
