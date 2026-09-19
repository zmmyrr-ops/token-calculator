import FeatureGuide from "@/components/FeatureGuide";
import { CloudSaveButton } from "./workspace/Workspace";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  ArrowUpRight,
  Copy,
  Download,
  Heart,
  Share2,
  Sparkles,
} from "lucide-react";
import { appPath, storageKey } from "./base";
import { track } from "./Analytics";
import {
  demoQuestion,
  intensities,
  personaArtifact,
  personaCard,
  personaAvatar,
  type Persona,
  type Intensity,
  type PersonaMode,
} from "@shared/personas";
import "./personas.css";
const modes: Record<PersonaMode, string> = {
  session: "本次对话",
  skill: "Codex Skill",
  project: "项目默认",
  global: "全局默认",
};
const favoriteKey = storageKey("mendao-personas-favorites-v1");
function initialFavorites(): string[] {
  try {
    const data = JSON.parse(localStorage.getItem(favoriteKey) || "[]");
    return Array.isArray(data)
      ? data.filter((x) => typeof x === "string").slice(0, 200)
      : [];
  } catch {
    return [];
  }
}
export function saveFile(
  name: string,
  text: string,
  type = "text/plain;charset=utf-8",
) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export default function Personas() {
  const [params, setParams] = useSearchParams();
  const [items, setItems] = useState<Persona[]>([]),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [attempt, setAttempt] = useState(0);
  const [q, setQ] = useState(""),
    [category, setCategory] = useState("全部"),
    [onlyFavorites, setOnlyFavorites] = useState(false),
    [favorites, setFavorites] = useState(initialFavorites),
    [notice, setNotice] = useState("");
  useEffect(() => {
    const c = new AbortController();
    setLoading(true);
    setError("");
    fetch(appPath("/api/v1/personas"), { signal: c.signal })
      .then(async (r) => {
        if (!r.ok) throw Error("人格库加载失败，请重试。");
        return r.json();
      })
      .then((d) => {
        setItems(d.items);
        setLoading(false);
      })
      .catch((e) => {
        if (!c.signal.aborted) {
          setError(e.message);
          setLoading(false);
        }
      });
    return () => c.abort();
  }, [attempt]);
  const intensity = (
    Object.keys(intensities).includes(params.get("strength") || "")
      ? params.get("strength")
      : "balanced"
  ) as Intensity;
  const mode = (
    Object.keys(modes).includes(params.get("mode") || "")
      ? params.get("mode")
      : "session"
  ) as PersonaMode;
  const selected =
    items.find((p) => p.id === params.get("persona")) || items[0];
  const missing =
    !!params.get("persona") &&
    items.length > 0 &&
    !items.some((p) => p.id === params.get("persona"));
  const filtered = items.filter(
    (p) =>
      (category === "全部" || p.category === category) &&
      (!onlyFavorites || favorites.includes(p.id)) &&
      `${p.name}${p.description}${p.traits.join(" ")}`.includes(q.trim()),
  );
  const content = selected ? personaArtifact(selected, intensity, mode) : "";
  function update(key: string, value: string) {
    // Read the committed URL so rapid control changes do not overwrite a pending router render.
    const next = new URLSearchParams(window.location.search);
    next.set(key, value);
    setParams(next, { replace: true });
    setNotice("");
  }
  async function copy(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      setNotice(label + "已复制");
      track("persona_copy", "/personas");
    } catch {
      setNotice("浏览器未允许复制，请手动选择下方文本复制。");
    }
  }
  function favorite(id: string) {
    const next = favorites.includes(id)
      ? favorites.filter((x) => x !== id)
      : [...favorites, id];
    try {
      localStorage.setItem(favoriteKey, JSON.stringify(next));
      setFavorites(next);
    } catch {
      setNotice("浏览器未允许保存收藏。");
    }
  }
  async function downloadCard() {
    try {
      const response = await fetch(appPath(personaAvatar(selected.id)));
      if (!response.ok) throw Error("头像加载失败");
      const blob = await response.blob();
      const avatar = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      saveFile(
        `${selected.id}-card.svg`,
        personaCard(selected, intensity, shareUrl(), avatar),
        "image/svg+xml;charset=utf-8",
      );
      setNotice("分享卡片已下载，包含专属头像，可用浏览器打开。");
    } catch {
      setNotice("分享卡片生成失败，请稍后重试。");
    }
  }
  function shareUrl() {
    const url = new URL(appPath("/personas"), location.origin);
    url.search = new URLSearchParams({
      persona: selected.id,
      strength: intensity,
      mode,
    }).toString();
    return url.href;
  }
  return (
    <div className="persona-hub">
      <header className="persona-hero">
        <div>
          <div className="eyebrow">PERSONALITY, WITH PURPOSE</div>
          <h1>
            给你的 AI，
            <br />
            <em>一点自己的性格。</em>
          </h1>
          <p>同样认真，换种说法。挑一个聊得来的人格，带进下一次对话。</p>
          <a className="button" href="#persona-guide">
            第一次使用？看安装教程 <ArrowUpRight size={16} />
          </a>
        </div>
        <div className="persona-orbit" aria-hidden="true">
          <span>
            <img src={appPath(personaAvatar("soft-cloud"))} alt="" />
          </span>
          <span>
            <img src={appPath(personaAvatar("velvet"))} alt="" />
          </span>
          <strong>
            <Sparkles size={42} />
            <small>HELLO, YOU.</small>
          </strong>
          <span>
            <img src={appPath(personaAvatar("roast"))} alt="" />
          </span>
          <span>
            <img src={appPath(personaAvatar("butler"))} alt="" />
          </span>
        </div>
      </header>
      <a className="persona-eyes-entry" href={appPath("/ai-eyes")}>
        <span className="persona-eyes-symbol" aria-hidden="true"><Sparkles size={25}/></span>
        <span><strong>你在挑选 AI 的性格，AI 也在认识你。</strong><small>看看 AI 眼里的你，领取自己的使用人格封面。</small></span>
        <span className="persona-eyes-cta">发现我的 AI 人格 <ArrowUpRight size={18}/></span>
      </a>
      <div className="persona-meta">
        <span>原创人格 · 可编辑提示词</span>
        <span>无需登录 · 生成指令不调用模型 API</span>
        <span>临时切换 / 长期配置</span>
      </div>
      <section aria-label="选择人格">
        <div className="persona-section-title">
          <h2>今天，想和谁聊？</h2>
          <label className="persona-favorite-filter">
            <input
              type="checkbox"
              checked={onlyFavorites}
              onChange={(e) => setOnlyFavorites(e.target.checked)}
            />
            只看本机收藏
          </label>
        </div>
        <div className="persona-filters">
          <input
            aria-label="搜索人格"
            placeholder="搜索人格、语气或用途"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            maxLength={100}
          />
          <div role="group" aria-label="人格分类">
            {["全部", "温暖陪伴", "鲜明个性", "高效协作"].map((c) => (
              <button
                key={c}
                aria-pressed={category === c}
                onClick={() => setCategory(c)}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
        {loading && <p role="status">正在打开人格库…</p>}
        {error && (
          <p role="alert">
            {error}
            <button className="button" onClick={() => setAttempt((x) => x + 1)}>
              重新加载
            </button>
          </p>
        )}
        <div className="persona-grid">
          {filtered.map((p, i) => (
            <article
              className={`persona-card tone-${i % 4} ${selected?.id === p.id ? "selected" : ""}`}
              key={p.id}
            >
              <button
                className="persona-choose"
                aria-pressed={selected?.id === p.id}
                onClick={() => {
                  update("persona", p.id);
                  requestAnimationFrame(() =>
                    document
                      .querySelector(".persona-workbench")
                      ?.scrollIntoView({
                        behavior: window.matchMedia(
                          "(prefers-reduced-motion: reduce)",
                        ).matches
                          ? "instant"
                          : "smooth",
                        block: "start",
                      }),
                  );
                }}
              >
                <img
                  className="persona-portrait"
                  src={appPath(personaAvatar(p.id))}
                  alt={`${p.name}专属插画头像`}
                  width={256}
                  height={256}
                  loading="lazy"
                  decoding="async"
                />
                <small>{p.category}</small>
                <h3>{p.name}</h3>
                <p>{p.tagline}</p>
                <span className="persona-card-foot">
                  {selected?.id === p.id ? "正在调配 ↓" : "选择这个人格 ↗"}
                </span>
              </button>
              <button
                className="persona-heart"
                aria-label={`${favorites.includes(p.id) ? "取消收藏" : "收藏"}${p.name}`}
                aria-pressed={favorites.includes(p.id)}
                onClick={() => favorite(p.id)}
              >
                <Heart
                  size={18}
                  fill={favorites.includes(p.id) ? "currentColor" : "none"}
                />
              </button>
            </article>
          ))}
        </div>
        {!loading && !error && !filtered.length && (
          <p className="empty-panel">
            没有匹配的人格，试试其他分类或清空搜索。
          </p>
        )}
      </section>
      {selected && (
        <section className="persona-workbench" aria-label="人格配置">
          <div className="persona-preview">
            <div className="eyebrow">MEET YOUR PERSONA</div>
            <h2>
              <img
                className="persona-preview-avatar"
                src={appPath(personaAvatar(selected.id))}
                alt=""
                width={112}
                height={112}
              />{" "}
              {selected.name}
            </h2>
            <p>{selected.description}</p>
            <div className="persona-demo">
              <small>同一道题 · 人工编写的风格示例，非实时生成</small>
              <p className="persona-question">{demoQuestion}</p>
              <blockquote>{selected.example}</blockquote>
            </div>
            <p className="tiny">
              示例用于比较表达方式，不随强度调节实时重写；实际模型输出可能不同。
            </p>
            <ul>
              {selected.traits.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
            <div className="action-row">
              <button
                className="button"
                onClick={() => void copy(shareUrl(), "人格分享链接")}
              >
                <Share2 size={16} />
                分享此配置
              </button>
              <button className="button" onClick={() => void downloadCard()}>
                <Download size={16} />
                下载分享卡片
              </button>
            </div>
          </div>
          <div className="persona-config">
            <div className="eyebrow">MAKE IT YOURS</div>
            <h2>把这种语气，带走。</h2>
            {missing && (
              <p role="alert">
                链接中的人格不存在或已下架，已展示其他可用人格。
              </p>
            )}
            <label>
              风格强度
              <select
                aria-label="风格强度"
                value={intensity}
                onChange={(e) => update("strength", e.target.value)}
              >
                {Object.entries(intensities).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            <div className="persona-mode" role="group" aria-label="使用范围">
              {Object.entries(modes).map(([k, v]) => (
                <button
                  key={k}
                  aria-pressed={mode === k}
                  onClick={() => update("mode", k)}
                >
                  {v}
                </button>
              ))}
            </div>
            <p>
              {mode === "session"
                ? "复制到当前对话即可，无需安装。不要将本次设定写入长期记忆。"
                : mode === "skill"
                  ? "下载 SKILL.md 放进独立技能目录，再在 Codex 中明确调用。安装不等于默认启用。"
                  : mode === "project"
                    ? "合并到当前项目的 AGENTS.md，仅影响该项目；请保留现有项目规范。"
                    : "合并到 Codex 的全局 AGENTS.md，影响该配置适用的新会话；先备份原文件。"}
            </p>
            <p className="tiny">
              完整设定 · {content.length.toLocaleString()} 字符 ·
              含角色定位、语言规则、多场景示范及执行检查
            </p>
            <textarea
              aria-label="生成的人格指令"
              readOnly
              value={content}
              rows={14}
            />
            <div className="action-row">
              <button
                className="button primary"
                onClick={() => void copy(content, "人格指令")}
              >
                <Copy size={16} />
                复制指令
              </button>
              <button
                className="button"
                onClick={() => {
                  saveFile(
                    mode === "skill" ? "SKILL.md" : `${selected.id}-${mode}.md`,
                    content,
                  );
                  track("persona_download", "/personas");
                  setNotice("配置文件已下载，请按下方教程安装。");
                }}
              >
                <Download size={16} />
                下载配置
              </button>
            </div>
            <CloudSaveButton item={{title:selected.name,kind:"人格",href:`/personas?persona=${selected.id}&strength=${intensity}&mode=${mode}`}}/>
            {mode === "skill" && (
              <button
                className="button"
                onClick={() =>
                  void copy(
                    `请使用 $mendao-${selected.id}，仅在本次对话采用这个人格，不修改长期配置。`,
                    "调用口令",
                  )
                }
              >
                复制 Skill 调用口令
              </button>
            )}
            <p className="tiny">
              只改变表达风格，不改变模型能力、工具权限和事实判断。配置会占用一定上下文
              Token。
            </p>
          </div>
        </section>
      )}
      <p className="persona-status" role="status" aria-live="polite">
        {notice}
      </p>
      <section id="persona-guide" className="persona-guide">
        <div className="eyebrow">A SMALL GUIDE TO A DIFFERENT VOICE</div>
        <h2>三分钟，给 AI 换个说话风格。</h2>
        <a className="button" href={appPath("/guides/ai-personas.md")} download>
          下载完整使用教程
        </a>
        <div className="persona-guide-grid">
          <article>
            <b>01 / 先试聊</b>
            <h3>本次对话使用</h3>
            <ol>
              <li>选择人格和强度，点击“本次对话”。</li>
              <li>复制完整指令，粘贴到你正在使用的 AI 对话中。</li>
              <li>
                正常提问，观察表达是否符合预期。普通聊天产品不一定支持
                Skill，粘贴指令即可试用。
              </li>
              <li>发送“恢复默认语气”结束本次设定；新聊天通常需要重新设置。</li>
            </ol>
          </article>
          <article>
            <b>02 / 按需调用</b>
            <h3>安装 Codex Skill</h3>
            <ol>
              <li>
                选择“Codex Skill”，下载 <code>SKILL.md</code>。
              </li>
              <li>
                在用户技能目录{" "}
                <code>
                  ~/.agents/skills/mendao-{selected?.id || "persona"}/
                </code>{" "}
                中放入该文件。项目专用则放到 <code>.agents/skills/</code>{" "}
                下的同名目录。
              </li>
              <li>按客户端要求重新加载技能；若未发现，重启后检查技能列表。</li>
              <li>在新消息中使用上方“调用口令”，明确要求仅本次对话生效。</li>
            </ol>
            <p>
              需要避免自动匹配时，在技能目录的 <code>agents/openai.yaml</code>{" "}
              中配置：
            </p>
            <pre>{"policy:\n  allow_implicit_invocation: false"}</pre>
            <p>卸载时删除该人格的独立技能目录，不要删除其他技能。</p>
          </article>
          <article>
            <b>03 / 设为习惯</b>
            <h3>Codex 长期默认</h3>
            <ol>
              <li>选择“项目默认”或“全局默认”，复制配置。</li>
              <li>
                项目默认：合并至项目根目录的 <code>AGENTS.md</code>
                。全局默认：合并至 <code>
                  ~/.codex/AGENTS.md
                </code>；若自定义了 <code>CODEX_HOME</code>，使用对应目录。
              </li>
              <li>
                先备份原文件，只替换 AI
                门道人格标记之间的内容，不覆盖原有规则，也不要同时叠加多个人格。
              </li>
              <li>
                新开会话或重启加载。存在 <code>AGENTS.override.md</code>{" "}
                时应检查实际加载文件；项目规则可能覆盖全局风格。
              </li>
            </ol>
          </article>
        </div>
        <details>
          <summary>如何验证生效、恢复默认？</summary>
          <p>
            在新会话提问：“请说明你当前采用的交流风格，再用两句话帮我规划今天的工作。”观察实际回答，不以模型口头宣称作为唯一依据。
          </p>
          <p>
            临时恢复：发送“恢复默认语气”。长期恢复：从实际加载的配置文件中删除{" "}
            <code>mendao-persona:start</code> 到 <code>mendao-persona:end</code>{" "}
            的整段人格配置，再新开会话。不要删除用户的其他配置。
          </p>
        </details>
        <details>
          <summary>ChatGPT、DeepSeek 或其他工具如何长期使用？</summary>
          <p>
            如果产品提供自定义指令、项目指令或智能体设定，可将人格正文保存到该入口；具体功能取决于产品和账号。不要把
            Codex 的文件路径或 Skill
            调用口令粘贴成其他产品的安装步骤。没有持久配置入口时，只能在每次新对话中粘贴临时指令。
          </p>
        </details>
        <details>
          <summary>隐私、费用和能力边界</summary>
          <p>
            本页在浏览器内生成指令，不发送你的聊天内容，不调用付费模型
            API。收藏仅保存在当前浏览器。分享链接只含人格
            ID、强度和模式。使用指令时，目标模型仍按其自身规则和计费方式处理；人格不保证永久记忆或每次完全相同的语气。
          </p>
        </details>
        <p className="tiny">
          配置教程核验：2026-09-18 ·{" "}
          <a
            href="https://learn.chatgpt.com/docs/build-skills"
            target="_blank"
            rel="noreferrer"
          >
            Codex Skill 官方说明
          </a>{" "}
          ·{" "}
          <a
            href="https://learn.chatgpt.com/docs/agent-configuration/agents-md"
            target="_blank"
            rel="noreferrer"
          >
            AGENTS.md 官方说明
          </a>
        </p>
      </section>
      <FeatureGuide path="/personas" />
    </div>
  );
}
