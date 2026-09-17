import { describe, it, expect } from "vitest";
import {
  computeCost,
  estimate,
  normalizeUsage,
  csvCell,
  classify,
  recommend,
  ageDays,
  resolvePrice,
} from "../../shared/engine";
import { defaults, type Model } from "../../shared/types";
const model: Model = {
  id: "test",
  canonicalId: "test/test",
  name: "测试型号",
  provider: "test",
  providerName: "Test",
  description: "测试",
  context: 1000000,
  maxOutput: 100000,
  reasoning: false,
  modes: ["none"],
  modality: ["text"],
  tokenizer: "reference",
  encoding: "o200k_base",
  price: {
    input: "2",
    output: "8",
    cache: "0.5",
    request: "0",
    currency: "USD",
    checkedAt: new Date().toISOString(),
    source: "https://example.com",
    basis: "test",
    overrides: [],
  },
  source: "https://example.com",
  checkedAt: new Date().toISOString(),
  channel: "test",
  access: "api",
  status: "listed",
  tier: "unverified",
  created: 0,
};
describe("billing arithmetic", () => {
  it("matches hand-calculated uncached total", () =>
    expect(
      computeCost(1000, 0, 500, 0, { input: "2", cache: "0.5", output: "8" }),
    ).toBe("0.006"));
  it("separates cache and reasoning without double counting", () => {
    const { visible, reasoning } = normalizeUsage(1500, 1000);
    expect(
      computeCost(1000, 200, visible, reasoning, {
        input: "2",
        cache: "0.5",
        output: "8",
      }),
    ).toBe("0.0137");
  });
  it("supports separate reasoning rate and request charges", () =>
    expect(
      computeCost(1000, 0, 500, 1000, {
        input: "2",
        cache: null,
        output: "8",
        reasoning: "4",
        request: "0.01",
      }),
    ).toBe("0.02"));
  it("rejects cache over total", () =>
    expect(() =>
      computeCost(10, 11, 0, 0, { input: "2", cache: "1", output: "8" }),
    ).toThrow());
  it("rejects missing cache rate", () =>
    expect(() =>
      computeCost(10, 1, 0, 0, { input: "2", cache: null, output: "8" }),
    ).toThrow());
  it("rejects negative and malformed prices", () => {
    expect(() =>
      computeCost(1, 0, 0, 0, { input: "-1", cache: null, output: "8" }),
    ).toThrow();
    expect(() =>
      computeCost(1, 0, 0, 0, { input: "abc", cache: null, output: "8" }),
    ).toThrow();
  });
  it("does not claim unknown reasoning is zero", () =>
    expect(estimate({ ...model, reasoning: true }, 100, defaults).status).toBe(
      "partial",
    ));
  it("rejects budget order and capacity excess", () => {
    expect(
      estimate(model, 100, {
        ...defaults,
        visible: { low: 10, typical: 5, high: 4 },
      }).status,
    ).toBe("unavailable");
    expect(estimate({ ...model, context: 1000 }, 900, defaults).status).toBe(
      "unavailable",
    );
  });
  it("requires a conversion rate and preserves actual multiplier", () => {
    expect(estimate(model, 100, { ...defaults, currency: "CNY" }).status).toBe(
      "unavailable",
    );
    const r = estimate(model, 1000, {
      ...defaults,
      currency: "CNY",
      fx: "7",
      visible: { low: 500, typical: 500, high: 500 },
      requests: 1000,
    });
    expect(r.values?.typical).toBe(0.042);
    expect(r.monthly?.typical).toBe(42);
  });
  it("does not rank stale prices", () => {
    expect(
      estimate(
        {
          ...model,
          price: { ...model.price!, checkedAt: "2020-01-01T00:00:00Z" },
        },
        100,
        defaults,
      ).status,
    ).toBe("unavailable");
  });
  it("applies inclusive tier threshold and UTC time windows", () => {
    const p = {
      ...model.price!,
      overrides: [
        { min_prompt_tokens: 1000, prompt: "0.000004", completion: "0.000016" },
        {
          utc_days: ["monday"],
          utc_start: 100,
          utc_end: 400,
          prompt: "0.000008",
        },
      ],
    };
    expect(resolvePrice(p, 999, new Date("2026-09-15T02:00:00Z")).input).toBe(
      "2",
    );
    expect(resolvePrice(p, 1000, new Date("2026-09-15T02:00:00Z")).input).toBe(
      "4",
    );
    expect(resolvePrice(p, 1000, new Date("2026-09-14T02:00:00Z")).input).toBe(
      "8",
    );
  });
  it("keeps tiny positive values and explicit zero price", () =>
    expect(
      Number(
        computeCost(1, 0, 0, 0, { input: ".001", output: "0", cache: null }),
      ),
    ).toBeGreaterThan(0));
});
describe("selection and export", () => {
  it("recognizes concrete tasks", () => {
    expect(classify("请翻译为英文")).toBe("translate");
    expect(classify("修复代码报错")).toBe("code");
  });
  it("excludes incomplete budgets from recommendations", () => {
    const m = { ...model, reasoning: true };
    expect(
      recommend([m], [estimate(m, 100, defaults)], "code", "cost"),
    ).toEqual([]);
  });
  it("escapes CSV formulas, quotes and line breaks", () => {
    expect(csvCell("=1+1")).toBe('"\'=1+1"');
    expect(csvCell('a"b\nc')).toBe('"a""b\nc"');
  });
  it("rejects invalid usage totals", () =>
    expect(() => normalizeUsage(100, 101)).toThrow());
  it("supports deterministic date testing", () =>
    expect(
      ageDays("2026-09-01T00:00:00Z", Date.parse("2026-09-09T00:00:00Z")),
    ).toBe(8));
});
