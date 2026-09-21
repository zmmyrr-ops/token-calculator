import { useEffect, useState } from "react";
import { appPath } from "../base";
import { personaAvatar, type Persona } from "@shared/personas";
import "../globals.css";
import "../platform.css";
import "./admin.css";
type Row = Persona & { revision: number };
export default function PersonasAdmin() {
  const [items, setItems] = useState<Row[]>([]),
    [draft, setDraft] = useState<Row | null>(null),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [dirty, setDirty] = useState(false),
    [showArchived, setShowArchived] = useState(false);
  async function load() {
    const r = await fetch(appPath("/api/admin/personas"));
    if (!r.ok)
      throw Error(r.status === 401 ? "请先登录管理后台。" : "读取人格失败");
    const d = await r.json();
    setItems(d.items);
    return d.items as Row[];
  }
  useEffect(() => {
    void load().catch((e) => setMessage(e.message));
  }, []);
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  async function save() {
    if (!draft) return;
    setBusy(true);
    setMessage("");
    try {
      const { revision, ...rest } = draft;
      const data = Object.fromEntries(
        Object.entries(rest).filter(([k]) => k !== "updatedAt"),
      );
      const r = await fetch(appPath(`/api/admin/personas/${draft.id}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data, revision }),
      });
      if (!r.ok) {
        const d = await r.json();
        throw Error(d.error || "保存失败");
      }
      const rows = await load();
      setDraft(rows.find((x) => x.id === draft.id) || null);
      setDirty(false);
      setMessage("已保存，发布状态立即生效。");
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="container" style={{ padding: "40px 20px" }}>
      <a href={appPath("/admin")}>← 管理后台</a>
      <h1>AI 人格管理</h1>
      <p>
        编辑官方人格、示例台词和发布状态。示例台词为人工编写；保存后立即更新线上内容，并记录审计历史。
      </p>
      <p role="status">{message}</p>
      <label>
        <input
          type="checkbox"
          checked={showArchived}
          onChange={(e) => setShowArchived(e.target.checked)}
        />{" "}
        显示旧版归档人格
      </label>
      <div className="action-row">
        {items
          .filter((p) => showArchived || !!p.voice)
          .map((p) => (
            <button
              disabled={busy}
              key={p.id}
              className={draft?.id === p.id ? "button primary" : "button"}
              onClick={() => {
                if (dirty && !confirm("放弃未保存的修改？")) return;
                setDraft(p);
                setDirty(false);
                setMessage("");
              }}
            >
              <img
                src={appPath(personaAvatar(p.id))}
                alt=""
                width={36}
                height={36}
                style={{ borderRadius: 10 }}
              />{" "}
              {p.name}
              {p.published ? "" : "（已下架）"}
            </button>
          ))}
      </div>
      {draft && (
        <form
          className="panel"
          style={{ marginTop: 24, padding: 24, maxWidth: 850 }}
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <fieldset disabled={busy} style={{ border: 0, padding: 0 }}>
            {(
              [
                "name",
                "tagline",
                "description",
                ...(draft.voice ? [] : ["example"]),
              ] as ("name" | "tagline" | "description" | "example")[]
            ).map((k) => (
              <label
                key={k}
                style={{ display: "grid", gap: 6, marginBottom: 16 }}
              >
                {
                  {
                    name: "名称",
                    icon: "图标字符",
                    tagline: "一句话介绍",
                    description: "用途说明",
                    example:
                      "风格示例（统一问题：计划写了很多却不想动，怎么办？）",
                  }[k]
                }
                <textarea
                  aria-label={
                    {
                      name: "名称",
                      icon: "图标字符",
                      tagline: "一句话介绍",
                      description: "用途说明",
                      example: "风格示例",
                    }[k]
                  }
                  required
                  value={draft[k]}
                  maxLength={
                    k === "name"
                      ? 30
                      : k === "tagline"
                        ? 100
                        : k === "description"
                          ? 500
                          : 600
                  }
                  rows={k === "example" ? 4 : 2}
                  onChange={(e) => {
                    setDraft({ ...draft, [k]: e.target.value });
                    setDirty(true);
                  }}
                />
              </label>
            ))}
            {draft.voice && (
              <section className="persona-admin-voice">
                <h2>V2 角色与示例</h2>
                {(["style", "defaultAddress"] as const).map((field) => (
                  <label
                    key={field}
                    style={{ display: "grid", marginBottom: 16 }}
                  >
                    {field === "style" ? "风格标签" : "默认称呼"}
                    <input
                      aria-label={field === "style" ? "风格标签" : "默认称呼"}
                      maxLength={field === "style" ? 20 : 12}
                      value={draft.voice![field]}
                      onChange={(e) => {
                        setDraft({
                          ...draft,
                          voice: { ...draft.voice!, [field]: e.target.value },
                        });
                        setDirty(true);
                      }}
                    />
                  </label>
                ))}
                {(["light", "balanced", "strong"] as const).map((level) => (
                  <details key={level}>
                    <summary>
                      {
                        { light: "轻度", balanced: "默认", strong: "强烈" }[
                          level
                        ]
                      }{" "}
                      · 强度规则与四个场景
                    </summary>
                    <label style={{ display: "grid", margin: "14px 0" }}>
                      档位名称
                      <input
                        aria-label={`${level}档位名称`}
                        maxLength={20}
                        required
                        value={draft.voice!.labels[level]}
                        onChange={(e) => {
                          setDraft({
                            ...draft,
                            voice: {
                              ...draft.voice!,
                              labels: {
                                ...draft.voice!.labels,
                                [level]: e.target.value,
                              },
                            },
                          });
                          setDirty(true);
                        }}
                      />
                    </label>
                    <label style={{ display: "grid", margin: "14px 0" }}>
                      执行要求
                      <textarea
                        aria-label={`${level}执行要求`}
                        rows={3}
                        maxLength={600}
                        required
                        value={draft.voice!.directions[level]}
                        onChange={(e) => {
                          setDraft({
                            ...draft,
                            voice: {
                              ...draft.voice!,
                              directions: {
                                ...draft.voice!.directions,
                                [level]: e.target.value,
                              },
                            },
                          });
                          setDirty(true);
                        }}
                      />
                    </label>
                    {draft.voice!.scenes.map((scene, i) => (
                      <label
                        key={scene.topic}
                        style={{ display: "grid", margin: "14px 0" }}
                      >
                        {scene.topic}：{scene.question}
                        <textarea
                          aria-label={`${level}${scene.topic}示例`}
                          rows={4}
                          maxLength={600}
                          required
                          value={scene.answers[level]}
                          onChange={(e) => {
                            setDraft({
                              ...draft,
                              voice: {
                                ...draft.voice!,
                                scenes: draft.voice!.scenes.map((x, j) =>
                                  i === j
                                    ? {
                                        ...x,
                                        answers: {
                                          ...x.answers,
                                          [level]: e.target.value,
                                        },
                                      }
                                    : x,
                                ),
                              },
                            });
                            setDirty(true);
                          }}
                        />
                      </label>
                    ))}
                  </details>
                ))}
                <p>
                  使用 {"{{称呼}}"}{" "}
                  作为称呼占位符，预览和导出会同步替换。下方连续对话展示默认强度。
                </p>
                {draft.voice.dialogues.map((dialogue, i) => (
                  <details key={i}>
                    <summary>{dialogue.title}</summary>
                    {dialogue.turns.map((turn, j) => (
                      <div key={j}>
                        {(["user", "reply"] as const).map((field) => (
                          <label
                            key={field}
                            style={{ display: "grid", margin: "14px 0" }}
                          >
                            {field === "user" ? "用户" : "角色回复"}
                            <textarea
                              aria-label={`对话${i + 1}第${j + 1}轮${field}`}
                              rows={field === "user" ? 2 : 3}
                              maxLength={field === "user" ? 300 : 600}
                              required
                              value={turn[field]}
                              onChange={(e) => {
                                setDraft({
                                  ...draft,
                                  voice: {
                                    ...draft.voice!,
                                    dialogues: draft.voice!.dialogues.map(
                                      (d, di) =>
                                        di === i
                                          ? {
                                              ...d,
                                              turns: d.turns.map((t, ti) =>
                                                ti === j
                                                  ? {
                                                      ...t,
                                                      [field]: e.target.value,
                                                    }
                                                  : t,
                                              ),
                                            }
                                          : d,
                                    ),
                                  },
                                });
                                setDirty(true);
                              }}
                            />
                          </label>
                        ))}
                      </div>
                    ))}
                  </details>
                ))}
              </section>
            )}
            <label style={{ display: "grid", gap: 6, marginBottom: 20 }}>
              完整人格设定与多场景示范
              <textarea
                aria-label="完整人格设定"
                rows={24}
                minLength={100}
                maxLength={12000}
                required
                value={draft.instructions || ""}
                onChange={(e) => {
                  setDraft({ ...draft, instructions: e.target.value });
                  setDirty(true);
                }}
              />
            </label>
            <label>
              分类
              <select
                value={draft.category}
                onChange={(e) => {
                  setDraft({
                    ...draft,
                    category: e.target.value as Persona["category"],
                  });
                  setDirty(true);
                }}
              >
                {["温暖陪伴", "鲜明个性", "高效协作"].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </label>
            <label style={{ display: "grid", gap: 6, margin: "16px 0" }}>
              表达规则（每行一条，2–8 条）
              <textarea
                rows={5}
                required
                value={draft.traits.join("\n")}
                onChange={(e) => {
                  setDraft({ ...draft, traits: e.target.value.split("\n") });
                  setDirty(true);
                }}
              />
            </label>
            <label>
              <input
                type="checkbox"
                checked={draft.published}
                onChange={(e) => {
                  setDraft({ ...draft, published: e.target.checked });
                  setDirty(true);
                }}
              />{" "}
              在前台发布
            </label>
            <p>
              <button className="button primary" disabled={!dirty}>
                {busy ? "保存中…" : "保存并更新"}
              </button>
            </p>
          </fieldset>
        </form>
      )}
    </main>
  );
}
