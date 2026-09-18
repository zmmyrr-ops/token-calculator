import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { mobilePrompt, parseMobileResult } from "@shared/ai-eyes-mobile";
import { eyesApi } from "./AiEyes";
export function MobileEyes({ enabled }: { enabled: boolean }) {
  const navigate = useNavigate();
  const [platform, setPlatform] = useState("豆包"),
    [mode, setMode] = useState<"conversation" | "questions">("conversation"),
    [raw, setRaw] = useState(""),
    [confirmed, setConfirmed] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const prompt = mobilePrompt(mode);
  let preview: ReturnType<typeof parseMobileResult> | null = null;
  try {
    if (raw.trim()) preview = parseMobileResult(raw);
  } catch {
    /* Validate on submission and preserve the pasted text. */
  }
  async function submit() {
    setBusy(true);
    setMessage("");
    try {
      const result = parseMobileResult(raw);
      const d = await eyesApi("/mobile-results", "POST", {
        result,
        platform,
        confirmed,
      });
      setRaw("");
      navigate("/ai-eyes/runs/" + d.run.id);
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="eyes-private eyes-mobile">
      <span className="eyes-label">豆包 · DEEPSEEK · 其他 AI</span>
      <h2>手机上，也能看看 AI 眼里的你</h2>
      <p>
        不用安装插件。复制指令，发给常用的
        AI，再把行为统计带回来，由本站生成画像。
      </p>
      <div className="eyes-controls">
        <label>
          使用的 AI
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
          >
            {["豆包", "DeepSeek", "其他 AI"].map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </label>
        <label>
          测评方式
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as typeof mode)}
          >
            <option value="conversation">熟悉我的 AI 来判断</option>
            <option value="questions">聊几句认识我</option>
          </select>
        </label>
      </div>
      <h3>1. 复制指令，发给你的 AI</h3>
      <p>
        {mode === "conversation"
          ? "建议在聊得较多的对话里发送。AI只能使用实际可见的内容，样本不足时会先提问。"
          : "发送后回答5～8个简短问题，等AI了解你的使用习惯后再生成结果。"}
      </p>
      <button
        className="button primary"
        disabled={!enabled}
        onClick={() =>
          void navigator.clipboard
            .writeText(prompt)
            .then(() =>
              setMessage("指令已复制，请打开 " + platform + " 粘贴发送"),
            )
            .catch(() => setMessage("复制失败，请展开下面的指令，长按全选复制"))
        }
      >
        复制手机测评指令
      </button>
      <details>
        <summary>查看完整指令 / 手动复制</summary>
        <textarea aria-label="手机测评指令" readOnly value={prompt} rows={9} />
      </details>
      <h3>2. 复制 AI 回复里的行为统计 JSON</h3>
      <p>
        只复制最后的代码块，不要复制完整聊天。回到本页粘贴，后台会根据行为关键词匹配画像，不必让AI选择人格类型。
      </p>
      <textarea
        aria-label="粘贴结果码"
        placeholder={'{"format":"AI_EYES_BEHAVIOR_2", ...}'}
        value={raw}
        maxLength={8000}
        rows={7}
        onChange={(e) => {
          setRaw(e.target.value);
          setConfirmed(false);
          setMessage("");
        }}
      />
      {preview && (
        <p>
          已识别 {preview.sample_count} 条样本、{preview.keywords.length}{" "}
          个行为关键词 ·{" "}
          {preview.basis === "questions" ? "基于本次问答" : "基于可见对话"}
        </p>
      )}
      <label className="eyes-mobile-consent">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
        />
        我确认只提交行为关键词和统计次数，不含原始聊天或个人敏感信息；了解这是可编辑的趣味结果，并非平台认证。
      </label>
      <button
        className="button primary"
        disabled={!enabled || busy || !confirmed || !raw.trim()}
        onClick={() => void submit()}
      >
        {busy ? "正在生成…" : "生成我的趣味画像"}
      </button>
      <p role="status">{message}</p>
      <p>
        <small>
          不需要登录。结果默认保存30天，仅当前浏览器可访问，主动分享后才公开。清除浏览器数据可能失去访问权限，请及时保存封面。指令在你选择的AI中运行，本网站不读取其账号历史，也不调用付费模型。
        </small>
      </p>
    </section>
  );
}
