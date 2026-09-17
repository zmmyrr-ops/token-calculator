import { chromium } from "@playwright/test";
import { writeFile, readFile } from "node:fs/promises";
const browser = await chromium.launch({
  channel: process.env.CI ? "chromium" : "chrome",
});
const page = await browser.newPage({
  viewport: { width: 80, height: 80 },
  deviceScaleFactor: 1,
});
const shapes = {
  news: '<rect x="7" y="5" width="18" height="22" rx="3"/><path d="M11 11h10M11 16h10M11 21h6"/>',
  learn:
    '<path d="M16 8C12 5 7 5 3 7v19c4-2 9-2 13 1 4-3 9-3 13-1V7c-4-2-9-2-13 1v19"/>',
  tools:
    '<rect x="4" y="4" width="9" height="9" rx="2"/><rect x="19" y="4" width="9" height="9" rx="2"/><rect x="4" y="19" width="9" height="9" rx="2"/><path d="M23 19v9m-4-4h9"/>',
  me: '<circle cx="16" cy="10" r="5"/><path d="M6 27v-3a10 10 0 0 1 20 0v3"/>',
};
for (const [name, shape] of Object.entries(shapes))
  for (const [suffix, color] of [
    ["", "#74838a"],
    ["-active", "#0a8c78"],
  ]) {
    await page.setContent(
      `<style>body{margin:0;display:grid;place-items:center;width:80px;height:80px}</style><svg width="58" height="58" viewBox="0 0 32 32" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${shape}</svg>`,
    );
    await page.screenshot({
      path: `miniprogram/assets/${name}${suffix}.png`,
      omitBackground: true,
    });
  }
await browser.close();
const config = JSON.parse(await readFile("miniprogram/app.json", "utf8"));
config.tabBar.list.forEach((x, i) => {
  const n = Object.keys(shapes)[i];
  x.iconPath = `assets/${n}.png`;
  x.selectedIconPath = `assets/${n}-active.png`;
});
await writeFile("miniprogram/app.json", JSON.stringify(config, null, 2) + "\n");
