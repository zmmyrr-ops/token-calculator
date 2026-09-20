import { test, expect } from "@playwright/test";
test("learning themes, old links, form filters and body search stay consistent", async ({
  page,
  request,
}) => {
  const all = await (await request.get("/api/v1/library/learn")).json();
  expect(all.categories).toHaveLength(6);
  for (const category of all.categories) {
    const response = await (
      await request.get("/api/v1/library/learn", { params: { category } })
    ).json();
    expect(response.total).toBeGreaterThan(0);
    expect(
      response.items.every(
        (a: { category: string }) => a.category === category,
      ),
    ).toBe(true);
  }
  await page.goto(
    "/learn?format=practice&category=" + encodeURIComponent("游戏开发实战"),
  );
  await expect(page.getByLabel("文章分类")).toHaveValue("游戏开发");
  await expect(page.locator(".learning-card")).toHaveCount(4);
  await expect(
    page.getByRole("navigation", { name: "学习中心分类" }).getByRole("link"),
  ).toHaveCount(4);
  await page.getByLabel("内容形式").selectOption("video");
  await page.getByLabel("文章分类").selectOption("");
  await page.getByRole("button", { name: "筛选", exact: true }).click();
  await expect(page.locator(".learning-card")).toHaveCount(6);
  const options = await page
    .getByLabel("文章分类")
    .locator("option")
    .allTextContents();
  expect(options).not.toContain("智能体与自动化");
  await page.goto("/learn?q=" + encodeURIComponent("0.036"));
  await expect(
    page.getByRole("link", {
      name: "Token 是什么？为什么不等于字数？",
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("link", { name: "重置", exact: true }).click();
  await expect(page.getByLabel("搜索知识文章")).toHaveValue("");
  await expect(page.locator(".learning-card")).toHaveCount(18);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.goto("/learn/tokens");
  await expect(
    page.getByRole("navigation", { name: "文章目录" }),
  ).toBeVisible();
  await expect(page.locator("main")).toContainText("0.036");
});
