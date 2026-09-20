import { useState } from "react";
export default function TutorialCode({
  code,
  language,
}: {
  code: string;
  language?: string;
}) {
  const [status, setStatus] = useState("复制代码");
  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setStatus("已复制");
    } catch {
      setStatus("复制失败，请手动选择");
    }
  }
  return (
    <div className="tutorial-code">
      <div>
        <span>{language || "代码"}</span>
        <button onClick={() => void copy()}>{status}</button>
      </div>
      <pre tabIndex={0}>
        <code>{code}</code>
      </pre>
    </div>
  );
}
