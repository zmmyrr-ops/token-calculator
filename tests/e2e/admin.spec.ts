import {initMiniEyes} from "../../backend/src/mini-eyes";
import {LearningCollector} from "../../backend/src/learning-collector";
import { initPersonas, personaRows } from "../../backend/src/personas";
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
  initPersonas(db);
  seedCommunity(db);
  db.seed(await (await fetch((process.env.TEST_URL || "http://127.0.0.1:3000") + "/api/v1/bootstrap")).json());
  await db.db
    .prepare("INSERT INTO admins VALUES(?,?,1)")
    .run("admin", await hashPassword("isolated-initial-password"));
  const app = express();
  app.use(express.json());
  app.use("/api/admin", adminRouter(db, undefined, new LearningCollector(db, async () => '<rss version="2.0"><channel><title>Empty</title></channel></rss>')));
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
    expect((await fetch(`http://127.0.0.1:${port}/api/admin/ai-eyes/results`)).status).toBe(401);
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
    recordEvent(db,{id:randomUUID(),name:"visit_start",page:"/learn",target:"none",source:"baidu",device:"desktop"});
    recordEvent(db,{id:randomUUID(),name:"visit_start",page:"/",target:"none",source:"google",device:"mobile"});
    await page.getByRole("button",{name:"刷新统计"}).click();
    const traffic=page.getByRole("region",{name:"流量来源统计"});
    await expect(traffic).toContainText("记录到 2 次进入");
    await page.getByLabel("来源设备筛选").selectOption("desktop");
    await expect(traffic).toContainText("记录到 1 次进入");
    await expect(traffic).toContainText("百度搜索");
    await expect(traffic).not.toContainText("Google 搜索");
    await traffic.screenshot({path:"test-results/traffic-"+test.info().project.name+".png"});
    await expect(page.locator(".analytics-metrics article").first().locator("strong")).toHaveText("1");
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
    await page.getByRole("button", { name: "小程序设置", exact: true }).click();
    await expect(page.getByLabel("开放小程序资讯")).toBeChecked();
    await page.getByLabel("开放小程序资讯").uncheck();
    await page.getByLabel("开放小程序社区论坛").uncheck();
    await page.getByRole("button", { name: "保存模块设置" }).click();
    await expect(page.getByRole("status")).toContainText("已保存");
    expect(
      db.meta<{ news: boolean; forum: boolean }>("miniModules"),
    ).toMatchObject({ news: false, forum: false });
    await page.getByLabel("开放小程序资讯").check();
    await page.getByLabel("开放小程序社区论坛").check();
    await page.getByRole("button", { name: "保存模块设置" }).click();
    await expect
      .poll(() => db.meta<{ news: boolean }>("miniModules")?.news)
      .toBe(true);
    const wxUser = randomUUID();
    db.db
      .prepare(
        "INSERT INTO community_users(id,username,nickname,password,demo,disabled,created_at,updated_at,source) VALUES(?,?,?,'unusable',0,0,?,?,'miniprogram')",
      )
      .run(
        wxUser,
        "wx_isolated_reader",
        "微信隔离验收",
        Date.now(),
        Date.now(),
      );
    db.db
      .prepare("INSERT INTO community_wechat_identities VALUES(?,?,?,?)")
      .run(
        "wx30d01d25ba6ff5c3",
        "isolated-openid-for-admin-test",
        wxUser,
        Date.now(),
      );
    await page.getByRole("button", { name: "用户管理", exact: true }).click();
    await page.getByLabel("注册来源").selectOption("miniprogram");
    await expect(page.getByText("共 1 条记录", { exact: true })).toBeVisible();
    await page.getByText("微信关联（1）").click();
    await expect(
      page.getByText("OpenID：isolated-openid-for-admin-test", {
        exact: false,
      }),
    ).toBeVisible();
    await page.getByRole("link", {name:"AI 人格管理"}).click();
    await page.getByRole("button", {name:"甜妹 · 糖糖",exact:true}).click();
    await page.getByLabel("名称",{exact:true}).fill("测试人格编辑");
    await page.getByLabel("默认称呼",{exact:true}).fill("小林");
    await page.getByLabel("在前台发布").uncheck();
    await page.getByRole("button", {name:"保存并更新"}).click();
    await expect(page.getByRole("status")).toContainText("已保存");
    expect(personaRows(db)[0]).toMatchObject({name:"测试人格编辑",published:false,voice:{defaultAddress:"小林"}});
    initMiniEyes(db);
    db.db.prepare("INSERT INTO mini_eyes_results VALUES(?,?,?)").run(wxUser,JSON.stringify({platform:"DeepSeek",created:Date.now(),result:{persona_id:"one_line_ceo",match_notes:["private"]}}),Date.now()+86400000);
    await page.goto("/admin/ai-eyes");
    await expect(page.getByRole("heading", {name:"AI 眼里的你 · 管理"})).toBeVisible();
    await page.getByLabel("画像使用入口").selectOption("miniprogram");
    await page.getByLabel("画像分析平台").selectOption("DeepSeek");
    const records=page.getByRole("region",{name:"画像记录"});
    await expect(records.getByText("微信隔离验收",{exact:false})).toBeVisible();
    await expect(records.getByText("一句话 CEO",{exact:true})).toBeVisible();
    await page.getByLabel("画像分析平台").selectOption("豆包");
    await expect(records.getByText("当前筛选下暂无画像记录。")).toBeVisible();
    await page.getByLabel("开放新任务", {exact:false}).uncheck();
    await expect.poll(()=>db.db.prepare("SELECT enabled FROM ai_eyes_settings").get()?.enabled).toBe(0);
    await page.getByLabel("开放新任务", {exact:false}).check();
    await expect.poll(()=>db.db.prepare("SELECT enabled FROM ai_eyes_settings").get()?.enabled).toBe(1);
    expect(db.db.prepare("SELECT count(*) n FROM ai_eyes_audit").get()?.n).toBe(2);
    await page.getByRole("link", {name:"← 管理后台",exact:true}).click();
    await page.getByRole("button", {name:"知识采集",exact:true}).click();
    await expect(page.getByRole("heading", {name:"学习中心 · 知识采集"})).toBeVisible();
    await page.getByRole("button", {name:"暂停定时采集",exact:true}).click();
    await expect(page.getByRole("button", {name:"开启定时采集",exact:true})).toBeVisible();
    await page.getByRole("button", {name:"立即采集",exact:true}).click();
    await expect(page.getByText(/上次开始：/)).toBeVisible();
    await page.getByRole("button", {name:"内容管理",exact:true}).click();
    await page.getByRole("link", {name:"SEO 管理",exact:true}).click();
    await page.getByLabel("查找SEO页面").fill("/ai-eyes");
    await page.locator(".admin-items button").first().click();
    await page.getByLabel("搜索标题",{exact:true}).fill("画像使用教程·隔离验证");
    await page.getByLabel("搜索摘要",{exact:true}).fill("豆包与DeepSeek的完整操作步骤");
    await page.getByRole("button",{name:"保存并发布SEO"}).click();
    await expect(page.getByRole("status")).toContainText("已发布");
    expect(db.publicContent().seoOverrides?.["/ai-eyes"].title).toBe("画像使用教程·隔离验证");
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.screenshot({path:`test-results/seo-admin-${test.info().project.name}.png`});
    await page.getByRole("link",{name:"← 管理后台",exact:true}).click();
    await page.screenshot({
      path: `docs/screenshots/admin-${test.info().project.name}.png`,
    });
  } finally {
    await new Promise<void>((r) => server.close(() => r()));
    db.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
