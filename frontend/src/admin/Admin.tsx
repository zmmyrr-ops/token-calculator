import LearningCollector from "./LearningCollector";
import MiniSettings from "./MiniSettings";
import BaiduDashboard from "./BaiduDashboard";
import CommunityModeration from "./CommunityModeration";
import AnalyticsDashboard from "./AnalyticsDashboard";
import { appPath } from "@/base";
import { useEffect, useState } from "react";
import { kinds, kindLabels, type Kind, type DocumentRecord } from "@shared/cms";
import { Fields, blankEntity, blankPractice } from "./Editor";
import "../globals.css";
import "../platform.css";
import "./admin.css";
type User = { username: string; mustChange: boolean };
type Row = { id: string; title: string; status: string; revision: number };
type History = { seq: number; action: string; actor: string; at: string };
async function api(path: string, method = "GET", body?: unknown) {
  const r = await fetch(appPath("/api/admin") + path, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await r.json();
  if (!r.ok) throw Error(data.error || "请求失败");
  return data;
}
export default function Admin() {
  const [learning, setLearning] = useState(false);
  const [mini, setMini] = useState(false);
  const [baidu, setBaidu] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [community, setCommunity] = useState<false | "posts" | "users">(false);
  const [user, setUser] = useState<User | null>(null),
    [loading, setLoading] = useState(true),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const [kind, setKind] = useState<Kind>("knowledge"),
    [rows, setRows] = useState<Row[]>([]),
    [q, setQ] = useState(""),
    [filter, setFilter] = useState("");
  const [doc, setDoc] = useState<DocumentRecord | null>(null),
    [draft, setDraft] = useState<Record<string, unknown> | null>(null),
    [dirty, setDirty] = useState(false),
    [history, setHistory] = useState<History[]>([]),
    [preview, setPreview] = useState(false),
    [passwordMode, setPasswordMode] = useState(false);
  const [username, setUsername] = useState("admin"),
    [password, setPassword] = useState(""),
    [newPassword, setNewPassword] = useState("");
  useEffect(() => {
    document.title = "内容管理 - AI 门道";
    let meta = document.querySelector('meta[name="robots"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "robots");
      document.head.append(meta);
    }
    meta.setAttribute("content", "noindex, nofollow");
    api("/session")
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    if (user && !user.mustChange)
      api("/documents/" + kind)
        .then(setRows)
        .catch((e) => setMessage(e.message));
  }, [kind, user]);
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
  const accept = (d: DocumentRecord) => {
    setDoc(d);
    setDraft(d.draft as unknown as Record<string, unknown>);
    setDirty(false);
    setPreview(false);
  };
  const reload = async () => {
    setRows(await api("/documents/" + kind));
    if (doc) setHistory(await api(`/documents/${kind}/${doc.id}/history`));
  };
  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setMessage("");
    try {
      await fn();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "操作失败");
    } finally {
      setBusy(false);
    }
  }
  async function open(id: string) {
    if (dirty && !confirm("当前编辑尚未保存，确定放弃吗？")) return;
    await run(async () => {
      accept(await api(`/documents/${kind}/${id}`));
      setHistory(await api(`/documents/${kind}/${id}/history`));
    });
  }
  async function save() {
    if (!draft) return;
    await run(async () => {
      const d = doc
        ? await api(`/documents/${kind}/${doc.id}`, "PUT", {
            data: draft,
            revision: doc.revision,
          })
        : await api("/documents/" + kind, "POST", draft);
      accept(d);
      setRows(await api("/documents/" + kind));
      setHistory(await api(`/documents/${kind}/${d.id}/history`));
      setMessage("草稿已保存，线上版本保持不变。");
    });
  }
  async function publication(action: "publish" | "unpublish") {
    if (!doc || dirty) return;
    if (
      !confirm(
        action === "publish"
          ? "确认将已保存草稿发布到网站？"
          : "确认撤下这条内容？被其他内容引用时会阻止撤下。",
      )
    )
      return;
    await run(async () => {
      accept(
        await api(`/documents/${kind}/${doc.id}/${action}`, "POST", {
          revision: doc.revision,
        }),
      );
      await reload();
      setMessage(
        action === "publish"
          ? "发布成功，刷新网站即可看到更新。"
          : "已撤下，草稿仍然保留。",
      );
    });
  }
  if (loading)
    return (
      <main className="admin-login">
        <h1>AI 门道管理后台</h1>
        <p>正在检查登录状态…</p>
      </main>
    );
  if (!user)
    return (
      <main className="admin-login">
        <div className="eyebrow">AI MENDAO / EDITOR</div>
        <h1>管理你的知识站。</h1>
        <p>登录后编辑、保存草稿并发布。初始账号见服务器初始化凭据文件。</p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void run(async () => {
              setUser(await api("/login", "POST", { username, password }));
              setPassword("");
            });
          }}
        >
          <label>
            用户名
            <input
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </label>
          <label>
            密码
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              maxLength={128}
            />
          </label>
          <button className="button primary" disabled={busy}>
            登录后台
          </button>
        </form>
        <p role="alert">{message}</p>
        <a href={appPath("/")}>返回网站</a>
      </main>
    );
  if (user.mustChange || passwordMode)
    return (
      <main className="admin-login">
        <h1>{user.mustChange ? "首次登录，请修改密码" : "修改管理员密码"}</h1>
        <p>新密码至少 12 位。修改后所有登录会话失效，请重新登录。</p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void run(async () => {
              await api("/password", "POST", {
                current: password,
                password: newPassword,
              });
              setUser(null);
              setPassword("");
              setNewPassword("");
              setPasswordMode(false);
              setMessage("密码已更新，请使用新密码登录。");
            });
          }}
        >
          <label>
            当前密码
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <label>
            新密码
            <input
              type="password"
              autoComplete="new-password"
              required
              minLength={12}
              maxLength={128}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </label>
          <button className="button primary" disabled={busy}>
            更新密码
          </button>
        </form>
        <p role="alert">{message}</p>
        <button
          className="button"
          onClick={() =>
            void run(async () => {
              await api("/logout", "POST");
              setUser(null);
              setPasswordMode(false);
            })
          }
        >
          退出登录
        </button>
      </main>
    );
  const publicPath = doc
    ? `/${{ knowledge: "learn", resource: "tools", scenario: "scenarios", model: "models" }[kind]}/${doc.id}`
    : "/";
  return (
    <div className="admin-shell">
      <header className="admin-header">
        <div>
          <strong>AI 门道</strong>
          <span>内容管理 · {user.username}</span>
        </div>
        <nav>
          <a href={appPath("/")} target="_blank" rel="noreferrer">
            查看网站 ↗
          </a>
          <button onClick={() => setPasswordMode(true)}>修改密码</button>
          <button
            disabled={busy}
            onClick={() =>
              void run(async () => {
                const r = await fetch(appPath("/api/admin/backup"), {
                  method: "POST",
                });
                if (!r.ok) {
                  const d = await r.json();
                  throw Error(d.error);
                }
                const u = URL.createObjectURL(await r.blob());
                const a = document.createElement("a");
                a.href = u;
                a.download =
                  "ai-mendao-" +
                  new Date().toISOString().slice(0, 10) +
                  ".sqlite";
                a.click();
                setTimeout(() => URL.revokeObjectURL(u), 1000);
                setMessage(
                  "数据库备份已下载，包含账号与会话数据，请妥善保管。",
                );
              })
            }
          >
            下载数据库备份
          </button>
          <button
            onClick={() =>
              void run(async () => {
                if (dirty && !confirm("放弃未保存的编辑并退出？")) return;
                await api("/logout", "POST");
                setUser(null);
                setDoc(null);
                setDraft(null);
                setDirty(false);
              })
            }
          >
            退出
          </button>
        </nav>
      </header>
      <nav className="analytics-switch" aria-label="后台模块">
        <button
          className={
            !analytics && !community && !baidu && !mini && !learning
              ? "button primary"
              : "button"
          }
          onClick={() => {
            setLearning(false);
            setMini(false);
            setAnalytics(false);
            setBaidu(false);
            setCommunity(false);
          }}
        >
          内容管理
        </button>
        <button
          className={analytics ? "button primary" : "button"}
          onClick={() => {
            setLearning(false);
            setMini(false);
            setAnalytics(true);
            setBaidu(false);
            setCommunity(false);
          }}
        >
          数据埋点
        </button>
        <button
          className={community === "posts" ? "button primary" : "button"}
          onClick={() => {
            setLearning(false);
            setMini(false);
            setCommunity("posts");
            setAnalytics(false);
            setBaidu(false);
          }}
        >
          社区管理
        </button>
        <button
          className={community === "users" ? "button primary" : "button"}
          onClick={() => {
            setLearning(false);
            setMini(false);
            setCommunity("users");
            setAnalytics(false);
            setBaidu(false);
          }}
        >
          用户管理
        </button>
        <button
          className={baidu ? "button primary" : "button"}
          onClick={() => {
            setLearning(false);
            setMini(false);
            setBaidu(true);
            setAnalytics(false);
            setCommunity(false);
          }}
        >
          百度收录
        </button>
        <button
          className={mini ? "button primary" : "button"}
          onClick={() => {
            setLearning(false);
            setMini(true);
            setBaidu(false);
            setAnalytics(false);
            setCommunity(false);
          }}
        >
          小程序设置
        </button>
        <button className={learning ? "button primary" : "button"} onClick={() => {setLearning(true);setMini(false);setBaidu(false);setAnalytics(false);setCommunity(false);}}>知识采集</button>
        <a className="button" href={appPath("/admin/personas")}>AI 人格管理</a>
        <a className="button" href={appPath("/admin/ai-eyes")}>AI 眼里的你</a>
      </nav>
      {learning && <LearningCollector />}
      {mini && <MiniSettings />}
      {baidu && <BaiduDashboard />}
      {community && (
        <CommunityModeration
          key={community}
          usersOnly={community === "users"}
        />
      )}
      {analytics && <AnalyticsDashboard />}
      <div
        className="admin-workspace"
        style={
          analytics || community || baidu || mini || learning
            ? { display: "none" }
            : undefined
        }
      >
        <aside className="admin-sidebar">
          <div className="admin-tabs">
            {kinds.map((k) => (
              <button
                key={k}
                className={kind === k ? "active" : ""}
                onClick={() => {
                  if (dirty && !confirm("放弃当前未保存的编辑？")) return;
                  setKind(k);
                  setDoc(null);
                  setDraft(null);
                  setDirty(false);
                  setMessage("");
                  setQ("");
                }}
              >
                {kindLabels[k]}
              </button>
            ))}
          </div>
          <input
            aria-label="搜索后台内容"
            placeholder="搜索标题或标识"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <select
            aria-label="筛选发布状态"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="">全部状态</option>
            <option value="draft">草稿/已撤下</option>
            <option value="changed">有未发布修改</option>
            <option value="published">已发布</option>
          </select>
          <button
            className="button primary"
            onClick={() => {
              if (dirty && !confirm("放弃未保存的编辑？")) return;
              setDoc(null);
              setDraft(blankEntity(kind));
              setDirty(true);
              setHistory([]);
              setPreview(false);
              setMessage("");
            }}
          >
            新增{kindLabels[kind]}
          </button>
          <p>{rows.length} 条内容</p>
          <div className="admin-items">
            {rows
              .filter(
                (r) =>
                  (!q ||
                    `${r.title} ${r.id}`
                      .toLowerCase()
                      .includes(q.toLowerCase())) &&
                  (!filter || r.status === filter),
              )
              .map((r) => (
                <button
                  key={r.id}
                  className={doc?.id === r.id ? "selected" : ""}
                  onClick={() => void open(r.id)}
                >
                  <strong>{r.title}</strong>
                  <small>
                    {r.id} ·{" "}
                    {
                      {
                        draft: "草稿",
                        changed: "有未发布修改",
                        published: "已发布",
                      }[r.status]
                    }
                  </small>
                </button>
              ))}
          </div>
        </aside>
        <main className="admin-main">
          <p className="admin-message" role="status">
            {message}
          </p>
          {draft ? (
            <>
              <div className="admin-toolbar">
                <div>
                  <h1>{String(draft.title || draft.name || "新建内容")}</h1>
                  <p>
                    {doc ? "版本 " + doc.revision : "尚未创建"} ·{" "}
                    {dirty ? "有未保存修改" : "已保存"}
                    {doc?.published ? " · 线上有已发布版本" : ""}
                  </p>
                </div>
                <div className="action-row">
                  <button
                    className="button"
                    disabled={busy}
                    onClick={() => setPreview((x) => !x)}
                  >
                    {preview ? "继续编辑" : "预览草稿"}
                  </button>
                  <button
                    className="button primary"
                    disabled={busy || !dirty}
                    onClick={() => void save()}
                  >
                    保存草稿
                  </button>
                  <button
                    className="button"
                    disabled={busy || dirty || !doc}
                    onClick={() => void publication("publish")}
                  >
                    发布
                  </button>
                  {doc?.published && (
                    <button
                      className="button"
                      disabled={busy || dirty}
                      onClick={() => void publication("unpublish")}
                    >
                      撤下
                    </button>
                  )}
                </div>
              </div>
              {preview ? (
                <article className="admin-preview">
                  <small>草稿预览 · 尚未发布</small>
                  <h2>{String(draft.title || draft.name)}</h2>
                  <p>{String(draft.summary || draft.description || "")}</p>
                  {Array.isArray(draft.sections) ? (
                    draft.sections.map((s, i) => (
                      <section key={i}>
                        <h3>{String(s.title)}</h3>
                        <p>{String(s.body)}</p>
                      </section>
                    ))
                  ) : (
                    <p>工具和场景的完整字段见下方结构预览。</p>
                  )}
                  <details>
                    <summary>完整内容结构</summary>
                    <pre>{JSON.stringify(draft, null, 2)}</pre>
                  </details>
                </article>
              ) : (
                <fieldset disabled={busy} className="admin-editor">
                  <Fields
                    value={draft as Parameters<typeof Fields>[0]["value"]}
                    locked={!!doc}
                    onChange={(v) => {
                      setDraft(v as Record<string, unknown>);
                      setDirty(true);
                    }}
                  />
                  {kind === "knowledge" && (
                    <button
                      type="button"
                      className="button"
                      onClick={() => {
                        if (draft.practice) {
                          const next = { ...draft };
                          delete next.practice;
                          setDraft(next);
                        } else {
                          const p = blankPractice();
                          p.steps = Array.from(
                            {
                              length: Array.isArray(draft.sections)
                                ? draft.sections.length
                                : 1,
                            },
                            () => ({ actions: [""], check: "" }),
                          );
                          setDraft({ ...draft, practice: p });
                        }
                        setDirty(true);
                      }}
                    >
                      {draft.practice ? "移除实践教程模块" : "添加实践教程模块"}
                    </button>
                  )}
                  {kind === "knowledge" && (
                    <button
                      type="button"
                      className="button"
                      onClick={() => {
                        const next = { ...draft };
                        if (next.video) delete next.video;
                        else
                          next.video = {
                            url: "",
                            publisher: "",
                            language: "",
                            version: "",
                            audience: "",
                            checkedAt: new Date().toISOString().slice(0, 10),
                          };
                        setDraft(next);
                        setDirty(true);
                      }}
                    >
                      {draft.video ? "移除视频课程模块" : "添加视频课程模块"}
                    </button>
                  )}
                  {kind === "model" && draft.price !== null && (
                    <button
                      type="button"
                      className="button"
                      onClick={() => {
                        setDraft({ ...draft, price: null });
                        setDirty(true);
                      }}
                    >
                      清除价格（标记未知）
                    </button>
                  )}
                </fieldset>
              )}
              {doc && (
                <section className="admin-history">
                  <h2>版本记录</h2>
                  <p>恢复操作只写回草稿；需再次发布才影响网站。</p>
                  {history.map((h) => (
                    <div key={h.seq}>
                      <span>
                        {h.at.slice(0, 19).replace("T", " ")} · {h.actor} ·{" "}
                        {h.action}
                      </span>
                      <button
                        className="button"
                        disabled={busy}
                        onClick={() => {
                          if (
                            !confirm(
                              "将这一版本恢复为草稿？未保存的修改会丢失。",
                            )
                          )
                            return;
                          void run(async () => {
                            accept(
                              await api(
                                `/documents/${kind}/${doc.id}/restore`,
                                "POST",
                                { seq: h.seq, revision: doc.revision },
                              ),
                            );
                            await reload();
                            setMessage("历史版本已恢复为草稿。");
                          });
                        }}
                      >
                        恢复为草稿
                      </button>
                    </div>
                  ))}
                  <div className="action-row">
                    {doc.published && (
                      <a
                        href={appPath(publicPath)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        查看线上版本 ↗
                      </a>
                    )}
                    {!doc.published && (
                      <button
                        className="button"
                        disabled={busy}
                        onClick={() => {
                          if (!confirm("永久删除这条未发布内容？")) return;
                          void run(async () => {
                            await api(
                              `/documents/${kind}/${doc.id}`,
                              "DELETE",
                              { revision: doc.revision },
                            );
                            setDoc(null);
                            setDraft(null);
                            setDirty(false);
                            await reload();
                            setMessage("内容已删除。");
                          });
                        }}
                      >
                        删除未发布内容
                      </button>
                    )}
                  </div>
                </section>
              )}
            </>
          ) : (
            <div className="admin-empty">
              <h1>把知识，更新到网站。</h1>
              <p>
                选择左侧内容开始编辑，或新建一条内容。保存草稿不会改变线上版本，发布后无需重新构建。
              </p>
              <p>
                URL
                标识创建后固定。关联内容必须先发布；被引用的文章与工具不能直接撤下。
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
