# AI 门道微信小程序

AppID：`wx30d01d25ba6ff5c3`。原生 WXML / WXSS / JavaScript，无网页套壳，复用仓库的 Node.js API 和 SQLite 内容、社区账号。品牌沿用透明 Logo 与「看懂 AI，用出门道。」。

## 功能划分

- **资讯**：真实来源、图文列表、分类搜索、分页、下拉刷新、原文链接、收藏与分享。后台抓取频率沿用网站配置；用户刷新只读取现有数据，不触发抓取。
- **学习**：基础知识、实践教程、视频来源、应用场景；原生阅读、准备清单、步骤、验收、常见问题、提示词复制、阅读完成标记。
- **工具**：模型与平台资料、能力边界、来源与价格核验信息、Token 费用预算。预算引擎与网站共用，支持阶梯/时段价格、上下文与输出上限、价格过期检查。未知推理用量会明确提示未计入。
- **我的**：网站账号登录/注册、昵称和头像、改密、退出、设备收藏、阅读进度与社区入口。社区支持分页、搜索、发帖、回复、删除自己的帖子/回复。

网站保留精确分词、大文件输入、完整多模型分析、媒体预算与管理后台。视频和第三方网站提供来源链接复制，本版不嵌入任意外站、不代播视频。暂未实现微信 OpenID 登录、云端收藏同步和社区帖子编辑；账号使用网站账号密码，注册后可设置头像。不需要 AppSecret。

## 开发与导入

在仓库根目录使用 Node.js 24：

```sh
npm ci --ignore-scripts
npm run mini:check
```

微信开发者工具 → 导入项目 → 选择本 `miniprogram` 目录，确认 AppID。无需「构建 npm」，依赖已经打包进 `utils/engine.js`。AppID 不是密钥；AppSecret、上传私钥不可写进此目录。

默认 API 地址是 `https://ruming.top`，在 `config.js` 修改。新接口随本次后端变更提供，需要部署对应后端后才可在正式 API 下使用新详情和小程序账号能力。`utils/engine.js` 为生成文件，修改 `shared/engine.ts` 后执行 `npm run mini:build`，不要手工维护两套计费规则。

本地开发可临时改为 `http://127.0.0.1:4000`，只在开发者工具本地设置中关闭合法域名校验。手机上不能用电脑的 127.0.0.1；真机请用 HTTPS 测试服务。不要提交本地 HTTP 配置。现有 `/staging` 使用 Basic Auth，而小程序登录使用 Bearer；本版不直接支持这个 Basic Auth 测试入口，集成测试采用独立本地数据库。

## 微信后台配置与发布

1. 确认小程序主体与可选服务类目，以及当前微信账号拥有该 AppID 的开发权限。
2. 微信公众平台 → 开发管理 → 开发设置 → **request 合法域名**添加 `https://ruming.top`。本版头像通过 JSON 上传同域 API，不使用 `wx.uploadFile`；新闻图片直接显示原来源 HTTPS 图片，失败时保留可读文字卡片，不通过任意地址代理。
3. 在微信隐私保护指引中如实填写账号、昵称、用户主动选择的照片/头像、社区内容等用途；完成隐私相关接口配置，真机确认选图授权及拒绝授权后的反馈。
4. 确认内容/社区对应的服务类目与所需材料。后台内容维护和社区审核继续使用网站管理后台。
5. 开启合法域名校验，在 iOS、Android 真机验收下述流程；不要把模拟器编译通过当成真机验收通过。
6. 开发者工具「上传」版本，微信后台设为体验版，补充审核资料后提交审核；审核通过再发布。仓库 CI 不会自动提交小程序审核或发布。

官方参考：[网络与合法域名](https://developers.weixin.qq.com/miniprogram/dev/framework/ability/network.html)、[开发者工具自动化](https://developers.weixin.qq.com/miniprogram/dev/devtools/auto/quick-start.html)。

## 接口与会话

公开列表复用 `/api/v1/news`、`/api/v1/library/learn`、`/api/v1/library/tools`、`/api/v1/catalog`。

新增公开读取：

- `GET /api/v1/mini/scenarios`：全部应用场景（轻量目录）。
- `GET /api/v1/mini/{learn|tools|scenarios}/:id`：已发布内容详情。
- `GET /api/v1/mini/news/:id`：单条资讯，未收录/已归档返回 404，分享冷启动也能读取。

小程序账号与论坛复用 `/api/mini/community` 下的 `register`、`login`、`session`、`profile`、`password`、`logout`、`posts`、`replies`。请求格式和校验与网页一致。注册/登录成功返回 `{ user, token }`；其余授权请求发送 `Authorization: Bearer <token>`。

- 小程序会话 7 天，服务端只保存 SHA-256 摘要并使用 `mini:` 命名空间。
- 小程序接口忽略 Cookie，拒绝带浏览器 Origin 的请求。网页接口继续仅接受原 Cookie 会话和合法 Origin；网页登录不会返回 bearer token。
- 退出只撤销当前会话，改密码/管理员禁用账户会撤销所有端的会话。所有端共享注册、登录、发帖限流。
- 客户端令牌按 API 环境分开储存，仅向 `/api/mini/community/` 附加。401 清除令牌，不记录或展示令牌。
- 收藏最多 200 条、本地阅读进度可清除；不承诺与网站或其他设备同步。
- 未增加新数据库表。复用 `community_users`、`community_sessions`、`forum_posts`、`forum_replies`、`community_limits` 与已有内容表。管理后台仍可管理同一批真实账号和帖子。

## 测试与构建

```sh
npm run check          # 类型、lint、单元测试、目录检查、小程序包检查
npm run build          # 网站与 API 构建
npm run mini:preview   # 已登录的本机微信工具：打开真实资讯并保存截图
npm run mini:test      # 微信工具 + 本机 4006：独立数据库全流程测试
```

`mini:preview` 与 `mini:test` 需要微信开发者工具已登录、开启 CLI / HTTP 服务。本机默认路径 `/Applications/wechatwebdevtools.app/Contents/MacOS/cli`，可通过 `WECHAT_CLI` 指定。测试截图和隔离数据库在被忽略的 `test-results/`，测试不创建生产用户/帖子。

`mini:test` 会复制项目到测试目录，临时使用本机接口并关闭该副本的域名检查；正式项目的 `urlCheck` 仍为 `true`。单元测试检查跨端会话隔离、Origin 拒绝、修改密码/退出撤销。包检查验证全部页面、JSON、JS 语法、Tab 图标及源码主包体积；最终大小以微信工具上传结果为准。

验收重点：资讯翻页与空搜索、无图片降级、分享后冷启动、文章/视频/场景详情、收藏清除、推理预算留空/超限/过期价格、账号注册登录、头像选择和取消、改密失效、发帖回复、删除自己的内容及无权删除他人内容、断网与 401。
