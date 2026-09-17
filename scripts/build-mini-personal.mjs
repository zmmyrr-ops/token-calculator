// Compatibility command: keep every module; runtime availability is managed by the admin.
import { cp, rm } from "node:fs/promises";
await rm("miniprogram-personal", { recursive: true, force: true });
await cp("miniprogram", "miniprogram-personal", {
  recursive: true,
  filter: (s) => !s.endsWith("project.private.config.json"),
});
console.log(
  "兼容目录已同步完整小程序。资讯和论坛保留，由后台统一控制是否开放；推荐直接导入 miniprogram/。",
);
