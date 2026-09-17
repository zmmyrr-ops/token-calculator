import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
  type FormEvent,
} from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import Link from "./Link";
import { appPath } from "./base";
import {
  forumCategories,
  type CommunityUser,
  type ForumPost,
  type ForumReply,
} from "@shared/community";
import "./community.css";
export async function communityApi(
  path: string,
  method = "GET",
  body?: unknown,
) {
  const r = await fetch(appPath("/api/community") + path, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await r.json();
  if (!r.ok) throw Error(data.error || "请求失败");
  return data;
}
const Auth = createContext<{
  user: CommunityUser | null;
  loading: boolean;
  setUser: (u: CommunityUser | null) => void;
}>({ user: null, loading: true, setUser: () => {} });
export function CommunityProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CommunityUser | null>(null),
    [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    const refresh = () => {
      communityApi("/session")
        .then((d) => {
          if (active) setUser(d.user);
        })
        .catch(() => {})
        .finally(() => {
          if (active) setLoading(false);
        });
    };
    refresh();
    window.addEventListener("focus", refresh);
    return () => {
      active = false;
      window.removeEventListener("focus", refresh);
    };
  }, []);
  return (
    <Auth.Provider value={{ user, loading, setUser }}>{children}</Auth.Provider>
  );
}
export function Avatar({
  user,
}: {
  user: Pick<CommunityUser, "avatar" | "nickname">;
}) {
  return user.avatar ? (
    <img
      className="community-avatar"
      src={appPath(user.avatar)}
      alt={`${user.nickname}的头像`}
      width="40"
      height="40"
    />
  ) : (
    <span className="community-avatar default" aria-label="默认头像">
      {user.nickname?.slice(0, 1) || "门"}
    </span>
  );
}
export function AccountLink() {
  const { user, loading } = useContext(Auth);
  return (
    <Link
      className="community-account-link"
      href={user ? "/account" : "/login"}
    >
      {user ? (
        <>
          <Avatar user={user} />
          <span>{user.nickname}</span>
        </>
      ) : loading ? (
        "账号"
      ) : (
        "登录 / 注册"
      )}
    </Link>
  );
}
function author(user: CommunityUser) {
  return (
    <span className="community-author">
      <Avatar user={user} />
      <span>{user.nickname}</span>
    </span>
  );
}
function date(time: number) {
  return new Date(time).toLocaleString("zh-CN", {
    timeZone: "Asia/Shanghai",
    hour12: false,
  });
}
export function AvatarInput({
  value,
  onChange,
}: {
  value: string | null | undefined;
  onChange: (v: string | null) => void;
}) {
  const [error, setError] = useState("");
  return (
    <div className="avatar-input">
      <label>
        上传头像（可选）
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setError("");
            if (
              file.size > 5 * 1024 * 1024 ||
              !["image/png", "image/jpeg", "image/webp"].includes(file.type)
            ) {
              setError("请选择 5 MB 以内的 PNG、JPEG 或 WebP 图片");
              e.target.value = "";
              return;
            }
            try {
              const bitmap = await createImageBitmap(file);
              const canvas = document.createElement("canvas");
              canvas.width = canvas.height = 128;
              const ctx = canvas.getContext("2d")!;
              const side = Math.min(bitmap.width, bitmap.height);
              ctx.drawImage(
                bitmap,
                (bitmap.width - side) / 2,
                (bitmap.height - side) / 2,
                side,
                side,
                0,
                0,
                128,
                128,
              );
              bitmap.close();
              onChange(canvas.toDataURL("image/png"));
            } catch {
              setError("图片无法读取，请换一张图片");
            }
            e.target.value = "";
          }}
        />
      </label>
      {value && (
        <img
          src={value.startsWith("data:") ? value : appPath(value)}
          alt="头像预览"
          className="community-avatar"
        />
      )}
      <button className="button" type="button" onClick={() => onChange(null)}>
        使用默认头像
      </button>
      {error && <p role="alert">{error}</p>}
      <small>头像会裁剪为正方形并压缩，未上传则使用昵称首字默认头像。</small>
    </div>
  );
}
export function UserAuth({ register = false }: { register?: boolean }) {
  const { user, setUser } = useContext(Auth);
  const nav = useNavigate();
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [avatar, setAvatar] = useState<string | null>(null);
  if (user)
    return (
      <section className="community-auth panel">
        <h1>你已登录</h1>
        <Link className="button primary" href="/forum">
          进入论坛
        </Link>
        <Link className="button" href="/account">
          管理个人资料
        </Link>
      </section>
    );
  return (
    <section className="community-auth panel">
      <div className="eyebrow">AI MENDAO COMMUNITY</div>
      <h1>{register ? "加入门道，一起讨论。" : "欢迎回来。"}</h1>
      <p>
        {register
          ? "创建账号，分享问题、方法与创作过程。"
          : "登录后参与讨论和管理自己的帖子。"}
      </p>
      <form
        onSubmit={async (e: FormEvent<HTMLFormElement>) => {
          e.preventDefault();
          const d = new FormData(e.currentTarget);
          setBusy(true);
          setError("");
          try {
            const result = await communityApi(
              register ? "/register" : "/login",
              "POST",
              {
                username: d.get("username"),
                password: d.get("password"),
                ...(register ? { nickname: d.get("nickname"), avatar } : {}),
              },
            );
            setUser(result.user);
            nav("/forum");
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          账号
          <input
            name="username"
            autoComplete="username"
            required
            minLength={4}
            maxLength={32}
            pattern="[a-zA-Z0-9_]{4,32}"
            placeholder="4–32 位字母、数字或下划线"
          />
        </label>
        {register && (
          <label>
            昵称
            <input
              name="nickname"
              required
              maxLength={24}
              autoComplete="nickname"
            />
          </label>
        )}
        <label>
          密码
          <input
            name="password"
            type="password"
            required
            minLength={register ? 12 : 1}
            maxLength={128}
            autoComplete={register ? "new-password" : "current-password"}
          />
        </label>
        {register && (
          <>
            <small>密码至少 12 位。当前没有邮箱找回功能，请妥善保存。</small>
            <AvatarInput value={avatar} onChange={setAvatar} />
            <label className="community-checkbox">
              <input type="checkbox" required />
              我同意<Link href="/community-rules">社区规则</Link>和
              <Link href="/privacy">隐私说明</Link>
            </label>
          </>
        )}
        {error && <p role="alert">{error}</p>}
        <button className="button primary" disabled={busy}>
          {busy ? "处理中…" : register ? "注册并登录" : "登录"}
        </button>
      </form>
      <p>
        {register ? "已有账号？" : "还没有账号？"}
        <Link href={register ? "/login" : "/register"}>
          {register ? "去登录" : "创建账号"}
        </Link>
      </p>
    </section>
  );
}
export function Account() {
  const { user, loading, setUser } = useContext(Auth);
  const nav = useNavigate();
  const [avatar, setAvatar] = useState<string | null | undefined>(),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  if (loading) return <p role="status">正在加载账号…</p>;
  if (!user)
    return (
      <section className="page-intro">
        <h1>个人账号</h1>
        <Link className="button primary" href="/login">
          请先登录
        </Link>
      </section>
    );
  return (
    <div className="community-auth panel">
      <h1>个人资料</h1>
      {author(user)}
      <p>账号：{user.username}</p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const d = new FormData(e.currentTarget);
          setBusy(true);
          setMessage("");
          try {
            const result = await communityApi("/profile", "PUT", {
              nickname: d.get("nickname"),
              ...(avatar === undefined ? {} : { avatar }),
            });
            setUser(result.user);
            setAvatar(undefined);
            setMessage("资料已保存");
          } catch (e) {
            setMessage((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          昵称
          <input
            name="nickname"
            defaultValue={user.nickname}
            required
            maxLength={24}
          />
        </label>
        <AvatarInput
          value={avatar === undefined ? user.avatar : avatar}
          onChange={setAvatar}
        />
        <button className="button primary" disabled={busy}>
          保存资料
        </button>
      </form>
      <h2>修改密码</h2>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const d = new FormData(e.currentTarget);
          setBusy(true);
          try {
            await communityApi("/password", "POST", {
              oldPassword: d.get("old"),
              password: d.get("new"),
            });
            setUser(null);
            nav("/login");
          } catch (e) {
            setMessage((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          当前密码
          <input
            type="password"
            name="old"
            required
            autoComplete="current-password"
          />
        </label>
        <label>
          新密码
          <input
            type="password"
            name="new"
            minLength={12}
            maxLength={128}
            required
            autoComplete="new-password"
          />
        </label>
        <button className="button" disabled={busy}>
          修改密码并退出登录
        </button>
      </form>
      {message && <p role="status">{message}</p>}
      <button
        className="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await communityApi("/logout", "POST");
            setUser(null);
            nav("/forum");
          } catch (e) {
            setMessage((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        退出账号
      </button>
    </div>
  );
}
function ForumPager({
  page,
  total,
  size = 12,
}: {
  page: number;
  total: number;
  size?: number;
}) {
  const [params] = useSearchParams();
  const link = (n: number) => {
    const p = new URLSearchParams(params);
    p.set("page", String(n));
    return "?" + p;
  };
  return (
    <nav className="pagination" aria-label="论坛分页">
      {page > 1 && (
        <Link className="button" href={link(page - 1)}>
          上一页
        </Link>
      )}
      <span>
        第 {page} 页 / 共 {Math.max(1, Math.ceil(total / size))} 页
      </span>
      {page * size < total && (
        <Link className="button" href={link(page + 1)}>
          下一页
        </Link>
      )}
    </nav>
  );
}
function useCommunityData<T>(url: string) {
  const [data, setData] = useState<T | null>(null),
    [error, setError] = useState(""),
    [version, setVersion] = useState(0);
  useEffect(() => {
    let active = true;
    setData(null);
    setError("");
    communityApi(url)
      .then((d) => {
        if (active) setData(d);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [url, version]);
  return { data, error, refresh: () => setVersion((v) => v + 1) };
}
export function Forum() {
  const [params] = useSearchParams();
  const { data, error, refresh } = useCommunityData<{
    items: ForumPost[];
    total: number;
    page: number;
  }>("/posts?" + params);
  return (
    <div className="community-hub">
      <header className="community-hero">
        <div>
          <div className="eyebrow">BUILD · SHARE · DISCUSS</div>
          <h1>有问题，一起找门道。</h1>
          <p>分享工具与方法，讨论游戏、3D、视频和 AI 创作。</p>
        </div>
        <Link className="button primary" href="/forum/new">
          发起讨论
        </Link>
      </header>
      <p className="community-notice">
        分享具体问题、制作过程和可复现的方法。
        <Link href="/community-rules">社区规则 →</Link>
      </p>
      <form className="hub-filter" action={appPath("/forum")}>
        <input
          name="q"
          aria-label="搜索论坛"
          placeholder="搜索话题或内容"
          defaultValue={params.get("q") || ""}
          maxLength={100}
        />
        <select
          name="category"
          aria-label="论坛分类"
          defaultValue={params.get("category") || ""}
        >
          <option value="">全部分类</option>
          {forumCategories.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <button className="button">搜索</button>
        <Link href="/forum">重置</Link>
      </form>
      {error && (
        <p role="alert">
          {error}{" "}
          <button className="button" onClick={refresh}>
            重试
          </button>
        </p>
      )}
      {!data && !error && <p role="status">正在加载讨论…</p>}
      {data && (
        <>
          <p className="micro">{data.total} 个话题 · 按发布时间排序</p>
          <div className="forum-list">
            {data.items.map((p) => (
              <article className="forum-card panel" key={p.id}>
                <div className="forum-meta">
                  <span className="badge neutral">{p.category}</span>
                  <span>{date(p.createdAt)}</span>
                </div>
                <h2>
                  <Link href={"/forum/" + p.id}>{p.title}</Link>
                </h2>
                <p>{p.body}</p>
                <div className="forum-meta">
                  {author(p.author)}
                  <span>{p.replies} 条回复</span>
                  <Link href={"/forum/" + p.id}>查看讨论 →</Link>
                </div>
              </article>
            ))}
          </div>
          {!data.items.length && (
            <p className="empty-panel">
              还没有匹配的讨论。可以换个关键词，或发起一个新话题。
            </p>
          )}
          <ForumPager page={data.page} total={data.total} />
        </>
      )}
    </div>
  );
}
function PostFields({ post }: { post?: ForumPost }) {
  return (
    <>
      <label>
        标题
        <input
          name="title"
          minLength={6}
          maxLength={120}
          required
          defaultValue={post?.title}
          placeholder="用一句话说明你想讨论的问题"
        />
      </label>
      <label>
        分类
        <select
          name="category"
          defaultValue={post?.category || forumCategories[0]}
        >
          {forumCategories.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </label>
      <label>
        正文
        <textarea
          name="body"
          minLength={10}
          maxLength={20000}
          rows={12}
          required
          defaultValue={post?.body}
          placeholder="说明目标、尝试过的方法和需要帮助的地方。请不要发布隐私或密钥。"
        />
      </label>
      <small>纯文本内容，不执行 HTML。不支持附件；最多 20000 字符。</small>
    </>
  );
}
export function NewPost() {
  const { user, loading } = useContext(Auth);
  const nav = useNavigate();
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  if (loading) return <p role="status">正在加载账号…</p>;
  if (!user)
    return (
      <section className="community-auth panel">
        <h1>登录后发起讨论</h1>
        <Link className="button primary" href="/login">
          登录
        </Link>
        <Link className="button" href="/register">
          注册账号
        </Link>
      </section>
    );
  return (
    <section className="community-editor panel">
      <Link href="/forum">← 返回社区</Link>
      <h1>发起讨论</h1>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const d = Object.fromEntries(new FormData(e.currentTarget));
          setBusy(true);
          setError("");
          try {
            const r = await communityApi("/posts", "POST", d);
            nav("/forum/" + r.id);
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <PostFields />
        {error && <p role="alert">{error}</p>}
        <button className="button primary" disabled={busy}>
          {busy ? "发布中…" : "发布讨论"}
        </button>
      </form>
    </section>
  );
}
export function PostDetail() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const { user } = useContext(Auth);
  const nav = useNavigate();
  const { data, error, refresh } = useCommunityData<{
    post: ForumPost;
    replies: ForumReply[];
    total: number;
    page: number;
  }>("/posts/" + encodeURIComponent(id || "") + "?" + params);
  const [editing, setEditing] = useState(false),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  if (error)
    return (
      <section className="page-intro">
        <h1>暂时无法打开讨论</h1>
        <p role="alert">{error}</p>
        <button className="button" onClick={refresh}>
          重试
        </button>
        <Link href="/forum">返回论坛</Link>
      </section>
    );
  if (!data) return <p role="status">正在加载讨论…</p>;
  const p = data.post;
  return (
    <div className="community-detail">
      <Link href="/forum">← 返回论坛</Link>
      <article className="panel forum-card">
        <div className="forum-meta">
          <span>{p.category}</span>
        </div>
        <h1>{p.title}</h1>
        <div className="forum-meta">
          {author(p.author)}
          <span>{date(p.createdAt)}</span>
          {p.revision > 1 && <span>已编辑</span>}
        </div>
        {editing ? (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              try {
                await communityApi("/posts/" + p.id, "PUT", {
                  ...Object.fromEntries(new FormData(e.currentTarget)),
                  revision: p.revision,
                });
                setEditing(false);
                refresh();
              } catch (e) {
                setMessage((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <PostFields post={p} />
            <div className="action-row">
              <button className="button primary" disabled={busy}>
                保存修改
              </button>
              <button
                className="button"
                type="button"
                onClick={() => setEditing(false)}
              >
                取消
              </button>
            </div>
          </form>
        ) : (
          <div className="forum-body">{p.body}</div>
        )}
        {user?.id === p.author.id && !editing && (
          <div className="action-row">
            <button className="button" onClick={() => setEditing(true)}>
              编辑帖子
            </button>
            <button
              className="button"
              disabled={busy}
              onClick={async () => {
                if (!confirm("确认删除这篇帖子？")) return;
                setBusy(true);
                try {
                  await communityApi("/posts/" + p.id, "DELETE");
                  nav("/forum");
                } catch (e) {
                  setMessage((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              删除帖子
            </button>
          </div>
        )}
      </article>
      <section className="panel forum-card">
        <h2>{data.total} 条回复</h2>
        {data.replies.map((r) => (
          <article className="forum-reply" key={r.id}>
            <div className="forum-meta">
              {author(r.author)}
              <span>{date(r.createdAt)}</span>
            </div>
            <p className="forum-body">{r.body}</p>
            {user?.id === r.author.id && (
              <button
                className="button"
                disabled={busy}
                onClick={async () => {
                  if (!confirm("删除这条回复？")) return;
                  setBusy(true);
                  try {
                    await communityApi("/replies/" + r.id, "DELETE");
                    refresh();
                  } catch (e) {
                    setMessage((e as Error).message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                删除回复
              </button>
            )}
          </article>
        ))}
        {!data.replies.length && <p>还没有回复，说说你的看法吧。</p>}
        <ForumPager page={data.page} total={data.total} size={20} />
        {user ? (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const form = e.currentTarget,
                body = new FormData(form).get("body");
              setBusy(true);
              setMessage("");
              try {
                await communityApi("/posts/" + p.id + "/replies", "POST", {
                  body,
                });
                form.reset();
                nav(
                  "/forum/" +
                    p.id +
                    "?page=" +
                    Math.ceil((data.total + 1) / 20),
                );
                refresh();
              } catch (e) {
                setMessage((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <label>
              写下回复
              <textarea
                name="body"
                required
                minLength={2}
                maxLength={5000}
                rows={4}
              />
            </label>
            <button className="button primary" disabled={busy}>
              发表回复
            </button>
          </form>
        ) : (
          <p>
            <Link href="/login">登录</Link>或<Link href="/register">注册</Link>
            后参与讨论。
          </p>
        )}
      </section>
      {message && <p role="alert">{message}</p>}
    </div>
  );
}
export function CommunityRules() {
  return (
    <article className="prose">
      <h1>社区规则</h1>
      <p>
        围绕 AI 工具、创作与学习交流。发帖时写清目标、步骤和依据，尊重不同观点。
      </p>
      <h2>内容要求</h2>
      <p>
        不要发布他人隐私、密码、密钥、侵权材料、垃圾广告或针对他人的辱骂。明确区分真实经历、个人推测和示例，不冒充他人。论坛内容由发布者提供，不等于站点审核后的事实。
      </p>
      <h2>管理与示例</h2>
      <p>
        管理员可以下架帖子和回复、禁用违规账号。部分账号和话题由站点预置，用于提供讨论起点；预置账号不开放登录，这些内容不代表真实用户经历或活跃人数。
      </p>
      <h2>账号与数据</h2>
      <p>
        昵称、头像和讨论内容公开可见。账号使用密码登录，没有邮箱验证或自动找回功能，请妥善保管密码。发帖与回复有频率限制。删除内容后对外不可见，后台及备份可能保留记录用于维护。
      </p>
      <Link href="/forum">返回社区</Link>
    </article>
  );
}
