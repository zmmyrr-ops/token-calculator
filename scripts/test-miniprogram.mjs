import automator from "miniprogram-automator";
import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:net";
import { DatabaseSync } from "node:sqlite";
import { mkdir, cp, writeFile, readFile } from "node:fs/promises";
import { randomUUID, randomBytes } from "node:crypto";
import path from "node:path";
import assert from "node:assert/strict";
const eyesOnly = process.argv.includes("--eyes-only");
const canonicalProject = path.resolve("miniprogram");
const cliPath = process.env.WECHAT_CLI ||
  "/Applications/wechatwebdevtools.app/Contents/MacOS/cli";
const dir = path.resolve(
  "test-results/miniprogram-integration-" + randomUUID(),
);
await mkdir(dir, { recursive: true });
const project = path.join(dir, "app");
await cp("miniprogram", project, {
  recursive: true,
  filter: (s) => !s.endsWith("project.private.config.json"),
});
// Refuse an occupied port so no test ever targets an unrelated database.
const guard = createServer();
await new Promise((resolve, reject) => {
  guard.once("error", reject);
  guard.listen(4006, "127.0.0.1", resolve);
});
await new Promise((resolve) => guard.close(resolve));
const origin = "http://127.0.0.1:4006";
await writeFile(
  path.join(project, "config.js"),
  `module.exports={apiBase:'${origin}',website:'https://ruming.top'};`,
);
const config = JSON.parse(
  await readFile(path.join(project, "project.config.json"), "utf8"),
);
config.setting.urlCheck = false;
config.projectname = "AI门道·临时自动化测试";
await writeFile(
  path.join(project, "project.config.json"),
  JSON.stringify(config),
);
const server = spawn(process.execPath, ["backend/dist/server.mjs"], {
  env: {
    ...process.env,
    PORT: "4006",
    LEARNING_SYNC: "off",
    HOST: "127.0.0.1",
    DATABASE_FILE: path.join(dir, "test.sqlite"),
    NEWS_DATA_FILE: path.join(dir, "news.json"),
    ADMIN_PASSWORD: randomBytes(24).toString("hex"),
  },
  stdio: "ignore",
});
let mini;
const errors = [];
async function waitFor(fn, timeout = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await fn()) return;
    await new Promise((r) => setTimeout(r, 200));
  }
  throw Error("Timed out");
}
try {
  await waitFor(async () => {
    try {
      return (await fetch(origin + "/api/health/ready")).ok;
    } catch {
      return false;
    }
  });
  const opened = spawnSync(
    cliPath,
    ["open", "--project", project],
    { encoding: "utf8", timeout: 15000 },
  );
  if (opened.status !== 0) throw Error("Unable to open WeChat project");
  await new Promise((resolve) => setTimeout(resolve, 3000));
  const launch = () =>
    automator.launch({
      cliPath,
      projectPath: project,
      timeout: 60000,
      trustProject: true,
    });
  try {
    mini = await launch();
  } catch (e) {
    if (!/split/.test(e.message)) throw e;
    await new Promise((r) => setTimeout(r, 3000));
    mini = await launch();
  }
  mini.on("exception", (e) => errors.push(e));
  const ready = async (p) => {
    await waitFor(async () => {
      const d = await p.data();
      return (
        d.error ||
        (!d.loading &&
          (d.page > 0 ||
            d.item ||
            d.post ||
            d.user ||
            (d.models && d.models.length)))
      );
    });
    assert.equal((await p.data("error")) || "", "");
    return p;
  };
  async function homeTab(tab) {
    const home = await mini.reLaunch("/pages/home/index?tab=" + tab);
    await waitFor(async () => await home.data("ready"));
    await home.waitFor(200);
    return home.$("#active-panel");
  }
  let p;
  if (!eyesOnly) {
  p = await ready(await homeTab("learn"));
  assert.ok((await p.data("items")).length > 0);
  const article = (await p.data("items"))[0];
  const before = (await p.data("items")).length;
  await p.callMethod("load", false);
  await ready(p);
  assert.ok((await p.data("items")).length > before);
  console.log("PASS: real learning API and pagination");
  await p.callMethod("filter", {
    currentTarget: { dataset: { value: "场景" } },
  });
  await ready(p);
  assert.ok((await p.data("items")).length > 0);
  p = await ready(
    await mini.navigateTo(
      "/pages/detail/index?kind=learn&id=" + encodeURIComponent(article.slug),
    ),
  );
  assert.ok(await p.data("item"));
  await p.callMethod("save");
  assert.equal(await p.data("saved"), true);
  console.log("PASS: article, local favorite");
  await mini.screenshot({ path: path.join(dir, "learn.png") });
  for (const kind of ["tools", "models"]) {
    p = await ready(await mini.redirectTo("/pages/list/index?kind=" + kind));
    const row = (await p.data("items"))[0];
    assert.ok(row);
    p = await ready(
      await mini.redirectTo(
        "/pages/detail/index?kind=" +
          kind +
          "&id=" +
          encodeURIComponent(row.id),
      ),
    );
    assert.ok(await p.data("item"));
  }
  p = await ready(await mini.redirectTo("/pages/calculator/index"));
  assert.ok((await p.data("models")).length);
  await p.callMethod("calculate");
  assert.ok(await p.data("result"));
  await mini.screenshot({ path: path.join(dir, "calculator.png") });
  console.log("PASS: tool/model detail and budget");
  }
  // A real session in the isolated test DB exercises profile/forum UI; live WeChat exchange has separate tests.
  const registration = await fetch(origin + "/api/mini/community/register", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      username: "mini_" + Date.now(),
      password: "test-only-long-password",
      nickname: "自动化测试",
    }),
  });
  assert.equal(registration.status, 201);
  const testSession = await registration.json();
  await mini.callWxMethod(
    "setStorageSync",
    "mendao-session:" + origin,
    testSession.token,
  );
  p = await mini.redirectTo("/pages/account/index");
  await waitFor(async () => !!(await p.data("user")));
  await p.setData({ nickname: "更新后的昵称" });
  await p.callMethod("submit");
  await ready(p);
  assert.equal((await p.data("user")).nickname, "更新后的昵称");
  console.log(
    "PASS: native bearer authentication and profile edit (isolated DB)",
  );
  p = await mini.redirectTo("/pages/ai-eyes/index");
  await waitFor(async () => !(await p.data("loading")));
  assert.ok(await p.data("user"), JSON.stringify({error:await p.data("error"),exceptions:errors}));
  assert.ok(!(await p.data("prompt")).includes("one_line_ceo"));
  await p.setData({raw:JSON.stringify({format:"AI_EYES_BEHAVIOR_2",basis:"questions",sample_count:5,keywords:[{keyword:"简短指令",count:5},{keyword:"委托决策",count:1}]}),agreed:true});
  await (await p.$("#generate-portrait")).tap();
  await waitFor(async () => !!(await p.data("result")) || !!(await p.data("submitError")));
  await waitFor(async () => !(await p.data("busy")));
  assert.equal(await p.data("submitError"), "");
  assert.equal((await p.data("result")).persona.id,"one_line_ceo");
  await mini.screenshot({path:path.join(dir,"ai-eyes.png")});
  p = await mini.redirectTo("/pages/ai-eyes/index");
  await waitFor(async () => !(await p.data("loading")));
  assert.equal((await p.data("result")).persona.id,"one_line_ceo");
  console.log("PASS: mini AI behavior import, server classification and saved private result");
  if (!eyesOnly) {
  p = await mini.redirectTo("/pages/compose/index");
  await p.setData({
    title: "小程序自动化集成测试",
    body: "这是独立测试数据库中的帖子，不会写入生产环境。",
  });
  await p.callMethod("submit");
  await waitFor(
    async () => (await mini.currentPage()).path === "pages/post/index",
  );
  p = await ready(await mini.currentPage());
  assert.ok(await p.data("post"));
  await p.setData({ body: "这是测试数据库中的回复。" });
  await p.callMethod("reply");
  await waitFor(async () => !(await p.data("sending")));
  assert.equal(await p.data("error"), "");
  assert.equal(await p.data("total"), 1);
  console.log("PASS: create discussion and reply");
  p = await homeTab("me");
  await new Promise((resolve) => setTimeout(resolve, 400));
  assert.ok((await p.data("items")).length);
  await mini.screenshot({ path: path.join(dir, "me.png") });
  await p.callMethod("logout");
  assert.ok(!(await p.data("user")));
  assert.ok(
    !(await mini.callWxMethod("getStorageSync", "mendao-session:" + origin)),
  );
  const settingsDb = new DatabaseSync(path.join(dir, "test.sqlite"));
  const setModules = (news, forum, minimalMode = false) =>
    settingsDb
      .prepare(
        "INSERT INTO meta VALUES('miniModules',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
      )
      .run(JSON.stringify({ news, forum, models: true, platforms: true, minimalMode }));
  try {
    setModules(true, true, true);
    await mini.evaluate(() => getApp().refreshSettings());
    p = await homeTab("me");
    assert.ok(!(await p.data("forumEnabled")));
    const tabs = await mini.evaluate(() => {
      const pages = getCurrentPages();
      return pages[pages.length - 1].data.tabs.map((x) => x.id);
    });
    assert.deepEqual(tabs, ["learn", "tools", "me"]);
    assert.equal(
      (await fetch(origin + "/api/mini/community/posts")).status,
      403,
    );
    assert.equal((await fetch(origin + "/api/v1/mini/news")).status, 403);
    assert.equal((await fetch(origin + "/api/community/posts")).status, 200);
    assert.equal((await fetch(origin + "/api/v1/mini/models")).status, 403);
    assert.equal((await fetch(origin + "/api/v1/mini/tools")).status, 403);
    assert.equal((await fetch(origin + "/api/v1/catalog?support=price")).status, 200);
    p = await homeTab("tools");
    assert.ok(!(await p.data("modelsEnabled")));
    assert.ok(!(await p.data("platformsEnabled")));
    const deep = await mini.reLaunch("/pages/detail/index?kind=models&id=test");
    await waitFor(async () => (await mini.currentPage()).path === "pages/home/index");
    setModules(true, true);
    await mini.evaluate(() => getApp().refreshSettings());
    assert.equal(
      (await fetch(origin + "/api/mini/community/posts")).status,
      200,
    );
    console.log(
      "PASS: admin settings hide actual native tab and community entry, block mini APIs, preserve website access",
    );
  } finally {
    settingsDb.close();
  }
  await mini.navigateTo("/pages/about/index");
  assert.equal(errors.length, 0, JSON.stringify(errors));
  console.log("PASS: logout, about, no runtime exceptions");
  }
  console.log("Screenshots: " + dir);
} finally {
  try {
    if (mini) await mini.disconnect();
  } finally {
    server.kill("SIGTERM");
    // Disconnecting the SDK does not close the IDE project. Never leave a
    // temporary app visible after its isolated backend has been stopped.
    for (const [command, target] of [
      ["close", project],
      ["open", canonicalProject],
    ]) {
      const result = spawnSync(cliPath, [command, "--project", target], {
        encoding: "utf8",
        timeout: 20000,
      });
      if (result.status !== 0) {
        console.error(`WeChat cleanup failed: ${command} ${target}`);
        process.exitCode = 1;
      }
    }
  }
}
