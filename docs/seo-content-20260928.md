# 知识文章与搜索优化实施记录（2026-09-28）

## 本次交付

- ✅ 新增《AI 输出 JSON 总报错？用 Python 做字段校验与失败重试》：字段契约、可运行校验器、异常输入和重试策略。
- ✅ 新增《AI 写完代码怎么验收？从复现 Bug 到回归测试的完整流程》：需求模板、Python 实现、四项单元测试、页面验收和发布记录模板。
- ✅ 新增《知识库答非所问怎么办？用小型评测集排查 RAG 的检索与引用》：四类样本、空白记录模板、错误定位、引用与权限验收。
- ✅ 文章写入 SQLite 内容管理，保留可编辑能力；一次性追加，不覆盖后台草稿或人工修改，后续删除也不会再次生成。
- ✅ 相关阅读优先选择正文直接关联、反向引用及同主题文章；不再给所有文章推荐同一组工具教程。
- ✅ React 与公开 HTML 共用 Article / BreadcrumbList 结构化数据，补充 headline、mainEntityOfPage、publisher、语言、分类与面包屑。
- ✅ 初始 HTML 补齐 og:type、Twitter 卡片与分享图；沿用唯一 canonical、参数页 noindex、私人结果隔离。
- ✅ 新文章沿用现有 sitemap 和百度候选队列，不另建重复提交服务。

本轮没有把全站旧文章全部重写，也不把外部资料导读伪装成完整站内课程。新增文章的示例与模板为本站编写的教学材料；来源说明 API 或评测原则，不声称第三方背书或已取得真实业务效果。

## 内容路线与搜索意图

以已有工具和实际读者任务为中心，每个问题维护一个主要页面，避免把同一答案拆成多篇关键词变体。

1. Token 与费用：保留 `/learn/tokens` 解释概念，`/learn/token-cost-practical-guide` 处理算账步骤，`/calculators/tokens` 负责计算。下一次补充应来自实际渠道用量差异，注明数据来源和报价时间。
2. AI 编程可靠性：以 `/learn/ai-code-acceptance-workshop` 为验收入口，连接 JSON 校验与已有游戏工程实战。下一步收集真实但已脱敏的报错复现，不编造“实测结果”。
3. RAG：`/learn/rag-starter` 负责建立入门概念，新评测篇负责定位失败。下一步补同一份公开资料的检索过程截图、失败样本和修改前后记录。
4. AI 人格、AI 眼里的你：保留现有产品教程，定期对照实际界面校正入口、权限和数据范围。不要复制别人的聊天或承诺能读取任意平台历史。
5. 游戏、3D、视频：继续完善已有实战的可下载工程、运行条件和人工验收。外部视频注明原作者、语言、版本与外链，不擅自搬运视频。

选题顺序依据站内搜索无结果词、文章反馈以及站长平台查询表现；未取得数据前不宣称某个词有确定搜索量。

## Google 执行策略

- 维持全用户一致的公开 HTML，确保正文、来源与内链无需 JavaScript 也能阅读。
- 在已验证的 ruming.top Search Console 资源中提交 `/sitemap.xml`；抽查新增的三条文章 URL。提交不等于收录。
- 按 URL 观察展示量、点击量、CTR、平均排名。只在有足够展示的页面上调整标题；先读实际搜索词，再判断是否满足意图。
- 标题说明任务和交付成果；摘要说明谁适合、能学到什么，不堆叠同义关键词。
- 结构化数据只描述真实可见内容：未知发布日期不编造、不每天刷新；无真实作者信息时不造专家身份；不造评分、评论或 FAQ 富结果承诺。
- 公开导读保持原文入口，未来优先充实确有价值的导读；批量抓取与扩写不作为流量增长手段。

## 百度执行策略

- 保持主域 `https://ruming.top`、站点验证域和提交地址一致；www 重定向沿用现有部署配置。
- 后台查看普通收录推送状态：新增文章是否进入队列、接口是否接受、是否达到配额、是否有重试错误。接口接受只代表提交成功，不代表已索引。
- 核对百度侧实际抓取页面的 HTTP 状态和正文；抓取失败先修访问问题，不重复加关键词。
- 既有文章保留 slug，合并或迁移内容时提供明确重定向，避免失效链接。
- 各站长后台需使用站点所有者账号；本轮没有代替用户登录、提交或读取任何未经核实的搜索表现数据。

## 维护节奏与验收

首周检查三条新页面正文、代码复制、移动端、canonical、结构化数据与 sitemap；抽检资料来源。随后每周查看有展示无点击、点击后快速离开的文章，先修标题与正文不匹配、步骤缺失和错误链接。每月选少量高价值文章补充可复现案例，记录真实修改内容，不仅刷新时间戳。

成功指标包括自然搜索进入学习中心的访问、文章到配套工具的点击、收藏及实际完成实践的反馈。站内来源埋点只表示可识别 referrer/UTM 的访问，缺失来源不能假设为 Google 或百度；关键词、展示量与排名以站长平台为准。

后续待办：
- ⬜ 在站长平台核验新增页面抓取与索引状态。
- ⬜ 收集实际查询与无结果搜索，排下一批教程。
- ⬜ 补一份公开资料 RAG 实验记录，保留失败案例。
- ⬜ 为已有游戏实战补一次实际版本复查和运行证据。

## 验证与发布边界

代码与正文在本地工作区实现。正式部署后，后端启动会执行 `learningDepth20260928` 一次性导入；发布前沿用现有数据库备份流程。回退镜像不会删除已导入文章，如要下线请在后台撤回对应内容。

文章源码：`backend/src/content/learning-depth.ts`；迁移：`backend/src/learning-depth.ts`。这份文件记录开发验收，不代表已部署或承诺搜索排名。

## 官方参考

- Google 以用户为先的内容：https://developers.google.com/search/docs/fundamentals/creating-helpful-content
- Google 搜索基础：https://developers.google.com/search/docs/essentials
- Article 结构化数据：https://developers.google.com/search/docs/appearance/structured-data/article
- 面包屑：https://developers.google.com/search/docs/appearance/structured-data/breadcrumb
- Python JSON 中文文档：https://docs.python.org/zh-cn/3/library/json.html
- Python unittest 中文文档：https://docs.python.org/zh-cn/3/library/unittest.html
- Claude 评测方法：https://platform.claude.com/docs/en/test-and-evaluate/develop-tests

### 本地验收结果

- ✅ `npm run check`：128 项单元测试、类型检查、lint、模型目录与小程序静态检查通过。
- ✅ `npm run build`：前后端构建完成；构建器仍提示既有大体积 chunk 和依赖中的 use client 指令，不阻断构建。
- ✅ Python 示例实跑：JSON 正常输入通过，5 组非法数据被拒绝；订单示例 4 项 unittest 通过。
- ✅ 学习中心与 SEO 桌面/手机回归：6 项既有检查通过，2 项新增文章检查通过。新检查最初用文本断言读取 script 得到空值，改为直接读取 textContent 后通过。
- ✅ 新文章无需 JavaScript 可读、canonical、sitemap、相关文章以及站内跳转验证通过。
- ✅ 正式部署与线上正文、结构化数据、站点地图、搜索和健康接口核验通过；搜索引擎实际收录仍待观察。

本地预览使用独立测试库 `/tmp/mendao-seo-20260928/mendao.sqlite`，不修改生产数据；前端端口 3300、API 端口 4300。


### 正式发布记录

2026-09-28：发布版本 `3b424127adf5c702ecf144d86be5d947c497ca37`。
[CI 36376641213](https://github.com/zmmyrr-ops/token-calculator/actions/runs/36376641213) 完成全量检查、浏览器回归和测试环境部署。通过现有受限生产 SSH 发布入口提升同一 SHA 镜像，发布前数据库备份成功，生产前后端均健康。

三篇正式文章 HTTP 200、公开 HTML、Article / BreadcrumbList、canonical、index 指令与 sitemap 均通过核验。正式学习中心搜索可找到新文章，浏览器实际显示正文、代码块、目录和相关文章。没有把推送或部署成功描述为已被 Google / 百度收录。

### 学习中心时间排序（2026-09-28）

学习中心统一按本站首次发布时间倒序。发布时间取内容审计中的首次 import / import_publish / publish 记录，不采用草稿更新时间；原文发布日期仍独立标注。相同时间以 slug 稳定排序，无历史发布时间的数据排在最后。排序在过滤、分页前完成，公开 HTML 列表使用同一比较规则。文章卡片展示本站发布日期，按北京时间格式化。不会为了调整顺序重写原文日期或覆盖后台内容。
