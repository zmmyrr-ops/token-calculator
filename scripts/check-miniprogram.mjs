import { readFile, readdir, stat } from "node:fs/promises";
import vm from "node:vm";
import path from "node:path";
const root = path.resolve("miniprogram");
let bytes = 0;
async function walk(dir) {
  for (const name of await readdir(dir)) {
    if (name === "project.private.config.json") continue;
    const f = path.join(dir, name);
    const info = await stat(f);
    if (info.isDirectory()) {
      await walk(f);
      continue;
    }
    bytes += info.size;
    if (f.endsWith(".json")) JSON.parse(await readFile(f, "utf8"));
    if (f.endsWith(".js"))
      new vm.Script(await readFile(f, "utf8"), { filename: f });
  }
}
await walk(root);
const app = JSON.parse(await readFile(path.join(root, "app.json"), "utf8"));
for (const page of app.pages)
  for (const ext of [".js", ".json", ".wxml"])
    await stat(path.join(root, page + ext));
for (const tab of app.tabBar.list) {
  if (!app.pages.includes(tab.pagePath)) throw Error("Missing tab route");
  await stat(path.join(root, tab.iconPath));
  await stat(path.join(root, tab.selectedIconPath));
}
if (bytes > 2 * 1024 * 1024) throw Error("主包超过 2 MiB，请分包");
console.log(
  `PASS: ${app.pages.length} routes, JS/JSON valid, ${(bytes / 1024).toFixed(1)} KiB source package (official upload size pending)`,
);
