import { useContent } from "@/content";
import Link from "@/Link";
export default function Updates() {
  const { catalog, modelCount, resources, knowledge } = useContent();
  return (
    <div className="hub">
      <header className="page-intro">
        <div className="eyebrow">DATA & SOURCES</div>
        <h1>知道资料从哪里来，也知道它的边界。</h1>
        <p>以下数字来自站内实际内容，没有访问量、评分或热度模拟。</p>
      </header>
      <div className="resource-grid">
        <article className="resource-card">
          <small>模型目录快照</small>
          <h2>{modelCount} 个模型条目</h2>
          <p>获取时间：{catalog.fetchedAt.slice(0, 10)}</p>
          <p>数据版本：{catalog.version}</p>
          <a href={catalog.source} target="_blank" rel="noreferrer">
            查看渠道来源 ↗
          </a>
        </article>
        <article className="resource-card">
          <small>工具与平台</small>
          <h2>{resources.length} 份资料</h2>
          <p>
            每份档案保留官方来源与查阅日期。功能说明与实际质量验证分开记录。
          </p>
          <Link href="/tools">查看工具资料 →</Link>
        </article>
        <article className="resource-card">
          <small>知识与教程</small>
          <h2>{knowledge.length} 篇内容</h2>
          <p>编辑整理概念和操作方法，关联实际工具与参考文档。</p>
          <Link href="/learn">查看知识库 →</Link>
        </article>
      </div>
      <section className="prose">
        <h2>如何处理变化</h2>
        <p>
          模型渠道报价可能包含时段与用量条件。计算器对过期报价提示复核，并在超过有效范围时停止自动费用推荐。没有明确报价的资料不显示为免费。
        </p>
        <p>
          来源链接不等于效果认证。本站没有发布未经同口径测试的排行榜，也不把收录数量作为全市场已覆盖证明。
        </p>
        <Link href="/how-it-works">查看计算与推荐依据 →</Link>
      </section>
    </div>
  );
}
