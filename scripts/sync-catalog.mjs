import fs from "node:fs";
import { CatalogSchema } from "../shared/types.ts";
import crypto from "node:crypto";
import Decimal from "decimal.js";
const providers = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  google: "Google",
  "x-ai": "Grok",
  deepseek: "DeepSeek 深度求索",
  qwen: "通义千问 Qwen",
  moonshotai: "月之暗面 Kimi",
  "z-ai": "智谱 GLM",
  minimax: "MiniMax",
  "bytedance-seed": "字节 Seed",
  bytedance: "字节豆包",
  baidu: "百度文心",
  tencent: "腾讯混元",
  stepfun: "阶跃星辰",
  "meta-llama": "Meta Llama",
  meta: "Meta",
  mistralai: "Mistral",
  cohere: "Cohere",
  amazon: "Amazon Nova",
  microsoft: "Microsoft",
  nvidia: "NVIDIA",
  "ibm-granite": "IBM Granite",
  xiaomi: "小米 MiMo",
  ai21: "AI21",
  perplexity: "Perplexity",
  inception: "Inception",
  writer: "Writer",
  rekaai: "Reka",
  "arcee-ai": "Arcee",
  nousresearch: "Nous Research",
  upstage: "Upstage",
  meituan: "美团",
  kwaipilot: "快手",
  inclusionai: "蚂蚁",
  poolside: "Poolside",
  thinkingmachines: "Thinking Machines",
  liquid: "Liquid",
  "aion-labs": "Aion Labs",
};
const source = "https://openrouter.ai/api/v1/models";
const raw = process.argv[2]
  ? JSON.parse(fs.readFileSync(process.argv[2], "utf8"))
  : await fetch(source).then((r) => {
      if (!r.ok) throw Error(r.status);
      return r.json();
    });
if (!Array.isArray(raw.data) || raw.data.length < 100)
  throw Error("Refuse incomplete source snapshot");
const fetchedAt = new Date().toISOString();
const models = [];
const excluded = [];
for (const m of raw.data) {
  const vendor = m.id.split("/")[0];
  if (
    !providers[vendor] ||
    m.id.includes(":") ||
    !m.architecture?.output_modalities?.includes("text")
  ) {
    excluded.push({ id: m.id, reason: "非目标厂商、渠道变体或非文本输出" });
    continue;
  }
  const pricing = m.pricing || {};
  const dollars = (v) =>
    v !== undefined && Number(v) >= 0 ? new Decimal(v).mul(1000000).toString() : null;
  const reasoning =
    m.supported_parameters?.includes("reasoning") ||
    m.supported_parameters?.includes("include_reasoning");
  models.push({
    id: m.id.replaceAll("/", "--"),
    canonicalId: m.id,
    name: m.name.replace(/^[^:]+: /, ""),
    provider: vendor,
    providerName: providers[vendor],
    description: (m.description || "").slice(0, 650),
    context: m.context_length || null,
    maxOutput: m.top_provider?.max_completion_tokens || null,
    reasoning: !!reasoning,
    modes:
      m.id === "openai/gpt-6-astra"
        ? ["low", "medium", "high", "xhigh", "max"]
        : reasoning
          ? ["default"]
          : ["none"],
    modality: m.architecture?.input_modalities || ["text"],
    tokenizer: "reference",
    encoding: /gpt-3.5|gpt-4-0314|gpt-4-0613/.test(m.id)
      ? "cl100k_base"
      : "o200k_base",
    price:
      pricing.prompt !== undefined && Number(pricing.prompt) >= 0
        ? {
            input: dollars(pricing.prompt),
            output: dollars(pricing.completion),
            cache: dollars(pricing.input_cache_read),
            request:
              pricing.request && Number(pricing.request) >= 0
                ? pricing.request
                : "0",
            currency: "USD",
            checkedAt: fetchedAt,
            source: `https://openrouter.ai/${m.id}`,
            basis: "channel-base",
            overrides: pricing.overrides || [],
          }
        : null,
    source: `https://openrouter.ai/${m.id}`,
    checkedAt: fetchedAt,
    channel: "OpenRouter",
    access: "api",
    status: "listed",
    tier: /nano|mini|lite|\b1b\b|\b3b\b/i.test(m.id) ? "economy" : "unverified",
    created: m.created || 0,
  });
}
const supplemental = JSON.parse(
  fs.readFileSync("data/supplemental.json", "utf8"),
);
models.push(
  ...supplemental.map((m) => ({
    ...m,
    tokenizer: "reference",
    encoding: "o200k_base",
    price: null,
    tier: "unverified",
    created: 0,
  })),
);
models.sort((a, b) => b.created - a.created || a.id.localeCompare(b.id));
const revision = crypto
  .createHash("sha256")
  .update(JSON.stringify(models))
  .digest("hex")
  .slice(0, 12);
const catalog = { version: `${fetchedAt.slice(0, 7)}-${revision}`, fetchedAt, source, models };
CatalogSchema.parse(catalog);
if (new Set(models.map((m) => m.id)).size !== models.length)
  throw Error("Duplicate model ids");
fs.mkdirSync("data/snapshots", { recursive: true });
if (fs.existsSync("data/catalog.json")) {
  const old = JSON.parse(fs.readFileSync("data/catalog.json"));
  fs.writeFileSync(`data/snapshots/${old.version}.json`, JSON.stringify(old));
}
fs.writeFileSync("data/catalog.json.tmp", JSON.stringify(catalog, null, 2));
fs.renameSync("data/catalog.json.tmp", "data/catalog.json");
fs.writeFileSync(
  "data/coverage.json",
  JSON.stringify(
    {
      fetchedAt,
      version: catalog.version,
      sourceCount: raw.data.length,
      included: models.length,
      providers: [...new Set(models.map((m) => m.providerName))],
      excluded,
      missingManufacturerAudits: ["零一万物 Yi", "百川", "AI21 Jamba"],
      limits: [
        "渠道目录不代表全球全部厂商清单；仍需逐家核验。",
        "目录报价为 OpenRouter 渠道基础报价，非厂商直连价；充值手续费和复杂阶梯另计。",
        "所有模型的输入暂使用用户选择的参考编码，不冒充官方 API token 计数。",
      ],
      entries: models.map((m) => ({
        id: m.id,
        source: m.source,
        status: m.status,
        missing: [
          "model-tokenizer-mapping",
          "task-evaluation",
          ...(m.price ? ["full-tier-audit"] : ["price"]),
        ],
      })),
    },
    null,
    2,
  ),
);
console.log(
  `Saved ${models.length} models, ${new Set(models.map((m) => m.provider)).size} providers, ${revision}`,
);
