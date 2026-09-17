# AI 门道微信小程序

AppID：`wx30d01d25ba6ff5c3`。推荐导入本 `miniprogram/` 目录。资讯和论坛完整保留，后台控制是否开放；不再构建删除这些模块的版本。旧命令 `npm run mini:personal` 仅同步同一完整项目到兼容目录。

## 功能与模块开关

- 资讯：图文、搜索分类、分页、详情和来源链接。
- 学习：知识、实践、视频来源与应用场景，收藏与阅读记录。
- 工具：模型/平台查询与详情，复用网站引擎的 Token 费用预算。
- 我的：微信登录、昵称头像、收藏、社区入口；论坛浏览、发帖、回复和删除自己的内容。

管理后台 → **小程序设置** → 分别设置「开放小程序资讯」「开放小程序社区论坛」，点击保存。默认均开放。开关只影响小程序，网站与原数据不变。配置保存在 SQLite `meta.miniModules`，保存记入 `history` 审计；所有用户得到相同配置，不识别审核者。

- `GET /api/v1/mini/settings` 返回公开模块状态。
- 小程序使用自定义 TabBar；资讯关闭时移除资讯 Tab，论坛关闭时移除“我的”社区入口。
- 启动/前台恢复时同步设置，前台每 30 秒同步；当前页面所属模块关闭时切回工具页。
- `/api/v1/mini/news`、`/api/v1/mini/news/:id` 受资讯开关保护；`/api/mini/community/posts`、`replies` 及其详情/写入接口受论坛开关保护，关闭返回 403。
- 账号、学习、工具不受这两个开关影响。网站公开 API 保持原有服务范围；开关不用于保护秘密数据。
- 新闻抓取频率沿用网站配置。视频只提供来源，不内嵌第三方网页或代播。

主体仍为个人。开放功能前应确认当前主体和相应服务类目；提审需如实声明功能，开关不保证过审，也不用于审核后规避平台要求。[微信官方类目说明](https://developers.weixin.qq.com/miniprogram/product/material/)。

## 微信登录与用户来源

小程序只显示微信登录入口，网站继续使用既有账号密码登录。流程：用户点击并同意隐私说明 → `wx.login` 获得一次性 code → `POST /api/mini/community/wechat-login { code }` → 服务端请求微信 `code2Session` → 按 **AppID + OpenID** 查找用户。

- 首次创建真实用户，来源 `miniprogram`，默认昵称「微信用户」、默认头像；可自行修改。服务端生成不可知随机密码，不把密码交给小程序。
- 再次登录使用同一用户，不重复注册。不同 AppID 的相同 OpenID 不视为同一身份。
- 不接受客户端自报 OpenID，不按昵称自动合并已有 PC 账号；PC 账号与微信账号的显式绑定暂未实现。
- 网站新注册来源 `pc`，系统预置账号 `system`；上线前未记录来源的历史账号标为 `legacy`（后台「历史未记录」），避免猜测。
- 来源表示注册入口，不是用户当前设备或最近登录位置；以后从其他入口登录不覆盖注册来源。
- 用户管理支持 PC／小程序／系统预置／历史未记录筛选；可搜索账号、昵称或 OpenID。微信关联可展开查看 AppID、OpenID 和关联时间，仅管理员接口返回。
- `session_key` 不保存、不下发；OpenID 不在公开用户资料、帖子或登录响应中返回。本站生成独立 7 天 Bearer 会话，数据库存摘要并使用 `mini:` 命名空间；退出撤销当前会话，停用账号撤销全部会话。
- 微信登录被停用账号不能绕过禁用状态重新建号。注册、登录与发帖有服务端限流。

数据库 migration **5**：`community_users.source` 新增注册来源，`community_wechat_identities(app_id, openid, user_id, created_at)` 保存关联，`(app_id, openid)` 为联合主键。原论坛数据保留。迁移幂等；发布前按现有流程备份数据库。旧版本的用户插入语句没有列名，不适配新增列；如需回退，应使用兼容此迁移的修复版本，避免直接回到迁移前代码。

[微信登录官方流程](https://developers.weixin.qq.com/miniprogram/dev/framework/open-ability/login.html)。

## 服务端凭据

正式与测试环境分别使用 `/opt/mendao/<环境>/storage/wechat-config.json`，容器中为 `/app/storage/wechat-config.json`，权限 0600、业务用户所有。格式为 `appId`、`appSecret` 两个键。也支持服务端 `WECHAT_APP_ID` / `WECHAT_APP_SECRET` 环境变量，或 `WECHAT_CONFIG_FILE` 指定路径。不得写入小程序、Git、网页配置或聊天。

后台仅显示 AppID 和是否已配置，不返回 AppSecret。微信 API 请求固定官方 HTTPS 地址，10 秒超时，微信原始错误和密钥不直接返回客户端。凭据文件已安全配置到 ECS 测试与生产；发布后仍需通过真实微信登录验收。

## 开发、测试、发布

```sh
npm ci --ignore-scripts
npm run check             # 类型、lint、单元测试、目录和小程序包检查
npm run build             # 网站 + Node API
npm run mini:preview       # 微信开发者工具预览
npm run mini:test          # 独立数据库内的资料、论坛等原生流程测试
```

原生项目无需「构建 npm」。`utils/engine.js` 从 `shared/engine.ts` 构建，改规则后执行 `npm run mini:build`。`config.js` 默认连接 `https://ruming.top`。现有 `/staging` 入口有 Basic Auth，不与 Bearer 混用；原生集成测试使用独立本地接口。

`mini:test` 在 4006 启动独立数据库，用真实测试会话检查资料与论坛界面，不调用正式注册接口。微信 code 换取身份、重复建号与关闭模块由单元测试覆盖，实际微信登录需使用开发者账号验证。测试目录和截图位于被忽略的 `test-results/`。

微信后台需配置 `https://ruming.top` 为 request 合法域名，按实际收集的数据填写隐私保护指引。照片仅在用户主动选择并保存后上传。开发者工具 CLI/HTTP 服务与开发者权限用于自动预览；`WECHAT_CLI` 可覆盖默认 macOS 路径。真机检查登录、拒绝/取消选图、断网、账号停用、关闭模块后旧页面与分享链接行为。

配套 API 按现有 GitHub Actions → ECS 测试 → 生产提升流程发布。小程序代码单独在微信开发者工具生成预览/上传，未自动提交审核或发布。
