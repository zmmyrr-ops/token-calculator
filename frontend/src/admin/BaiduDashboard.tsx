import { useCallback, useEffect, useState } from "react";
import { appPath } from "@/base";
type Status = {
  configured: boolean;
  production: boolean;
  origin: string;
  sitemap: string;
  automatic: boolean;
  batchSize: number;
  dailyLimit: number;
  protocol: string | null;
  busy: boolean;
  total: number;
  pageSize: number;
  counts: Record<string, number>;
  remaining: number | null;
  blocked: string | null;
  items: {
    url: string;
    state: string;
    attempts: number;
    submitted_at: number | null;
    error: string | null;
  }[];
  runs: {
    id: number;
    at: number;
    requested: number;
    accepted: number | null;
    message: string;
  }[];
};
const labels: Record<string, string> = {
  pending: "待提交",
  sending: "提交中",
  sent: "百度已接收",
  failed: "失败",
  uncertain: "需人工核对",
};
async function api(path = "", body?: unknown, method = "POST") {
  const r = await fetch(
    appPath("/api/admin/baidu" + path),
    body === undefined
      ? {}
      : {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
  );
  const d = await r.json();
  if (!r.ok) throw Error(d.error || "操作失败");
  return d;
}
export default function BaiduDashboard() {
  const [data, setData] = useState<Status | null>(null),
    [page, setPage] = useState(1),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const [endpoint, setEndpoint] = useState(""),
    [automatic, setAutomatic] = useState(false),
    [batchSize, setBatchSize] = useState(10),
    [dailyLimit, setDailyLimit] = useState(100);
  const load = useCallback(async () => {
    const d: Status = await api("?page=" + page);
    setData(d);
    return d;
  }, [page]);
  useEffect(() => {
    let active = true;
    api("?page=" + page)
      .then((d: Status) => {
        if (active) setData(d);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [page]);
  useEffect(() => {
    api()
      .then((d: Status) => {
        setAutomatic(d.automatic);
        setBatchSize(d.batchSize);
        setDailyLimit(d.dailyLimit);
      })
      .catch(() => {});
  }, []);
  async function run(
    task: () => Promise<{ message?: string }>,
    success: string,
  ) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const d = await task();
      setMessage(d.message || success);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "操作失败");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel baidu-dashboard">
      <h2>百度普通收录</h2>
      <p className="muted">
        自动推送公开页面，跟踪提交结果。百度接收成功不代表已经收录，最终结果请在百度搜索资源平台查看。
      </p>
      {error && <p role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}
      {data && (
        <>
          {!data.production && (
            <p>当前为测试环境，仅可查看和配置，不会向百度推送。</p>
          )}
          {data.blocked && <p role="alert">{data.blocked}</p>}
          <div className="baidu-summary">
            <span>{data.configured ? "已配置接口" : "尚未配置接口"}</span>
            <span>待提交 {data.counts.pending || 0}</span>
            <span>已接收 {data.counts.sent || 0}</span>
            <span>需核对 {data.counts.uncertain || 0}</span>
            <span>百度今日剩余额度 {data.remaining ?? "未知"}</span>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void run(async () => {
                const d = await api(
                  "/config",
                  { endpoint, automatic, batchSize, dailyLimit },
                  "PUT",
                );
                setEndpoint("");
                return d;
              }, "设置已保存");
            }}
          >
            <h3>API 推送设置</h3>
            <p>
              当前正式站点：<strong>{data.origin}</strong>
              。请从百度该站点的「普通收录 → API 提交」复制完整接口调用地址，www
              与主域不能混用。
            </p>
            <label>
              接口调用地址（含 token）
              <input
                type="password"
                autoComplete="new-password"
                value={endpoint}
                onChange={(e) => setEndpoint(e.target.value)}
                placeholder={
                  data.configured
                    ? "已安全保存；留空保持原值"
                    : "粘贴百度提供的完整接口地址"
                }
                maxLength={1000}
              />
            </label>
            <div className="baidu-settings">
              <label>
                每批链接数
                <input
                  type="number"
                  min={1}
                  max={100}
                  required
                  value={batchSize}
                  onChange={(e) => setBatchSize(Number(e.target.value))}
                />
              </label>
              <label>
                本站每日最多提交次数（按链接计）
                <input
                  type="number"
                  min={1}
                  max={10000}
                  required
                  value={dailyLimit}
                  onChange={(e) => setDailyLimit(Number(e.target.value))}
                />
              </label>
            </div>
            <label className="baidu-toggle">
              <input
                type="checkbox"
                checked={automatic}
                onChange={(e) => setAutomatic(e.target.checked)}
              />
              自动推送新增或更新页面（每 15 分钟检查）
            </label>
            {data.protocol === "http:" && (
              <p className="muted">
                当前使用百度提供的 HTTP
                接口地址。接口凭据仅保存在服务器，不会回传到浏览器。
              </p>
            )}
            <button className="button primary" disabled={busy}>
              保存设置
            </button>
          </form>
          <h3>Sitemap 与手动提交</h3>
          <p>
            <a href={data.sitemap} target="_blank" rel="noreferrer">
              {data.sitemap}
            </a>{" "}
            ·{" "}
            <a href={appPath("/api/admin/baidu/urls.txt")}>下载公开链接清单</a>{" "}
            ·{" "}
            <a
              href="https://ziyuan.baidu.com/linksubmit/index"
              target="_blank"
              rel="noreferrer"
            >
              打开百度普通收录
            </a>
          </p>
          <p className="muted">
            Sitemap
            地址和链接清单可在百度后台手动提交。列表不包含账号、管理后台或资讯外站原文。
          </p>
          <div className="action-row">
            <button
              className="button primary"
              disabled={
                busy || data.busy || !data.configured || !data.production
              }
              onClick={() => void run(() => api("/submit", {}), "提交完成")}
            >
              立即推送一批
            </button>
            <button
              className="button"
              disabled={busy}
              onClick={() =>
                void run(() => api("/retry", {}), "失败与待核对链接已重新排队")
              }
            >
              已核对，重新排队失败链接
            </button>
            <button
              className="button"
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  await load();
                  return {};
                }, "已刷新")
              }
            >
              刷新状态
            </button>
          </div>
          <h3>公开链接队列（{data.total}）</h3>
          <div className="baidu-table">
            <table>
              <thead>
                <tr>
                  <th>页面</th>
                  <th>状态</th>
                  <th>尝试次数</th>
                  <th>最近接收时间</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((r) => (
                  <tr key={r.url}>
                    <td>
                      <a href={r.url} target="_blank" rel="noreferrer">
                        {r.url.replace(data.origin, "")}
                      </a>
                      {r.error && <small>{r.error}</small>}
                    </td>
                    <td>{labels[r.state] || r.state}</td>
                    <td>{r.attempts}</td>
                    <td>
                      {r.submitted_at
                        ? new Date(r.submitted_at).toLocaleString("zh-CN")
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="action-row">
            <button
              className="button"
              disabled={page === 1 || busy}
              onClick={() => setPage(page - 1)}
            >
              上一页
            </button>
            <span>
              {page} / {Math.max(1, Math.ceil(data.total / data.pageSize))}
            </span>
            <button
              className="button"
              disabled={page * data.pageSize >= data.total || busy}
              onClick={() => setPage(page + 1)}
            >
              下一页
            </button>
          </div>
          <h3>最近提交记录</h3>
          {!data.runs.length && <p className="muted">尚无提交记录</p>}
          {data.runs.map((r) => (
            <p key={r.id}>
              {new Date(r.at).toLocaleString("zh-CN")} · 请求 {r.requested} 条 ·{" "}
              {r.message}
            </p>
          ))}
        </>
      )}
    </section>
  );
}
