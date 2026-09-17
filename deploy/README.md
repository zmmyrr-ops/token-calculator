# 阿里云 ECS：React 静态前端 + Node.js API

**实际线上已使用 [单台 ECS CI/CD 方案](ecs/README.md)**，包含 /staging/ 测试环境与生产环境。下面保留的是原单环境手动部署方式。

本站不再使用 SSR。前端容器 Nginx 提供静态资源及 SPA fallback，后端容器 Node.js 提供 JSON API 和资讯采集。宿主 Nginx 负责 HTTPS，配置见 `nginx.conf`。该配置仍代理本机 3000，但目标已变为静态前端容器。

1. ECS 安装 Docker Engine、Compose 插件和 Nginx，安全组只开放 80/443（SSH 按管理要求限制）。不要对公网开放 API 4000。
2. 将项目上传至 ECS，复制 `deploy/env.example` 为 `deploy/.env`，核对域名及备案号，并设置至少 12 位的随机 ADMIN_PASSWORD；SITE_URL 必须与访问后台的 HTTPS 域名一致。
3. 在项目根目录执行 `docker compose --env-file deploy/.env -f deploy/compose.yaml up -d --build`。
4. 为 ruming.top 安装有效 TLS 证书，按 `nginx.conf` 配置宿主 Nginx，执行 `nginx -t` 后 reload。
5. 检查 `/api/health/ready`、首页、深层路由刷新、`/news` 来源状态、词元计算器，确认 HTTPS 无跨域或 CSP 报错。

`news-data` 命名卷持久化 SQLite 数据库（内容、账号、会话、历史、资讯）。**不要执行 `docker compose down -v`**，这会删除整个数据库。只运行一个后端实例；增加实例前需迁移共享数据库与独立采集任务。建议定期备份该卷。

无需模型 API Key，也没有模拟资讯兜底。默认每 15 分钟检查 RSS；大陆 ECS 对境外来源的连通性需部署后验证。某源不可达时页面显示来源错误，继续提供已收录真实内容。支持 ETag / Last-Modified，单次抓取 20 秒超时及 5 MiB 限制，每源并行抓取，最多保留 3000 条。修改源列表需重新构建后端。

模型、教程、工具和场景通过 `/admin` 编辑并发布，不需构建。`catalog:sync` 只更新首次建库使用的种子快照，不会覆盖已有数据库。资讯自动写入 SQLite。备份恢复见 `docs/09-数据库与管理后台.md`。

原单环境 compose 未作为本次线上部署入口；实际 ECS 使用 deploy/ecs/compose.yaml，已完成部署与验收。
