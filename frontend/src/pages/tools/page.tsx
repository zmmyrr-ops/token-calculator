import ResourceIcon from "@/components/ResourceIcon";
import { resourceCategory } from "@shared/resource-categories";
import { usePage, Pagination } from "@/usePage";
import type { Content } from "@shared/content";
import Link from "@/Link";
export default function Tools({
  searchParams,
}: {
  searchParams: { q?: string; category?: string; page?: string };
}) {
  const p = searchParams;
  const q = typeof p.q === "string" ? p.q.slice(0, 200) : "";
  const category =
    typeof p.category === "string" ? resourceCategory(p.category) : "";
  const { data, page, status } = usePage<Content["resources"][number]>(
    "/api/v1/library/tools",
    p,
  );
  const list = data?.items ?? [];
  return (
    <div className="hub">
      <header className="page-intro">
        <div className="eyebrow">TOOLS & PLATFORMS</div>
        <h1>从想法到作品，找到合适的工具。</h1>
        <p>
          官方资料整理，能力、限制与来源分别列明。价格以实际产品与套餐为准。
        </p>
        <div className="action-row">
          <Link className="button" href="/models">
            查看大模型目录
          </Link>
          <Link className="button" href="/compare">
            对比工具
          </Link>
        </div>
      </header>
      <form className="hub-filter" key={q + category}>
        <input
          name="q"
          defaultValue={q}
          aria-label="搜索工具平台"
          maxLength={200}
          placeholder="名称、功能或任务"
        />
        <select key={category+(data?.categories.join()||"")} name="category" defaultValue={category} aria-label="工具分类">
          <option value="">全部分类</option>
          {(data?.categories ?? []).map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <button className="button primary">筛选</button>
        <Link className="button" href="/tools">
          重置
        </Link>
      </form>
      {data && (
        <nav className="learning-tabs" aria-label="平台分类">
          <Link
            className={!category ? "button primary" : "button"}
            href={q ? "/tools?q=" + encodeURIComponent(q) : "/tools"}
          >
            全部
          </Link>
          {data.categories.map((c) => (
            <Link
              className={category === c ? "button primary" : "button"}
              key={c}
              href={
                "/tools?category=" +
                encodeURIComponent(c) +
                (q ? "&q=" + encodeURIComponent(q) : "")
              }
            >
              {c}
            </Link>
          ))}
        </nav>
      )}
      {status}
      {data && <p className="muted">{data.total} 个工具</p>}
      <div className="resource-grid">
        {list.map((t) => (
          <Link className="resource-card" key={t.id} href={`/tools/${t.id}`}>
            <div className="platform-card-heading">
              <ResourceIcon name={t.name} icon={t.icon} />
              <div>
                <small>{t.category}</small>
                <h2>{t.name}</h2>
              </div>
            </div>
            <div className="platform-tags">
              {t.tags?.map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>
            <p>{t.summary}</p>
            <span>{t.access} · 查看资料 →</span>
          </Link>
        ))}
      </div>
      {data && !list.length && (
        <p className="empty-panel">
          没有匹配工具。可以清除筛选或搜索具体名称。
        </p>
      )}
      {data && (
        <Pagination path="/tools" params={p} page={page} total={data.total} />
      )}
    </div>
  );
}
