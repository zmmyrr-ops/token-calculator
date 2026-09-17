# AI 门道：选定的品牌图标

2026-09-17，用户选定 Image 模型生成的干净版「智能之门」。使用内置 imagegen 生成，本次部署直接复用该位图，没有以手工 SVG 替换图案。

原始图：`ai-door-approved-source.png`（1254 × 1254）。生成方向：保留薄荷绿门框、底部斜笔画、中心实心圆点和紫色开启门扇；清除颗粒、杂色和光晕，深蓝背景，无文字。

适配：仅中心裁切为 970 × 970，保留全部图形，再缩放输出；不修改造型和颜色。页面图标使用 `frontend/public/brand/ai-door-v4.png`（256 × 256）；另提供 32px favicon、180px Apple touch icon、多尺寸 ICO。兼容旧路径的 favicon.svg 内嵌同一 PNG，避免旧入口仍展示之前的字母图案。

使用位置：全站导航、首页轨道中心、资讯页右侧品牌视觉、浏览器标签、手机收藏。入口路径带 v4 或版本化文件名，更新浏览器缓存。

本地验证：构建通过；1280px、390px 下首页和资讯页图标加载、实际图片尺寸、页面无横向溢出、favicon 和 touch icon 响应验证通过。截图见同目录。

发布：GitHub Actions `35209370392` 全部通过，测试环境通过 1280px/390px 图标专项验收；版本 `fcc5547517dcdedce99dbd618fefd46a095ef100` 晋级正式环境，数据库备份和容器健康检查通过。

## 透明背景修订（v5）

用户要求去掉黑色底。使用内置 imagegen 对已批准图案做 background-extraction：仅移除外部及门内的深蓝背景，保留薄荷绿门框、斜线、圆点和紫色门扇；输出真实 alpha 透明 PNG，不增加阴影、光晕或底板。源文件为 `ai-door-transparent-source.png`，适配图片为 `frontend/public/brand/ai-door-v5.png`。favicon/ICO/手机收藏图标同步更新为 v5。首页和资讯页的 CSS 背景、边框、阴影底板一并移除。

验证：图片外侧与门内像素 alpha 均为 0；浅色和深色背景视觉检查；1280px/390px 首页与资讯页加载、无溢出检查通过。
