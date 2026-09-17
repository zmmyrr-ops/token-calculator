import { chromium } from "@playwright/test";
import fs from "node:fs";
fs.mkdirSync("docs/screenshots", { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const errors = [];
const results = {
  checkedAt: new Date().toISOString(),
  environment: "macOS local Chrome, localhost, no network throttling",
  measurements: [],
};
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1100 },
  });
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await page.goto("http://127.0.0.1:3000/calculators/tokens", { waitUntil: "networkidle" });
  await page.screenshot({
    path: "docs/screenshots/desktop.png",
    fullPage: true,
  });
  await page.getByLabel("待计算文本").fill("验证本地分词与预算功能。");
  await page
    .getByTestId("token-count")
    .filter({ hasText: /^[\d,]+$/ })
    .waitFor();
  await page.getByText("推理消耗预算", { exact: true }).click();
  await page.getByLabel("使用可编辑的推理预算情景").check();
  await page.screenshot({
    path: "docs/screenshots/desktop-result.png",
    fullPage: true,
  });
  for (const size of [10000, 1048576]) {
    const text = "hello world ".repeat(Math.ceil(size / 12)).slice(0, size);
    const start = performance.now();
    await page.getByLabel("待计算文本").fill(text);
    await page.waitForFunction(
      () =>
        /^\d[\d,]*$/.test(
          document.querySelector("[data-testid=token-count]")?.textContent ||
            "",
        ),
      {},
      { timeout: 30000 },
    );
    results.measurements.push({
      bytes: size,
      elapsedMs: Math.round(performance.now() - start),
      tokens: await page.getByTestId("token-count").textContent(),
    });
  }
  for (const route of [
    "/how-it-works",
    "/privacy",
    "/models/openai--gpt-6-astra",
  ]) {
    await page.goto("http://127.0.0.1:3000" + route, {
      waitUntil: "networkidle",
    });
    results.measurements.push({
      route,
      heading: await page.locator("h1").innerText(),
    });
  }
  const mobile = await browser.newPage({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 1,
  });
  await mobile.goto("http://127.0.0.1:3000/calculators/tokens", { waitUntil: "networkidle" });
  await mobile.screenshot({
    path: "docs/screenshots/mobile.png",
    fullPage: true,
  });
  results.mobileOverflow = await mobile.evaluate(
    () => document.documentElement.scrollWidth > innerWidth,
  );
  results.errors = errors;
  fs.writeFileSync(
    "docs/browser-verification.json",
    JSON.stringify(results, null, 2),
  );
  console.log(JSON.stringify(results, null, 2));
} finally {
  await browser.close();
}
