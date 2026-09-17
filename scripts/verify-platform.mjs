import { chromium } from "@playwright/test";
import fs from "node:fs";
const routes = [
  "/",
  "/news",
  "/learn",
  "/learn/tokens",
  "/learn/image-to-3d",
  "/tools",
  "/tools/meshy",
  "/scenarios",
  "/scenarios/3d",
  "/tutorials",
  "/models",
  "/models/openai--gpt-6-astra",
  "/calculators",
  "/calculators/tokens",
  "/calculators/media",
  "/compare?ids=meshy,tripo",
  "/saved",
  "/search?q=token",
  "/updates",
  "/about",
  "/privacy",
];
const browser = await chromium.launch({ channel: "chrome" });
const report = {
  checkedAt: new Date().toISOString(),
  environment:
    "macOS local Chrome, Vite static frontend + independent Node API, no network throttling",
  pages: [],
  errors: [],
};
try {
  for (const width of [1440, 375]) {
    const page = await browser.newPage({
      viewport: { width, height: 1000 },
      reducedMotion: "reduce",
    });
    page.on("pageerror", (e) =>
      report.errors.push({ width, error: e.message }),
    );
    for (const route of routes) {
      const response = await page.goto("http://127.0.0.1:3000" + route, {
        waitUntil: "networkidle",
      });
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      );
      const canonical = (await page.locator("link[rel=canonical]").count())
        ? await page.locator("link[rel=canonical]").getAttribute("href")
        : null;
      report.pages.push({
        width,
        route,
        status: response.status(),
        overflow,
        canonical,
      });
      if (
        [
          "/",
          "/calculators/tokens",
          "/news",
          "/tools",
          "/learn/tokens",
          "/calculators/media",
        ].includes(route)
      )
        await page.screenshot({
          path: `docs/screenshots/dark-${route === "/" ? "home" : route.replaceAll("/", "-")}-${width}.png`,
          fullPage: true,
        });
    }
    await page.close();
  }
  fs.writeFileSync(
    "docs/platform-verification.json",
    JSON.stringify(report, null, 2),
  );
  const failures = report.pages.filter((p) => p.status !== 200 || p.overflow);
  console.log(
    JSON.stringify(
      { pages: report.pages.length, failures, errors: report.errors },
      null,
      2,
    ),
  );
  if (failures.length || report.errors.length) process.exitCode = 1;
} finally {
  await browser.close();
}
