import { chromium } from "@playwright/test";
import { writeFile, readFile } from "node:fs/promises";
const root = process.cwd();
const catalog = JSON.parse(
  await readFile(root + "/data/ai-eyes/catalog.json", "utf8"),
);
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage();
await page.goto(process.env.TEST_URL || "http://127.0.0.1:3017/ai-eyes");
await page.getByRole("heading", { level: 1 }).waitFor();
for (const p of catalog.items.filter(
  (p) =>
    !process.env.ONLY_IDS || process.env.ONLY_IDS.split(",").includes(p.id),
)) {
  const data = await page.evaluate(async (p) => {
    const { exportEyes } = await import("/src/ai-eyes/export.ts");
    const images = await exportEyes(
      p,
      "我",
      "https://ruming.top/ai-eyes",
      "cover",
      () => {},
    );
    if (images.length !== 1) throw Error("Expected exactly one cover");
    const image = await createImageBitmap(images[0]);
    if (image.width !== 1080 || image.height !== 1440)
      throw Error("Invalid dimensions");
    image.close();
    const bytes = new Uint8Array(await images[0].arrayBuffer());
    let str = "";
    for (const byte of bytes) str += String.fromCharCode(byte);
    return btoa(str);
  }, p);
  await writeFile(
    root + "/frontend/public/ai-eyes-art/" + p.id + "-cover-v4.png",
    Buffer.from(data, "base64"),
  );
  console.log(p.id, "single 1080×1440 cover verified");
}
await browser.close();
