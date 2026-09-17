# AI 门道 · ruming.top

**懂点 AI，做点不一样的。** 看 AI 资讯，找实用工具，学创作方法。

React 前端 + Node.js 后端，**纯客户端渲染，不使用 SSR / Next.js**。知识、模型、游戏/3D/视频教程、计算工具及真实 AI 资讯共用一个平台主页。

完整交接资料：[项目开发与运维手册](docs/00-项目开发与运维手册.md)，包含数据库、配置、构建测试、发布回滚、备份恢复和排障。

## 项目模块

- `frontend/`：React 19 + Vite 8 + React Router；静态页面、深色科技风、移动端、词元 Worker、收藏与素材预算。
- `backend/`：Node.js 24 + Express 5；内容、模型 API、RSS 采集、资讯搜索/分类/分页、健康检查与 sitemap。
- `shared/`：前后端类型与纯函数（计价、词元设置、收藏校验）。
- `data/`：真实渠道模型快照、覆盖台账、词表校验清单。业务资料不会打包进前端 JS，页面通过 API 加载。

现有 313 个模型条目、42 个厂商、9 篇知识/教程、11 个工具档案、5 个场景；并非所有厂商均完成官方资料审核。私人文本、文件和报价仅在浏览器处理；无模型 API Key 依赖。

## 启动

需要 Node.js 24.x。

```sh
npm ci --ignore-scripts
npm run dev
```

前端 `http://127.0.0.1:3000`，后端 `http://127.0.0.1:4000`。前端代理 `/api`；也可分别执行 `npm run dev:frontend` 和 `npm run dev:backend`。

```sh
npm run check
npm run build
npm start
npm run test:e2e
```

`npm start` 同时运行编译后的 Node 后端与 Vite **本地静态预览**。云端生产使用 [独立容器部署步骤](deploy/README.md)，不使用 Vite 开发/预览服务器。

## 实时资讯

`/news` 展示真实公开 RSS 标题及原文链接：首页也有最新收录入口。已接入量子位、Google AI、NVIDIA、Hugging Face、Microsoft Research。默认每 15 分钟抓取；页面每分钟刷新可见列表。不是秒级推送，不保证全网覆盖。标题保留原文语言，按关键词自动分类。

支持搜索、分类、来源筛选、分页、空态、失败重试、来源健康状态；发布时间与本站收录时间分开。无虚构资讯、热度、摘要或模型生成的替代内容。失败保留历史，来源故障公开展示。

数据保存在 `backend/storage/mendao.sqlite`，以数据库事务写入，最多 3000 条；生产挂载持久卷。单后端实例，停止服务后可运行 `npm run news:sync` 手动采集。手动采集前停止后台，避免并发采集相互覆盖。`NEWS_POLL_MINUTES` 可配置 5–1440 分钟，`NEWS_DATA_FILE` 仅用于旧 JSON 的首次导入。国内 ECS 需验证境外源连通性。

## 文档与边界

- [统一需求](docs/01-需求文档.md)
- [当前技术方案](docs/02-技术文档.md)
- [本轮迁移验收](docs/05-前后端拆分与资讯验收.md)
- [开发清单](TODO.md)
- [教程与场景完善](docs/08-教程与场景完善.md)
- [SEO 优化策略与执行计划](docs/06-SEO优化策略.md)

备案已配置为 `浙ICP备2023017888号-4`。数据库与内容管理后台已接入；用户账号同步、完整厂商审核仍未完成；ECS 已上线，详见下方 CI/CD 部署说明。纯 SPA 需要 JavaScript；HTML 不包含正文，搜索引擎收录与分享预览能力弱于原 SSR，这是本次架构变更的取舍。

## 数据库与管理后台

进入 `/admin` 管理知识/实践教程、工具、应用场景及模型。支持草稿、预览、发布、下架、修改历史恢复、版本冲突检测和数据库备份下载。页面从数据库读取已发布内容，保存草稿不会影响线上。

第一次本地启动自动迁入现有真实资料，生成用户名 `admin` 与随机初始密码，保存到 `backend/storage/admin-initial-credentials.txt`（仅文件所有者可读）。首次登录强制改密，成功后删除初始密码文件。已有数据库不会被种子资料覆盖。

生产首次启动必须设置 `ADMIN_PASSWORD`（12–128 位），并正确配置 `SITE_URL`、HTTPS 和持久卷。详细操作、备份恢复及边界见 [数据库与后台](docs/09-数据库与管理后台.md)。

## 已部署的测试与生产

- 生产：https://ruming.top/ ，后台 /admin，沿用迁入数据库的本地管理员账号。
- 测试：https://ruming.top/staging/ ，需独立访问密码，后台 /staging/admin。测试资料、账号、数据库独立。
- main 推送触发 GitHub CI 与测试部署；Actions 的 Publish production 手动输入已通过测试的完整提交 SHA，提升同一镜像。
- 部署前与每天自动备份 SQLite；保留 14 天，同机备份，OSS 异地备份待配置。
- 详情见 [ECS CI/CD 运维说明](deploy/ecs/README.md)。
