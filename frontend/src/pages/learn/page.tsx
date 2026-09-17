import { usePage, Pagination } from "@/usePage";
import type { Content } from "@shared/content";
import Link from "@/Link";
export default function Learn({
  searchParams,
}: {
  searchParams: { q?: string; category?: string; page?: string };
}) {
  const p = searchParams;
  const q = typeof p.q === "string" ? p.q.slice(0, 200) : "";
  const category = typeof p.category === "string" ? p.category : "";
  const { data, page, status } = usePage<Content["knowledge"][number]>(
    "/api/v1/library/learn",
    p,
  );
  const entries = data?.items ?? [];
  return (
    <div className="hub">
      <header className="page-intro">
        <div className="eyebrow">KNOWLEDGE BASE</div>
        <h1>理解 AI，从一个问题开始。</h1>
        <p>概念、方法和实践，连接到你需要的下一步。</p>
      </header>
      <form className="hub-filter">
        <input
          name="q"
          defaultValue={q}
          maxLength={200}
          aria-label="搜索知识文章"
          placeholder="搜索概念或问题"
        />
        <select name="category" aria-label="文章分类" defaultValue={category}>
          <option value="">全部分类</option>
          {(data?.categories ?? []).map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <button className="button primary">筛选</button>
        <Link className="button" href="/learn">
          重置
        </Link>
      </form>
      {status}
      {data && <p className="muted">{data.total} 篇文章</p>}
      <div className="resource-grid">
        {entries.map((a) => (
          <Link
            className="resource-card"
            key={a.slug}
            href={`/learn/${a.slug}`}
          >
            <small>{a.category}</small>
            <h2>{a.title}</h2>
            <p>{a.summary}</p>
            <span>阅读文章 →</span>
          </Link>
        ))}
      </div>
      {data && !entries.length && (
        <p className="empty-panel">
          没有匹配的文章，请尝试更短的关键词或清除分类。
        </p>
      )}
      {data && (
        <Pagination path="/learn" params={p} page={page} total={data.total} />
      )}
    </div>
  );
}
