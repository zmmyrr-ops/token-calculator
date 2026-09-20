import { test, expect } from "@playwright/test";
test("captures a search entrance without raw query and does not count SPA navigation or reload twice", async ({
  page,
}) => {
  const events: Record<string, unknown>[] = [];
  await page.route("**/api/v1/events", async (route) => {
    events.push(route.request().postDataJSON());
    await route.fulfill({ status: 204 });
  });
  await page.goto("/learn", {
    referer: "https://www.baidu.com/s?wd=private-search",
  });
  await expect
    .poll(() => events.filter((e) => e.name === "visit_start").length)
    .toBe(1);
  expect(events.find((e) => e.name === "visit_start")).toMatchObject({
    source: "baidu",
    page: "/learn",
  });
  expect(JSON.stringify(events)).not.toContain("private-search");
  await page
    .getByRole("link", {
      name: "Token 是什么？为什么不等于字数？",
      exact: true,
    })
    .click();
  await expect(page).toHaveURL(/learn\/tokens/);
  await page.reload();
  await expect(
    page.getByRole("heading", {
      name: "Token 是什么？为什么不等于字数？",
      exact: true,
    }),
  ).toBeVisible();
  expect(events.filter((e) => e.name === "visit_start")).toHaveLength(1);
  await page.goto("/learn?utm_source=private-campaign");
  await expect
    .poll(() => events.filter((e) => e.name === "visit_start").length)
    .toBe(2);
  expect(events.filter((e) => e.name === "visit_start").at(-1)?.source).toBe(
    "campaign",
  );
  expect(JSON.stringify(events)).not.toContain("private-campaign");
  await page.evaluate(() => localStorage.setItem("analytics-disabled", "1"));
  const count = events.length;
  await page.goto("/learn", { referer: "https://www.google.com/" });
  await expect(page.locator(".learning-card").first()).toBeVisible();
  expect(events.length).toBe(count);
});
