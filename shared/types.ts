import { z } from "zod";
const decimal = z.string().regex(/^\d+(\.\d+)?([eE][+-]?\d+)?$/);
export const ModelSchema = z.object({
  id: z.string(),
  canonicalId: z.string(),
  name: z.string(),
  provider: z.string(),
  providerName: z.string(),
  description: z.string(),
  context: z.number().nullable(),
  maxOutput: z.number().nullable(),
  reasoning: z.boolean(),
  modes: z.array(z.string()),
  modality: z.array(z.string()),
  tokenizer: z.string(),
  encoding: z.enum(["cl100k_base", "o200k_base"]),
  price: z
    .object({
      input: decimal.nullable(),
      output: decimal.nullable(),
      cache: decimal.nullable(),
      request: decimal,
      currency: z.literal("USD"),
      checkedAt: z.iso.datetime(),
      source: z.url(),
      basis: z.string(),
      overrides: z.array(z.record(z.string(), z.unknown())).default([]),
    })
    .nullable(),
  source: z.url(),
  checkedAt: z.iso.datetime(),
  channel: z.string(),
  access: z.enum(["api", "weights", "web-only", "restricted"]),
  status: z.string(),
  tier: z.string(),
  created: z.number(),
});
export const CatalogSchema = z.object({
  version: z.string(),
  fetchedAt: z.iso.datetime(),
  source: z.url(),
  models: z.array(ModelSchema),
});
export type Model = z.infer<typeof ModelSchema>;
export type Encoding = "cl100k_base" | "o200k_base";
export type Budget = { low: number; typical: number; high: number };
export type Settings = {
  visible: Budget;
  reasoning: Budget | null;
  extra: number;
  cache: number;
  requests: number;
  fx: string;
  currency: "USD" | "CNY";
  preference: "balanced" | "cost" | "quality";
  task: string;
  encoding: Encoding;
};
export const presets: Record<string, Budget> = {
  short: { low: 128, typical: 256, high: 512 },
  standard: { low: 512, typical: 1024, high: 2048 },
  long: { low: 2048, typical: 4096, high: 8192 },
};
export const defaults: Settings = {
  visible: presets.standard,
  reasoning: null,
  extra: 0,
  cache: 0,
  requests: 1,
  fx: "",
  currency: "USD",
  preference: "balanced",
  task: "auto",
  encoding: "o200k_base",
};
export const tasks: Record<string, string> = {
  auto: "自动判断",
  rewrite: "改写润色",
  summary: "长文摘要",
  translate: "翻译",
  extract: "结构化提取",
  code: "代码问答",
  reason: "复杂推理",
  other: "一般问答",
};
