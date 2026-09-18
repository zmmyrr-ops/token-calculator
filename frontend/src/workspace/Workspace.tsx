import { useEffect, useState, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Bookmark,
  Compass,
  FolderOpen,
  ArrowUpRight,
  Sparkles,
} from "lucide-react";
import Link from "../Link";
import { communityApi, useCommunityAuth } from "../Community";
import { storageKey } from "../base";
import { parseLibrary } from "@shared/library";
import type {
  WorkspaceItem,
  WorkspacePrompt,
  WorkspaceProject,
  TaskPack,
} from "@shared/workspace";
import "./workspace.css";
const api = (path: string, method = "GET", body?: unknown) =>
  communityApi("/workspace" + path, method, body);
const errorText = (e: unknown) =>
  e instanceof Error ? e.message : "操作失败，请重试";
function download(value: unknown, name: string) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
async function copy(text: string) {
  await navigator.clipboard.writeText(text);
}
function Gate({ children }: { children: ReactNode }) {
  const { user, loading } = useCommunityAuth();
  if (loading) return <p role="status">正在加载账号…</p>;
  if (!user)
    return (
      <section className="ws-hero">
        <div className="eyebrow">YOUR CREATIVE SPACE</div>
        <h1>给自己的 AI 创作，留一个位置。</h1>
        <p>登录后跨设备保存常用工具、提示词与任务进度。任务包可以先浏览。</p>
        <div className="action-row">
          <Link className="button primary" href="/login">
            登录 / 注册
          </Link>
          <Link className="button" href="/task-packs">
            先看场景任务包
          </Link>
        </div>
      </section>
    );
  return <div key={user.id}>{children}</div>;
}
function useData<T>(path: string) {
  const [data, setData] = useState<T | null>(null),
    [error, setError] = useState(""),
    [version, setVersion] = useState(0);
  useEffect(() => {
    let active = true;
    setData(null);
    setError("");
    api(path)
      .then((d) => {
        if (active) setData(d);
      })
      .catch((e) => {
        if (active) setError(errorText(e));
      });
    return () => {
      active = false;
    };
  }, [path, version]);
  return { data, error, setData, refresh: () => setVersion((v) => v + 1) };
}
export function CloudSaveButton({
  item,
}: {
  item: Omit<WorkspaceItem, "id" | "updated" | "category" | "note"> & {
    note?: string;
  };
}) {
  const { user } = useCommunityAuth();
  const [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <div className="ws-save">
      <button
        className="button"
        disabled={busy}
        onClick={async () => {
          if (!user) {
            setMessage("请先登录，再保存到云端工作台");
            return;
          }
          setBusy(true);
          try {
            await api("/items", "POST", {
              title: item.title,
              href:
                item.kind === "预算"
                  ? item.href + "&saved=" + Date.now()
                  : item.href,
              kind: item.kind,
              category: "未分类",
              note: item.note || "",
            });
            setMessage("已保存到云端工作台");
          } catch (e) {
            setMessage(errorText(e));
          } finally {
            setBusy(false);
          }
        }}
      >
        <Bookmark size={15} /> 保存到工作台
      </button>
      <span role="status">{message}</span>
      {message && !user && <Link href="/login">去登录</Link>}
    </div>
  );
}
type Summary = {
  itemCount: number;
  prompts: Omit<WorkspacePrompt, "body">[];
  projects: {
    id: string;
    title: string;
    packTitle: string;
    done: number;
    total: number;
    updated: number;
  }[];
};
export default function Workspace() {
  return (
    <Gate>
      <Dashboard />
    </Gate>
  );
}
function Dashboard() {
  const { user } = useCommunityAuth();
  const { data, error, refresh } = useData<Summary>("");
  const [q, setQ] = useState(""),
    [tab, setTab] = useState("全部"),
    [page, setPage] = useState(1),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [edit, setEdit] = useState<WorkspaceItem | null>(null);
  const {
    data: saved,
    error: savedError,
    refresh: refreshSaved,
  } = useData<{
    items: WorkspaceItem[];
    total: number;
    page: number;
    pageSize: number;
  }>("/items?" + new URLSearchParams({ q, kind: tab, page: String(page) }));
  async function act(fn: () => Promise<unknown>, success: string) {
    setBusy(true);
    try {
      await fn();
      setMessage(success);
      refresh();
      refreshSaved();
    } catch (e) {
      setMessage(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="creator-workspace">
      <header className="ws-hero">
        <div>
          <div className="eyebrow">MY AI WORKSPACE</div>
          <h1>{user?.nickname}的 AI 工作台</h1>
          <p>把有用的内容留下，把想做的事继续做完。</p>
          <div className="action-row">
            <Link className="button primary" href="/task-packs">
              开始一个创作任务 <ArrowUpRight size={16} />
            </Link>
            <Link className="button" href="/workspace/prompts/new">
              新建提示词
            </Link>
          </div>
        </div>
        <FolderOpen size={72} />
      </header>
      {error && (
        <p role="alert">
          {error}
          <button className="button" onClick={refresh}>
            重试
          </button>
        </p>
      )}
      {message && (
        <p className="ws-status" role="status">
          {message}
        </p>
      )}
      {!data && !error && <p role="status">正在加载你的工作台…</p>}
      {data && (
        <>
          <div className="ws-stats">
            <div>
              <strong>
                {data.projects.filter((p) => p.done < p.total).length}
              </strong>
              <span>正在进行的任务</span>
            </div>
            <div>
              <strong>{data.itemCount}</strong>
              <span>云端收藏</span>
            </div>
            <div>
              <strong>{data.prompts.length}</strong>
              <span>我的提示词</span>
            </div>
            <div>
              <strong>
                {data.projects.filter((p) => p.done === p.total).length}
              </strong>
              <span>已完成任务</span>
            </div>
          </div>
          <section className="ws-section">
            <header>
              <h2>接着上次继续</h2>
              <Link href="/task-packs">浏览全部任务包 →</Link>
            </header>
            <div className="ws-grid">
              {data.projects.length ? (
                data.projects.map((p) => (
                  <article className="ws-card" key={p.id}>
                    <small>{p.packTitle}</small>
                    <h3>
                      <Link href={"/workspace/projects/" + p.id}>
                        {p.title}
                      </Link>
                    </h3>
                    <progress value={p.done} max={p.total} />
                    <p>
                      {p.done}/{p.total} 步已完成 ·{" "}
                      {p.done === p.total
                        ? "可以整理成果了"
                        : "按自己的节奏继续"}
                    </p>
                    <Link
                      className="button"
                      href={"/workspace/projects/" + p.id}
                    >
                      继续任务 →
                    </Link>
                  </article>
                ))
              ) : (
                <div className="ws-empty">
                  <Compass />
                  <h3>从一个小成果开始</h3>
                  <p>选择游戏、3D 或视频任务包，进度会随账号保存。</p>
                  <Link href="/task-packs">挑一个任务 →</Link>
                </div>
              )}
            </div>
          </section>
          <section className="ws-section">
            <header>
              <h2>我的提示词</h2>
              <Link href="/workspace/prompts/new">新建提示词 +</Link>
            </header>
            <div className="ws-grid">
              {data.prompts.map((p) => (
                <article className="ws-card" key={p.id}>
                  <small>
                    {p.category} · 版本 {p.revision}
                  </small>
                  <h3>
                    <Link href={"/workspace/prompts/" + p.id}>{p.title}</Link>
                  </h3>
                  <Link href={"/workspace/prompts/" + p.id}>
                    编辑、复制与查看历史 →
                  </Link>
                </article>
              ))}
              {!data.prompts.length && (
                <p className="ws-empty">
                  把调试有效的提示词保存下来，修改时自动留下历史版本。
                </p>
              )}
            </div>
          </section>
          <section className="ws-section">
            <header>
              <h2>常用内容与记录</h2>
              <Link href="/saved">查看本机收藏</Link>
            </header>
            <div className="ws-filters">
              <input
                aria-label="搜索工作台收藏"
                placeholder="搜索名称、分类或备注"
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(1);
                }}
              />
              <select
                aria-label="收藏类型"
                value={tab}
                onChange={(e) => {
                  setTab(e.target.value);
                  setPage(1);
                }}
              >
                {[
                  "全部",
                  "知识",
                  "教程",
                  "工具",
                  "模型",
                  "人格",
                  "画像",
                  "预算",
                ].map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className="ws-grid">
              {(saved?.items || []).map((x) => (
                <article className="ws-card" key={x.id}>
                  <small>
                    {x.kind} · {x.category}
                  </small>
                  <h3>
                    <Link href={x.href}>{x.title}</Link>
                  </h3>
                  {x.note && <p className="ws-note">{x.note}</p>}
                  <div className="action-row">
                    <button className="button" onClick={() => setEdit(x)}>
                      分类与备注
                    </button>
                    <button
                      className="text-button"
                      disabled={busy}
                      onClick={() => {
                        if (confirm("移除这条云端收藏？"))
                          void act(
                            () => api("/items/" + x.id, "DELETE"),
                            "已移除收藏",
                          );
                      }}
                    >
                      移除
                    </button>
                  </div>
                </article>
              ))}
            </div>
            {savedError && (
              <p role="alert">
                {savedError}
                <button className="button" onClick={refreshSaved}>
                  重试
                </button>
              </p>
            )}
            {!saved && !savedError && <p role="status">正在加载收藏…</p>}
            {saved && (
              <nav className="action-row" aria-label="工作台收藏分页">
                <button
                  className="button"
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  上一页
                </button>
                <span>
                  第 {page} 页 · 共 {saved.total} 条
                </span>
                <button
                  className="button"
                  disabled={page * 24 >= saved.total}
                  onClick={() => setPage((p) => p + 1)}
                >
                  下一页
                </button>
              </nav>
            )}
            {saved && saved.total === 0 && data.itemCount > 0 && (
              <p className="ws-empty">没有匹配的收藏，试试其他关键词或类型。</p>
            )}
            {!data.itemCount && (
              <p className="ws-empty">
                在知识、模型、工具详情中点击“保存到工作台”，也可以导入已有的本机收藏。
              </p>
            )}
            {edit && (
              <form
                className="ws-editor"
                onSubmit={(e) => {
                  e.preventDefault();
                  const value = { category: edit.category, note: edit.note };
                  void act(
                    () => api("/items/" + edit.id, "PATCH", value),
                    "分类与备注已保存",
                  );
                  setEdit(null);
                }}
              >
                <h3>编辑收藏：{edit.title}</h3>
                <label>
                  分类
                  <input
                    value={edit.category}
                    maxLength={40}
                    onChange={(e) =>
                      setEdit({ ...edit, category: e.target.value })
                    }
                  />
                </label>
                <label>
                  备注
                  <textarea
                    aria-label="备注"
                    value={edit.note}
                    maxLength={4000}
                    onChange={(e) => setEdit({ ...edit, note: e.target.value })}
                  />
                </label>
                <div className="action-row">
                  <button className="button primary" disabled={busy}>
                    保存
                  </button>
                  <button
                    className="button"
                    type="button"
                    onClick={() => setEdit(null)}
                  >
                    取消
                  </button>
                </div>
              </form>
            )}
            <div className="action-row">
              <button
                className="button"
                disabled={busy}
                onClick={() =>
                  void act(async () => {
                    const lib = parseLibrary(
                      localStorage.getItem(storageKey("ruming-library-v1")) ||
                        '{"version":1,"items":[],"progress":{}}',
                    );
                    const existing = new Set<string>();
                    for (const i of lib.items) {
                      if (!existing.has(i.href)) {
                        await api("/items", "POST", {
                          title: i.title,
                          href: i.href,
                          kind: i.kind,
                          category: "本机导入",
                          note: "",
                        });
                        existing.add(i.href);
                      }
                    }
                  }, "本机收藏已合并到云端，已有记录及本机原件均保留")
                }
              >
                导入本机收藏
              </button>
              <button
                className="button"
                disabled={busy}
                onClick={() =>
                  void act(
                    async () =>
                      download(await api("/export"), "AI门道-工作台备份.json"),
                    "已导出工作台备份",
                  )
                }
              >
                导出全部资料
              </button>
            </div>
            <p className="ws-muted">
              仅你能查看工作台。云端保存的提示词、笔记与成果会发送到本站；请勿填写密码或
              API 密钥。本机收藏导入不包含旧教程勾选记录。
            </p>
          </section>
        </>
      )}
    </div>
  );
}
export function PromptPage() {
  return (
    <Gate>
      <PromptEditor />
    </Gate>
  );
}
function PromptEditor() {
  const { id } = useParams(),
    nav = useNavigate();
  const isNew = id === "new";
  const [value, setValue] = useState<WorkspacePrompt>({
      id: "",
      title: "",
      body: "",
      category: "通用",
      revision: 0,
      updated: 0,
    }),
    [versions, setVersions] = useState<
      (WorkspacePrompt & { created: number })[]
    >([]),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [loaded, setLoaded] = useState(isNew);
  useEffect(() => {
    let active = true;
    if (!isNew)
      api("/prompts/" + id)
        .then((v) => {
          if (active) {
            setValue(v);
            setLoaded(true);
          }
        })
        .catch((e) => {
          if (active) setMessage(errorText(e));
        });
    return () => {
      active = false;
    };
  }, [id, isNew]);
  return (
    <section className="creator-workspace ws-editor">
      <Link href="/workspace">← 我的工作台</Link>
      <h1>{isNew ? "新建提示词" : "编辑提示词"}</h1>
      <p>
        保留有效版本，逐步改成自己的方法。最多 100 条提示词，每条保留 50
        个版本。
      </p>
      {loaded && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            try {
              const body = {
                title: value.title,
                body: value.body,
                category: value.category,
              };
              const d = await api(
                "/prompts" + (isNew ? "" : "/" + id),
                isNew ? "POST" : "PUT",
                { ...body, ...(!isNew ? { revision: value.revision } : {}) },
              );
              if (isNew) nav("/workspace/prompts/" + d.id);
              else {
                setValue(d);
                setVersions([]);
                setMessage("新版本已保存");
              }
            } catch (e) {
              setMessage(errorText(e));
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            提示词名称
            <input
              required
              maxLength={100}
              value={value.title}
              onChange={(e) => setValue({ ...value, title: e.target.value })}
            />
          </label>
          <label>
            提示词分类
            <input
              maxLength={40}
              value={value.category}
              onChange={(e) => setValue({ ...value, category: e.target.value })}
            />
          </label>
          <label>
            提示词正文
            <textarea
              aria-label="提示词正文"
              required
              rows={14}
              maxLength={20000}
              value={value.body}
              onChange={(e) => setValue({ ...value, body: e.target.value })}
            />
          </label>
          <div className="action-row">
            <button className="button primary" disabled={busy}>
              保存提示词
            </button>
            <button
              type="button"
              className="button"
              onClick={() =>
                copy(value.body)
                  .then(() => setMessage("已复制"))
                  .catch(() => setMessage("复制失败，请手动选择正文复制"))
              }
            >
              复制正文
            </button>
            {!isNew && (
              <>
                <button
                  type="button"
                  className="button"
                  onClick={() =>
                    api("/prompts/" + id + "/versions")
                      .then((d) => setVersions(d.items))
                      .catch((e) => setMessage(errorText(e)))
                  }
                >
                  查看版本历史
                </button>
                <button
                  type="button"
                  className="text-button"
                  onClick={async () => {
                    if (!confirm("删除这条提示词及全部历史版本？")) return;
                    try {
                      await api("/prompts/" + id, "DELETE");
                      nav("/workspace");
                    } catch (e) {
                      setMessage(errorText(e));
                    }
                  }}
                >
                  删除提示词
                </button>
              </>
            )}
          </div>
        </form>
      )}
      {message && <p role="status">{message}</p>}
      {versions.map((v) => (
        <details className="ws-card" key={v.revision}>
          <summary>
            版本 {v.revision} · {new Date(v.created).toLocaleString()}
          </summary>
          <pre>{v.body}</pre>
          <button
            className="button"
            onClick={() => {
              setValue({
                ...value,
                title: v.title,
                body: v.body,
                category: v.category,
              });
              setMessage("旧版本已填入编辑框，点击保存创建新版本");
            }}
          >
            使用这个版本
          </button>
        </details>
      ))}
    </section>
  );
}
export function TaskPacks() {
  const { id } = useParams();
  const { data, error, refresh } = useData<{ items: TaskPack[] }>("/packs");
  const { user } = useCommunityAuth();
  const nav = useNavigate();
  const [category, setCategory] = useState("全部"),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const p = data?.items.find((p) => p.id === id);
  async function start(packId: string) {
    if (!user) {
      setMessage("登录后才能保存任务进度");
      return;
    }
    setBusy(true);
    try {
      const d = await api("/projects", "POST", { packId });
      nav("/workspace/projects/" + d.id);
    } catch (e) {
      setMessage(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="creator-workspace">
      <header className="ws-hero">
        <div>
          <div className="eyebrow">CREATOR MISSIONS</div>
          <h1>{p?.title || "场景任务包"}</h1>
          <p>{p?.summary || "选一个目标，沿着步骤做出自己的第一份作品。"}</p>
          <Link href="/workspace">我的工作台 →</Link>
        </div>
        <Compass size={72} />
      </header>
      {error && (
        <p role="alert">
          {error}
          <button onClick={refresh}>重试</button>
        </p>
      )}
      {!data && !error && <p>正在加载任务包…</p>}
      {message && (
        <p role="status">
          {message} {!user && <Link href="/login">去登录</Link>}
        </p>
      )}
      {id && data && !p ? (
        <p>
          任务包不存在。<Link href="/task-packs">返回列表</Link>
        </p>
      ) : p ? (
        <>
          <Link href="/task-packs">← 全部任务包</Link>
          <div className="ws-card">
            <h2>你将得到</h2>
            <p>{p.deliverable}</p>
            <h3>开始前准备</h3>
            <ul>
              {p.preparation.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
            <ToolLinks pack={p} />
            <button
              className="button primary"
              disabled={busy}
              onClick={() => void start(p.id)}
            >
              {busy ? "创建中…" : "开始这个任务"}
            </button>
          </div>
          {p.steps.map((s, i) => (
            <article className="ws-card" key={s.id}>
              <small>步骤 {i + 1}</small>
              <h2>{s.title}</h2>
              <ul>
                {s.actions.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
              <p>
                <strong>完成标准：</strong>
                {s.check}
              </p>
              <details>
                <summary>配套提示词</summary>
                <pre>{s.prompt}</pre>
              </details>
            </article>
          ))}
        </>
      ) : (
        <>
          <div className="action-row">
            {["全部", "游戏", "3D", "视频"].map((c) => (
              <button
                className={"button " + (c === category ? "primary" : "")}
                aria-pressed={c === category}
                key={c}
                onClick={() => setCategory(c)}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="ws-grid">
            {data?.items
              .filter((p) => category === "全部" || p.category === category)
              .map((p) => (
                <article
                  className={"ws-card ws-pack ws-pack-" + p.category}
                  key={p.id}
                >
                  <Sparkles />
                  <small>
                    {p.category} · {p.effort}
                  </small>
                  <h2>
                    <Link href={"/task-packs/" + p.id}>{p.title}</Link>
                  </h2>
                  <p>{p.summary}</p>
                  <p className="ws-muted">交付：{p.deliverable}</p>
                  <Link className="button" href={"/task-packs/" + p.id}>
                    查看步骤与工具 →
                  </Link>
                </article>
              ))}
          </div>
        </>
      )}
    </div>
  );
}
function ToolLinks({ pack }: { pack: TaskPack }) {
  return (
    <div>
      <h3>配套工具与教程</h3>
      <ul>
        {pack.tools.map((t) => (
          <li key={t.href}>
            <Link href={t.href}>{t.name}</Link>：{t.role}
          </li>
        ))}
      </ul>
      <Link href={pack.tutorial}>打开相关教程 →</Link>
      <p className="ws-muted">
        平台能力、使用权限和费用以实际页面为准；这里提供创作流程，不自动调用付费模型。
      </p>
    </div>
  );
}
export function ProjectPage() {
  return (
    <Gate>
      <ProjectEditor />
    </Gate>
  );
}
async function imagePreview(file: File) {
  if (
    !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
    file.size > 10 * 1024 * 1024
  )
    throw Error("请选择10MB以内的 PNG、JPEG 或 WebP 图片");
  const bitmap = await createImageBitmap(file);
  try {
    if (bitmap.width * bitmap.height > 40000000) throw Error("图片尺寸过大");
    const c = document.createElement("canvas");
    const scale = Math.min(1, 512 / Math.max(bitmap.width, bitmap.height));
    c.width = Math.max(1, Math.round(bitmap.width * scale));
    c.height = Math.max(1, Math.round(bitmap.height * scale));
    c.getContext("2d")!.drawImage(bitmap, 0, 0, c.width, c.height);
    const data = c.toDataURL("image/png");
    if (data.length > 349550)
      throw Error("压缩后图片仍超过256KB，请选择更简洁的预览图");
    return data;
  } finally {
    bitmap.close();
  }
}
function ProjectEditor() {
  const { id } = useParams(),
    nav = useNavigate();
  const { data, error, setData, refresh } = useData<WorkspaceProject>(
    "/projects/" + id,
  );
  const [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [dirty, setDirty] = useState(false);
  useEffect(() => {
    const leave = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", leave);
    return () => window.removeEventListener("beforeunload", leave);
  }, [dirty]);
  function patch(v: Partial<WorkspaceProject>) {
    if (data) {
      setData({ ...data, ...v });
      setDirty(true);
    }
  }
  async function save() {
    if (!data) return;
    setBusy(true);
    try {
      const { title, completed, notes, outcome, url, image, revision } = data;
      setData(
        await api("/projects/" + id, "PUT", {
          title,
          completed,
          notes,
          outcome,
          url,
          image,
          revision,
        }),
      );
      setDirty(false);
      setMessage("项目已保存到云端");
    } catch (e) {
      setMessage(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="creator-workspace">
      {error && (
        <p role="alert">
          {error}
          <button onClick={refresh}>重试</button>
        </p>
      )}
      {!data && !error && <p>正在加载项目…</p>}
      {data && (
        <>
          <header className="ws-hero">
            <div>
              <Link href="/workspace">← 我的工作台</Link>
              <h1>{data.title}</h1>
              <p>{data.pack.deliverable}</p>
              <progress
                value={data.completed.length}
                max={data.pack.steps.length}
              />
              <p>
                {data.completed.length}/{data.pack.steps.length} 步完成 ·{" "}
                {dirty ? "有未保存修改" : "已同步"}
              </p>
            </div>
            <button
              className="button primary"
              disabled={busy || !dirty}
              onClick={() => void save()}
            >
              保存任务进度
            </button>
          </header>
          {message && <p role="status">{message}</p>}
          <div className="ws-project-layout">
            <section>
              <label className="ws-title-input">
                项目名称
                <input
                  maxLength={100}
                  value={data.title}
                  disabled={busy}
                  onChange={(e) => patch({ title: e.target.value })}
                />
              </label>
              {data.pack.steps.map((s, i) => (
                <article className="ws-card" key={s.id}>
                  <label className="ws-step">
                    <input
                      type="checkbox"
                      disabled={busy}
                      checked={data.completed.includes(s.id)}
                      onChange={() =>
                        patch({
                          completed: data.completed.includes(s.id)
                            ? data.completed.filter((x) => x !== s.id)
                            : [...data.completed, s.id],
                        })
                      }
                    />
                    <strong>
                      {i + 1}. {s.title}
                    </strong>
                  </label>
                  <ul>
                    {s.actions.map((a) => (
                      <li key={a}>{a}</li>
                    ))}
                  </ul>
                  <p>
                    <strong>完成标准：</strong>
                    {s.check}
                  </p>
                  <details>
                    <summary>提示词与使用方法</summary>
                    <pre>{s.prompt}</pre>
                    <div className="action-row">
                      <button
                        className="button"
                        onClick={() =>
                          copy(s.prompt)
                            .then(() => setMessage("提示词已复制"))
                            .catch(() => setMessage("复制失败，请手动选择文字"))
                        }
                      >
                        复制提示词
                      </button>
                      <button
                        className="button"
                        disabled={busy}
                        onClick={async () => {
                          setBusy(true);
                          try {
                            await api("/prompts", "POST", {
                              title: data.pack.title + " · " + s.title,
                              body: s.prompt,
                              category: data.pack.category,
                            });
                            setMessage("已加入工作台提示词");
                          } catch (e) {
                            setMessage(errorText(e));
                          } finally {
                            setBusy(false);
                          }
                        }}
                      >
                        保存为我的提示词
                      </button>
                    </div>
                  </details>
                </article>
              ))}
            </section>
            <aside className="ws-card">
              <ToolLinks pack={data.pack} />
              <h3>完成后做什么</h3>
              <p>
                填写成果和复盘，再选择是否去社区交流。项目笔记及图片默认私密。
              </p>
            </aside>
          </div>
          <form
            className="ws-editor"
            onSubmit={(e) => {
              e.preventDefault();
              void save();
            }}
          >
            <h2>制作笔记与成果</h2>
            <label>
              制作笔记
              <textarea
                aria-label="制作笔记"
                rows={5}
                maxLength={10000}
                disabled={busy}
                value={data.notes}
                onChange={(e) => patch({ notes: e.target.value })}
                placeholder="记录尝试、工具、实际成本、遇到的问题…"
              />
            </label>
            <label>
              成果与复盘
              <textarea
                aria-label="成果与复盘"
                rows={5}
                maxLength={6000}
                disabled={busy}
                value={data.outcome}
                onChange={(e) => patch({ outcome: e.target.value })}
                placeholder="做出了什么？哪一步最有效？下一次想改什么？"
              />
            </label>
            <label>
              作品链接
              <input
                type="url"
                maxLength={1000}
                disabled={busy}
                value={data.url}
                onChange={(e) => patch({ url: e.target.value })}
                placeholder="https://…"
              />
            </label>
            <label>
              上传成果预览图
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                disabled={busy}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (file)
                    try {
                      patch({ image: await imagePreview(file) });
                    } catch (err) {
                      setMessage(errorText(err));
                    }
                }}
              />
            </label>
            <small>
              仅保存一张最多512px、256KB的私密预览图；原始模型、视频和工程文件请自行保管。
            </small>
            {data.image && (
              <div>
                <img
                  className="ws-result-image"
                  src={data.image}
                  alt="我的成果预览"
                />
                <button
                  type="button"
                  className="button"
                  disabled={busy}
                  onClick={() => patch({ image: "" })}
                >
                  移除预览图
                </button>
              </div>
            )}
            <div className="action-row">
              <button className="button primary" disabled={busy || !dirty}>
                保存笔记与成果
              </button>
              <button
                type="button"
                className="button"
                onClick={() => {
                  try {
                    sessionStorage.setItem(
                      storageKey("workspace-forum-draft"),
                      JSON.stringify({
                        title: "创作复盘：" + data.title,
                        body: `我完成的任务：${data.pack.title}\n\n成果与复盘：\n${data.outcome || "（请补充你的成果或想求助的问题）"}\n\n作品链接：${data.url || "暂无"}\n\n希望讨论的问题：\n`,
                        category: "经验分享",
                      }),
                    );
                    nav("/forum/new?from=workspace");
                  } catch {
                    setMessage("无法打开草稿，请复制成果后到社区发帖");
                  }
                }}
              >
                生成社区交流草稿
              </button>
              <button
                type="button"
                className="text-button"
                disabled={busy}
                onClick={async () => {
                  if (!confirm("删除此任务及其笔记和成果？")) return;
                  try {
                    await api("/projects/" + id, "DELETE");
                    setDirty(false);
                    nav("/workspace");
                  } catch (e) {
                    setMessage(errorText(e));
                  }
                }}
              >
                删除任务
              </button>
            </div>
            <p className="ws-muted">
              社区按钮只生成可编辑草稿，不会直接发布，也不会带入私密笔记或预览图。请在发布前确认内容。
            </p>
          </form>
        </>
      )}
    </div>
  );
}
