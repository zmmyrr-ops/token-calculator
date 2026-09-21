import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
test("AI eyes creates a real scoped task, accepts minimal result, exports and revokes sharing", async ({
  page,
  request,
}) => {
  await page.goto("/ai-eyes");
  await expect(
    page.getByRole("heading", { name: /AI 眼里的你：\s*它会怎么形容你/ }),
  ).toBeVisible();
  await expect(page.locator(".eyes-type-grid button")).toHaveCount(0);
  await page.getByRole("button", {name:"使用 Codex",exact:true}).click();
  await page.locator(".eyes-consent input").check();
  const created = page.waitForResponse(
    (r) =>
      r.url().endsWith("/api/v1/ai-eyes/runs") &&
      r.request().method() === "POST",
  );
  await page
    .getByRole("button", { name: "看看 AI 眼里的我", exact: true })
    .click();
  const data = await (await created).json();
  await expect(page.getByLabel("专属执行指令")).toHaveValue(
    new RegExp(data.run.id),
  );
  const path = "/api/v1/ai-eyes/runs/" + data.run.id;
  const result = await request.post(path + "/result", {
    headers: { Authorization: "Bearer " + data.submitToken },
    data: {
      schema_version: "4",
      catalog_version: "user-original-1",
      persona_id: "prompt_academician",
      alternative_persona_id: null,
      match_notes: ["善于提前整理背景和验收条件。"],
      sample_scope: "limited",
    },
  });
  expect(result.ok()).toBe(true);
  await expect(
    page.getByRole("heading", { level: 1, name: "Prompt 工程院院士" }),
  ).toBeVisible({ timeout: 15000 });
  await expect(page.locator(".eyes-paper")).toContainText(
    "我负责给 AI 做 onboarding。",
  );
  await expect(page.getByText("浏览其他类型", {exact:true})).toHaveCount(0);
  await expect(page.getByRole("button", {name:/完整长图|完整多页卡/})).toHaveCount(0);
  await page.getByRole("button", { name: "生成我的封面" }).click();
  await expect(page.locator(".eyes-export-preview img")).toHaveCount(1, {
    timeout: 30000,
  });
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "保存封面" }).click();
  const file = await download;
  expect((await readFile((await file.path())!)).slice(1, 4).toString()).toBe(
    "PNG",
  );
  await page.getByRole("button", { name: "预览分享内容" }).click();
  await page.getByRole("button", { name: "确认公开（替换旧分享）" }).click();
  const link = page.getByRole("link", { name: "打开当前公开报告" });
  await expect(link).toBeVisible();
  const url = await link.getAttribute("href");
  const publicData = await (
    await request.get("/api/v1/ai-eyes/shares/" + url!.split("/").pop())
  ).json();
  expect(publicData.match_notes).toBeUndefined();
  await page.getByRole("button", { name: "撤销分享", exact: true }).click();
  await expect(link).toHaveCount(0);
  expect(
    (
      await request.get("/api/v1/ai-eyes/shares/" + url!.split("/").pop())
    ).status(),
  ).toBe(404);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("Claude Code is a parallel entry with separate consent and persisted source", async ({ page }) => {
  await page.goto('/ai-eyes');
  await expect(page.getByRole('button', {name:'使用 Claude Code',exact:true})).toBeVisible();
  await page.getByRole('button', {name:'使用 Codex',exact:true}).click();
  await page.locator('.eyes-consent input').check();
  await page.getByRole('button', {name:'使用 Claude Code',exact:true}).click();
  await expect(page.locator('.eyes-consent input')).not.toBeChecked();
  await page.locator('.eyes-consent input').check();
  const created = page.waitForResponse(r => r.url().endsWith('/api/v1/ai-eyes/runs') && r.request().method()==='POST');
  await page.getByRole('button', {name:'看看 AI 眼里的我',exact:true}).click();
  expect((await (await created).json()).run.scope.source).toBe('claude_code');
  await expect(page.getByLabel('专属执行指令')).toHaveValue(/本机 Claude Code 历史/);
  await page.reload();
  await expect(page.getByRole('heading', {name:'等待你在 Claude Code 发送'})).toBeVisible();
});
