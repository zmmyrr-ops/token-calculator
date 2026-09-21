import { useEffect, useState } from "react";
import { appPath } from "../base";
type Results = {
  total: number;
  page: number;
  pageSize: number;
  items: {
    id: string;
    channel: string;
    platform: string;
    state: string;
    created: number;
    expires: number;
    personaName: string | null;
    userId: string | null;
    nickname: string | null;
  }[];
};
export default function AdminResults() {
  const [channel, setChannel] = useState("all"),
    [platform, setPlatform] = useState("all"),
    [page, setPage] = useState(1),
    [refresh, setRefresh] = useState(0);
  const [data, setData] = useState<Results | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    const params = new URLSearchParams({
      channel,
      platform,
      page: String(page),
    });
    void fetch(appPath("/api/admin/ai-eyes/results?" + params), {
      signal: controller.signal,
    })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw Error(d.error || "读取失败");
        return d;
      })
      .then((d) => {
        if (!controller.signal.aborted) setData(d);
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [channel, platform, page, refresh]);
  const states: Record<string, string> = {
    waiting: "待执行",
    running: "执行中",
    completed: "已生成",
    failed: "失败",
    expired: "已过期",
  };
  return (
    <section aria-label="画像记录">
      <h2>画像记录 · 全部来源</h2>
      <p>
        网页包含 Codex / Claude Code 任务及豆包 / DeepSeek
        导入；小程序显示每个账号最新一份有效结果。已删除或到期的数据不显示，记录数不代表历史生成次数。不展示原始聊天、行为关键词或匹配说明。
      </p>
      <div className="action-row">
        <label>
          使用入口{" "}
          <select
            aria-label="画像使用入口"
            value={channel}
            onChange={(e) => {
              setChannel(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">全部入口</option>
            <option value="web">网页</option>
            <option value="miniprogram">微信小程序</option>
          </select>
        </label>
        <label>
          分析平台{" "}
          <select
            aria-label="画像分析平台"
            value={platform}
            onChange={(e) => {
              setPlatform(e.target.value);
              setPage(1);
            }}
          >
            {["all", "Codex", "Claude Code", "豆包", "DeepSeek", "其他 AI"].map((v) => (
              <option key={v} value={v}>
                {v === "all" ? "全部平台" : v}
              </option>
            ))}
          </select>
        </label>
        <button
          className="button"
          disabled={loading}
          onClick={() => setRefresh((n) => n + 1)}
        >
          刷新画像记录
        </button>
      </div>
      {error && <p role="alert">{error}</p>}
      {loading ? (
        <p role="status">正在读取画像记录…</p>
      ) : (
        !error &&
        data && (
          <>
            <p>
              共 {data.total} 条记录 · 第 {data.page} /{" "}
              {Math.max(1, Math.ceil(data.total / data.pageSize))} 页
            </p>
            {data.items.length === 0 ? (
              <p>当前筛选下暂无画像记录。</p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table>
                  <thead>
                    <tr>
                      <th>入口 / 平台</th>
                      <th>用户 / 任务</th>
                      <th>画像类型</th>
                      <th>状态</th>
                      <th>生成 / 创建时间</th>
                      <th>到期时间</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((x) => (
                      <tr key={x.channel + ":" + x.id}>
                        <td>
                          {x.channel === "web" ? "网页" : "微信小程序"}
                          <br />
                          {x.platform}
                        </td>
                        <td>
                          {x.channel === "web"
                            ? "匿名网页任务"
                            : x.nickname || "小程序用户"}
                          <br />
                          <small>{x.id}</small>
                        </td>
                        <td>{x.personaName || "—"}</td>
                        <td>{states[x.state] || x.state}</td>
                        <td>{new Date(x.created).toLocaleString()}</td>
                        <td>{new Date(x.expires).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="action-row">
              <button
                className="button"
                disabled={data.page <= 1}
                onClick={() => setPage(data.page - 1)}
              >
                上一页画像
              </button>
              <button
                className="button"
                disabled={data.page * data.pageSize >= data.total}
                onClick={() => setPage(data.page + 1)}
              >
                下一页画像
              </button>
            </div>
          </>
        )
      )}
    </section>
  );
}
