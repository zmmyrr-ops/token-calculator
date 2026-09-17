import Decimal from "decimal.js";
import type { Budget, Model, Settings } from "./types";
export function ageDays(date: string, now = Date.now()) {
  return Math.max(0, (now - new Date(date).getTime()) / 86400000);
}
export function classify(text: string) {
  if (/```|function\s|def\s|报错|代码|debug/i.test(text)) return "code";
  if (/翻译|translate/i.test(text)) return "translate";
  if (/摘要|总结|summari/i.test(text)) return "summary";
  if (/提取|抽取|json|extract/i.test(text)) return "extract";
  if (/证明|推导|多步|架构|证明|reason/i.test(text)) return "reason";
  if (/改写|润色|rewrite/i.test(text)) return "rewrite";
  return "other";
}
export function validBudget(b: Budget) {
  return (
    [b.low, b.typical, b.high].every(
      (n) => Number.isSafeInteger(n) && n >= 0 && n <= 10000000,
    ) &&
    b.low <= b.typical &&
    b.typical <= b.high
  );
}
export function computeCost(
  i: number,
  h: number,
  v: number,
  r: number,
  p: {
    input: string;
    cache: string | null;
    output: string;
    request?: string;
    reasoning?: string;
  },
) {
  if ([i, h, v, r].some((x) => !Number.isSafeInteger(x) || x < 0) || h > i)
    throw Error("无效的 token 预算");
  if (
    [
      p.input,
      p.output,
      p.cache ?? "0",
      p.request ?? "0",
      p.reasoning ?? "0",
    ].some((x) => !new Decimal(x).isFinite() || new Decimal(x).isNegative())
  )
    throw Error("无效价格");
  if (h > 0 && p.cache === null) throw Error("该渠道没有可核验的缓存单价");
  return new Decimal(i - h)
    .mul(p.input)
    .plus(new Decimal(h).mul(p.cache ?? 0))
    .plus(new Decimal(v).mul(p.output))
    .plus(new Decimal(r).mul(p.reasoning ?? p.output))
    .div(1e6)
    .plus(p.request ?? 0)
    .toString();
}
export function resolvePrice(
  p: NonNullable<Model["price"]>,
  input: number,
  now = new Date(),
) {
  const current = {
    input: p.input,
    output: p.output,
    cache: p.cache,
    request: p.request,
  };
  const day = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ][now.getUTCDay()];
  const time = now.getUTCHours() * 100 + now.getUTCMinutes();
  for (const rule of p.overrides ?? []) {
    if (
      typeof rule.min_prompt_tokens === "number" &&
      input < rule.min_prompt_tokens
    )
      continue;
    if (Array.isArray(rule.utc_days) && !rule.utc_days.includes(day)) continue;
    if (
      typeof rule.utc_start === "number" &&
      typeof rule.utc_end === "number"
    ) {
      const start = rule.utc_start,
        end = rule.utc_end;
      const match =
        end <= start
          ? time >= start || time < end
          : time >= start && time < end;
      if (!match) continue;
    }
    for (const [from, to] of [
      ["prompt", "input"],
      ["completion", "output"],
      ["input_cache_read", "cache"],
    ] as const) {
      if (typeof rule[from] === "string")
        current[to] = new Decimal(rule[from] as string).mul(1e6).toString();
    }
  }
  return current;
}
export type Estimate = {
  id: string;
  status: "complete" | "partial" | "unavailable";
  values: Budget | null;
  monthly: Budget | null;
  input: number;
  reason: string;
  warning: string;
  custom: boolean;
};
export function estimate(
  m: Model,
  count: number,
  s: Settings,
  custom?: { input: string; output: string },
): Estimate {
  const base = {
    id: m.id,
    input: count + s.extra,
    values: null,
    monthly: null,
    custom: !!custom,
  };
  const fail = (reason: string): Estimate => ({
    ...base,
    status: "unavailable",
    reason,
    warning: "",
  });
  if (
    !validBudget(s.visible) ||
    (s.reasoning && !validBudget(s.reasoning)) ||
    !Number.isSafeInteger(s.extra) ||
    s.extra < 0 ||
    !Number.isSafeInteger(s.requests) ||
    s.requests < 1 ||
    s.requests > 1e9 ||
    !Number.isFinite(s.cache) ||
    s.cache < 0 ||
    s.cache > 1
  )
    return fail("请检查预算上下界、缓存比例及请求次数");
  const p = custom
    ? { input: custom.input, output: custom.output, cache: null, request: "0" }
    : m.price
      ? resolvePrice(m.price, count + s.extra)
      : null;
  if (!p || p.input === null || p.output === null)
    return fail("暂无公开单价，可在模型设置中填写私人报价");
  if (!custom && m.price && ageDays(m.price.checkedAt) > 30)
    return fail("价格超过 30 天未核验，暂不参与预算");
  if (
    s.currency === "CNY" &&
    (!s.fx ||
      !Number.isFinite(Number(s.fx)) ||
      Number(s.fx) <= 0 ||
      Number(s.fx) > 100)
  )
    return fail("请填写 USD → CNY 参考汇率");
  if (s.cache > 0 && p.cache === null)
    return fail("缺少缓存命中报价，请将缓存比例设为 0");
  const i = count + s.extra;
  const r = m.reasoning ? s.reasoning : { low: 0, typical: 0, high: 0 };
  if (m.context && i + s.visible.high + (r?.high ?? 0) > m.context)
    return fail("输入与输出预算超出该型号的上下文容量");
  if (m.maxOutput && s.visible.high + (r?.high ?? 0) > m.maxOutput)
    return fail("回答与推理预算超出输出上限");
  try {
    const values = {} as Budget;
    for (const k of ["low", "typical", "high"] as const) {
      const c = computeCost(
        i,
        Math.floor(i * s.cache),
        s.visible[k],
        r?.[k] ?? 0,
        {
          input: p.input,
          output: p.output,
          cache: p.cache,
          request: p.request,
        },
      );
      values[k] = new Decimal(c)
        .mul(s.currency === "CNY" ? s.fx : 1)
        .toNumber();
    }
    const warning =
      "参考编码；已应用目录公开的输入阶梯及当前 UTC 时段报价，未含工具调用、缓存创建及充值费。";
    return {
      ...base,
      status: r ? "complete" : "partial",
      values,
      monthly: {
        low: new Decimal(values.low).mul(s.requests).toNumber(),
        typical: new Decimal(values.typical).mul(s.requests).toNumber(),
        high: new Decimal(values.high).mul(s.requests).toNumber(),
      },
      reason: !r ? "未计入推理：填写推理预算后可比较总情景" : "预算假设已齐备",
      warning,
    };
  } catch {
    return fail("价格或预算格式不正确");
  }
}
export function recommend(
  models: Model[],
  estimates: Estimate[],
  task: string,
  preference: Settings["preference"],
) {
  const candidates = models
    .map((m) => ({ model: m, result: estimates.find((x) => x.id === m.id)! }))
    .filter(
      (x) =>
        x.result?.status === "complete" &&
        x.result.values &&
        x.model.access === "api",
    );
  candidates.sort((a, b) => {
    if (preference !== "cost" && (task === "code" || task === "reason")) {
      const gap = Number(b.model.reasoning) - Number(a.model.reasoning);
      if (gap) return gap;
    }
    return (
      a.result.values!.typical - b.result.values!.typical ||
      a.model.id.localeCompare(b.model.id)
    );
  });
  return candidates.slice(0, 3);
}
export function money(n: number, currency = "USD") {
  const prefix = currency === "CNY" ? "¥" : "$";
  if (n > 0 && n < 0.0001) return `${prefix}<0.0001`;
  return (
    prefix +
    n.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: n < 1 ? 5 : 2,
    })
  );
}
export function normalizeUsage(output: number, reasoning: number) {
  if (reasoning > output || reasoning < 0) throw Error("推理量超出总输出");
  return { visible: output - reasoning, reasoning };
}
export function csvCell(v: unknown) {
  let s = String(v ?? "");
  if (/^[\s]*[=+@-]/.test(s)) s = "'" + s;
  return '"' + s.replaceAll('"', '""') + '"';
}
