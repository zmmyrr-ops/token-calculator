# SEO第一阶段交付

## 目标与边界

让AI画像、AI人格、Token工具的介绍可直接抓取，编辑页面元信息，并把三个工具和原创操作教程相连。保留React客户端＋Node API架构，以公共HTML快照支持初始阅读；不对不同爬虫展示不同内容。Google Search Console账号验证和搜索表现数据接入不在本次范围，代码发布不保证收录或排名。

## 公开页与隐私

/ai-eyes首页此前被整个路径的noindex中间件拦截，现仅首页进入公共预渲染和sitemap。/ai-eyes/runs/*、/ai-eyes/claim、/ai-eyes/s/*仍无索引、no-store、不携带canonical；测试环境全部禁止索引。参数筛选不创建可索引的重复页面。

三个工具介绍共享shared/feature-guides.ts，客户端与快照显示相同使用步骤、FAQ和教程链接；详情教程反向链接工具。没有自动输出全部人格列表或个人测试数据。静态截图来自实际本站页面，不是虚构用户测试结果。

## SEO管理

后台新增SEO管理链接，路径/admin/seo。可搜索已发布公开路径，编辑搜索标题（最大120字符）、摘要（400）、分享图（HTTPS地址或站内图片）。留空回退页面原值；保存即发布，采用revision冲突检查，可重新加载后再编辑。预览是文字预览，不保证搜索引擎按此展示。

GET/PUT /api/admin/seo复用管理员会话与来源校验。仅接受indexablePaths内的公开页面，不允许将账号或画像结果设置为可索引。标题重复、摘要缺失、短文章提示为编辑辅助，不是排名评分。

配置存SQLite meta.seoOverrides，以页面路径为键；history记录管理员、修改值与时间。发布递增contentVersion，触发PublicSnapshots重建；前端按当前路由取得SEO配置。BaiduService指纹含SEO值，因此修改文章元信息也能进入现有更新提交流程。分享图同步og:image和twitter:image（客户端）；服务端输出og:image。

## 教程与维护

一次性迁移seoTutorials20260919新增3篇：
- /learn/ai-portrait-mobile-guide
- /learn/ai-persona-setup-guide
- /learn/token-cost-practical-guide

正文存documents，后续可在内容管理编辑发布；迁移不覆盖人工修改，也不复活已删除内容。教程引用本站功能与Codex官方配置文档，明确趣味画像、统计范围与费用估算限制。截图在frontend/public/guide-images，更新界面时应同步检查。

## 验证清单

- ✅ 114项单元测试：公开/私密路径、SEO保存冲突、输入转义、快照刷新、教程幂等迁移
- ✅ 类型检查、lint、小程序打包检查
- ✅ 44项桌面与移动网页回归（含SEO后台保存、画像首页meta、教程入口）
- ⬜ CI与测试环境部署
- ⬜ 正式环境预渲染、sitemap、私人结果隔离验证
