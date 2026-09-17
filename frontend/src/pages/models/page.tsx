import { appPath } from "@/base";
import { useContent } from "@/content";
import Link from "@/Link";
import { Search, ArrowUpRight } from "lucide-react";

export default function ModelsPage({
  searchParams,
}: {
  searchParams: Record<string, string | undefined>;
}) {
  const { catalog, models, filterModels, coverage } = useContent();

  const params = searchParams;
  const filtered = filterModels(params);
  const page = Math.max(
    1,
    Math.min(Math.ceil(filtered.length / 24) || 1, Number(params.page) || 1),
  );
  const list = filtered.slice((page - 1) * 24, page * 24);
  const vendors = [
    ...new Map(models.map((m) => [m.provider, m.providerName])).entries(),
  ].sort((a, b) => a[1].localeCompare(b[1]));
  function pageLink(n: number) {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(params))
      if (v && k !== "page") p.set(k, v);
    p.set("page", String(n));
    return "/models?" + p;
  }
  return (
    <>
      <section className="page-intro">
        <div className="eyebrow">MODEL DIRECTORY</div>
        <h1>大模型，一处比较。</h1>
        <p>
          {models.length} 个模型条目 · {vendors.length} 个厂商 · 目录获取日期{" "}
          {catalog.fetchedAt.slice(0, 10)}
          。报价为标注渠道基础价，不是订阅产品费用。
        </p>
      </section>
      <form className="catalog-filters" action={appPath("/models")}>
        <label className="search-box">
          <Search size={18} />
          <input
            name="q"
            aria-label="搜索模型目录"
            defaultValue={params.q}
            maxLength={200}
            placeholder="搜索模型、中文厂商或 API ID…"
          />
        </label>
        <select
          name="provider"
          aria-label="筛选厂商"
          defaultValue={params.provider ?? ""}
        >
          <option value="">全部厂商</option>
          {vendors.map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>
        <select
          name="access"
          aria-label="访问方式"
          defaultValue={params.access ?? ""}
        >
          <option value="">全部访问方式</option>
          <option value="api">API</option>
          <option value="web-only">网页专属</option>
          <option value="weights">开放权重</option>
          <option value="restricted">申请访问</option>
        </select>
        <select
          name="support"
          aria-label="能力筛选"
          defaultValue={params.support ?? ""}
        >
          <option value="">全部支持状态</option>
          <option value="price">有渠道报价</option>
          <option value="reasoning">支持推理</option>
          <option value="info">仅资料</option>
        </select>
        <button className="button primary" type="submit">
          筛选
        </button>
      </form>
      <p className="micro">
        找到 {filtered.length}{" "}
        个条目。所有型号均可选择参考编码；尚未把参考编码核验为各型号的官方计数。
      </p>
      <div className="catalog-grid">
        {list.map((m) => (
          <article className="catalog-card panel" key={m.id}>
            <div className="micro">{m.providerName}</div>
            <h2>
              <Link href={`/models/${m.id}`}>{m.name}</Link>
            </h2>
            <p>{m.canonicalId}</p>
            <div className="catalog-meta">
              <span className="badge neutral">
                {m.context
                  ? Math.round(m.context / 1024) + "K 上下文"
                  : "容量待核验"}
              </span>
              <span className="badge neutral">
                {m.reasoning ? "支持推理" : "标准模式"}
              </span>
              <span className="badge neutral">
                {m.access === "api"
                  ? "API"
                  : m.access === "weights"
                    ? "开放权重"
                    : m.access === "web-only"
                      ? "网页专属"
                      : "受限访问"}
              </span>
            </div>
            <div className="catalog-card-footer">
              <span>
                {m.price
                  ? `$${Number(m.price.input).toLocaleString()} 输入 / 百万`
                  : "无可核验单价"}
              </span>
              <Link href={`/models/${m.id}`}>
                查看详情 <ArrowUpRight size={13} />
              </Link>
            </div>
          </article>
        ))}
      </div>
      {!list.length && (
        <div className="empty-state panel">
          没有匹配的模型。<Link href="/models">重置筛选</Link>
        </div>
      )}
      <nav className="pagination" aria-label="模型分页">
        {page > 1 && (
          <Link className="button outline" href={pageLink(page - 1)}>
            上一页
          </Link>
        )}
        <span className="micro">
          {page} / {Math.ceil(filtered.length / 24) || 1}
        </span>
        {page * 24 < filtered.length && (
          <Link className="button outline" href={pageLink(page + 1)}>
            下一页
          </Link>
        )}
      </nav>
      <details className="panel" style={{ padding: 20, marginBottom: 30 }}>
        <summary>覆盖范围与已知缺口</summary>
        <p className="micro">
          来源：公开渠道模型清单及补充官方资料。共检查 {coverage.sourceCount}{" "}
          条渠道记录；排除批量/免费重复别名、非文本输出及匿名条目。收录不代表每个型号都已实测。
        </p>
        <p className="micro">
          仍待逐家审核：{coverage.missingManufacturerAudits.join("、")}
          。本目录不宣称已经穷尽全球型号。维护者应每周复核目录，新发布发现后两个工作日内更新。
        </p>
        <Link href="/how-it-works">查看计数和费用的支持边界</Link>
      </details>
    </>
  );
}
