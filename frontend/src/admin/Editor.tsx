import { useState } from "react";
import type { Kind } from "@shared/cms";
type Value =
  | string
  | number
  | boolean
  | null
  | Value[]
  | { [key: string]: Value };
const labels: Record<string, string> = {
  slug: "URL 标识",
  id: "标识",
  title: "标题",
  name: "名称",
  category: "分类",
  summary: "摘要",
  keywords: "关键词",
  sections: "正文段落",
  body: "正文",
  sources: "参考来源",
  url: "链接",
  source: "资料来源",
  checkedAt: "核验日期",
  video: "视频课程",
  publisher: "课程发布者",
  language: "语言",
  version: "课程版本说明",
  practice: "实践教程",
  scenario: "关联场景",
  level: "基础要求",
  audience: "适合人群",
  result: "目标成果",
  preparation: "准备清单",
  deliverables: "交付清单",
  steps: "阶段",
  actions: "操作项",
  check: "验收条件",
  pitfalls: "常见问题",
  problem: "问题",
  solution: "解决方法",
  prompt: "提问模板",
  toolRoles: "工具分工",
  role: "职责",
  input: "输入类型",
  output: "输出类型/单价",
  access: "使用方式",
  capabilities: "能力",
  limits: "限制说明",
  article: "关联文章标识",
  articles: "关联文章",
  tools: "关联工具",
  canonicalId: "官方/渠道模型 ID",
  provider: "厂商标识",
  providerName: "厂商名称",
  description: "说明",
  context: "上下文长度",
  maxOutput: "最大输出",
  reasoning: "支持推理",
  modes: "模式",
  modality: "模态",
  tokenizer: "分词器",
  encoding: "参考编码",
  price: "价格",
  cache: "缓存输入单价",
  request: "请求费用",
  currency: "币种",
  basis: "计价依据",
  overrides: "高级阶梯规则",
  channel: "渠道",
  status: "资料状态",
  tier: "定位",
  created: "来源创建时间戳",
};
const emptyFor = (key: string): Value =>
  ({
    sections: { title: "", body: "" },
    sources: { title: "", url: "" },
    steps: { actions: [""], check: "" },
    pitfalls: { problem: "", solution: "" },
    toolRoles: { id: "", role: "" },
  })[key] || "";
export const blankPractice = () => ({
  scenario: "",
  level: "入门",
  audience: "",
  result: "",
  preparation: [""],
  deliverables: [""],
  steps: Array.from({ length: 1 }, () => ({ actions: [""], check: "" })),
  pitfalls: [{ problem: "", solution: "" }],
  prompt: "",
  toolRoles: [],
});
export function blankEntity(kind: Kind): Record<string, Value> {
  if (kind === "knowledge")
    return {
      slug: "",
      title: "",
      category: "基础知识",
      summary: "",
      keywords: "",
      sections: [{ title: "", body: "" }],
      sources: [],
    };
  if (kind === "resource")
    return {
      id: "",
      name: "",
      category: "",
      summary: "",
      input: "",
      output: "",
      access: "",
      capabilities: [""],
      limits: "",
      url: "",
      source: "",
      checkedAt: new Date().toISOString().slice(0, 10),
      article: "",
    };
  if (kind === "scenario")
    return {
      id: "",
      name: "",
      summary: "",
      articles: [""],
      tools: [],
      steps: [""],
    };
  return {
    id: "",
    canonicalId: "",
    name: "",
    provider: "",
    providerName: "",
    description: "",
    context: null,
    maxOutput: null,
    reasoning: false,
    modes: ["default"],
    modality: ["text"],
    tokenizer: "unknown",
    encoding: "o200k_base",
    price: null,
    source: "",
    checkedAt: new Date().toISOString(),
    channel: "",
    access: "api",
    status: "待核验",
    tier: "",
    created: Math.floor(Date.now() / 1000),
  };
}
export function Fields({
  value,
  onChange,
  path = "",
  locked = false,
}: {
  value: Value;
  onChange: (v: Value) => void;
  path?: string;
  locked?: boolean;
}) {
  const key = path.split(".").pop() || "",
    label = labels[key] || key;
  if (key === "overrides")
    return <JsonField value={value} onChange={onChange} />;
  if (Array.isArray(value))
    return (
      <fieldset className="admin-array">
        <legend>
          {label} · {value.length}
        </legend>
        {value.map((v, i) => (
          <div className="admin-array-row" key={i}>
            <Fields
              value={v}
              path={path + "." + i}
              onChange={(next) =>
                onChange(value.map((x, j) => (i === j ? next : x)))
              }
            />
            <button
              type="button"
              className="admin-remove"
              onClick={() => onChange(value.filter((_, j) => i !== j))}
              aria-label={"移除" + label + "第" + (i + 1) + "项"}
            >
              移除
            </button>
          </div>
        ))}
        <button
          type="button"
          className="button"
          onClick={() =>
            onChange([
              ...value,
              typeof value[0] === "object" &&
              value[0] !== null &&
              !Array.isArray(value[0])
                ? Object.fromEntries(
                    Object.entries(value[0]).map(([k, v]) => [
                      k,
                      Array.isArray(v) ? [] : typeof v === "string" ? "" : v,
                    ]),
                  )
                : path === "steps"
                  ? ""
                  : typeof value[0] === "string"
                    ? ""
                    : emptyFor(key),
            ])
          }
        >
          添加{label}
        </button>
      </fieldset>
    );
  if (value !== null && typeof value === "object")
    return (
      <div className="admin-fields">
        {Object.entries(value).map(([k, v]) => (
          <Fields
            key={k}
            path={path ? path + "." + k : k}
            value={v}
            locked={locked && ["id", "slug"].includes(k) && !path}
            onChange={(next) => onChange({ ...value, [k]: next })}
          />
        ))}
      </div>
    );
  if (typeof value === "boolean")
    return (
      <label className="admin-check">
        <input
          type="checkbox"
          checked={value}
          onChange={(e) => onChange(e.target.checked)}
        />
        {label}
      </label>
    );
  if (value === null) {
    return (
      <div className="admin-null">
        <span>{label}：未设置</span>
        <button
          type="button"
          className="button"
          onClick={() =>
            onChange(
              key === "price"
                ? {
                    input: "0",
                    output: "0",
                    cache: null,
                    request: "0",
                    currency: "USD",
                    checkedAt: new Date().toISOString(),
                    source: "",
                    basis: "请填写报价来源与计价口径",
                    overrides: [],
                  }
                : 0,
            )
          }
        >
          设置{label}
        </button>
      </div>
    );
  }
  const options =
    key === "encoding"
      ? ["o200k_base", "cl100k_base"]
      : key === "level"
        ? ["入门", "有基础"]
        : key === "access" &&
            ["api", "weights", "web-only", "restricted"].includes(String(value))
          ? ["api", "weights", "web-only", "restricted"]
          : null;
  const multiline =
    [
      "body",
      "description",
      "summary",
      "prompt",
      "solution",
      "limits",
      "result",
    ].includes(key) || String(value).length > 140;
  return (
    <label className={"admin-field " + (multiline ? "wide" : "")}>
      <span>
        {label || "内容"}
        {locked ? "（创建后固定）" : ""}
      </span>
      {options ? (
        <select
          aria-label={label}
          value={String(value)}
          onChange={(e) => onChange(e.target.value)}
        >
          {options.map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
      ) : multiline ? (
        <textarea
          aria-label={label}
          value={String(value)}
          onChange={(e) => onChange(e.target.value)}
          rows={key === "body" ? 7 : 3}
        />
      ) : (
        <input
          aria-label={label}
          disabled={locked}
          type={typeof value === "number" ? "number" : "text"}
          value={value}
          onChange={(e) =>
            onChange(
              typeof value === "number"
                ? Number(e.target.value)
                : e.target.value,
            )
          }
        />
      )}
    </label>
  );
}

function JsonField({
  value,
  onChange,
}: {
  value: Value;
  onChange: (v: Value) => void;
}) {
  const [text, setText] = useState(JSON.stringify(value, null, 2));
  const [error, setError] = useState("");
  return (
    <div>
      <label>
        高级阶梯规则（JSON）
        <textarea value={text} onChange={(e) => setText(e.target.value)} />
      </label>
      <button
        type="button"
        className="button"
        onClick={() => {
          try {
            const parsed = JSON.parse(text);
            if (!Array.isArray(parsed)) throw Error("请填写 JSON 数组");
            onChange(parsed);
            setError("");
          } catch {
            setError("格式错误，请填写有效的 JSON 数组");
          }
        }}
      >
        应用规则
      </button>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
