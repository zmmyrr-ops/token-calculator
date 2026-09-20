import { test, expect } from "@playwright/test";
test("game directory groups engines and renderers with icons and working tutorials", async ({
  page,
  request,
}) => {
  await page.goto("/tools?category=" + encodeURIComponent("游戏引擎"));
  await expect(page.locator(".resource-card")).toHaveCount(10);
  await expect(page.locator('nav[aria-label="平台分类"] a')).toHaveCount(9);
  for (const name of [
    "Godot",
    "Cocos Creator",
    "LayaAir",
    "PixiJS",
    "Three.js",
  ])
    await expect(
      page.locator(".resource-card").filter({ hasText: name }),
    ).toBeVisible();
  await page.locator(".resource-card").filter({ hasText: "Godot" }).click();
  await expect(page.locator("h1")).toHaveText("Godot");
  await expect(page.locator(".platform-icon img")).toBeVisible();
  await expect
    .poll(() =>
      page
        .locator(".platform-icon img")
        .evaluate(
          (img: HTMLImageElement) => img.complete && img.naturalWidth > 0,
        ),
    )
    .toBe(true);
  await page.getByRole("link", { name: "阅读相关操作路线 →" }).click();
  await expect(page.locator("h1")).toContainText("Godot + AI");
  const r = await request.get(
    "/api/v1/library/tools?q=2D&category=" +
      encodeURIComponent("游戏引擎与渲染"),
  );
  const d = await r.json();
  expect(d.items.some((x: { id: string }) => x.id === "pixijs")).toBe(true);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
});
