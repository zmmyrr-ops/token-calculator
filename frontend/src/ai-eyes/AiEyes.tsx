import FeatureGuide from "../components/FeatureGuide";
import { MobileEyes } from "./MobileEyes";
import { CloudSaveButton } from "../workspace/Workspace";
import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  type EyesRun,
  type EyesPersona,
  type EyesSelection,
  eyesCatalog,
  eyesArt,
} from "@shared/ai-eyes";
import { appPath } from "../base";
import { analyticsEnabled } from "../Analytics";
import { exportEyes, saveBlob } from "./export";
import "./eyes.css";
let pendingInstruction = "",
  pendingClaim = "";
const API = "/api/v1/ai-eyes";
export async function eyesApi(path: string, method = "GET", body?: unknown) {
  const response = await fetch(appPath(API + path), {
    method,
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) throw Error(data.error || "操作失败，请重试");
  return data;
}
function event(name: string) {
  if (!analyticsEnabled()) return;
  void eyesApi("/events", "POST", { event: name }).catch(() => {});
}
function Content({ p }: { p: EyesPersona }) {
  return (
    <article className="eyes-paper">
      {p.blocks.map((b) => {
        const content = b.runs.map((r, i) =>
          r.bold ? <strong key={i}>{r.text}</strong> : r.text,
        );
        return b.kind === "h2" ? (
          <h2 key={b.id}>{content}</h2>
        ) : b.kind === "h3" ? (
          <h3 key={b.id} id={b.id}>
            {content}
          </h3>
        ) : (
          <p key={b.id}>{content}</p>
        );
      })}
    </article>
  );
}
function ExportPanel({ p, nickname }: { p: EyesPersona; nickname: string }) {
  const [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [image, setImage] = useState<{ blob: Blob; url: string } | null>(null);
  useEffect(
    () => () => {
      if (image) URL.revokeObjectURL(image.url);
    },
    [image],
  );
  async function generate() {
    setBusy(true);
    setImage(null);
    try {
      const [blob] = await exportEyes(p, nickname, "", "cover", setMessage);
      setImage({ blob, url: URL.createObjectURL(blob) });
      event("export_cover");
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="eyes-exports">
      <h3>你的专属人格封面</h3>
      <p>
        把 AI 眼里的自己保存下来。图片含网站入口，保存不会公开你的报告。
      </p>
      <button
        className="button primary"
        disabled={busy}
        onClick={() => void generate()}
      >
        {busy ? "正在绘制封面…" : image ? "重新生成封面" : "生成我的封面"}
      </button>
      <p role="status">{message}</p>
      {image && (
        <div className="eyes-export-preview">
          <figure>
            <img src={image.url} alt={p.name + "专属封面"} />
            <button
              className="button"
              onClick={() => {
                saveBlob(image.blob, `${p.id}-cover.png`);
                event("download_image");
              }}
            >
              保存封面
            </button>
          </figure>
        </div>
      )}
    </section>
  );
}
function Result({ run, refresh }: { run: EyesRun; refresh: () => void }) {
  const [selection, setSelection] = useState<EyesSelection>({
      personaId: run.result!.persona_id,
      nickname: run.selection?.nickname || "我",
    }),
    [notice, setNotice] = useState(""),
    [confirming, setConfirming] = useState(false);
  const p = eyesCatalog.items.find((x) => x.id === selection.personaId)!;
  async function share() {
    try {
      const d = await eyesApi(`/runs/${run.id}/share`, "POST", {
        confirmed: true,
        selection,
      });
      setNotice(new URL(appPath("/ai-eyes/s/" + d.id), location.origin).href);
      setConfirming(false);
      refresh();
    } catch (e) {
      setNotice((e as Error).message);
    }
  }
  return (
    <>
      <div className="eyes-result-header">
        <div>
          <span className="eyes-label">
            {selection.personaId === run.result!.persona_id
              ? "本次推荐"
              : "自选浏览 · 不覆盖原推荐"}
          </span>
          <h1>{p.name}</h1>
          <p>{p.keyword}</p>
          <p>趣味画像 · 文案演绎，非心理测试</p>
        </div>
        <img src={appPath(eyesArt(p.id))} alt={p.name + "人物插画"} />
      </div>
      <aside className="eyes-private">
        <h3>为什么推荐这一型 · 仅自己可见</h3>
        <p>
          {run.scope.source === "mobile_import" ? `${run.scope.platform} · ${run.scope.basis === "questions" ? "基于本次问答" : "基于可见对话"}。${run.scope.matcherVersion ? "用户提供行为统计，由本站规则匹配" : "用户粘贴导入"}，非平台认证的历史分析。` : run.result!.sample_scope === "limited"
            ? "本次可用样本有限，结果仅供娱乐参考。"
            : "根据范围内多个会话的交流方式进行推荐。"}
        </p>
        {run.result!.match_notes.map((x, i) => (
          <p key={i}>{x}</p>
        ))}
      </aside>
      <div className="eyes-controls">
        <label>
          封面昵称（最多12个可见字符）
          <input
            value={selection.nickname}
            maxLength={48}
            onChange={(e) =>
              setSelection({ ...selection, nickname: e.target.value })
            }
          />
        </label>
        <button
          className="button"
          onClick={() =>
            void eyesApi(`/runs/${run.id}/selection`, "POST", selection)
              .then(() => {
                setNotice("昵称已保存");
                refresh();
              })
              .catch((e) => setNotice(e.message))
          }
        >
          保存昵称
        </button>
      </div>
      <Content p={p} />
      <ExportPanel
        key={p.id + selection.nickname}
        p={p}
        nickname={selection.nickname}
      />
      <section className="eyes-private">
        <h3>主动公开分享</h3>
        <p>只公开昵称、你的类型与原文；不会公开匹配说明和聊天。</p>
        <button className="button primary" onClick={() => setConfirming(true)}>
          预览分享内容
        </button>
        {confirming && (
          <div className="eyes-share-confirm">
            <h4>
              即将公开：{selection.nickname} · {p.name}
            </h4>
            <p>
              {selection.personaId === run.result!.persona_id
                ? "本次推荐"
                : "自选分享"}{" "}
              · 下方全文即为公开正文
            </p>
            <details>
              <summary>展开完整公开内容</summary>
              <Content p={p} />
            </details>
            <button className="button primary" onClick={() => void share()}>
              确认公开（替换旧分享）
            </button>
            <button className="button" onClick={() => setConfirming(false)}>
              取消
            </button>
          </div>
        )}
        {run.shareId && (
          <p>
            <CloudSaveButton item={{title:p.name+" · AI眼里的你",kind:"画像",href:"/ai-eyes/s/"+run.shareId,note:"公开报告，撤销分享或报告过期后将无法访问。"}}/>
            <a href={appPath("/ai-eyes/s/" + run.shareId)}>打开当前公开报告</a>{" "}
            ·{" "}
            <button
              className="button"
              onClick={() =>
                void eyesApi(`/runs/${run.id}/share`, "DELETE")
                  .then(() => {
                    setNotice("分享已撤销");
                    refresh();
                  })
                  .catch((e) => setNotice(e.message))
              }
            >
              撤销分享
            </button>
          </p>
        )}
        <p role="status" className="eyes-wrap">
          {notice}
        </p>
      </section>
      <Feedback id={run.id} />
    </>
  );
}
function Feedback({ id }: { id: string }) {
  const [fun, setFun] = useState("有意思"),
    [recognition, setRecognition] = useState("暂不评价"),
    [reading, setReading] = useState("舒服"),
    [status, setStatus] = useState("");
  return (
    <section className="eyes-private">
      <h3>这份报告读起来怎么样？</h3>
      <div className="eyes-controls">
        {[
          [fun, setFun, ["有意思", "一般", "没感觉"]],
          [recognition, setRecognition, ["有点像我", "不太像", "暂不评价"]],
          [reading, setReading, ["舒服", "太密", "字太小"]],
        ].map(([value, set, options], i) => (
          <select
            aria-label={["趣味反馈", "认领反馈", "阅读反馈"][i]}
            key={i}
            value={value as string}
            onChange={(e) => (set as (v: string) => void)(e.target.value)}
          >
            {(options as string[]).map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
        ))}
        <button
          className="button"
          onClick={() =>
            void eyesApi(`/runs/${id}/feedback`, "POST", {
              fun,
              recognition,
              reading,
            })
              .then(() => setStatus("感谢反馈"))
              .catch((e) => setStatus(e.message))
          }
        >
          提交反馈
        </button>
      </div>
      <p role="status">{status}</p>
    </section>
  );
}
export default function AiEyes() {
  const loc = useLocation(),
    nav = useNavigate(),
    params = useParams();
  const [entry, setEntry] = useState<"codex" | "mobile" | null>(null);
  const [days, setDays] = useState(7),
    [consent, setConsent] = useState(false),
    [error, setError] = useState(""),
    [run, setRun] = useState<EyesRun | null>(null),
    [instruction, setInstruction] = useState(pendingInstruction),
    [claim, setClaim] = useState(pendingClaim),
    [busy, setBusy] = useState(false),
    [share, setShare] = useState<
      (EyesSelection & { selectionMode: string; source?: string }) | null
    >(null),
    [refresh, setRefresh] = useState(0),
    [enabled, setEnabled] = useState(true);
  const isRun = loc.pathname.includes("/runs/"),
    isShare = loc.pathname.includes("/s/"),
    isClaim = loc.pathname.endsWith("/claim");
  useEffect(() => {
    setError("");
    setRun(null);
    setShare(null);
    if (!isRun && !isShare)
      void eyesApi("/config")
        .then((d) => setEnabled(d.enabled))
        .catch((e) => setError(e.message));
  }, [loc.pathname, isRun, isShare]);
  useEffect(() => {
    if (!isRun || !params.id) return;
    let stopped = false,
      timer: ReturnType<typeof setTimeout>,
      count = 0;
    const poll = async () => {
      try {
        const d = await eyesApi("/runs/" + params.id);
        if (stopped) return;
        setRun(d);
        if (["waiting", "running"].includes(d.status))
          timer = setTimeout(
            () => void poll(),
            Math.min(10000, 3000 + count++ * 1000),
          );
      } catch (e) {
        if (!stopped) setError((e as Error).message);
      }
    };
    void poll();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [isRun, params.id, refresh]);
  useEffect(() => {
    if (isShare && params.id) {
      let active = true;
      void eyesApi("/shares/" + params.id)
        .then((d) => {
          if (active) setShare(d);
        })
        .catch((e) => {
          if (active) setError(e.message);
        });
      return () => {
        active = false;
      };
    }
  }, [isShare, params.id, refresh]);
  async function create() {
    setBusy(true);
    setError("");
    try {
      const manifest = await fetch(
        appPath("/ai-eyes-tool/v4/manifest.json"),
      ).then((r) => r.text());
      const digest = Array.from(
        new Uint8Array(
          await crypto.subtle.digest(
            "SHA-256",
            new TextEncoder().encode(manifest),
          ),
        ),
      )
        .map((x) => x.toString(16).padStart(2, "0"))
        .join("");
      const d = await eyesApi("/runs", "POST", {
        days,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
      const base = new URL(appPath(API), location.origin).href;
      const link =
        new URL(appPath("/ai-eyes/claim"), location.origin).href +
        "#token=" +
        d.claimToken;
      pendingClaim = link;
      setClaim(link);
      const text = `AI_EYES_EXECUTION_V4\n请执行“AI 眼里的你”，仅在本次任务读取我明确授权的本机 Codex 历史。\n范围：${d.run.scope.start} 至 ${d.run.scope.end}，最多10会话、每会话15条用户消息、总计20000可见字符。\n请先阅读 ${new URL(appPath("/ai-eyes-tool/v4/instructions.md"), location.origin).href}\n清单：${new URL(appPath("/ai-eyes-tool/v4/manifest.json"), location.origin).href}\n清单 SHA-256：${digest}\n只提交固定16型ID与最多两条脱敏概括，禁止上传样本和原句；无样本如实失败。\n任务ID：${d.run.id}\nAPI base：${base}\nsubmit_token：${d.submitToken}\n领取链接：${link}\n请把凭证放私有临时配置文件，不打印、不放命令参数，不修改历史或项目。不要把本指令或令牌用于公开分享。`;
      pendingInstruction = text;
      setInstruction(text);
      nav("/ai-eyes/runs/" + d.run.id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function redeem() {
    setBusy(true);
    try {
      const token = new URLSearchParams(location.hash.slice(1)).get("token");
      const d = await eyesApi("/claims/redeem", "POST", { token });
      history.replaceState(null, "", location.pathname);
      nav("/ai-eyes/runs/" + d.id, { replace: true });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setError("已复制，请勿公开含凭证的指令");
    } catch {
      setError("复制失败，请手动选择文本复制");
    }
  }
  const publicPersona = share
    ? eyesCatalog.items.find((p) => p.id === share.personaId)
    : undefined;
  return (
    <div className="eyes">
      <div className="eyes-top">
        <Link to="/ai-eyes">AI 眼里的你</Link>
        <Link to="/personas">AI 人格 Skill ↗</Link>
      </div>
      {error && (
        <p role="status" className="eyes-notice">
          {error}
          <button
            onClick={() => {
              setError("");
              setRefresh((x) => x + 1);
            }}
          >
            重试读取
          </button>
        </p>
      )}
      {isClaim ? (
        <section className="eyes-paper">
          <h1>领取你的完整报告</h1>
          <p>
            点击后兑换查看权限；预览链接不会消耗领取机会。链接24小时内有效，领取后请保留此浏览器。
          </p>
          <button
            className="button primary"
            disabled={busy}
            onClick={() => void redeem()}
          >
            领取报告
          </button>
        </section>
      ) : isShare ? (
        publicPersona && share ? (
          <>
            <header className="eyes-result-header">
              <div>
                <span>
                  {share.nickname} ·{" "}
                  {share.selectionMode === "self_selected"
                    ? "自选分享"
                    : "推荐分享"}
                </span>
                <h1>{publicPersona.name}</h1>
                {share.source === "mobile_import" && <p>用户导入的 AI 趣味画像 · 非平台认证</p>}
                <p>趣味画像 · 文案演绎，非心理测试</p>
                <Link className="button primary" to="/ai-eyes">
                  看看 AI 眼里的我
                </Link>
              </div>
              <img
                src={appPath(eyesArt(publicPersona.id))}
                alt={publicPersona.name}
              />
            </header>
            <Content p={publicPersona} />
            <ExportPanel p={publicPersona} nickname={share.nickname} />
          </>
        ) : (
          !error && <p>正在打开报告…</p>
        )
      ) : isRun ? (
        run ? (
          <>
            {run.status === "completed" ? (
              <Result run={run} refresh={() => setRefresh((x) => x + 1)} />
            ) : (
              <section className="eyes-paper">
                <h1>
                  {
                    {
                      waiting: "等待你在 Codex 发送",
                      running: "Codex 正在处理",
                      failed: "执行未完成",
                      insufficient_data: "样本不足",
                      cancelled: "任务已取消",
                      expired: "任务已到期",
                    }[run.status]
                  }
                </h1>
                <p>
                  阶段：
                  {(
                    {
                      waiting: "尚未收到执行回报",
                      collecting: "整理聊天",
                      matching: "匹配角色",
                      validating: "校验提交",
                    } as Record<string, string>
                  )[run.phase] || run.phase}
                </p>
                <p>
                  提交截止：{new Date(run.deadline).toLocaleString()} · 范围{" "}
                  {run.scope.days} 天
                </p>
                <p>{run.error}</p>
                {instruction && instruction.includes("任务ID：" + run.id) ? (
                  <>
                    <textarea
                      aria-label="专属执行指令"
                      readOnly
                      rows={12}
                      value={instruction}
                    />
                    <button
                      className="button primary"
                      onClick={() =>
                        void copy(instruction).then(() =>
                          event("copy_instruction"),
                        )
                      }
                    >
                      复制专属指令
                    </button>
                    <p>
                      到 Codex
                      新建会话，粘贴并发送。可能需要批准文件或网络访问；不是全程离线分析。
                    </p>
                    <p className="eyes-wrap">
                      领取链接（勿公开）：<a href={claim}>{claim}</a>
                    </p>
                  </>
                ) : (
                  <p>
                    刷新后不会再次显示提交密钥。已复制的指令仍可使用；若尚未保存，请取消并新建任务。
                  </p>
                )}
                {["waiting", "running"].includes(run.status) && (
                  <button
                    className="button"
                    onClick={() =>
                      void eyesApi("/runs/" + run.id + "/cancel", "POST", {})
                        .then(() => setRefresh((x) => x + 1))
                        .catch((e) => setError(e.message))
                    }
                  >
                    取消任务
                  </button>
                )}
                <Link className="button" to="/ai-eyes">
                  返回重新创建
                </Link>
              </section>
            )}
            <p>
              保存至 {new Date(run.expires).toLocaleString()}。
              <button
                className="button"
                onClick={() => {
                  if (confirm("删除结果并撤销全部分享？无法撤回已下载图片。"))
                    void eyesApi("/runs/" + run.id, "DELETE")
                      .then(() => nav("/ai-eyes"))
                      .catch((e) => setError(e.message));
                }}
              >
                删除结果
              </button>
            </p>
          </>
        ) : (
          !error && <p>正在读取任务…</p>
        )
      ) : (
        <>
          <>
            <a href="#eyes-usage-guide" className="eyes-label">使用步骤与常见问题 ↓</a>
            <header className="eyes-hero eyes-entry-hero">
              <div>
                <span className="eyes-label">
                  A DIFFERENT KIND OF SELF-PORTRAIT
                </span>
                <h1>
                  AI 眼里的你：
                  <br />
                  它会怎么形容你？
                </h1>
                <p>这不是心理测试。</p>
                <p>这是一个被你使唤了很久的 AI，对你偷偷做出的工作总结。</p>
                <small>趣味画像 · 文案演绎，非心理测试</small>

              </div>
              <img
                src={appPath(eyesArt("one_line_ceo"))}
                alt="一句话 CEO 与忙碌的 AI 助手"
              />
            </header>
            <div className="eyes-entry-grid" aria-label="选择使用平台">
              <article className={"eyes-entry-card" + (entry === "codex" ? " is-selected" : "")}>
                <span className="eyes-entry-symbol" aria-hidden="true">⌘</span>
                <span className="eyes-label">电脑端 · 本机历史</span>
                <h2>Codex</h2>
                <p>让熟悉你工作方式的 AI，从本机对话里发现你的使用习惯。</p>
                <small>复制专属指令 → 执行分析 → 自动领取</small>
                <button className="button primary" aria-expanded={entry === "codex"} aria-controls="eyes-codex-flow" onClick={() => setEntry("codex")}>使用 Codex</button>
              </article>
              <article className={"eyes-entry-card eyes-entry-chat" + (entry === "mobile" ? " is-selected" : "")}>
                <span className="eyes-entry-symbol" aria-hidden="true">✳</span>
                <span className="eyes-label">手机 / 网页 · 通用对话</span>
                <h2>豆包 / DeepSeek</h2>
                <p>在常用的 AI 里统计行为关键词，带回这里揭晓你的趣味画像。</p>
                <small>复制通用指令 → 带回统计 → 揭晓画像</small>
                <button className="button primary" aria-expanded={entry === "mobile"} aria-controls="eyes-mobile-flow" onClick={() => setEntry("mobile")}>使用豆包 / DeepSeek</button>
              </article>
            </div>
            <div id="eyes-mobile-flow" className="eyes-entry-flow" hidden={entry !== "mobile"}><MobileEyes enabled={enabled} /></div>
            <div id="eyes-codex-flow" className="eyes-entry-flow" hidden={entry !== "codex"}>
            <h2>用 Codex 分析本机历史</h2>
                <div className="eyes-start">
                  <label>
                    电脑 Codex · 分析范围
                    <select
                      value={days}
                      onChange={(e) => setDays(Number(e.target.value))}
                    >
                      <option value={7}>最近7天</option>
                      <option value={30}>最近30天</option>
                    </select>
                  </label>
                  <label className="eyes-consent">
                    <input
                      type="checkbox"
                      checked={consent}
                      onChange={(e) => setConsent(e.target.checked)}
                    />
                    我同意在 Codex
                    中分析该范围内本机历史；最多10会话，清洗后的样本会进入当前模型上下文，本站仅接收类型及简短说明。
                  </label>
                  <button
                    className="button primary"
                    disabled={!consent || busy || !enabled}
                    onClick={() => void create()}
                  >
                    {enabled ? "看看 AI 眼里的我" : "功能维护中"}
                  </button>
                </div>
            <section className="eyes-how">
              <div>
                <b>01 / 复制指令</b>
                <p>网站生成专属任务，不要求注册。</p>
              </div>
              <div>
                <b>02 / Codex 新会话发送</b>
                <p>需本机可读历史与 Python 3.10+；不支持的环境会说明原因。</p>
              </div>
              <div>
                <b>03 / 回来领取</b>
                <p>只属于你的趣味报告和专属封面。</p>
              </div>
            </section>
          <details>
            <summary>隐私、兼容性与执行包</summary>
            <p>
              只读本机 Codex
              的可识别记录；不跨平台、设备或云端补读。不上传原始聊天，但样本会进入你的
              Codex 模型上下文。网站删除不会删除你在 Codex
              中的执行会话。结果默认完成后保存30天，源站撤销不代表召回外部截图。备份最长轮换14天。
            </p>
            <p>
              失去浏览器 Cookie
              且领取链接过期后无法恢复。执行指令含短期凭证，请勿公开。
            </p>
            <a href={appPath("/ai-eyes-tool/v4/instructions.md")}>
              查看执行说明
            </a>{" "}
            ·{" "}
            <a href={appPath("/ai-eyes-tool/v4/bundle.zip")} download>
              下载完整执行包 ZIP
            </a>
            <p>
              内容版本：{eyesCatalog.version} · 原稿 SHA-256：
              <code>{eyesCatalog.sha256}</code>
            </p>
          </details>
            </div>
            <div id="eyes-usage-guide"><FeatureGuide path="/ai-eyes" /></div>
          </>
        </>
      )}
    </div>
  );
}
