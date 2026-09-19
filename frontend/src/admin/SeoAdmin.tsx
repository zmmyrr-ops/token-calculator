import { useEffect, useState } from "react";
import { appPath } from "../base";
type Row = {
  path: string;
  title: string;
  description: string;
  image: string;
  warnings: string[];
  custom: {
    title: string;
    description: string;
    image: string;
    revision: number;
  };
};
export default function SeoAdmin() {
  const [rows, setRows] = useState<Row[]>([]),
    [selected, setSelected] = useState<Row | null>(null),
    [q, setQ] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  async function load() {
    const r = await fetch(appPath("/api/admin/seo"));
    const d = await r.json();
    if (!r.ok) throw Error(d.error || "请先登录后台");
    setRows(d.items);
    return d.items as Row[];
  }
  useEffect(() => {
    void load().catch((e) => setMessage(e.message));
  }, []);
  async function save() {
    if (!selected) return;
    setBusy(true);
    setMessage("");
    try {
      const r = await fetch(appPath("/api/admin/seo"), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: selected.path, ...selected.custom }),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error || "保存失败");
      const next = await load();
      setSelected(next.find((x) => x.path === selected.path) || null);
      setMessage("已发布，页面元信息与预渲染已更新。");
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="container" style={{ paddingBlock: 32 }}>
      <a href={appPath("/admin")}>← 管理后台</a>
      <h1>SEO 管理</h1>
      <p>
        修改已发布公开页面的搜索标题、摘要和分享图。留空使用页面默认值；私人结果和账号页面不可设置为收录。搜索引擎可能自行调整展示内容，保存不代表立即收录。
      </p>
      <p role="status">{message}</p>
      <label>
        查找页面
        <input
          aria-label="查找SEO页面"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </label>
      <div className="admin-workspace">
        <aside
          className="admin-items"
          style={{ maxHeight: 520, overflowY: "auto" }}
        >
          {rows
            .filter((r) =>
              (r.path + r.title).toLowerCase().includes(q.toLowerCase()),
            )
            .map((r) => (
              <button
                key={r.path}
                disabled={busy}
                onClick={() => setSelected({ ...r, custom: { ...r.custom } })}
              >
                {r.path}
                <br />
                {r.title}
                {r.warnings.length > 0 && (
                  <small> · {r.warnings.join("；")}</small>
                )}
              </button>
            ))}
        </aside>
        {selected ? (
          <section className="panel" style={{ padding: 24, minWidth: 0 }}>
            <h2>{selected.path}</h2>
            <fieldset disabled={busy} className="admin-editor">
              {(["title", "description", "image"] as const).map((key, i) => (
                <label className="admin-field" style={{ marginBottom: 20 }} key={key}>
                  {["搜索标题", "搜索摘要", "分享图片链接"][i]}
                  <textarea
                    aria-label={["搜索标题", "搜索摘要", "分享图片链接"][i]}
                    maxLength={
                      key === "title" ? 120 : key === "description" ? 400 : 2000
                    }
                    value={selected.custom[key]}
                    placeholder={selected[key]}
                    onChange={(e) =>
                      setSelected({
                        ...selected,
                        custom: { ...selected.custom, [key]: e.target.value },
                      })
                    }
                  />
                </label>
              ))}
              <p>
                标题 {selected.custom.title.length}/120 · 摘要{" "}
                {selected.custom.description.length}/400
              </p>
              <h3>文字预览（非搜索结果保证）</h3>
              <strong>{selected.custom.title || selected.title}</strong>
              <p>{selected.custom.description || selected.description}</p>
              {selected.warnings.map((w) => (
                <p key={w}>{w}</p>
              ))}
              <button className="button primary" onClick={() => void save()}>
                保存并发布SEO
              </button>
              <button
                className="button"
                onClick={() =>
                  void load()
                    .then((items) =>
                      setSelected(
                        items.find((x) => x.path === selected.path) || null,
                      ),
                    )
                    .catch((e) => setMessage(e.message))
                }
              >
                重新加载配置
              </button>
            </fieldset>
          </section>
        ) : (
          <p>选择页面开始编辑。</p>
        )}
      </div>
    </main>
  );
}
