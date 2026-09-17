import { test, expect } from "@playwright/test";
test("user registration, avatar, profile, discussion and session lifecycle", async ({
  page,
  request,
}) => {
  const name =
    "reader_" +
    Date.now().toString(36) +
    Math.random().toString(36).slice(2, 6);
  page.on("dialog", (d) => d.accept());
  await page.goto("/forum");
  await expect(page.locator(".forum-card")).toHaveCount(12);
  await expect(
    page.getByText("示例讨论", { exact: true }).first(),
  ).toBeVisible();
  await page.getByRole("link", { name: "下一页", exact: true }).click();
  await expect(page).toHaveURL(/page=2/);
  await expect(page.locator(".forum-card")).toHaveCount(12);
  await page.goto("/register");
  await page.getByLabel("账号", { exact: true }).fill(name);
  await page.getByLabel("昵称", { exact: true }).fill("创作测试者");
  await page
    .getByLabel("密码", { exact: true })
    .fill("secure-test-password-42");
  const png = await page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#66ccaa";
    ctx.fillRect(0, 0, 128, 128);
    return c.toDataURL("image/png").split(",")[1];
  });
  await page
    .locator('input[type="file"]')
    .setInputFiles({
      name: "avatar.png",
      mimeType: "image/png",
      buffer: Buffer.from(png, "base64"),
    });
  await expect(page.getByAltText("头像预览")).toBeVisible();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "注册并登录" }).click();
  await expect(page).toHaveURL(/\/forum$/);
  await expect(page.locator(".community-account-link")).toContainText(
    "创作测试者",
  );
  const session = await (
    await page.request.get("/api/community/session")
  ).json();
  expect(session.user.username).toBe(name);
  const avatar = await request.get(session.user.avatar);
  expect(avatar.headers()["content-type"]).toContain("image/png");
  await page.goto("/account");
  await page.getByLabel("昵称", { exact: true }).fill("创作测试者更新");
  await page.getByRole("button", { name: "使用默认头像" }).click();
  await page.getByRole("button", { name: "保存资料" }).click();
  await expect(page.getByText("资料已保存", { exact: true })).toBeVisible();
  await expect(page.locator(".community-account-link")).toContainText(
    "创作测试者更新",
  );
  await page.goto("/forum/new");
  await page
    .getByLabel("标题", { exact: true })
    .fill("如何给小游戏准备可复用素材 " + name);
  await page
    .getByLabel("正文", { exact: true })
    .fill(
      "这是隔离数据库中的讨论验证，目标是确保帖子和回复可以正确存储。<script>window.forumUnsafe=true</script>",
    );
  await page.getByRole("button", { name: "发布讨论" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(name);
  const postUrl = page.url();
  expect(await page.evaluate(() => "forumUnsafe" in window)).toBe(false);
  await page.getByLabel("写下回复").fill("回复已经明确记录目标和验证步骤。");
  await page.getByRole("button", { name: "发表回复" }).click();
  await expect(page.locator(".forum-reply")).toHaveCount(1);
  await page.getByRole("button", { name: "编辑帖子", exact: true }).click();
  await page
    .getByLabel("标题", { exact: true })
    .fill("已更新的小游戏素材话题 " + name);
  await page.getByRole("button", { name: "保存修改" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("已更新");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `docs/screenshots/community-${test.info().project.name}.png`,
  });
  await page.goto("/account");
  await page.getByRole("button", { name: "退出账号", exact: true }).click();
  await page.goto("/login");
  await page.getByLabel("账号", { exact: true }).fill(name);
  await page
    .getByLabel("密码", { exact: true })
    .fill("secure-test-password-42");
  await page.getByRole("button", { name: "登录", exact: true }).click();
  await expect(page).toHaveURL(/\/forum$/);
  await page.goto(postUrl);
  await page.getByRole("button", { name: "删除帖子", exact: true }).click();
  await expect(page).toHaveURL(/\/forum$/);
  await page.goto(postUrl);
  await expect(
    page.getByRole("heading", { name: "暂时无法打开讨论" }),
  ).toBeVisible();
});
