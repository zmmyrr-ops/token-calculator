import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
test("persona discovery, saved preferences, share state and usable downloads", async ({
  page,
}) => {
  await page.goto("/personas");
  await expect(
    page.getByRole("heading", { name: "今天，想和谁聊？" }),
  ).toBeVisible();
  await expect(page.locator(".persona-card")).toHaveCount(5);
  await page
    .getByRole("button", { name: "收藏御姐 · 绯姐", exact: true })
    .click();
  await page.getByLabel("只看本机收藏").check();
  await expect(page.locator(".persona-card")).toHaveCount(1);
  await page.reload();
  await page.getByLabel("只看本机收藏").check();
  await expect(page.locator(".persona-card")).toHaveCount(1);
  await page.locator(".persona-choose").click();
  await page.getByLabel("风格强度").selectOption("strong");
  await page.getByRole("button", { name: "Codex Skill", exact: true }).click();
  await expect(page.getByLabel("生成的人格指令")).toHaveValue(
    /name: mendao-queen-v2/,
  );
  const downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: "下载配置", exact: true }).click();
  const file = await downloaded;
  expect(file.suggestedFilename()).toBe("SKILL.md");
  expect(await readFile((await file.path())!, "utf8")).toContain("压场");
  const url = page.url();
  await page.goto(url);
  await expect(page.getByLabel("风格强度")).toHaveValue("strong");
  await expect(page.getByLabel("生成的人格指令")).toHaveValue(
    /name: mendao-queen-v2/,
  );
  await page.getByRole("button", { name: "项目默认", exact: true }).click();
  await expect(page.getByLabel("生成的人格指令")).toHaveValue(
    /mendao-persona:start/,
  );
  await expect(page.locator("#persona-guide")).toContainText("先备份原文件");
  const cardDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "下载分享卡片", exact: true }).click();
  const card = await cardDownload;
  expect(card.suggestedFilename()).toBe("queen-v2-card.svg");
  expect(await readFile((await card.path())!, "utf8")).toContain(
    "data:image/webp;base64,",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("new personality examples follow intensity and address, archived links stay explicit", async ({
  page,
}) => {
  await page.goto("/personas?persona=sugar-v2");
  await expect(page.locator(".persona-card")).toHaveCount(5);
  const demo = page.locator(".persona-demo blockquote");
  const balanced = await demo.textContent();
  await page.getByLabel("风格强度").selectOption("strong");
  await expect(demo).not.toHaveText(balanced!);
  await page.getByLabel("希望怎么称呼你").fill("小林");
  await expect(demo).toContainText("小林");
  await expect(page.getByLabel("生成的人格指令")).toHaveValue(/小林/);
  await page.getByRole("button", { name: "求夸", exact: true }).click();
  await expect(demo).toContainText("登录");
  await page.reload();
  await expect(page.getByLabel("希望怎么称呼你")).toHaveValue("小林");
  await expect(page.getByLabel("风格强度")).toHaveValue("strong");
  await page.goto("/personas?persona=velvet");
  await expect(page.getByRole("alert")).toContainText("已下架");
  await expect(page.locator(".persona-card")).toHaveCount(5);
  for (const avatar of await page.locator(".persona-portrait").all()) {
    await avatar.scrollIntoViewIfNeeded();
    await expect
      .poll(() =>
        avatar.evaluate(
          (i) =>
            (i as HTMLImageElement).complete &&
            (i as HTMLImageElement).naturalWidth > 0,
        ),
      )
      .toBe(true);
  }
});
