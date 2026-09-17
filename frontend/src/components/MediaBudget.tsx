import { useState } from "react";
import { mediaBudget, type MediaInput } from "@shared/media-budget";
import { Download, Plus, Trash2 } from "lucide-react";
export default function MediaBudget() {
  const [data, setData] = useState<MediaInput>({
    unit: "秒",
    currency: "CNY",
    mode: "usage",
    rate: "",
    packSize: "",
    packPrice: "",
    balance: "",
    extra: "",
    rows: [],
  });
  const [status, setStatus] = useState("");
  let result: ReturnType<typeof mediaBudget> | null = null;
  let error = "";
  try {
    if (data.rows.length) result = mediaBudget(data);
  } catch {
    error =
      "请检查输入：数量和尝试次数需为正整数，用量需大于0，金额不允许负数，额度包容量需大于0。";
  }
  const update = (key: keyof Omit<MediaInput, "rows">, value: string) =>
    setData({ ...data, [key]: value });
  function exportReport() {
    if (!result) return;
    const report = {
      version: 1,
      createdAt: new Date().toISOString(),
      basis: "用户提供的用量和报价；非平台自动报价",
      input: data,
      result,
    };
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(report, null, 2)], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "ruming-media-budget.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setStatus("预算已导出，包含你填写的项目名称与报价。");
  }
  return (
    <div className="media-layout">
      <section className="surface">
        <h2>1. 选择计费口径</h2>
        <p>
          一份预算使用同一服务、同一种额度。不同平台的积分或不同单位请分别计算。
        </p>
        <div className="form-grid">
          <label>
            计费用量单位
            <select
              aria-label="计费用量单位"
              value={data.unit}
              onChange={(e) => update("unit", e.target.value)}
            >
              <option>秒</option>
              <option>张</option>
              <option>个</option>
            </select>
          </label>
          <label>
            币种
            <select
              aria-label="币种"
              value={data.currency}
              onChange={(e) => update("currency", e.target.value)}
            >
              <option value="CNY">人民币 CNY</option>
              <option value="USD">美元 USD</option>
            </select>
          </label>
          <label>
            计费方式
            <select
              aria-label="计费方式"
              value={data.mode}
              onChange={(e) => update("mode", e.target.value)}
            >
              <option value="usage">按用量单价</option>
              <option value="package">购买额度包</option>
            </select>
          </label>
          {data.mode === "usage" ? (
            <label>
              每{data.unit}单价
              <input
                aria-label="用量单价"
                inputMode="decimal"
                value={data.rate}
                onChange={(e) => update("rate", e.target.value)}
                placeholder="填写实际报价"
              />
            </label>
          ) : (
            <>
              <label>
                已有可用额度（{data.unit}）
                <input
                  value={data.balance}
                  inputMode="decimal"
                  onChange={(e) => update("balance", e.target.value)}
                  placeholder="未填按 0"
                />
              </label>
              <label>
                每包容量（{data.unit}）
                <input
                  aria-label="每包容量"
                  value={data.packSize}
                  inputMode="decimal"
                  onChange={(e) => update("packSize", e.target.value)}
                  placeholder="填写实际容量"
                />
              </label>
              <label>
                每包价格
                <input
                  aria-label="每包价格"
                  value={data.packPrice}
                  inputMode="decimal"
                  onChange={(e) => update("packPrice", e.target.value)}
                  placeholder="填写实际报价"
                />
              </label>
            </>
          )}
          <label>
            其他固定费用
            <input
              inputMode="decimal"
              value={data.extra}
              onChange={(e) => update("extra", e.target.value)}
              placeholder="未填按 0；整项目仅加一次"
            />
          </label>
        </div>
        <h2 className="section-spacer">2. 填写实际任务</h2>
        <p>
          每项用量 = 产出数量 × 每个产出的计费{data.unit}数 ×
          尝试次数。按服务规则填入取整后的计费用量。
        </p>
        {data.rows.map((row, i) => (
          <div className="budget-row" key={i}>
            <label>
              任务名称
              <input
                maxLength={120}
                value={row.name}
                onChange={(e) =>
                  setData({
                    ...data,
                    rows: data.rows.map((r, n) =>
                      n === i ? { ...r, name: e.target.value } : r,
                    ),
                  })
                }
                placeholder="填写任务名称"
              />
            </label>
            {(["count", "units", "attempts"] as const).map((k) => (
              <label key={k}>
                {k === "count"
                  ? "产出数量"
                  : k === "units"
                    ? `每个计费${data.unit}数`
                    : "尝试次数"}
                <input
                  type="number"
                  min={k === "units" ? "0.000001" : 1}
                  step={k === "units" ? "any" : 1}
                  value={row[k]}
                  onChange={(e) =>
                    setData({
                      ...data,
                      rows: data.rows.map((r, n) =>
                        n === i
                          ? {
                              ...r,
                              [k]:
                                k === "units"
                                  ? e.target.value
                                  : Number(e.target.value),
                            }
                          : r,
                      ),
                    })
                  }
                />
              </label>
            ))}
            <button
              aria-label={`删除任务${i + 1}`}
              onClick={() =>
                setData({ ...data, rows: data.rows.filter((_, n) => n !== i) })
              }
            >
              <Trash2 size={17} />
            </button>
          </div>
        ))}
        <button
          className="button"
          disabled={data.rows.length >= 30}
          onClick={() =>
            setData({
              ...data,
              rows: [
                ...data.rows,
                { name: "", count: 1, units: "1", attempts: 1 },
              ],
            })
          }
        >
          <Plus size={16} /> 添加任务
        </button>
        <p className="muted small">最多30项。仅在本页处理，刷新不保留预算。</p>
      </section>
      <aside className="surface budget-summary">
        <h2>预算结果</h2>
        {error && <p role="alert">{error}</p>}
        {result ? (
          <>
            <div className="budget-number">
              {result.amount === null
                ? "报价未填写"
                : `${data.currency === "CNY" ? "¥" : "$"}${result.amount}`}
            </div>
            <p>
              {data.mode === "package" ? "新增购买支出" : "用量费用"}
              ，含已填固定费用
            </p>
            <dl className="detail-spec">
              <dt>总消耗</dt>
              <dd data-testid="media-units">
                {result.units} {data.unit}
              </dd>
              {data.mode === "package" && (
                <>
                  <dt>需补充用量</dt>
                  <dd>
                    {result.shortfall} {data.unit}
                  </dd>
                  <dt>购买包数</dt>
                  <dd>{result.packages ?? "需填写报价"}</dd>
                  <dt>预计剩余额度</dt>
                  <dd>{result.remaining ?? "未计算"}</dd>
                </>
              )}
            </dl>
            <button className="button" onClick={exportReport}>
              <Download size={16} /> 导出预算
            </button>
          </>
        ) : (
          !error && (
            <p>添加任务并填写报价后计算。这里不会自动填入任何平台价格。</p>
          )
        )}
        <p className="small muted">
          本工具按填写的线性单价或固定容量包计算。订阅权限、税费、额度有效期和阶梯折扣需按真实服务规则确认；尝试次数是你的计划，不是成功率预测。
        </p>
        <p role="status">{status}</p>
      </aside>
    </div>
  );
}
