import { appPath } from "@/base";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  ArrowUpRight,
  Radio,
  Search,
  Cpu,
  BrainCircuit,
  Blocks,
  FlaskConical,
  Orbit,
} from "lucide-react";
import {
  newsCategories,
  type NewsArticle,
  type NewsResponse,
} from "@shared/news";
import Link from "./Link";
function NewsCover({ item }: { item: NewsArticle }) {
  const [failed, setFailed] = useState(false);
  const icons = {
    硬件算力: Cpu,
    大模型: BrainCircuit,
    软件应用: Blocks,
    研究进展: FlaskConical,
    产业动态: Orbit,
  };
  const Icon = icons[item.category];
  return (
    <div
      className={`news-cover cover-${Object.keys(icons).indexOf(item.category)}`}
    >
      {item.imageUrl && !failed ? (
        <img
          src={item.imageUrl}
          alt=""
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="news-cover-art" aria-label={`${item.category}分类封面`}>
          <div className="cover-orbit" />
          <Icon size={70} strokeWidth={1} />
          <span>AI / {item.category}</span>
          <small>分类封面</small>
        </div>
      )}
      <span className="news-cover-source">{item.sourceName}</span>
    </div>
  );
}
function date(value: string | null) {
  return value
    ? new Date(value).toLocaleString("zh-CN", {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "尚未完成";
}
export function News({ compact = false }: { compact?: boolean }) {
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState<NewsResponse | null>(null),
    [error, setError] = useState(false),
    [loading, setLoading] = useState(true),
    [refresh, setRefresh] = useState(0);
  const q = compact ? "" : params.get("q") || "",
    category = compact ? "" : params.get("category") || "",
    source = compact ? "" : params.get("source") || "",
    page = compact
      ? 1
      : Math.max(1, Math.floor(Number(params.get("page")) || 1));
  const [draft, setDraft] = useState(q);
  useEffect(() => setDraft(q), [q]);
  useEffect(() => {
    const controller = new AbortController();
    const p = new URLSearchParams({
      page: String(page),
      pageSize: compact ? "3" : "18",
      q,
      category,
      source,
    });
    async function load() {
      setLoading(true);
      try {
        const r = await fetch(appPath("/api/v1/news?") + p, {
          signal: controller.signal,
        });
        if (!r.ok) throw Error();
        setData(await r.json());
        setError(false);
      } catch {
        if (!controller.signal.aborted) setError(true);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, 60000);
    return () => {
      controller.abort();
      clearInterval(timer);
    };
  }, [q, category, source, page, refresh, compact]);
  function pageHref(n: number) {
    const next = new URLSearchParams(params);
    if (n === 1) next.delete("page");
    else next.set("page", String(n));
    return "/news" + (next.size ? "?" + next : "");
  }
  function update(values: Record<string, string>) {
    const next = new URLSearchParams(params);
    next.delete("page");
    for (const [k, v] of Object.entries(values)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    setParams(next);
  }
  const cards = data?.items.map((item) => (
    <a
      className="news-card"
      key={item.id}
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
    >
      <NewsCover key={item.imageUrl || "fallback"} item={item} />
      <div className="news-card-body">
        <div className="news-card-meta">
          <span>{item.category}</span>
          <ArrowUpRight size={17} />
        </div>
        <h2>{item.title}</h2>
        <div className="news-card-footer">
          <strong>{item.sourceName}</strong>
          <span>
            {item.publishedAt
              ? "来源发布 " + date(item.publishedAt)
              : "来源未提供有效发布时间"}
          </span>
        </div>
      </div>
    </a>
  ));
  if (compact)
    return (
      <section className="portal-section">
        <div className="portal-section-head">
          <div>
            <div className="eyebrow">LIVE SIGNAL / AI NEWS</div>
            <h2>AI 正在发生什么</h2>
            <p>追踪模型、应用与算力动态，从来源读起。</p>
          </div>
          <Link href="/news">全部资讯 →</Link>
        </div>
        {error ? (
          <p role="alert">
            资讯暂时无法加载。<Link href="/news">查看资讯状态</Link>
          </p>
        ) : !data?.items.length ? (
          <p role="status">
            {loading
              ? "正在连接资讯服务…"
              : "正在等待来源更新，暂无已收录资讯。"}
          </p>
        ) : (
          <div className="news-grid">{cards}</div>
        )}
      </section>
    );
  return (
    <div className="hub news-page">
      <header className="news-hero">
        <div>
          <div className="eyebrow">
            <Radio size={15} /> AI SIGNAL / 持续更新
          </div>
          <h1>读懂 AI 的下一步。</h1>
          <p>大模型、人工智能应用、硬件与研究动态。真实来源，直达原文。</p>
        </div>
        <Cpu size={76} strokeWidth={1} />
      </header>
      <form
        className="news-filters"
        onSubmit={(e) => {
          e.preventDefault();
          update({ q: draft.trim() });
        }}
      >
        <label className="search-box">
          <Search size={18} />
          <input
            aria-label="搜索 AI 资讯"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={200}
            placeholder="搜索模型、芯片、应用…"
          />
        </label>
        <select
          aria-label="资讯来源"
          value={source}
          onChange={(e) => update({ source: e.target.value })}
        >
          <option value="">全部来源</option>
          {data?.sources.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <button className="button primary">搜索资讯</button>
      </form>
      <div className="news-categories" aria-label="资讯分类">
        {newsCategories.map((c) => (
          <button
            className={category === (c === "全部" ? "" : c) ? "active" : ""}
            aria-pressed={category === (c === "全部" ? "" : c)}
            key={c}
            onClick={() => update({ category: c === "全部" ? "" : c })}
          >
            {c}
          </button>
        ))}
      </div>
      {error && (
        <p role="alert" className="alert">
          暂时无法连接资讯服务。{data ? "下方保留上次加载结果。" : ""}
          <button onClick={() => setRefresh((x) => x + 1)}>重试</button>
        </p>
      )}
      {data && (
        <p className="news-result-count" role="status">
          已收录 {data.total} 条匹配资讯
          {data.refreshing ? " · 来源采集中，稍后自动更新" : ""}
        </p>
      )}
      {!data && loading && <p role="status">正在加载真实资讯…</p>}
      {data && !data.items.length && (
        <div className="empty-state">
          <h2>
            {q || category || source ? "没有找到匹配资讯" : "暂未收录资讯"}
          </h2>
          <p>
            {q || category || source
              ? "试试其他关键词或清除筛选。"
              : "采集启动后自动更新，可在下方查看来源状态。"}
          </p>
          {(q || category || source) && (
            <button
              className="button"
              onClick={() => {
                setDraft("");
                setParams({});
              }}
            >
              清除筛选
            </button>
          )}
        </div>
      )}
      <div className="news-grid" aria-busy={loading}>
        {cards}
      </div>
      {data && (data.total > 18 || page > 1) && (
        <nav className="pagination" aria-label="资讯分页">
          {page > 1 ? (
            <Link className="button" href={pageHref(page - 1)}>
              上一页
            </Link>
          ) : (
            <span className="button" aria-disabled="true">
              上一页
            </span>
          )}
          <span>
            第 {page} 页 / {Math.max(1, Math.ceil(data.total / 18))} 页
          </span>
          {page * 18 < data.total ? (
            <Link className="button" href={pageHref(page + 1)}>
              下一页
            </Link>
          ) : (
            <span className="button" aria-disabled="true">
              下一页
            </span>
          )}
        </nav>
      )}
      <details className="news-sources">
        <summary>
          来源与采集状态 ·{" "}
          {data?.sources.filter((s) => s.lastSuccess && !s.error).length || 0}/
          {data?.sources.length || 5} 个来源正常
        </summary>
        <p>
          本站聚合公开 RSS
          标题与原文链接，保留原文语言；分类按标题关键词自动整理，可能存在偏差。定时采集受来源更新频率及网络延迟影响，不保证即时或全网覆盖。内容观点属于原发布方。
        </p>
        <div className="news-source-grid">
          {data?.sources.map((s) => (
            <div key={s.id}>
              <a href={s.url} target="_blank" rel="noreferrer">
                {s.name} ↗
              </a>
              <p>
                {s.language} · 已收录 {s.count} 条
              </p>
              <small>最近成功：{date(s.lastSuccess)}</small>
              <p className={s.error ? "source-error" : "source-ok"}>
                {s.error
                  ? "采集暂不可用：" + s.error
                  : s.lastSuccess
                    ? "连接正常"
                    : "等待首次采集"}
              </p>
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}
export default News;
