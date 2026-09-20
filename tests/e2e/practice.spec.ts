import { test, expect } from "@playwright/test";
test("practice discovery, scenario links and actionable export", async ({
  page,
}) => {
  await page.goto("/tutorials");
  await expect(page).toHaveURL(/learn\?format=practice/);
  await expect(page.locator(".learning-card")).toHaveCount(8);
  await page.getByLabel("搜索知识文章").fill("不会存在的教程");
  await page.getByRole("button", { name: "筛选", exact: true }).click();
  await expect(
    page.getByText("没有匹配内容，试试更短的关键词或其他主题。"),
  ).toBeVisible();
  await page.getByRole("link", { name: "重置", exact: true }).click();
  await expect(page.locator(".learning-card")).toHaveCount(8);
  await page.getByLabel("内容形式").selectOption("video");
  await page.getByRole("button", {name:"筛选",exact:true}).click();
  await expect(page.locator(".learning-card")).toHaveCount(6);
  await page.getByRole("link", { name: /Blender 官方基础视频/ }).click();
  await expect(
    page.getByRole("link", { name: /前往原站观看视频/ }),
  ).toHaveAttribute(
    "href",
    "https://studio.blender.org/training/blender-2-8-fundamentals/",
  );
  await page.goto("/scenarios");
  await expect(page).toHaveURL(/learn\?format=scenarios/);
  await expect(page.locator(".resource-card")).toHaveCount(5);
  await page.goto("/scenarios/3d");
  await expect(page.getByRole("heading", { name: "开始前准备" })).toBeVisible();
  await page.getByRole("link", { name: "开始这条实践路线 →" }).click();
  await expect(page.locator(".practice-stage .practice-check")).toHaveCount(4);
  await page.getByText("导入后贴图丢失", { exact: true }).click();
  await expect(
    page.getByText(/检查导出文件包含或引用的贴图路径/),
  ).toBeVisible();
  await page.getByLabel("实践提问模板").fill("我的道具验收要求");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "下载实践清单" }).click();
  const file = await download;
  expect(file.suggestedFilename()).toContain("实践清单.md");
  const stream = await file.createReadStream();
  let text = "";
  for await (const chunk of stream!) text += chunk.toString();
  expect(text).toContain("我的道具验收要求");
  expect(text).toContain("## 交付");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
