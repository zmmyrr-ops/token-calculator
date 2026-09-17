import { useEffect, useState } from "react";
import { appPath } from "@/base";
type Settings = {
  news: boolean;
  forum: boolean;
  updatedAt?: string;
  wechat: { configured: boolean; appId: string };
};
export default function MiniSettings() {
  const [data, setData] = useState<Settings | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  async function load() {
    setError("");
    try {
      const r = await fetch(appPath("/api/admin/mini-settings"));
      const d = await r.json();
      if (!r.ok) throw Error(d.error);
      setData(d);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  async function save() {
    if (!data) return;
    setBusy(true);
    setMessage("");
    setError("");
    try {
      const r = await fetch(appPath("/api/admin/mini-settings"), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ news: data.news, forum: data.forum }),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error);
      setData(d);
      setMessage(
        "已保存，小程序接口立即生效；入口在下次刷新或前台同步时更新。",
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel">
      <h1>小程序设置</h1>
      <p>
        保留全部内容，只控制小程序模块是否开放。网站资讯与论坛不受影响。开关对所有小程序用户统一生效，入口在刷新或前台同步时更新。
      </p>
      {error && <p role="alert">{error}</p>}
      {!data ? (
        <button className="button" onClick={() => void load()}>
          重新加载设置
        </button>
      ) : (
        <>
          <div className="panel">
            <h2>模块开放</h2>
            <label>
              <input
                type="checkbox"
                checked={data.news}
                onChange={(e) => setData({ ...data, news: e.target.checked })}
              />{" "}
              开放小程序资讯
            </label>
            <p>显示资讯 Tab、图文列表和资讯详情。</p>
            <label>
              <input
                type="checkbox"
                checked={data.forum}
                onChange={(e) => setData({ ...data, forum: e.target.checked })}
              />{" "}
              开放小程序社区论坛
            </label>
            <p>
              显示社区入口，并允许浏览帖子、发帖和回复。关闭不会删除已有内容。
            </p>
            <button
              className="button primary"
              disabled={busy}
              onClick={() => void save()}
            >
              {busy ? "保存中…" : "保存模块设置"}
            </button>
            {message && <p role="status">{message}</p>}
            {data.updatedAt && (
              <small>
                最近修改：{new Date(data.updatedAt).toLocaleString("zh-CN")}
              </small>
            )}
          </div>
          <div className="panel">
            <h2>微信登录</h2>
            <p>AppID：{data.wechat.appId}</p>
            <p>服务端凭据：{data.wechat.configured ? "已配置" : "尚未配置"}</p>
            <p>
              首次微信登录自动注册并标记为“小程序”，OpenID
              关联在用户管理中查看。AppSecret 和微信 session_key
              不向客户端返回。
            </p>
          </div>
          <p>
            提审前请如实选择与实际功能匹配的服务类目；关闭模块不代表具备相应上线资格。
          </p>
        </>
      )}
    </section>
  );
}
