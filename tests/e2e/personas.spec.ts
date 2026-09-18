import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
test("persona discovery, saved preferences, share state and usable downloads", async ({
  page,
}) => {
  await page.goto("/personas");
  await expect(
    page.getByRole("heading", { name: "今天，想和谁聊？" }),
  ).toBeVisible();
  await expect(page.locator(".persona-card")).toHaveCount(12);
  await page.getByRole("button", { name: "收藏冷静御姐", exact: true }).click();
  await page.getByLabel("只看本机收藏").check();
  await expect(page.locator(".persona-card")).toHaveCount(1);
  await page.reload();
  await page.getByLabel("只看本机收藏").check();
  await expect(page.locator(".persona-card")).toHaveCount(1);
  await page.locator(".persona-choose").click();
  await page.getByLabel("风格强度").selectOption("strong");
  await page.getByRole("button", { name: "Codex Skill", exact: true }).click();
  await expect(page.getByLabel("生成的人格指令")).toHaveValue(
    /name: mendao-velvet/,
  );
  const downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: "下载配置", exact: true }).click();
  const file = await downloaded;
  expect(file.suggestedFilename()).toBe("SKILL.md");
  expect(await readFile((await file.path())!, "utf8")).toContain("个性鲜明");
  const url = page.url();
  await page.goto(url);
  await expect(page.getByLabel("风格强度")).toHaveValue("strong");
  await expect(page.getByLabel("生成的人格指令")).toHaveValue(
    /name: mendao-velvet/,
  );
  await page.getByRole("button", { name: "项目默认", exact: true }).click();
  await expect(page.getByLabel("生成的人格指令")).toHaveValue(
    /mendao-persona:start/,
  );
  await expect(page.locator("#persona-guide")).toContainText("先备份原文件");
  const cardDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "下载分享卡片", exact: true }).click();
  const card = await cardDownload;
  expect(card.suggestedFilename()).toBe("velvet-card.svg");
  expect(await readFile((await card.path())!, "utf8")).toContain("data:image/webp;base64,");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
