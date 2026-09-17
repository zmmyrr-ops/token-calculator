import { useEffect, useState } from "react";
import { appPath } from "@/base";
import { eventLabels, type AnalyticsSummary } from "@shared/analytics";
const label = (name: string) =>
  eventLabels[name as keyof typeof eventLabels] ?? name;
export default function AnalyticsDashboard() {
  const [days, setDays] = useState("7"),
    [revision, setRevision] = useState(0);
  const [data, setData] = useState<AnalyticsSummary | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    const abort = new AbortController();
    setData(null);
    setError("");
    fetch(appPath("/api/admin/analytics") + "?days=" + days, {
      signal: abort.signal,
    })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw Error(d.error || "统计加载失败");
        if (!abort.signal.aborted) setData(d);
      })
      .catch((e) => {
        if (!abort.signal.aborted) setError(e.message);
      });
    return () => abort.abort();
  }, [days, revision]);
  const peak = Math.max(
    1,
    ...(data?.daily.map((d) => d.pageViews + d.interactions) ?? []),
  );
  return (
    <section className="analytics-dashboard">
      <header className="analytics-heading">
        <div>
          <div className="eyebrow">SITE ANALYTICS</div>
          <h1>数据埋点</h1>
          <p>了解用户访问了哪里、使用了哪些入口。</p>
        </div>
        <div className="action-row">
          <select
            aria-label="统计时间范围"
            value={days}
            onChange={(e) => setDays(e.target.value)}
          >
            <option value="7">最近 7 天</option>
            <option value="30">最近 30 天</option>
            <option value="90">最近 90 天</option>
          </select>
          <button className="button" onClick={() => setRevision((x) => x + 1)}>
            刷新统计
          </button>
        </div>
      </header>
      <p className="micro">
        北京时间，包含今天。统计从功能上线后开始；不识别独立访客，不提供
        UV。后台访问不计入统计。数据可能受屏蔽、网络失败和自动化访问影响。
      </p>
      {error && <p role="alert">{error}，请重试或重新登录。</p>}
      {!data && !error && <p role="status">正在加载统计…</p>}
      {data && (
        <>
          <div className="analytics-metrics">
            {[
              ["页面访问 PV", data.pageViews],
              ["入口点击", data.clicks],
              [
                "计算使用",
                data.events.find((e) => e.name === "calculator_used")?.count ??
                  0,
              ],
              ["全部事件", data.totalEvents],
            ].map(([title, value]) => (
              <article className="panel" key={title}>
                <span>{title}</span>
                <strong>{Number(value).toLocaleString()}</strong>
              </article>
            ))}
          </div>
          {data.totalEvents === 0 && (
            <p className="empty-panel">
              这个时间范围还没有收到访问数据。用户访问公开页面后，刷新统计即可查看。
            </p>
          )}
          <section className="panel analytics-section">
            <h2>每日趋势</h2>
            <p className="micro">
              紫色：页面访问 · 青色：交互事件。横向滚动可查看完整日期。
            </p>
            <div
              className="analytics-chart"
              role="img"
              aria-label="每日访问和交互趋势，详细数据见下方列表"
            >
              {data.daily.map((d) => (
                <div
                  className="analytics-day"
                  key={d.day}
                  title={`${d.day}：访问 ${d.pageViews}，交互 ${d.interactions}`}
                >
                  <span>{d.pageViews + d.interactions}</span>
                  <div className="analytics-bar">
                    <i
                      style={{ height: `${(d.interactions / peak) * 120}px` }}
                    />
                    <b style={{ height: `${(d.pageViews / peak) * 120}px` }} />
                  </div>
                  <small>{d.day.slice(5)}</small>
                </div>
              ))}
            </div>
            <details>
              <summary>每日统计明细</summary>
              <ul>
                {data.daily.map((d) => (
                  <li key={d.day}>
                    {d.day}：访问 {d.pageViews} · 交互 {d.interactions}
                  </li>
                ))}
              </ul>
            </details>
          </section>
          <div className="analytics-columns">
            <section className="panel analytics-section">
              <h2>热门页面</h2>
              <p className="micro">按路由类型汇总；详情页合并统计。</p>
              <ol>
                {data.pages.map((p) => (
                  <li key={p.page}>
                    <code>{p.page}</code>
                    <strong>{p.count}</strong>
                  </li>
                ))}
              </ol>
            </section>
            <section className="panel analytics-section">
              <h2>事件分布</h2>
              <ol>
                {data.events.map((e) => (
                  <li key={e.name}>
                    <span>{label(e.name)}</span>
                    <strong>{e.count}</strong>
                  </li>
                ))}
              </ol>
            </section>
            <section className="panel analytics-section">
              <h2>主要入口</h2>
              <ol>
                {data.targets.map((t) => (
                  <li key={t.name + t.target}>
                    <span>
                      {label(t.name)} ·{" "}
                      {t.target === "external"
                        ? "第三方原文/官网"
                        : t.target === "none"
                          ? "当前页面"
                          : t.target}
                    </span>
                    <strong>{t.count}</strong>
                  </li>
                ))}
              </ol>
            </section>
          </div>
          <p className="micro">
            保存最近 90 天、约 10
            万条事件，超过上限清理最早数据，因此高流量时可能不足 90
            天。只记录事件类型、路由类型和服务器时间，不采集输入正文、查询词、IP
            或访客标识。
          </p>
        </>
      )}
    </section>
  );
}
