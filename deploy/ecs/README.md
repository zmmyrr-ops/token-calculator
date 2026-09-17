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

每环境独立 Compose project、网络、Node API、前端 Nginx、SQLite、会话和日志。生产前端仅绑定 127.0.0.1:3100，测试 3101。每后端限制 512 MiB / 0.65 CPU，每前端 96 MiB / 0.25 CPU；正式构建在 GitHub。测试使用 /staging/ API、资源、表单路径和单独 localStorage key、后台 Cookie 名称及路径。

前端镜像包含同一次提交构建的生产与测试两个静态目录，环境间提升的是同一镜像。后台来源校验使用 https://ruming.top，测试 APP_BASE_PATH=/staging。www 如需后台登录，应使用 ruming.top 规范域名。

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
