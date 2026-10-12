# 单台 ECS CI/CD

目标：8.145.52.220，Alibaba Cloud Linux 3 / x86_64 / 2 核 4 GiB。保留宿主 Nginx、原 HTTPS 证书与 /nl-online 路由。生产根路径 /，测试 /staging/；测试站有独立 HTTP Basic 访问密码与 noindex。

## 发布流程

1. PR：GitHub 执行类型、lint、单测、React 构建、真实浏览器测试和两种 Docker 镜像构建，不使用部署密钥。
2. 推送 main：通过以上检查后，对镜像标记完整提交 SHA，经 SSH 传到 ECS，自动部署 staging。
3. 在测试站验收后，打开 GitHub Actions → Publish production → Run workflow，分支 main，填写测试通过的完整 40 位 SHA。生产提升服务器中同一套镜像，不重新构建；发布时核对测试通过记录中的镜像 ID。重新导入同一 SHA 会撤销旧测试记录，必须重新通过测试环境健康检查。
4. 生产与测试都在替换前备份数据库、检查容器健康和 HTTP 接口。更新失败且有上一版本时恢复上一镜像配置。数据库不会被自动还原，避免覆盖上线后的数据；未来破坏性 schema 变更必须另行设计迁移和兼容性。

不用 ACR：GitHub 构建并通过 SSH 推送压缩镜像流，绕开 ECS 无法连接 Docker Hub 的问题。GitHub Actions 用量仍按账号实际额度计算。

## 凭据和权限

仓库 Actions Secrets：ECS_STAGING_KEY、ECS_PRODUCTION_KEY。分别对应两把不同私钥，服务器端使用 restrict + forced command，不能请求任意 Shell。测试密钥只允许镜像导入和测试发布；生产密钥只允许提升通过测试记录的 SHA。无 Docker socket 挂载进业务容器，无公网后端端口。

不要把密钥、app.env、数据库、访问密码提交 Git。部署配置位于 /opt/mendao，环境配置与 storage 分别位于 production 和 staging 目录。初次初始化 root SSH 密钥仅用于服务器维护，不能放入流水线。

GitHub 仓库写权限意味着可修改流水线并调用 Secrets；应只授权可信维护者。当前生产通过手动触发和服务器测试记录限制发布，不宣称启用了 GitHub 套餐相关的强制双人审批。路径部署仍共享浏览器 origin，不构成抵御恶意测试代码的安全边界；只部署可信版本。

## 环境与资源

每环境独立 Compose project、网络、Node API、前端 Nginx、SQLite、会话和日志。当前为单机容器重建更新，会有短暂重启窗口，不是零停机或高可用方案。生产前端仅绑定 127.0.0.1:3100，测试 3101。每后端限制 512 MiB / 0.65 CPU，每前端 96 MiB / 0.25 CPU；正式构建在 GitHub。测试使用 /staging/ API、资源、表单路径和单独 localStorage key、后台 Cookie 名称及路径。

前端镜像包含同一次提交构建的生产与测试两个静态目录，环境间提升的是同一镜像。后台来源校验使用 https://ruming.top，测试 APP_BASE_PATH=/staging。Nginx 将 www.ruming.top 的 HTTP/HTTPS 请求以 308 跳转到 https://ruming.top，并保留路径与查询参数，避免后台登录来源不匹配。修改后需运行 nginx -t 并重载 Nginx；已打开的旧 www 后台页面需要刷新。

## 运维

- 查看：docker compose -p mendao-production --env-file /opt/mendao/production/release.env -f /opt/mendao/compose.yaml ps
- 日志：同上 compose 命令追加 logs --tail=100 backend
- 手动备份：/opt/mendao/backup.sh production
- 定时备份：mendao-backup.timer 每天服务器时间 03:30 左右执行，保留 14 天，使用 SQLite 在线快照并做 integrity_check。
- 备份位置：/opt/mendao/<环境>/storage/backups。当前是同机备份，不等于 OSS 异地备份；待提供 OSS 资源与权限后接入。
- 回退：生产工作流输入以前测试通过且镜像仍保留的 SHA。更早版本必须确认数据库兼容，不要随意手工替换数据库。
- 镜像保留：当前保留已传入镜像供回退；定期检查 docker system df，清理前确认当前和上一发布镜像，不执行 indiscriminate prune。
- Nginx 初始配置备份：/opt/mendao/bootstrap-backup/nginx。
- 原静态站目录 /var/www/html/dist 保留；/nl-online 不被替换。

证书当前到期日 2027-02-13，未擅自修改其签发/续期方式；自动续期需要确认原证书管理渠道。

## 尚需实际验收

CI 成功、测试与生产上线、首次备份与回退结果以实际运行记录为准。本文是运行方式，不能代替验收记录。

## 更新服务器部署脚本

应用流水线不自动覆盖 root 所有的部署控制脚本。维护时先上传到新的临时文件，用 bash -n 校验，等待 /opt/mendao/deploy.lock 锁后以 mv 原子替换；不要直接 scp 覆盖运行中的 .sh 文件。Nginx 修改必须先备份、nginx -t 成功后 reload。

## 2026-10-09 标题发布记录

- 生产版本：`68b752fe13a2d294c052ce868debf3b83e3bb98f`，网页标题统一追加「学习用途」。
- 本地 `npm run check` 及前后端、staging 前端构建通过。本次提交使用 `[skip ci]`，没有运行 GitHub CI。
- 依赖及运行配置未变，基于生产版本 `397ed891259378d2a4c5c266b60872444c319521` 构建增量镜像，仅覆盖编译后的 backend/dist、生产及 staging 的 index.html/assets；上传包 SHA256 为 `9acec6bcd4ecb7f552bebcd399d772cdfc0a419e056bc158e713199cea3a55e8`，服务端校验一致。
- 通过原部署脚本发布 staging，验证首页、学习中心、画像、后台初始 HTML 标题；随后用生产部署密钥提升同一镜像。两环境数据库备份及容器健康检查通过。
- 线上首页、/learn、/ai-eyes 返回 HTTP 200 且标题包含「学习用途」；实际浏览器刷新 /ai-eyes 后标题正确。
- 可通过原生产发布流程回退到上一版本 `397ed891259378d2a4c5c266b60872444c319521`。

## 2026-10-12 磁盘治理与 OSS 公共资源

- 清理前根盘 96%（可用 1.7 GiB）；98 个 Mendao 镜像累计约 14 GB。定向清理 92 个过期标签后降至 61%（可用约 15 GiB），未触碰其他项目、运行容器或数据库。
- `/opt/mendao/cleanup.py` 默认只打印计划，`--apply` 执行。保留生产/测试当前及上一版本、所有容器引用的版本、最新三个版本；仅删除 `mendao-frontend` / `mendao-backend` 的 SHA 标签，不使用 force/prune、不删除卷。失去全部镜像的过期版本同时移除 verified 记录。部署成功后自动执行，使用同一部署锁；清理失败不回滚已健康的应用。
- OSS 使用已有私有 Bucket `tanhaodian-private-wulanchabu`，地域 `oss-cn-wulanchabu`，本站独立前缀 `mendao/public/`。不修改桶 ACL，不访问其他项目对象。
- 136 个公开图片（101,735,491 bytes）迁移：ai-eyes-art、persona-avatars、guide-images、platform-icons。对象键包含 SHA256，上传后逐一下载验证长度和 SHA256；原网页 URL 不变。后端只代理编译期清单中的图片，通过 HTTPS 内网端点签名请求，不向浏览器返回签名或密钥，无桶列表/任意对象访问入口。浏览器缓存 1 小时；失败返回不可缓存的 502。
- 服务端凭据在各环境 storage/oss-public-assets.json，属主 1000:1000、权限 0600，字段 bucket/region/internal/accessKeyId/accessKeySecret。不要提交或输出该文件。复用已有服务器凭据；若后续拆分 RAM 权限，只需授予该前缀读取权限给运行服务，上传工具另用写权限。
- CI 前端镜像指定 `--build-arg OSS_PUBLIC_ASSETS=true`，在复制到最终运行镜像之前排除上述目录，避免生产和 staging 重复打包。默认本地构建仍包含图片，方便离线开发。
- 所有新版镜像在切换容器前运行 verify-public-assets.mjs，检查清单内每个对象的长度和摘要元数据；缺配置、缺对象、权限失败则停止部署。旧回滚镜像没有检查器，使用原本内置图片。

### 更新图片的流程

1. 编辑 frontend/public 对应目录，执行 `node scripts/prepare-public-assets.mjs`，提交资源和 backend/src/content/public-assets.json。
2. **发布前**将该次资源和清单上传到服务器临时目录，执行 `OSS_SDK_PATH=/opt/food-trend-radar/app/node_modules/ali-oss /opt/food-trend-radar/node/bin/node scripts/upload-public-assets.mjs <服务端配置文件> <清单文件> <public目录>`。上传工具依赖已安装的 ali-oss SDK；运行服务不依赖该 SDK。
3. 仅在全部下载摘要验证成功后发布应用。新图未上传时，部署预检会失败并保留旧服务。新增不同资源目录需要同时更新清单生成器、后端允许路径、Nginx 路由和 Docker 排除规则。
4. 不直接删除旧 OSS 对象：回滚版本可能仍引用它们。本地原始美术资源保留在仓库，旧镜像中的资源也保留用于回退；此次增量镜像仍继承旧基础层，完全清洁构建后才会从新镜像底层省去约 200 MB 的重复资源。

### 本次发布验证

- 应用版本 `2d42a24a231784ef9de9815696f50f93c6ec793a`；本地 npm run check 通过（131 项单测）、后端构建通过。本次手动增量发布，提交跳过 GitHub CI。
- 测试环境通过原部署脚本、OSS 136 项预检、136 张图片经网站 HTTP 下载的 SHA256 校验；生产提升同一套镜像。回退版本 `68b752fe13a2d294c052ce868debf3b83e3bb98f` 保留内置资源。
- OSS 签名实现参考：https://www.alibabacloud.com/help/en/oss/developer-reference/include-signatures-in-the-authorization-header 。
