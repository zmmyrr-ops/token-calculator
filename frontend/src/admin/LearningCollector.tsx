import { useEffect, useState } from "react";
import { appPath } from "../base";
type State = {
  enabled: boolean;
  running: boolean;
  intervalHours: number;
  count: number;
  sources: { id: string; name: string; home: string; language: string }[];
  last: null | {
    startedAt: number;
    finishedAt: number;
    added: number;
    sources: {
      id: string;
      added: number;
      skipped: number;
      error: string | null;
    }[];
  };
};
export default function LearningCollector() {
  const [data, setData] = useState<State | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function call(path = "", method = "GET", body?: unknown) {
    const r = await fetch(appPath("/api/admin/learning-collector" + path), {
      method,
      headers: { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const d = await r.json();
    if (!r.ok) throw Error(d.error || "请求失败");
    setData(d);
  }
  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const r = await fetch(appPath("/api/admin/learning-collector"));
        const d = await r.json();
        if (!r.ok) throw Error(d.error || "状态读取失败");
        if (active) setData(d);
      } catch (e) {
        if (active) setError((e as Error).message);
      }
    };
    void load();
    const timer = setInterval(() => void load(), 5000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);
  async function action(path: string, method: string, body?: unknown) {
    setBusy(true);
    setError("");
    try {
      await call(path, method, body);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="admin-panel">
      <h2>学习中心 · 知识采集</h2>
      <p>
        每6小时检查公开订阅源，自动发布有来源的短摘要与阅读索引。全文仍由原站提供，已入库内容不会覆盖或重复发布。
      </p>
      {error && <p role="alert">{error}</p>}
      {data && (
        <>
          <p>
            已收录 {data.count} 条 ·{" "}
            {data.enabled ? "定时采集已开启" : "定时采集已暂停"} ·{" "}
            {data.running ? "正在采集" : "空闲"}
          </p>
          <button
            className="button"
            disabled={busy}
            onClick={() => void action("", "PUT", { enabled: !data.enabled })}
          >
            {data.enabled ? "暂停定时采集" : "开启定时采集"}
          </button>{" "}
          <button
            className="button primary"
            disabled={busy || data.running}
            onClick={() => void action("/refresh", "POST")}
          >
            立即采集
          </button>
          <p>
            {data.last
              ? "上次开始：" +
                new Date(data.last.startedAt).toLocaleString() +
                "；新增 " +
                data.last.added +
                " 条"
              : "尚未执行"}
          </p>
          {data.sources.map((s) => {
            const last = data.last?.sources.find((x) => x.id === s.id);
            return (
              <article className="admin-preview" key={s.id}>
                <h3>
                  <a href={s.home} target="_blank" rel="noreferrer">
                    {s.name}
                  </a>
                </h3>
                <p>
                  {s.language} ·{" "}
                  {last
                    ? last.error
                      ? "采集失败：" + last.error
                      : `新增 ${last.added}，跳过 ${last.skipped}`
                    : "等待采集"}
                </p>
              </article>
            );
          })}
          <p>
            内容可在“内容管理 → 知识与教程”搜索 shared-
            标识或文章标题，编辑或下架。删除后保留去重记录，不会再次抓回。最多保留500条自动索引，达到上限后暂停新增。
          </p>
        </>
      )}
    </section>
  );
}
