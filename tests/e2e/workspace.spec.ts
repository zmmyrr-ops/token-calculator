import { test, expect } from "@playwright/test";
test("workspace stores private resources, versions and project progress across visits", async ({
  page,
  request,
  baseURL,
}) => {
  const username =
    "ws_" +
    Date.now().toString(36) +
    "_" +
    Math.random().toString(36).slice(2, 6);
  const result = await request.post("/api/community/register", {
    headers: { Origin: baseURL! },
    data: { username, password: "WorkspacePass123!", nickname: "工作台测试" },
  });
  expect(result.status()).toBe(201);
  await page.context().addCookies((await request.storageState()).cookies);
  await page.goto("/task-packs/game-character");
  await expect(
    page.locator(".community-account-link"),
  ).toBeVisible();
  await page.getByRole("button", { name: "开始这个任务", exact: true }).click();
  await expect(page).toHaveURL(/\/workspace\/projects\//);
  const projectUrl = page.url();
  await page.getByLabel("1. 明确角色设定").check();
  await page
    .getByLabel("制作笔记", { exact: true })
    .fill("这是私密制作笔记，不应进入社区草稿");
  await page
    .getByLabel("成果与复盘", { exact: true })
    .fill("完成了角色立绘，下一次调整配色。");
  await page
    .getByRole("button", { name: "保存笔记与成果", exact: true })
    .click();
  await expect(page.getByRole("status")).toHaveText("项目已保存到云端");
  await page.reload();
  await expect(page.getByLabel("1. 明确角色设定")).toBeChecked();
  await expect(page.getByLabel("制作笔记", { exact: true })).toHaveValue(
    /私密/,
  );
  await page.getByRole("button", { name: "生成社区交流草稿" }).click();
  await expect(page.getByLabel("正文", { exact: true })).toHaveValue(
    /完成了角色立绘/,
  );
  await expect(page.getByLabel("正文", { exact: true })).not.toHaveValue(
    /私密制作笔记/,
  );
  await page.goto("/workspace/prompts/new");
  await page.getByLabel("提示词名称").fill("角色设计提示词");
  await page.getByLabel("提示词正文").fill("第一版：先描述轮廓");
  await page.getByRole("button", { name: "保存提示词", exact: true }).click();
  await expect(page).toHaveURL(/\/workspace\/prompts\/(?!new)/);
  await page.getByLabel("提示词正文").fill("第二版：增加颜色限制");
  await page.getByRole("button", { name: "保存提示词", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("新版本已保存");
  await page.getByRole("button", { name: "查看版本历史" }).click();
  await expect(
    page.locator("summary").filter({ hasText: "版本 1" }),
  ).toBeVisible();
  await page.goto("/tools/blender");
  await page.getByRole("button", { name: "保存到工作台", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("已保存到云端工作台");
  await page.goto("/workspace");
  await expect(
    page.getByRole("heading", { name: "工作台测试的 AI 工作台" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Blender", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "角色设计提示词", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "分类与备注" }).click();
  await page.getByLabel("备注", { exact: true }).fill("我的建模工具");
  await page.getByRole("button", { name: "保存", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("分类与备注已保存");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出全部资料" }).click();
  expect((await download).suggestedFilename()).toContain("工作台备份");
  await page.goto(projectUrl);
  await expect(page.getByLabel("1. 明确角色设定")).toBeChecked();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
