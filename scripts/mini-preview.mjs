import automator from "miniprogram-automator";
import path from "node:path";
import { mkdir } from "node:fs/promises";
const mini = await automator.launch({
  cliPath:
    process.env.WECHAT_CLI ||
    "/Applications/wechatwebdevtools.app/Contents/MacOS/cli",
  projectPath: path.resolve("miniprogram"),
  timeout: 60000,
});
mini.on("exception", (e) => console.error("Mini program exception:", e));
await mkdir("test-results/miniprogram", { recursive: true });
try {
  const page = await mini.reLaunch("/pages/news/index");
  await page.waitFor(3000);
  console.log(
    JSON.stringify({
      page: page.path,
      items: (await page.data("items")).length,
      error: await page.data("error"),
    }),
  );
  await mini.screenshot({
    path: path.resolve("test-results/miniprogram/news.png"),
  });
} finally {
  mini.disconnect();
}
