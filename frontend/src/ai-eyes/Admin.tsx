import AdminResults from "./AdminResults";
import { useEffect, useState } from "react";
import { appPath } from "../base";
import "./eyes.css";
type Stats = {
  enabled: boolean;
  version: string;
  hash: string;
  layoutVersion: string;
  types: number;
  events: { event: string; count: number }[];
  audit: { at: number; action: string; target: string }[];
  counts: { state: string; count: number }[];
  runs: {
    id: string;
    state: string;
    phase: string;
    created: number;
    expires: number;
    error: string | null;
  }[];
  shares: { id: string; expires: number }[];
  feedback: { value: string; count: number }[];
};
export default function EyesAdmin() {
  const [data, setData] = useState<Stats | null>(null),
    [message, setMessage] = useState(""),
    [saving, setSaving] = useState(false);
  async function request(path = "", method = "GET", body?: unknown) {
    const r = await fetch(appPath("/api/admin/ai-eyes" + path), {
      method,
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    const d = await r.json();
    if (!r.ok) throw Error(d.error || "请先登录后台");
    return d;
  }
  async function load() {
    try {
      setData(await request());
    } catch (e) {
      setMessage((e as Error).message);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  return (
    <main className="eyes-admin">
      <a href={appPath("/admin")}>← 管理后台</a>
      <h1>AI 眼里的你 · 管理</h1>
      <p role="status">{message}</p>
      {data && (
        <>
          <label>
            <input
              type="checkbox"
              checked={data.enabled}
              disabled={saving}
              onChange={(e) => {
                const enabled = e.target.checked;
                setData({ ...data, enabled });
                setSaving(true);
                void request("/settings", "PUT", { enabled })
                  .then(load)
                  .catch(async (e) => {
                    setMessage(e.message);
                    await load();
                  })
                  .finally(() => setSaving(false));
              }}
            />{" "}
            开放新任务（关闭后已创建任务可完成，公开目录保留）
          </label>
          <p>
            原稿：{data.version} · {data.types} 型 · 布局：{data.layoutVersion}
          </p>
          <p style={{ overflowWrap: "anywhere" }}>SHA-256：{data.hash}</p>
          <p>
            原稿不在这里直接改写；更新内容须创建新版本并校验原文。执行包：Python
            3.10+、已知 JSONL 事件格式。删除与过期清理每小时运行；备份保留14天。
          </p>
          <AdminResults />
          <h2>网页任务概况（含 Codex 与豆包 / DeepSeek）</h2>
          <p>
            {data.counts.map((x) => `${x.state}：${x.count}`).join(" / ") ||
              "尚无任务"}
          </p>
          <h2>最近100个网页任务 · 执行状态</h2>
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th>任务</th>
                  <th>状态</th>
                  <th>阶段</th>
                  <th>时间</th>
                  <th>错误</th>
                </tr>
              </thead>
              <tbody>
                {data.runs.map((x) => (
                  <tr key={x.id}>
                    <td>{x.id}</td>
                    <td>{x.state}</td>
                    <td>{x.phase}</td>
                    <td>{new Date(x.created).toLocaleString()}</td>
                    <td>{x.error || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <h2>公开分享</h2>
          {data.shares.map((s) => (
            <p key={s.id}>
              <a href={appPath("/ai-eyes/s/" + s.id)}>{s.id}</a>{" "}
              <button
                className="button"
                onClick={() => {
                  if (confirm("撤销该公开分享？"))
                    void request("/shares/" + s.id, "DELETE")
                      .then(load)
                      .catch((e) => setMessage(e.message));
                }}
              >
                撤销
              </button>
            </p>
          ))}
          <h2>近90天操作次数（非独立人数）</h2>
          {data.events.map((x) => (
            <p key={x.event}>
              {x.event}：{x.count}
            </p>
          ))}
          <h2>管理操作记录</h2>
          {data.audit.map((x, i) => (
            <p key={i}>
              {new Date(x.at).toLocaleString()} · {x.action} · {x.target}
            </p>
          ))}
          <h2>反馈</h2>
          {data.feedback.map((x) => (
            <p key={x.value}>
              {x.value}：{x.count}
            </p>
          ))}
        </>
      )}
    </main>
  );
}
