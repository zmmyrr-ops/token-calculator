import { test, expect } from "@playwright/test";
test("anonymous telemetry excludes query text and can be disabled", async ({
  page,
  request,
}) => {
  const events: Record<string, unknown>[] = [];
  page.on("request", (req) => {
    if (req.url().endsWith("/api/v1/events")) events.push(req.postDataJSON());
  });
  const sent = page.waitForResponse((r) => r.url().endsWith("/api/v1/events"));
  await page.goto("/search?q=PrivateAnalyticsCanary");
  expect((await sent).status()).toBe(204);
  await expect(
    page.getByRole("heading", { name: "搜索：PrivateAnalyticsCanary" }),
  ).toBeVisible();
  await expect
    .poll(() => events.some((e) => e.name === "page_view"))
    .toBe(true);
  const pageView = events.find((e) => e.name === "page_view")!;
  const entrance = events.find((e) => e.name === "visit_start")!;
  expect(entrance).toMatchObject({
    source: "direct_unknown",
    page: "/search",
    target: "none",
  });
  expect(Object.keys(entrance).sort()).toEqual([
    "device",
    "id",
    "name",
    "page",
    "source",
    "target",
  ]);
  expect(JSON.stringify(events)).not.toContain("PrivateAnalyticsCanary");
  expect(pageView).toMatchObject({
    name: "page_view",
    page: "/search",
    target: "none",
  });
  expect(Object.keys(pageView).sort()).toEqual([
    "id",
    "name",
    "page",
    "target",
  ]);
  const denied = await request.post("/api/v1/events", {
    data: events[0],
    headers: { Origin: "https://untrusted.example" },
  });
  expect(denied.status()).toBe(403);
  await page.goto("/privacy");
  await page.getByLabel("允许匿名访问与功能使用统计").uncheck();
  const count = events.length;
  await page.goto("/models");
  await expect(page.locator(".catalog-card").first()).toBeVisible();
  await page.getByRole("link", { name: "下一页", exact: true }).click();
  await expect(page).toHaveURL(/page=2/);
  await expect(page.locator(".catalog-card").first()).toBeVisible();
  expect(events).toHaveLength(count);
  await page.goto("/admin");
  await expect(page.getByRole("heading")).toBeVisible();
  expect(events).toHaveLength(count);
});
