import { test, expect } from "@playwright/test";

test("new lessons are searchable, readable and use matching HTML/client metadata", async ({ page, request }) => {
  const slug = "ai-json-validation-workshop";
  const title = "AI 输出 JSON 总报错？用 Python 做字段校验与失败重试";
  const response = await request.get("/learn/" + slug);
  expect(response.status()).toBe(200);
  const html = await response.text();
  expect(html).toContain("def validate_ticket");
  expect(html).toContain('"@type":"BreadcrumbList"');
  expect(await (await request.get("/sitemap.xml")).text()).toContain("https://ruming.top/learn/" + slug);
  await page.goto("/learn?q=" + encodeURIComponent("JSON"));
  await page.getByRole("link", { name: title, exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "文章目录" })).toBeVisible();
  await expect.poll(() => page.locator('script[type="application/ld+json"]').textContent()).toContain('"@type":"Article"');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://ruming.top/learn/" + slug);
  const related = page.locator(".portal-related").filter({ has: page.getByRole("heading", { name: "配套工具与教程" }) });
  await expect(related.getByRole("link", { name: /AI 写完代码怎么验收/ })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await related.getByRole("link", { name: /AI 写完代码怎么验收/ }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("AI 写完代码怎么验收");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://ruming.top/learn/ai-code-acceptance-workshop");
});
