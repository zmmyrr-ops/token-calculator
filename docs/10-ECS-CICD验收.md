# ECS CI/CD 验收（2026-09-17）

## 线上入口

- 生产：https://ruming.top/；后台：https://ruming.top/admin。
- 测试：https://ruming.top/staging/；后台：https://ruming.top/staging/admin。
- 测试访问凭据仅保存于本机 backend/storage/cicd/staging-access.txt，未提交 Git。生产管理员沿用迁入的本地数据库账号。
- 原 /nl-online 路由实测返回 200，原静态站目录保留。

## 最终版本

生产与测试均运行 `3fb11fc37cadc9f0a2fb3c682bf2a118794ac5f3`。最终 CI #4 成功：https://github.com/zmmyrr-ops/token-calculator/actions/runs/35188468603；最终生产发布 #2 成功：https://github.com/zmmyrr-ops/token-calculator/actions/runs/35188851124。后续纯文档提交不改变线上应用版本。

## 已实测

- SSH 指纹与用户提供的 ED25519 指纹一致，严格校验主机身份。
- GitHub main 推送自动完成 65 项单元测试、24 项桌面/手机浏览器测试、前后端镜像构建、SSH 镜像导入和测试部署。
- 首次 CI（35187484533）测试、构建和容器启动完成，但部署脚本在运行中被更新，末尾出现 shell EOF 错误，整体失败；后续 CI #2、#3 成功。部署脚本已通过 bash -n 和实际回退演练；后续维护禁止原地覆盖正在运行的脚本，应等待部署锁并原子替换。
- 首次手动生产发布成功：https://github.com/zmmyrr-ops/token-calculator/actions/runs/35187898205。
- 同一对镜像从测试提升至生产，未重新构建；追加镜像 ID 校验，拒绝测试记录与实际镜像不符的版本。
- 两个环境分别检查首页、资讯、教程、计算器和后台入口，覆盖 1280 / 390 像素视口；无页面异常或横向溢出。实际词表加载、计算器输入正常。
- 测试站无访问密码返回 401，页面 noindex；正式站正常公开访问。
- 测试环境故意部署健康检查失败的镜像，确认发布失败、恢复上一版本且健康恢复，演练镜像已清理，生产不参与故障演练。
- 镜像 ID 不匹配的生产发布被拒绝，生产 release.env 未变更。
- 生产数据库使用 SQLite 在线一致性快照由本机迁入，测试单独初始化真实种子资料，不共享账号和数据库。
- 每日备份 timer 已启用，首次两库备份成功并通过 integrity_check；保留 14 天。
- 两个环境业务容器在检查时合计约 140 MiB 内存；ECS 剩余磁盘约 31 GiB（数值随运行变化）。

## 运维边界

- Docker Hub 在 ECS 超时，故采用 GitHub 构建 + SSH 传输镜像，不依赖 ACR。
- 当前自动备份为同机备份，OSS 异地备份尚未接入。
- 现有证书到期 2027-02-13；未修改原签发方式，自动续期待确认。
- 资讯源实测：量子位、Google AI、NVIDIA、Microsoft Research 可刷新；Hugging Face 在 ECS 抓取失败，保留迁入历史，并在来源状态显示错误。
- 测试与生产是同一浏览器 origin，不是针对恶意代码的安全隔离边界，只部署可信提交。
- CI 密钥使用 forced command；实际验证不能执行任意 shell 命令。生产仍需可信仓库维护者手动触发，并非宣称开启了套餐相关的强制多人审批。
- 应用自动回退不自动恢复数据库；破坏性 schema 变更需要独立的迁移与回退设计。

完整操作见 [运行说明](../deploy/ecs/README.md)。
