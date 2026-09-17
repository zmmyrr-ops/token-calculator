import { useState } from "react";
import {
  Download,
  Copy,
  Gamepad2,
  Boxes,
  Clapperboard,
  Workflow,
  Image,
} from "lucide-react";
import type { Practice } from "@shared/practice";
export const sceneIcons = {
  games: Gamepad2,
  "3d": Boxes,
  video: Clapperboard,
  image: Image,
  automation: Workflow,
};
export function PracticeBrief({ practice: p }: { practice: Practice }) {
  return (
    <section className="practice-brief">
      <div className="eyebrow">这次要完成什么 · {p.level}</div>
      <h2>{p.result}</h2>
      <p>适合：{p.audience}</p>
      <h3>开始前准备</h3>
      <ul>
        {p.preparation.map((x) => (
          <li key={x}>{x}</li>
        ))}
      </ul>
    </section>
  );
}
export function PracticeActions({
  practice: p,
  title,
  slug,
}: {
  practice: Practice;
  title: string;
  slug: string;
}) {
  const [prompt, setPrompt] = useState(p.prompt),
    [message, setMessage] = useState("");
  function download() {
    const text = `# ${title}\n\n目标：${p.result}\n\n## 准备\n${p.preparation.map((x) => "- [ ] " + x).join("\n")}\n\n## 操作与验收\n${p.steps.map((s, i) => `### 阶段 ${i + 1}\n${s.actions.map((x) => "- [ ] " + x).join("\n")}\n验收：${s.check}`).join("\n\n")}\n\n## 交付\n${p.deliverables.map((x) => "- [ ] " + x).join("\n")}\n\n## 提问模板\n${prompt}\n\n来源：AI 门道 /learn/${slug}\n编辑整理的实践建议，非自动完成或效果承诺。\n`;
    const url = URL.createObjectURL(
      new Blob([text], { type: "text/markdown;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = slug + "-实践清单.md";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMessage("实践清单已导出。");
  }
  return (
    <section className="practice-template">
      <h2>带着清单去实践</h2>
      <p>
        下方是可编辑的提问模板；填写方括号内容后复制到你使用的助手。本站不会发送这些文字。
      </p>
      <textarea
        aria-label="实践提问模板"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        maxLength={12000}
      />
      <div className="action-row">
        <button
          className="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(prompt);
              setMessage("提问模板已复制。");
            } catch {
              setMessage("无法自动复制，请在文本框内手动选择并复制。");
            }
          }}
        >
          <Copy size={15} />
          复制提问模板
        </button>
        <button className="button primary" onClick={download}>
          <Download size={15} />
          下载实践清单
        </button>
      </div>
      <p role="status">{message}</p>
    </section>
  );
}
