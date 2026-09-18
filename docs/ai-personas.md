# AI 人格合集：功能、维护与发布

前台入口 `/personas`，首页和主导航均有入口。管理入口 `/admin/personas`，使用既有管理员账号及会话。

## 已实现

- 12 个原创人格，三类筛选、关键词搜索、本机收藏。
- 统一问题的人工编写示例，明确不是真实模型生成。
- 三档强度；本次对话、Codex Skill、项目默认、全局默认四种导出。
- 完整提示词预览、剪切板复制、Markdown 下载、可复现配置分享链接、SVG 分享卡片。
- 页内安装、验证、卸载、恢复教程；`frontend/public/guides/ai-personas.md` 为下载版。
- 后台编辑名称、图标、简介、表达规则、示例和发布状态；乐观锁避免覆盖他人修改。
- SEO 标题、简介、站点地图、静态可读简介；复制/下载埋点不包含聊天正文。

## 数据与接口

SQLite `personas`：`id` 主键、`data` JSON、`revision` 整数、`updated_at` 时间。

首次启动通过 `INSERT OR IGNORE` 写入官方人格；之后部署不会覆盖管理员编辑或重新发布已下架条目。整体 SQLite 备份包含此表。内容种子在 `backend/src/personas.ts`，校验与导出规则在 `shared/personas.ts`。

- GET `/api/v1/personas`：只返回已发布人格。
- GET `/api/admin/personas`：管理员读取全部内容。
- PUT `/api/admin/personas/:id`：提交 `{data, revision}`，需管理员登录并通过既有来源校验。ID 不可修改；版本冲突 409；修改事务同时写入 `history`。

没有接入生成模型或额外模型密钥，没有虚构用户数、热度或下载量。示例是编辑内容；强度控制导出指令，不会实时重写示例台词。生成的人格文件需用户主动安装，网站不会直接改本地配置。

## 维护

后台点击“AI 人格管理”，选择条目后编辑，保存立即生效。下架从列表移除；旧分享链接显示不可用提示并提供其他已发布人格。收藏仅存浏览器，过期 ID 不展示。

编辑时注意：名称与简介要与规则一致；台词回答同一个示例问题；不得把示例描述成模型实测。默认配置只影响沟通风格，不应覆盖用户项目规范和权限。

## 验证与发布

`npm run check`：类型、lint、单元测试和既有小程序检查。
`npx playwright test tests/e2e/personas.spec.ts tests/e2e/admin.spec.ts`：桌面/移动浏览器的配置、下载、分享还原、收藏和后台编辑。

按现有 main → GitHub Actions → staging → production 同镜像提升流程发布。没有修改小程序功能入口；该模块是网站独立页面。

## 本次发布记录

2026-09-18：版本 `610233f473069a7843171190b0ee7f3882631dff` 已部署测试和生产环境。
CI：https://github.com/zmmyrr-ops/token-calculator/actions/runs/35302501271 。
96 项单元测试通过；桌面/移动端的人格与后台流程验证通过。发布前已自动备份数据库。
