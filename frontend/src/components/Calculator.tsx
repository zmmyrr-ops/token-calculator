import { CloudSaveButton } from "../workspace/Workspace";
import { track } from "@/Analytics";
import { appPath, storageKey } from "@/base";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "@/Link";
import {
  ArrowUpRight,
  Check,
  ChevronDown,
  Copy,
  Download,
  FileText,
  LockKeyhole,
  Plus,
  RotateCcw,
  Search,
  Settings2,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import {
  defaults,
  presets,
  tasks,
  type Budget,
  type Model,
  type Settings,
  type Encoding,
} from "@shared/types";
import {
  ageDays,
  classify,
  csvCell,
  estimate,
  money,
  recommend,
} from "@shared/engine";
function BudgetFields({
  label,
  value,
  onChange,
}: {
  label: string;
  value: Budget;
  onChange: (b: Budget) => void;
}) {
  return (
    <fieldset className="budget-fields">
      <legend>
        {label} <span>token</span>
      </legend>
      {(["low", "typical", "high"] as const).map((k, i) => (
        <label key={k}>
          {["较少", "典型", "较多"][i]}
          <input
            aria-label={`${label}${["较少", "典型", "较多"][i]}`}
            type="number"
            min="0"
            max="10000000"
            value={value[k]}
            onChange={(e) =>
              onChange({ ...value, [k]: Number(e.target.value) })
            }
          />
        </label>
      ))}
    </fieldset>
  );
}
export default function Calculator({
  initialModels,
  catalogVersion,
  modelCount,
}: {
  initialModels: Model[];
  catalogVersion: string;
  modelCount: number;
}) {
  const trackedCalculation = useRef(false);
  const [text, setText] = useState("");
  const [undo, setUndo] = useState("");
  const [selected, setSelected] = useState(initialModels);
  const [s, setS] = useState<Settings>(defaults);
  const [count, setCount] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [slow, setSlow] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [retry, setRetry] = useState(0);
  const [preset, setPreset] = useState("standard");
  const [showPicker, setShowPicker] = useState(false);
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<Model[]>([]);
  const [pickerBusy, setPickerBusy] = useState(false);
  const [pickerError, setPickerError] = useState("");
  const [includeText, setIncludeText] = useState(false);
  const [custom, setCustom] = useState<
    Record<string, { input: string; output: string }>
  >({});
  const [modeByModel, setModeByModel] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const worker = useRef<Worker | null>(null);
  const composing = useRef(false);
  const sequence = useRef(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    try {
      const saved = JSON.parse(
        localStorage.getItem(storageKey("token-calculator-preferences")) ||
          "null",
      );
      if (
        saved &&
        ["USD", "CNY"].includes(saved.currency) &&
        ["o200k_base", "cl100k_base"].includes(saved.encoding)
      )
        setS((old) => ({
          ...old,
          currency: saved.currency,
          encoding: saved.encoding,
          fx: typeof saved.fx === "string" ? saved.fx : "",
        }));
    } catch {
      /* Storage may be disabled by the browser. */
    }
    setReady(true);
  }, []);
  useEffect(() => {
    if (ready)
      try {
        localStorage.setItem(
          storageKey("token-calculator-preferences"),
          JSON.stringify({
            currency: s.currency,
            encoding: s.encoding,
            fx: s.fx,
          }),
        );
      } catch {
        /* Storage may be disabled by the browser. */
      }
  }, [ready, s.currency, s.encoding, s.fx]);
  useEffect(() => {
    const id = ++sequence.current;
    setCount(null);
    setError("");
    setSlow(false);
    if (timer.current) clearTimeout(timer.current);
    if (composing.current) {
      setBusy(false);
      return;
    }
    if (!text) {
      setBusy(false);
      return;
    }
    if (new TextEncoder().encode(text).length > 1048576) {
      setError("文本超过 1 MiB，请缩小文本后重试。");
      setBusy(false);
      return;
    }
    setBusy(true);
    const delay = setTimeout(() => {
      try {
        const w =
          worker.current ??
          new Worker(
            new URL("../workers/tokenizer.worker.ts", import.meta.url),
          );
        worker.current = w;
        timer.current = setTimeout(() => setSlow(true), 5000);
        w.onmessage = (e) => {
          if (e.data.id !== sequence.current) return;
          if (timer.current) clearTimeout(timer.current);
          setBusy(false);
          setSlow(false);
          if (e.data.error) setError(e.data.error);
          else {
            setCount(e.data.count);
            if (!trackedCalculation.current && e.data.count > 0) {
              trackedCalculation.current = true;
              track("calculator_used");
            }
          }
        };
        w.onerror = () => {
          w.terminate();
          worker.current = null;
          if (timer.current) clearTimeout(timer.current);
          setBusy(false);
          setError("本地计数器加载失败，请重试。");
        };
        w.postMessage({ id, text, encoding: s.encoding });
      } catch {
        setBusy(false);
        setError("浏览器不支持本地计算，请更新浏览器。");
      }
    }, 250);
    return () => {
      clearTimeout(delay);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [text, s.encoding, retry]);
  useEffect(
    () => () => {
      worker.current?.terminate();
    },
    [],
  );
  useEffect(() => {
    if (!showPicker) return;
    const controller = new AbortController();
    const delay = setTimeout(async () => {
      setPickerBusy(true);
      setPickerError("");
      try {
        const r = await fetch(
          appPath(
            `/api/v1/catalog?q=${encodeURIComponent(query.slice(0, 200))}&pageSize=30`,
          ),
          { signal: controller.signal },
        );
        if (!r.ok) throw Error();
        const d = await r.json();
        setOptions(d.models);
      } catch (e) {
        if (!(e instanceof DOMException && e.name === "AbortError"))
          setPickerError("目录加载失败，请修改搜索词重试。");
      } finally {
        if (!controller.signal.aborted) setPickerBusy(false);
      }
    }, 200);
    return () => {
      clearTimeout(delay);
      controller.abort();
    };
  }, [showPicker, query]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 3500);
    return () => clearTimeout(t);
  }, [toast]);
  useEffect(() => {
    if (!showPicker) return;
    function key(e: KeyboardEvent) {
      if (e.key === "Escape") setShowPicker(false);
    }
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [showPicker]);
  const task = s.task === "auto" ? classify(text) : s.task;
  const results = useMemo(
    () => selected.map((m) => estimate(m, count ?? 0, s, custom[m.id])),
    [selected, count, s, custom],
  );
  const recommendations =
    count !== null ? recommend(selected, results, task, s.preference) : [];
  const mainResult =
    recommendations[0]?.result ?? results.find((x) => x.values) ?? results[0];
  const primary = selected.find((m) => m.id === mainResult?.id);
  function patch(part: Partial<Settings>) {
    setS((old) => ({ ...old, ...part }));
  }
  function exportData() {
    return {
      version: 1,
      catalogVersion,
      ruleVersion: "rules-1",
      exportedAt: new Date().toISOString(),
      scope: "单轮纯文本；参考编码、基础渠道单价情景，不是实际账单预测",
      encoding: s.encoding,
      settings: s,
      modeByModel,
      task,
      inputTokens: count,
      models: selected.map((m) => ({
        id: m.canonicalId,
        source: m.source,
        checkedAt: m.checkedAt,
        channel: m.channel,
      })),
      customPrices: custom,
      results,
      ...(includeText ? { text } : {}),
    };
  }
  function download(format: "json" | "csv") {
    if (count === null) return;
    const data = exportData();
    const out =
      format === "json"
        ? JSON.stringify(data, null, 2)
        : "\uFEFF" +
          [
            [
              "模型",
              "渠道",
              "编码",
              "输入token",
              "低预算",
              "典型预算",
              "高预算",
              "币种",
              "状态",
              "价格日期",
              "来源",
              "假设",
            ],
            ...results.map((r, i) => [
              selected[i].name,
              selected[i].channel,
              s.encoding,
              r.input,
              r.values?.low,
              r.values?.typical,
              r.values?.high,
              s.currency,
              r.reason,
              selected[i].checkedAt,
              selected[i].source,
              JSON.stringify({
                settings: s,
                catalogVersion,
                custom: custom[selected[i].id] ?? null,
                ...(includeText ? { text } : {}),
              }),
            ]),
          ]
            .map((row) => row.map(csvCell).join(","))
            .join("\r\n");
    const url = URL.createObjectURL(
      new Blob([out], {
        type: format === "json" ? "application/json" : "text/csv;charset=utf-8",
      }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `token-budget.${format}`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    track("report_export");
    setToast("报告已导出");
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(
        JSON.stringify(exportData(), null, 2),
      );
      setToast("结果已复制");
    } catch {
      setToast("无法访问剪贴板，请使用导出 JSON。");
    }
  }
  async function importFile(file: File | undefined) {
    if (!file) return;
    if (!/\.(txt|md)$/i.test(file.name)) {
      setError("仅支持 UTF-8 TXT 或 Markdown 文件。");
      return;
    }
    if (file.size > 1048576) {
      setError("文件超过 1 MiB，请缩小文件。");
      return;
    }
    try {
      setText(
        new TextDecoder("utf-8", { fatal: true }).decode(
          await file.arrayBuffer(),
        ),
      );
    } catch {
      setError("无法读取，请使用 UTF-8 编码文件。");
    }
    if (fileRef.current) fileRef.current.value = "";
  }
  function cancel() {
    sequence.current++;
    worker.current?.terminate();
    worker.current = null;
    if (timer.current) clearTimeout(timer.current);
    setBusy(false);
    setSlow(false);
    setError("已取消计算，文本已保留。");
  }
  return (
    <>
      <section className="workspace" aria-label="词元计算工作区">
        <div className="input-panel panel">
          <div className="panel-top">
            <div className="panel-title">
              <FileText size={17} /> 输入你的文本
            </div>
            <span className="local-label">
              <LockKeyhole size={12} /> 仅在本地处理
            </span>
          </div>
          <textarea
            className="prompt"
            aria-label="待计算文本"
            placeholder={
              "在这里粘贴你的问题、提示词或一段文章…\n\n我们会在浏览器里计算词元，并帮你比较不同模型的使用成本。"
            }
            value={text}
            onChange={(e) => setText(e.target.value)}
            onCompositionStart={() => {
              composing.current = true;
            }}
            onCompositionEnd={() => {
              composing.current = false;
              setRetry((x) => x + 1);
            }}
            spellCheck={false}
          />
          <div className="input-toolbar">
            <div>
              <button
                className="text-button"
                onClick={() => fileRef.current?.click()}
              >
                <Upload size={14} /> 导入文件
              </button>
              <input
                ref={fileRef}
                hidden
                type="file"
                accept=".txt,.md"
                onChange={(e) => void importFile(e.target.files?.[0])}
              />
            </div>
            <span className="muted small">
              {Array.from(text).length.toLocaleString()} 字符 ·{" "}
              {new TextEncoder().encode(text).length.toLocaleString()} 字节
            </span>
            <button
              className="icon-button"
              title={text ? "清空文本" : "撤销清空"}
              aria-label={text ? "清空文本" : "撤销清空"}
              onClick={() => {
                if (text) {
                  setUndo(text);
                  setText("");
                } else if (undo) {
                  setText(undo);
                  setUndo("");
                }
              }}
            >
              <RotateCcw size={15} />
            </button>
          </div>
          {error && (
            <div className="alert" role="alert">
              {error}{" "}
              {text && (
                <button onClick={() => setRetry((x) => x + 1)}>重新计算</button>
              )}
            </div>
          )}
          {slow && (
            <div className="alert">
              文本较大，仍在计算… <button onClick={cancel}>取消</button>
            </div>
          )}
          <div className="input-settings">
            <label>
              任务类型
              <select
                value={s.task}
                onChange={(e) => patch({ task: e.target.value })}
              >
                {Object.entries(tasks).map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              参考分词编码
              <select
                value={s.encoding}
                onChange={(e) =>
                  patch({ encoding: e.target.value as Encoding })
                }
              >
                <option value="o200k_base">o200k_base</option>
                <option value="cl100k_base">cl100k_base</option>
              </select>
            </label>
          </div>
          <p className="micro input-note">
            固定编码的计数是精确值；映射到不同模型时仅供参考，不包含平台隐藏提示词。
          </p>
        </div>
        <div className="results-panel">
          <div className="metric-panel panel">
            <div className="eyebrow">
              INPUT TOKENS <span>输入词元</span>
            </div>
            <div
              className="token-number"
              aria-live="polite"
              data-testid="token-count"
            >
              {busy ? (
                <span className="calculating">
                  计算中<span>…</span>
                </span>
              ) : count === null ? (
                "—"
              ) : (
                count.toLocaleString()
              )}
            </div>
            <div className="metric-bottom">
              <span className="badge neutral">{s.encoding}</span>
              <span className="micro">
                {count === null
                  ? "输入文本后自动计算"
                  : "本地编码精确值 · 模型用量仅供参考"}
              </span>
            </div>
          </div>
          <div className="budget-panel panel">
            <div className="panel-top">
              <div className="panel-title">回答长度</div>
              <span className="badge neutral">预算假设</span>
            </div>
            <div className="segmented">
              {[
                ["short", "简短"],
                ["standard", "标准"],
                ["long", "详细"],
                ["custom", "自定义"],
              ].map(([id, label]) => (
                <button
                  key={id}
                  className={preset === id ? "active" : ""}
                  onClick={() => {
                    setPreset(id);
                    if (presets[id]) patch({ visible: presets[id] });
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            <BudgetFields
              label="回答预算"
              value={s.visible}
              onChange={(v) => {
                setPreset("custom");
                patch({ visible: v });
              }}
            />
            {selected.some((m) => m.reasoning) && (
              <details className="reasoning-details">
                <summary>
                  <span>推理消耗预算</span>
                  <span className="micro">
                    {s.reasoning ? "已填写情景" : "尚未计入"}{" "}
                    <ChevronDown size={12} />
                  </span>
                </summary>
                <p className="micro">
                  推理强度不对应固定 token
                  倍率。填写假设才计算推理费用；模式选择不会自动改变 token
                  假设，也不会调用模型。
                </p>
                <label className="check-label">
                  <input
                    type="checkbox"
                    checked={!!s.reasoning}
                    onChange={(e) =>
                      patch({
                        reasoning: e.target.checked
                          ? { low: 512, typical: 2048, high: 8192 }
                          : null,
                      })
                    }
                  />{" "}
                  使用可编辑的推理预算情景
                </label>
                {s.reasoning && (
                  <BudgetFields
                    label="推理预算"
                    value={s.reasoning}
                    onChange={(r) => patch({ reasoning: r })}
                  />
                )}
              </details>
            )}
          </div>
        </div>
      </section>
      <section className="compare-section">
        <div className="section-heading">
          <div>
            <div className="eyebrow">MODEL COMPARISON</div>
            <h2>
              同一个问题，不同的选择
              <span className="count-pill">{selected.length} / 6</span>
            </h2>
          </div>
          <button
            className="button outline"
            onClick={() => {
              setShowPicker(true);
              setQuery("");
            }}
            disabled={selected.length >= 6}
          >
            <Plus size={16} /> 添加模型
          </button>
        </div>
        <div className="comparison panel">
          <div className="comparison-controls">
            <div className="preference-group" aria-label="推荐偏好">
              {[
                ["cost", "省钱优先"],
                ["balanced", "均衡"],
                ["quality", "质量优先"],
              ].map(([id, label]) => (
                <button
                  className={s.preference === id ? "chosen" : ""}
                  key={id}
                  onClick={() =>
                    patch({ preference: id as Settings["preference"] })
                  }
                >
                  {label}
                </button>
              ))}
            </div>
            <label className="currency-label">
              显示币种
              <select
                aria-label="显示币种"
                value={s.currency}
                onChange={(e) =>
                  patch({ currency: e.target.value as Settings["currency"] })
                }
              >
                <option value="USD">USD 美元</option>
                <option value="CNY">CNY 人民币</option>
              </select>
            </label>
          </div>
          <div className="comparison-head">
            <span>模型 / 渠道</span>
            <span>输入 / 输出单价</span>
            <span>单次预算区间</span>
            <span>状态</span>
            <span />
          </div>
          {selected.map((m, index) => {
            const r = results[index];
            const isBest = recommendations[0]?.model.id === m.id;
            return (
              <div
                key={m.id}
                className={`model-row ${isBest ? "recommended-row" : ""}`}
              >
                <div className="model-name-cell">
                  <div className={`brand-icon brand-${m.provider}`}>
                    {m.providerName.slice(0, 1)}
                  </div>
                  <div>
                    <Link href={`/models/${m.id}`} className="model-name">
                      {m.name}
                    </Link>
                    <div className="micro">
                      {m.channel} · {m.reasoning ? "支持推理" : "标准模式"}
                    </div>
                    {m.reasoning && (
                      <select
                        className="mode-select"
                        aria-label={`${m.name} 推理模式`}
                        value={modeByModel[m.id] ?? m.modes[0]}
                        onChange={(e) =>
                          setModeByModel((old) => ({
                            ...old,
                            [m.id]: e.target.value,
                          }))
                        }
                      >
                        {m.modes.map((mode) => (
                          <option key={mode} value={mode}>
                            {mode === "default"
                              ? "默认模式（档位待核验）"
                              : mode}
                          </option>
                        ))}
                      </select>
                    )}
                    {isBest && <span className="badge green">规则候选</span>}
                  </div>
                </div>
                <div className="price-cell">
                  {custom[m.id] ? (
                    <>
                      <span>
                        ${custom[m.id].input} / ${custom[m.id].output}
                      </span>
                      <small>私人报价 / 百万 token</small>
                    </>
                  ) : m.price ? (
                    <>
                      <span>
                        ${Number(m.price.input).toLocaleString()} / $
                        {Number(m.price.output).toLocaleString()}
                      </span>
                      <small>
                        USD / 百万 token · {m.checkedAt.slice(5, 10)}
                        {ageDays(m.checkedAt) > 7 ? " 待复核" : ""}
                      </small>
                    </>
                  ) : (
                    <span className="muted">未公布</span>
                  )}
                </div>
                <div className="cost-cell">
                  {count !== null && r.values ? (
                    <>
                      <strong>
                        {money(r.values.low, s.currency)} –{" "}
                        {money(r.values.high, s.currency)}
                      </strong>
                      <small>
                        {r.status === "partial"
                          ? "部分预算 · 不含未知项"
                          : `典型 ${money(r.values.typical, s.currency)}`}
                      </small>
                    </>
                  ) : (
                    <span className="muted">
                      {count === null ? "等待输入" : "暂不可计算"}
                    </span>
                  )}
                </div>
                <div className="status-cell">
                  <span className="badge neutral">参考编码</span>
                  <small>
                    {count !== null
                      ? r.reason
                      : m.price
                        ? "渠道基础价"
                        : "资料收录"}
                  </small>
                </div>
                <div className="row-actions">
                  <button
                    className="icon-button"
                    title="私人报价"
                    aria-label={`设置 ${m.name} 私人报价`}
                    onClick={() => setEditing(editing === m.id ? null : m.id)}
                  >
                    <Settings2 size={14} />
                  </button>
                  <button
                    className="icon-button"
                    aria-label={`移除 ${m.name}`}
                    disabled={selected.length <= 1}
                    onClick={() =>
                      setSelected((old) => old.filter((x) => x.id !== m.id))
                    }
                  >
                    <X size={14} />
                  </button>
                </div>
                {editing === m.id && (
                  <div className="custom-price">
                    <label>
                      私人输入价（USD/百万）
                      <input
                        type="number"
                        min="0"
                        value={custom[m.id]?.input ?? ""}
                        onChange={(e) =>
                          setCustom((old) => ({
                            ...old,
                            [m.id]: {
                              output: old[m.id]?.output ?? "",
                              input: e.target.value,
                            },
                          }))
                        }
                      />
                    </label>
                    <label>
                      私人输出价（USD/百万）
                      <input
                        type="number"
                        min="0"
                        value={custom[m.id]?.output ?? ""}
                        onChange={(e) =>
                          setCustom((old) => ({
                            ...old,
                            [m.id]: {
                              input: old[m.id]?.input ?? "",
                              output: e.target.value,
                            },
                          }))
                        }
                      />
                    </label>
                    <button
                      onClick={() =>
                        setCustom((old) => {
                          const next = { ...old };
                          delete next[m.id];
                          return next;
                        })
                      }
                    >
                      恢复渠道报价
                    </button>
                  </div>
                )}
              </div>
            );
          })}
          <div className="comparison-foot">
            <span className="micro">
              模型库 {modelCount} 项 ·
              渠道单价情景，不含充值手续费；按公开阶梯及当前 UTC 时段计算。
            </span>
            <Link href="/models">
              浏览全部模型 <ArrowUpRight size={14} />
            </Link>
          </div>
        </div>
      </section>
      <div className="bottom-grid">
        <section className="recommendation panel">
          <div className="panel-title">
            <Sparkles size={18} /> 选择建议{" "}
            <span className="badge neutral">规则建议</span>
          </div>
          {recommendations.length > 0 ? (
            <>
              <h3>{recommendations[0].model.name}</h3>
              <p>
                在你选择的模型和当前预算情景中，
                {s.preference === "cost"
                  ? "此方案的典型费用较低"
                  : task === "code" || task === "reason"
                    ? "优先考虑支持推理的候选，再比较费用"
                    : "按当前预算费用提供候选"}
                。任务判断：{tasks[task]}。
              </p>
              <div className="recommend-cost">
                <strong>
                  {mainResult?.values
                    ? money(mainResult.values.typical, s.currency)
                    : "—"}
                </strong>
                <span>典型单次预算</span>
              </div>
              {recommendations.length > 1 && (
                <p className="micro">
                  备选：
                  {recommendations
                    .slice(1)
                    .map((x) => x.model.name)
                    .join("、")}
                </p>
              )}
              <p className="micro">
                {s.preference === "quality"
                  ? "尚无足够实测数据判断质量最优。"
                  : "没有进行回答质量实测。"}
                参考编码、预算假设和渠道差异会影响结果。
              </p>
            </>
          ) : (
            <>
              <h3>
                {text ? "先补齐预算，再比较" : "让每一次提问，都更有把握。"}
              </h3>
              <p>
                {text
                  ? "填写推理预算，或加入标准模式模型；存在缺价、超限或不完整费用时不会强行推荐。"
                  : "粘贴你的文本，选择需要比较的模型。我们会解释选择依据，而不只给出一个数字。"}
              </p>
              <span className="micro">不生成回答 · 不调用付费模型</span>
            </>
          )}
        </section>
        <section className="advanced panel">
          <div className="panel-title">
            <Settings2 size={17} /> 更多预算设置
          </div>
          <div className="advanced-fields">
            <label>
              额外输入 token
              <input
                type="number"
                min="0"
                value={s.extra}
                onChange={(e) => patch({ extra: Number(e.target.value) })}
              />
            </label>
            <label>
              缓存命中比例（%）
              <input
                type="number"
                min="0"
                max="100"
                value={s.cache * 100}
                onChange={(e) => patch({ cache: Number(e.target.value) / 100 })}
              />
            </label>
            <label>
              每月请求次数
              <input
                type="number"
                min="1"
                value={s.requests}
                onChange={(e) => patch({ requests: Number(e.target.value) })}
              />
            </label>
            <label>
              参考汇率 · USD → CNY
              <input
                type="number"
                min="0.01"
                step="0.01"
                placeholder="自行填写，非实时汇率"
                value={s.fx}
                onChange={(e) => patch({ fx: e.target.value })}
              />
            </label>
          </div>
          <div className="monthly">
            <span>
              月度预算情景 {primary && <small>· {primary.name}</small>}
            </span>
            <strong>
              {count !== null && mainResult?.monthly
                ? money(mainResult.monthly.typical, s.currency)
                : "—"}
            </strong>
          </div>
          <p className="micro">
            仅将单次情景乘以请求次数，不含工具调用、重试及未知系统提示。
          </p>
        </section>
      </div>
      {count !== null && mainResult && <section className="panel"><CloudSaveButton item={{title:"Token预算 · "+new Date().toLocaleDateString(),kind:"预算",href:"/calculators/tokens?budget="+count+"-"+s.currency+"-"+s.encoding,note:JSON.stringify({inputTokens:count,encoding:s.encoding,currency:s.currency,scope:"估算情景，不是实际账单；不含输入原文",results:results.slice(0,8)},null,2).slice(0,4000)}}/><p className="micro">主动保存后仅将词元数量与费用估算发送到工作台，不包含输入原文。</p></section>}
      <div className="export-bar">
        <label className="check-label">
          <input
            type="checkbox"
            checked={includeText}
            onChange={(e) => setIncludeText(e.target.checked)}
          />{" "}
          导出时包含原文<span className="micro">默认不包含</span>
        </label>
        <div>
          <button
            className="button outline"
            disabled={count === null || busy}
            onClick={() => void copy()}
          >
            <Copy size={15} /> 复制结果
          </button>
          <button
            className="button outline"
            disabled={count === null || busy}
            onClick={() => download("csv")}
          >
            <Download size={15} /> CSV
          </button>
          <button
            className="button primary"
            disabled={count === null || busy}
            onClick={() => download("json")}
          >
            <Download size={15} /> 导出报告
          </button>
        </div>
      </div>
      {showPicker && (
        <div className="modal-backdrop" onClick={() => setShowPicker(false)}>
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="picker-title"
            className="model-modal"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key !== "Tab") return;
              const nodes = Array.from(
                e.currentTarget.querySelectorAll<HTMLElement>(
                  "button:not(:disabled),input,a[href]",
                ),
              );
              const first = nodes[0],
                last = nodes[nodes.length - 1];
              if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last?.focus();
              } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first?.focus();
              }
            }}
          >
            <div className="panel-top">
              <h2 id="picker-title">添加对比模型</h2>
              <button
                autoFocus
                className="icon-button"
                aria-label="关闭模型选择"
                onClick={() => setShowPicker(false)}
              >
                <X />
              </button>
            </div>
            <label className="search-box">
              <Search size={18} />
              <input
                aria-label="搜索对比模型"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="搜索模型、厂商或 API ID"
                maxLength={200}
              />
            </label>
            <p className="micro">
              从 {modelCount} 个条目中选择，最多对比 6
              个。不同型号的计数均为参考编码。
            </p>
            <div className="picker-results">
              {pickerBusy ? (
                <p>搜索中…</p>
              ) : pickerError ? (
                <p role="alert">{pickerError}</p>
              ) : options.length === 0 ? (
                <p>没有匹配的模型，请尝试其他关键词。</p>
              ) : (
                options.map((m) => (
                  <button
                    key={m.id}
                    disabled={
                      selected.some((x) => x.id === m.id) ||
                      selected.length >= 6
                    }
                    onClick={() => {
                      setSelected((old) => [...old, m]);
                      setToast(`已添加 ${m.name}`);
                      setShowPicker(false);
                    }}
                  >
                    <div>
                      <strong>{m.name}</strong>
                      <small>
                        {m.providerName} · {m.channel} ·{" "}
                        {m.price ? "有渠道报价" : "资料展示"}
                      </small>
                    </div>
                    {selected.some((x) => x.id === m.id) ? (
                      <Check size={18} />
                    ) : (
                      <Plus size={18} />
                    )}
                  </button>
                ))
              )}
            </div>
            <Link href="/models" className="text-button">
              查看完整目录与来源 <ArrowUpRight size={14} />
            </Link>
          </section>
        </div>
      )}
      {toast && (
        <div role="status" className="toast">
          <Check size={16} />
          {toast}
        </div>
      )}
    </>
  );
}
