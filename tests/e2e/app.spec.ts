import { test, expect } from "@playwright/test";
test("published HTML and catalog API are independent", async ({
  page,
  request,
}) => {
  const r = await request.get("/");
  const html = await r.text();
  expect(html).toContain('id="root"');
  expect(html).toMatch(/<h1[\s>]/i);
  expect(html).toContain("data-prerendered");
  await page.goto("/models?q=Claude");
  await expect(
    page.getByRole("heading", { name: "大模型，一处比较。" }),
  ).toBeVisible();
  await expect(page.locator(".catalog-card").first()).toContainText("Claude");
  expect((await request.get("/api/v1/catalog?pageSize=101")).status()).toBe(
    400,
  );
  expect((await request.get("/api/v1/catalog/not-a-model")).status()).toBe(404);
});
test("local calculation, scenario, export and privacy", async ({ page }) => {
  const sent: string[] = [];
  const errors: string[] = [];
  page.on("request", (r) => sent.push(r.url() + " " + (r.postData() || "")));
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/calculators/tokens");
  const text = "PrivateCanary_5917 请帮我翻译这一句话，保留空格。";
  await page.getByLabel("待计算文本").fill(text);
  await expect(page.getByTestId("token-count")).toHaveText(/^[\d,]+$/, {
    timeout: 30000,
  });
  await page.getByText("推理消耗预算", { exact: true }).click();
  await page.getByLabel("使用可编辑的推理预算情景").check();
  await expect(page.locator(".recommend-cost")).toBeVisible();
  await page.getByRole("button", { name: "添加模型" }).click();
  await page.getByLabel("搜索对比模型").fill("claude");
  await expect(page.locator(".picker-results button").first()).toContainText(
    /Claude/i,
  );
  await page.locator(".picker-results button").first().click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出报告" }).click();
  const file = await download;
  const stream = await file.createReadStream();
  let output = "";
  for await (const chunk of stream!) output += chunk.toString();
  expect(JSON.parse(output).text).toBeUndefined();
  expect(output).not.toContain(text);
  expect(sent.some((x) => x.includes("PrivateCanary"))).toBe(false);
  expect(errors).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.reload();
  await expect(page.getByLabel("待计算文本")).toHaveValue("");
});
test("empty, spaces, rapid changes, undo, unsupported import", async ({
  page,
}) => {
  await page.goto("/calculators/tokens");
  await page.getByLabel("待计算文本").fill("  ");
  await expect(page.getByTestId("token-count")).toHaveText(/^[\d,]+$/);
  await page.getByLabel("待计算文本").fill("long text ".repeat(100));
  await page.getByLabel("待计算文本").fill("hello world");
  await expect(page.getByTestId("token-count")).toHaveText("2");
  await page.getByLabel("清空文本").click();
  await expect(page.getByLabel("待计算文本")).toHaveValue("");
  await page.getByLabel("撤销清空").click();
  await expect(page.getByLabel("待计算文本")).toHaveValue("hello world");
  await page.locator("input[type=file]").setInputFiles({
    name: "bad.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("test"),
  });
  await expect(page.locator(".alert[role=alert]")).toContainText("仅支持");
});
test("encoding switch and no-JS fallback", async ({ page, browser }) => {
  await page.goto("/calculators/tokens");
  await page.getByLabel("待计算文本").fill("hello world");
  await expect(page.getByTestId("token-count")).toHaveText("2");
  await page.getByLabel("参考分词编码").selectOption("cl100k_base");
  await expect(page.getByTestId("token-count")).toHaveText("2");
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 390, height: 844 },
  });
  const nojs = await context.newPage();
  await nojs.goto((process.env.TEST_URL || "http://127.0.0.1:3000") + "/");
  await expect(nojs.locator("noscript > div")).toContainText(
    "交互计算、画像生成和账号功能需要启用 JavaScript",
  );
  await page.goto(
    (process.env.TEST_URL || "http://127.0.0.1:3000") + "/models?page=2",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await context.close();
});

test("knowledge homepage, search, article and calculator are connected", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "看懂 AI",
  );
  await expect(page.getByLabel("待计算文本")).toHaveCount(0);
  await page.getByLabel("搜索 AI 门道").fill("token");
  await page.getByRole("button", { name: "搜索", exact: true }).click();
  await page.getByRole("link", { name: /Token 是什么/ }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Token 是什么",
  );
  await page.getByRole("link", { name: "计算词元与费用 →" }).click();
  await expect(page.getByLabel("待计算文本")).toBeVisible();
  await page.getByLabel("待计算文本").fill("hello world");
  await expect(page.getByTestId("token-count")).toHaveText("2");
});

test("official resources, library persistence, workflow and registration", async ({
  page,
}) => {
  await page.goto("/tools/meshy");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Meshy");
  await expect(
    page.getByRole("link", { name: "官方资料 ↗", exact: true }),
  ).toHaveAttribute("href", "https://www.meshy.ai/");
  await page.getByRole("button", { name: "收藏", exact: true }).click();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "已收藏", exact: true }),
  ).toBeVisible();
  await page.goto("/learn/image-to-3d");
  await page.getByRole("checkbox").first().check();
  await page.reload();
  await expect(page.getByRole("checkbox").first()).toBeChecked();
  await page.goto("/saved");
  await expect(
    page.getByRole("link", { name: "Meshy", exact: true }),
  ).toBeVisible();
  const dl = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出备份" }).click();
  const stream = await (await dl).createReadStream();
  let value = "";
  for await (const chunk of stream!) value += chunk.toString();
  expect(JSON.parse(value).items[0].href).toBe("/tools/meshy");
  await page.locator("input[type=file]").setInputFiles({
    name: "invalid.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      '{"version":1,"items":[{"href":"javascript:alert(1)"}],"progress":{}}',
    ),
  });
  await expect(page.getByRole("status")).toContainText("无法导入");
  await page.getByRole("button", { name: "清除全部" }).click();
  await page.getByRole("button", { name: "确认清除" }).click();
  await expect(
    page.getByRole("heading", { name: "把有用的内容留在这里" }),
  ).toBeVisible();
  await page.goto("/models/openai--gpt-5.6-luna");
  await page.getByRole("button", { name: "收藏", exact: true }).click();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "已收藏", exact: true }),
  ).toBeVisible();
  await page.goto("/about");
  await expect(page.getByText("张鸣鸣（个人）")).toBeVisible();
  await expect(
    page.locator("footer").getByRole("link", { name: "浙ICP备2023017888号-4" }),
  ).toHaveAttribute("href", "https://beian.miit.gov.cn/");
});

test("media budget uses only supplied quotes and tool comparison works", async ({
  page,
}) => {
  await page.goto("/calculators/media");
  await expect(page.getByLabel("用量单价")).toHaveValue("");
  await page.getByRole("button", { name: "添加任务" }).click();
  await expect(page.getByText("报价未填写", { exact: true })).toBeVisible();
  await page.getByLabel("产出数量", { exact: true }).fill("6");
  await page.getByLabel("每个计费秒数").fill("5");
  await page.getByLabel("尝试次数", { exact: true }).fill("3");
  await page.getByLabel("用量单价").fill("0.2");
  await expect(page.locator(".budget-number")).toHaveText("¥18.00");
  await expect(page.getByTestId("media-units")).toHaveText("90 秒");
  await page.getByLabel("计费方式", { exact: true }).selectOption("package");
  await page.getByLabel("每包容量", { exact: true }).fill("50");
  await page.getByLabel("每包价格", { exact: true }).fill("12");
  await expect(page.locator(".budget-number")).toHaveText("¥24.00");
  await page.goto("/compare?ids=meshy,tripo");
  await expect(page.getByRole("table")).toContainText("Meshy");
  await expect(page.getByRole("table")).toContainText("Tripo");
  await page.goto("/scenarios/automation");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "办公自动化",
  );
  await expect(page.getByRole("link", { name: /n8n/ })).toBeVisible();
});

test("live news API, filters, source provenance and home entry", async ({
  page,
  request,
}) => {
  const response = await request.get("/api/v1/news?pageSize=3");
  expect(response.status()).toBe(200);
  const data = await response.json();
  expect(data.sources).toHaveLength(5);
  expect((await request.get("/api/v1/news?page=bad")).status()).toBe(400);
  expect((await request.get("/api/v1/news?source=unknown")).status()).toBe(400);
  await page.goto("/news");
  await expect(
    page.getByRole("navigation", { name: "主导航" }).getByRole("link").first(),
  ).toHaveText("AI 实时资讯");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "看懂 AI，用出门道。",
  );
  await expect(page.locator(".news-result-count")).toBeVisible();
  await expect(page.getByText(/来源每.*分钟检查/)).toHaveCount(0);
  await expect(page.locator(".news-status")).toHaveCount(0);
  await expect(page.locator(".news-card").getByText(/本站收录/)).toHaveCount(0);
  if (data.total) {
    await expect(page.locator(".news-cover").first()).toBeVisible();
    await expect(page.locator(".news-card").first()).toHaveAttribute(
      "href",
      /^https?:\/\//,
    );
  }
  await page.getByRole("button", { name: "硬件算力", exact: true }).click();
  await expect(page).toHaveURL(/category=/);
  await page.getByLabel("搜索 AI 资讯").fill("NoResult_712884");
  await page.getByRole("button", { name: "搜索资讯", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "没有找到匹配资讯" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "清除筛选" }).click();
  await expect(page).toHaveURL(/\/news$/);
  await page.locator(".news-sources summary").click();
  await expect(page.locator(".news-source-grid>div")).toHaveCount(5);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.goto("/");
  await expect(page.getByRole("link", { name: "全部资讯 →" })).toBeVisible();
});

test("catalog and search request pages without downloading the full bootstrap", async ({
  page,
  request,
}) => {
  const bootstrap = await (
    await request.get("/api/v1/bootstrap?path=%2Fmodels")
  ).json();
  expect(bootstrap.catalog.models).toHaveLength(0);
  expect(bootstrap.coverage.entries).toHaveLength(0);
  expect(bootstrap.modelCount).toBeGreaterThan(24);
  const first = await (
    await request.get("/api/v1/catalog?page=1&pageSize=24")
  ).json();
  const second = await (
    await request.get("/api/v1/catalog?page=2&pageSize=24")
  ).json();
  expect(first.models).toHaveLength(24);
  expect(second.models).toHaveLength(24);
  expect(
    second.models.some((m: { id: string }) =>
      first.models.some((n: { id: string }) => m.id === n.id),
    ),
  ).toBe(false);
  const detail = await (
    await request.get(
      "/api/v1/bootstrap?path=" +
        encodeURIComponent("/models/" + first.models[0].id),
    )
  ).json();
  expect(detail.catalog.models).toHaveLength(1);
  for (const endpoint of [
    "/api/v1/search",
    "/api/v1/library/tools",
    "/api/v1/library/learn",
  ]) {
    const result = await (await request.get(endpoint + "?pageSize=2")).json();
    expect(result.items).toHaveLength(2);
    expect(result.total).toBeGreaterThan(2);
    expect((await request.get(endpoint + "?pageSize=101")).status()).toBe(400);
    expect(
      (await (await request.get(endpoint + "?q=NotPresentCanary871")).json())
        .total,
    ).toBe(0);
  }
  const requests: string[] = [];
  page.on("request", (r) => requests.push(r.url()));
  await page.goto("/models");
  await expect(page.locator(".catalog-card")).toHaveCount(24);
  await page.getByRole("link", { name: "下一页", exact: true }).click();
  await expect(page).toHaveURL(/page=2/);
  await expect(page.locator(".catalog-card").first()).toContainText(
    second.models[0].name,
  );
  await page.goBack();
  await expect(page.locator(".catalog-card").first()).toContainText(
    first.models[0].name,
  );
  expect(
    requests
      .filter((url) => url.includes("/bootstrap"))
      .every((url) => url.includes("path=")),
  ).toBe(true);
  await page.goto("/search?q=Claude&type=models");
  await expect(page.locator(".resource-card").first()).toContainText("Claude");
});

test("Baidu verification file and brand assets are served as static files", async ({
  page,
  request,
}) => {
  const verify = await request.get("/baidu_verify_codeva-dNjacCJLDs.html");
  expect(verify.status()).toBe(200);
  expect(await verify.text()).toBe("4a4ceceaa8eab27d185ee515776a1873");
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "用出门道",
  );
  await expect(page.locator(".site-mark")).toBeVisible();
  expect((await request.get("/favicon.svg?v=5")).status()).toBe(200);
});

test("public article is readable without JavaScript and unknown routes return 404", async ({
  browser,
  request,
}) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  await page.goto(
    (process.env.TEST_URL || "http://127.0.0.1:3000") + "/learn/tokens",
  );
  await expect(
    page.getByRole("heading", {
      name: "Token 是什么？为什么不等于字数？",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByText("模型处理的是词元序列", { exact: true }),
  ).toBeVisible();
  const response = await request.get("/learn/missing-seo-page");
  expect(response.status()).toBe(404);
  const article = await request.get("/learn/tokens");
  const html = await article.text();
  expect(html).toContain('rel="canonical"');
  expect(html).toContain("application/ld+json");
  await page.goto(
    (process.env.TEST_URL || "http://127.0.0.1:3000") + "/models?page=2",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await context.close();
});
