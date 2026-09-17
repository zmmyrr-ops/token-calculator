import { initCommunity } from "../../backend/src/community";
import { seedCommunity } from "../../backend/src/community-seed";
import { recordEvent } from "../../backend/src/analytics";
import { randomUUID } from "node:crypto";
import { test, expect } from "@playwright/test";
import express from "express";
import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { ContentDatabase, CmsError } from "../../backend/src/database";
import { adminRouter, hashPassword } from "../../backend/src/admin";

test("isolated admin: change password, save, publish and download backup", async ({
  page,
}) => {
  const dir = mkdtempSync(path.join(tmpdir(), "mendao-admin-test-"));
  const db = new ContentDatabase(path.join(dir, "test.sqlite"));
  initCommunity(db);
  seedCommunity(db);
  db.seed(await (await fetch("http://127.0.0.1:3000/api/v1/bootstrap")).json());
  await db.db
    .prepare("INSERT INTO admins VALUES(?,?,1)")
    .run("admin", await hashPassword("isolated-initial-password"));
  const app = express();
  app.use(express.json());
  app.use("/api/admin", adminRouter(db));
  app.use(
    (
      e: Error,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      res
        .status(e instanceof CmsError ? e.status : 400)
        .json({ error: e.message });
    },
  );
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((r) => server.once("listening", r));
  const port = (server.address() as { port: number }).port;
  try {
    await page.route("**/api/admin/**", async (route) => {
      const url = new URL(route.request().url());
      url.port = String(port);
      const response = await route.fetch({ url: url.toString() });
      await route.fulfill({ response });
    });
    page.on("dialog", (dialog) => dialog.accept());
    await page.goto("/admin");
    await page.getByLabel("用户名", { exact: true }).fill("admin");
    await page
      .getByLabel("密码", { exact: true })
      .fill("isolated-initial-password");
    await page.getByRole("button", { name: "登录后台" }).click();
    await expect(
      page.getByRole("heading", { name: "首次登录，请修改密码" }),
    ).toBeVisible();
    await page
      .getByLabel("当前密码", { exact: true })
      .fill("isolated-initial-password");
    await page
      .getByLabel("新密码", { exact: true })
      .fill("isolated-changed-password");
    await page.getByRole("button", { name: "更新密码" }).click();
    await expect(page.getByRole("button", { name: "登录后台" })).toBeVisible();
    await page
      .getByLabel("密码", { exact: true })
      .fill("isolated-changed-password");
    await page.getByRole("button", { name: "登录后台" }).click();
    await page.locator(".admin-items button").first().click();
    const title = page.getByLabel("标题", { exact: true }).first();
    const original = await title.inputValue();
    await title.fill(original + "（隔离验收）");
    await page.getByRole("button", { name: "保存草稿", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "发布", exact: true }),
    ).toBeEnabled();
    expect(
      db
        .publicContent()
        .knowledge.some((x) => x.title.endsWith("（隔离验收）")),
    ).toBe(false);
    await page.getByRole("button", { name: "发布", exact: true }).click();
    await expect
      .poll(() =>
        db
          .publicContent()
          .knowledge.some((x) => x.title.endsWith("（隔离验收）")),
      )
      .toBe(true);
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "下载数据库备份" }).click();
    const download = await downloadPromise;
    const file = await download.path();
    expect(readFileSync(file!).subarray(0, 15).toString()).toBe(
      "SQLite format 3",
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.getByRole("button", { name: "数据埋点", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "数据埋点", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("这个时间范围还没有收到访问数据。", { exact: false }),
    ).toBeVisible();
    await page.getByLabel("统计时间范围").selectOption("30");
    await expect(page.locator(".analytics-day")).toHaveCount(30);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    recordEvent(db, {
      id: randomUUID(),
      name: "page_view",
      page: "/models",
      target: "none",
    });
    await page.getByRole("button", { name: "刷新统计" }).click();
    await expect(
      page.locator(".analytics-metrics article").first().locator("strong"),
    ).toHaveText("1");
    await page.getByRole("button", { name: "社区管理", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "社区管理", exact: true }),
    ).toBeVisible();
    await expect(page.getByText("共 48 条记录", { exact: true })).toBeVisible();
    await page
      .getByRole("button", { name: "下架", exact: true })
      .first()
      .click();
    await expect(
      page.getByRole("button", { name: "恢复展示", exact: true }).first(),
    ).toBeVisible();
    await page.getByRole("button", { name: "用户管理", exact: true }).click();
    await expect(
      page.getByText("共 120 条记录", { exact: true }),
    ).toBeVisible();
    await page.getByLabel("搜索用户").fill("example_v2_001");
    await page.getByRole("button", { name: "搜索", exact: true }).click();
    await expect(page.getByText("共 1 条记录", { exact: true })).toBeVisible();
    await page.getByLabel("账号类型").selectOption("registered");
    await expect(page.getByText("共 0 条记录", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "重置", exact: true }).click();
    await expect(
      page.getByText("共 120 条记录", { exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `docs/screenshots/admin-${test.info().project.name}.png`,
    });
  } finally {
    await new Promise<void>((r) => server.close(() => r()));
    db.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
