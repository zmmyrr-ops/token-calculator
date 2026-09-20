import { trafficLabels, type TrafficSource } from "@shared/traffic";
import { useEffect, useState } from "react";
import { appPath } from "@/base";
import { eventLabels, type AnalyticsSummary } from "@shared/analytics";
const label = (name: string) =>
  eventLabels[name as keyof typeof eventLabels] ?? name;
export default function AnalyticsDashboard() {
  const [device, setDevice] = useState("all");
  const [days, setDays] = useState("7"),
    [revision, setRevision] = useState(0);
  const [data, setData] = useState<AnalyticsSummary | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    const abort = new AbortController();
    setData(null);
    setError("");
    fetch(
      appPath("/api/admin/analytics") + "?days=" + days + "&device=" + device,
      {
        signal: abort.signal,
      },
    )
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw Error(d.error || "统计加载失败");
        if (!abort.signal.aborted) setData(d);
      })
      .catch((e) => {
        if (!abort.signal.aborted) setError(e.message);
      });
    return () => abort.abort();
  }, [days, revision, device]);
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
          <section
            className="panel analytics-section"
            aria-label="流量来源统计"
          >
            <div className="action-row">
              <h2>流量来源</h2>
              <select
                aria-label="来源设备筛选"
                value={device}
                onChange={(e) => setDevice(e.target.value)}
              >
                <option value="all">全部设备</option>
                <option value="desktop">PC 电脑</option>
                <option value="mobile">手机</option>
                <option value="tablet">平板</option>
                <option value="unknown">设备未知</option>
              </select>
            </div>
            <p>记录到 {data.traffic.entries} 次进入 · 设备筛选仅作用于本模块</p>
            <p className="micro">
              按当前标签页统计：站内跳转与刷新不重复计入；30分钟无页面活动后再次进入，或重新从外部链接进入，开始一次新访问。不是独立访客数。设备与搜索来源为浏览器信息推断，UTM链接优先归为推广。
            </p>
            <p className="micro">
              升级前 {data.traffic.legacyPageViews}{" "}
              次页面浏览未采集来源（全部设备）；历史来源无法补算。来源缺失不能确定是直接访问还是搜索进入。
            </p>
            {!data.traffic.entries ? (
              <p className="empty-panel">
                尚未记录到符合条件的进入数据；上线后有新的访问会在这里显示。
              </p>
            ) : (
              <>
                <ol>
                  {data.traffic.sources.map((s) => (
                    <li key={s.source}>
                      <span>
                        {trafficLabels[s.source]}{" "}
                        <small>
                          ({((100 * s.count) / data.traffic.entries).toFixed(1)}
                          %)
                        </small>
                      </span>
                      <strong>{s.count}</strong>
                    </li>
                  ))}
                </ol>
                <h3>首次进入页面</h3>
                <p className="micro">
                  详情页按类型合并，不存具体文章或用户结果标识。
                </p>
                <ol>
                  {data.traffic.landings.map((s) => (
                    <li key={s.source + s.page}>
                      <span>
                        {trafficLabels[s.source]} · <code>{s.page}</code>
                      </span>
                      <strong>{s.count}</strong>
                    </li>
                  ))}
                </ol>
                <details>
                  <summary>查看每日来源趋势</summary>
                  <ul>
                    {data.traffic.daily.map((s) => (
                      <li key={s.day + s.source}>
                        {s.day} · {trafficLabels[s.source as TrafficSource]}：
                        {s.count} 次
                      </li>
                    ))}
                  </ul>
                </details>
              </>
            )}
          </section>
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
            天。记录事件类型、路由类型、来源类别、设备类别和服务器时间，不采集输入正文、查询词、IP
            或访客标识。
          </p>
        </>
      )}
    </section>
  );
}
