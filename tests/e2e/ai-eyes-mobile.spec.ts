import { test, expect } from "@playwright/test";
test("mobile AI result import validates, persists, exports and marks sharing", async ({
  page,
}) => {
  await page.goto("/ai-eyes");
  await expect(
    page.getByRole("heading", { name: "手机上，也能看看 AI 眼里的你" }),
  ).toBeVisible();
  await page.getByText("查看完整指令 / 手动复制").click();
  await expect(page.getByLabel("手机测评指令")).toHaveValue(/one_line_ceo/);
  await page.getByLabel("粘贴结果码").fill("not json");
  await page.locator(".eyes-mobile-consent input").check();
  await page
    .getByRole("button", { name: "生成我的趣味画像", exact: true })
    .click();
  await expect(page.locator(".eyes-mobile [role=status]")).toContainText(
    "格式不正确",
  );
  await page
    .getByLabel("粘贴结果码")
    .fill(
      JSON.stringify({
        format: "AI_EYES_MOBILE_1",
        persona_id: "one_line_ceo",
        basis: "questions",
        match_notes: ["习惯先给目标，再逐步补充要求。"],
      }),
    );
  await page.locator(".eyes-mobile-consent input").check();
  await page
    .getByRole("button", { name: "生成我的趣味画像", exact: true })
    .click();
  await expect(page).toHaveURL(/\/ai-eyes\/runs\//);
  await expect(
    page.getByRole("heading", { name: "一句话 CEO", exact: true }),
  ).toBeVisible();
  await expect(page.getByText(/豆包 · 基于本次问答/)).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "一句话 CEO", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "生成我的封面", exact: true }).click();
  await expect(page.locator(".eyes-export-preview img")).toBeVisible({
    timeout: 30000,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
