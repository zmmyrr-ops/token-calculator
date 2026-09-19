import automator from "miniprogram-automator";
import path from "node:path";
import { mkdir } from "node:fs/promises";
const timer = setTimeout(() => {
  console.error("微信模拟器响应超时，请重新打开项目后重试");
  process.exit(1);
}, 60000);
const launch = () =>
  automator.launch({
    cliPath:
      process.env.WECHAT_CLI ||
      "/Applications/wechatwebdevtools.app/Contents/MacOS/cli",
    projectPath: path.resolve("miniprogram"),
    timeout: 60000,
  });
let mini;
try {
  mini = await launch();
} catch (error) {
  if (!/split/.test(error.message)) throw error;
  await new Promise((resolve) => setTimeout(resolve, 3000));
  mini = await launch();
}
mini.on("exception", (e) => console.error("Mini program exception:", e));
await mkdir("test-results/miniprogram", { recursive: true });
try {
  const page = await mini.reLaunch(
    "/pages/home/index?tab=news",
  );
  await page.waitFor(3000);
  console.log(
    JSON.stringify({
      page: page.path,
      items: ((await (await page.$("#active-panel")).data("items")) || []).length,
      error: await (await page.$("#active-panel")).data("error"),
    }),
  );
  await mini.screenshot({
    path: path.resolve(
      "test-results/miniprogram/news.png",
    ),
  });
} finally {
  mini.disconnect();
  clearTimeout(timer);
}
