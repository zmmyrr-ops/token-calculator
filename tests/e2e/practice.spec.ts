import { test, expect } from "@playwright/test";
test("practice discovery, scenario links and actionable export", async ({
  page,
}) => {
  await page.goto("/tutorials");
  await expect(page.locator(".course-card")).toHaveCount(5);
  await page.getByLabel("筛选教程场景").selectOption("3d");
  await expect(page.locator(".course-card")).toHaveCount(1);
  await page.getByLabel("搜索实践教程").fill("不会存在的教程");
  await expect(
    page.getByRole("heading", { name: "没有找到匹配教程" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "清除筛选" }).click();
  await expect(page.locator(".course-card")).toHaveCount(5);
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
