# SEO 首批开发

2026-09-17；保留 React 客户端渲染 + Node.js API，没有启用 SSR 或 SSG。

## 已落地

1. `shared/seo.ts` 统一页面标题、描述、URL 规范化、索引策略和公开路由清单。实体详情从真实知识/工具/模型内容生成，未知实体不索引；清除页面中不起作用的 Next.js metadata。
2. `frontend/src/Seo.tsx` 在首次内容加载与路由切换后更新 title、description、canonical、robots、Open Graph 与 Twitter 标签。避免从 noindex 页面跳到文章后保留错误的排除标记。
3. 正常 `/news?page=2`、`/models?page=2` 使用自身 canonical，`page=1` 合并为目录根 URL。跟踪参数不进入 canonical；普通关键词和筛选结果不索引。
4. 搜索、收藏、动态工具比较和未找到页面使用 noindex。它们不再被 robots 阻挡，以便爬虫能够读取索引指令。
5. 资讯上/下一页使用真实 href，支持发现后续页面，同时保持 React 导航。
6. robots 保留 API 总体限制，但允许 bootstrap/catalog/news 公共渲染请求；所有 API 响应增加 X-Robots-Tag: noindex，不将 JSON 作为独立内容页推广。
7. sitemap 使用共享公开路由集合，测试排除私人页面、重复路径和不存在的实体。

## 验证范围

新增 5 个单测覆盖分页/追踪参数、索引排除、错误路径、真实文章元信息、sitemap 全路由一致性。新增桌面/移动端 SEO 浏览器测试覆盖 robots、API 响应头、sitemap、资讯分页链接与 canonical、搜索到文章的元信息切换、错误页 noindex。原计算器、资讯、收藏、工具与预算回归继续保留。

实际结果：TypeScript、ESLint、目录校验与生产构建通过；57 项单元测试、18 项桌面/移动浏览器测试全部通过。

## 当前边界

页面元信息仍主要由浏览器 JavaScript 写入，不保证不执行 JS 的分享爬虫可获取。初始 HTML 仍是 SPA 外壳，不含文章正文。未知页面目前通过客户端 noindex 处理，Nginx 的真实 HTTP 404 尚未实现。模型目录的编辑质量筛选、结构化数据、SSG、站长平台验证与线上收录情况均未在本轮完成；本地测试不能证明线上已被索引。
