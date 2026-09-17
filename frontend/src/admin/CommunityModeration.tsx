import { useEffect, useState } from "react";
import { appPath } from "@/base";
import { Avatar } from "@/Community";
import type { CommunityUser, ForumPost, ForumReply } from "@shared/community";
type Item = Partial<ForumPost & ForumReply & CommunityUser> & {
  id: string;
  disabled?: boolean;
};
export default function CommunityModeration({
  usersOnly = false,
}: {
  usersOnly?: boolean;
}) {
  const [q, setQ] = useState(""),
    [search, setSearch] = useState(""),
    [type, setType] = useState(""),
    [state, setState] = useState("");
  const [kind, setKind] = useState(usersOnly ? "users" : "posts"),
    [page, setPage] = useState(1),
    [version, setVersion] = useState(0),
    [busy, setBusy] = useState(false),
    [data, setData] = useState<{ items: Item[]; total: number } | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    setData(null);
    setError("");
    fetch(
      appPath(
        `/api/admin/community/${kind}?${new URLSearchParams({ page: String(page), q: search, type, state })}`,
      ),
    )
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw Error(d.error);
        if (active) setData(d);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [kind, page, version, search, type, state]);
  async function toggle(item: Item) {
    const enabled =
      kind === "users" ? !!item.disabled : item.status !== "visible";
    if (!confirm((enabled ? "恢复" : "停用/下架") + "这条记录？")) return;
    setBusy(true);
    try {
      const r = await fetch(
        appPath(`/api/admin/community/${kind}/${item.id}/status`),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ enabled }),
        },
      );
      const d = await r.json();
      if (!r.ok) throw Error(d.error);
      setVersion((v) => v + 1);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="community-moderation">
      <h1>{usersOnly ? "用户管理" : "社区管理"}</h1>
      <p>
        管理帖子、回复和账号；示例数据与真实注册用户均保存在数据库，标记分别显示。禁用用户会撤销其登录会话，已发布内容可单独下架。
      </p>
      <div className="action-row">
        {!usersOnly &&
          [
            ["posts", "帖子"],
            ["replies", "回复"],
          ].map(([id, label]) => (
            <button
              className={kind === id ? "button primary" : "button"}
              key={id}
              onClick={() => {
                setData(null);
                setKind(id);
                setPage(1);
              }}
            >
              {label}
            </button>
          ))}
        <button className="button" onClick={() => setVersion((v) => v + 1)}>
          刷新
        </button>
      </div>
      {usersOnly && (
        <form
          className="hub-filter"
          onSubmit={(e) => {
            e.preventDefault();
            setSearch(q);
            setPage(1);
          }}
        >
          <input
            aria-label="搜索用户"
            placeholder="搜索账号或昵称"
            value={q}
            maxLength={100}
            onChange={(e) => setQ(e.target.value)}
          />
          <select
            aria-label="账号类型"
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              setPage(1);
            }}
          >
            <option value="">全部账号</option>
            <option value="registered">注册用户</option>
            <option value="preset">预置账号</option>
          </select>
          <select
            aria-label="账号状态"
            value={state}
            onChange={(e) => {
              setState(e.target.value);
              setPage(1);
            }}
          >
            <option value="">全部状态</option>
            <option value="active">正常</option>
            <option value="disabled">已禁用</option>
          </select>
          <button className="button primary">搜索</button>
          <button
            type="button"
            className="button"
            onClick={() => {
              setQ("");
              setSearch("");
              setType("");
              setState("");
              setPage(1);
            }}
          >
            重置
          </button>
        </form>
      )}
      {error && <p role="alert">{error}</p>}
      {!data && !error && <p role="status">正在加载社区数据…</p>}
      {data && (
        <>
          <p>共 {data.total} 条记录</p>
          {data.items.map((item) => (
            <article className="panel" key={item.id}>
              {kind === "users" ? (
                <>
                  <Avatar
                    user={{
                      nickname: item.nickname!,
                      avatar: item.avatar ?? null,
                    }}
                  />
                  <strong> {item.nickname}</strong>
                  <p>
                    账号：{item.username} · {item.disabled ? "已禁用" : "正常"}
                    <br />
                    注册时间：
                    {new Date(item.createdAt!).toLocaleString("zh-CN")}
                  </p>
                </>
              ) : (
                <>
                  <h2>{item.title || "回复"}</h2>
                  <p>
                    作者：{item.author?.nickname} · 状态：{item.status}
                  </p>
                  <div className="forum-body">{item.body}</div>
                </>
              )}
              <p>{item.demo ? "示例账号/内容" : "用户注册/发布"}</p>
              {(!item.demo && kind === "users") || kind !== "users" ? (
                <button
                  className="button"
                  disabled={busy || item.status === "deleted"}
                  onClick={() => void toggle(item)}
                >
                  {kind === "users"
                    ? item.disabled
                      ? "恢复账号"
                      : "禁用账号"
                    : item.status === "visible"
                      ? "下架"
                      : "恢复展示"}
                </button>
              ) : (
                <small>示例账号不开放登录</small>
              )}
            </article>
          ))}
          {!data.items.length && <p>暂无记录</p>}
          <nav className="pagination">
            {page > 1 && (
              <button className="button" onClick={() => setPage((p) => p - 1)}>
                上一页
              </button>
            )}
            <span>第 {page} 页</span>
            {page * 20 < data.total && (
              <button className="button" onClick={() => setPage((p) => p + 1)}>
                下一页
              </button>
            )}
          </nav>
        </>
      )}
    </section>
  );
}
