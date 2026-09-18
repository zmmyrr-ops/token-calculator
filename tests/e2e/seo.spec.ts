import { test, expect } from "@playwright/test";
test("SEO metadata updates across routes and page links remain crawlable", async ({
  page,
  request,
}) => {
  const canonicalOrigin = process.env.SITE_URL || "https://ruming.top";
  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toContain("Allow: /api/v1/bootstrap");
  expect(robots).not.toContain("Disallow: /search");
  expect(
    (await request.get("/api/v1/bootstrap")).headers()["x-robots-tag"],
  ).toBe("noindex");
  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).toContain(canonicalOrigin + "/news");
  expect(sitemap).not.toContain("/saved");
  await page.goto("/news?page=2");
  await expect(page.locator("link[rel=canonical]")).toHaveAttribute(
    "href",
    canonicalOrigin + "/news?page=2",
  );
  await expect(page).toHaveTitle(/第 2 页/);
  await expect(
    page.getByRole("link", { name: "上一页", exact: true }),
  ).toHaveAttribute("href", "/news");
  await page.goto("/search?q=token");
  await expect(page.locator("meta[name=robots]")).toHaveAttribute(
    "content",
    "noindex, follow",
  );
  await page.getByRole("link", { name: /Token 是什么/ }).click();
  await expect(page.locator("meta[name=robots]")).toHaveAttribute(
    "content",
    "index, follow",
  );
  await expect(page).toHaveTitle(/Token 是什么/);
  await expect(page.locator("meta[name=description]")).toHaveAttribute(
    "content",
    /分词编码/,
  );
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute(
    "content",
    canonicalOrigin + "/learn/tokens",
  );
  await page.goto("/not-a-real-route");
  await expect(page.locator("meta[name=robots]")).toHaveAttribute(
    "content",
    "noindex, follow",
  );
});
