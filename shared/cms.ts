import { learningCategory } from "./learning";
import { resourceCategory } from "./resource-categories";
import { z } from "zod";
import { ModelSchema } from "./types";
export const kinds = ["knowledge", "resource", "scenario", "model"] as const;
export type Kind = (typeof kinds)[number];
export const kindLabels: Record<Kind, string> = {
  knowledge: "知识与教程",
  resource: "工具与平台",
  scenario: "应用场景",
  model: "模型目录",
};
const text = z.string().max(20000),
  short = z.string().max(300),
  id = z.string().regex(/^[a-zA-Z0-9_][a-zA-Z0-9_.-]{0,150}$/);
const link = z
  .string()
  .max(2000)
  .refine(
    (s) =>
      /^\/(?!\/)[a-zA-Z0-9_/-]*$/.test(s) ||
      (() => {
        try {
          const u = new URL(s);
          return (
            ["https:", "http:"].includes(u.protocol) &&
            !u.username &&
            !u.password
          );
        } catch {
          return false;
        }
      })(),
    "请输入 http(s) 来源链接或站内路径",
  );
const lines = z.array(text).max(100);
export const practiceSchema = z.object({
  scenario: id,
  level: z.enum(["入门", "有基础"]),
  audience: text,
  result: text,
  preparation: lines,
  deliverables: lines,
  steps: z.array(z.object({ actions: lines, check: text })).max(100),
  pitfalls: z.array(z.object({ problem: text, solution: text })).max(100),
  prompt: text,
  toolRoles: z.array(z.object({ id, role: text })).max(100),
});
export const curationSchema = z.object({
  publisher: short,
  author: short,
  url: link,
  publishedAt: z.string().max(40),
  collectedAt: z.string().max(40),
  language: short,
});
export type Curation = z.infer<typeof curationSchema>;
export const knowledgeSchema = z.object({
  workshop: z
    .object({
      image: z
        .string()
        .regex(/^\/workshop-files\/[a-z0-9-]+\.png$/)
        .optional(),
      version: short,
      duration: short,
      verification: text,
      download: z.string().regex(/^\/workshop-files\/[a-z0-9-]+\.zip$/),
      demo: z
        .string()
        .regex(/^\/workshop-files\/[a-z0-9-]+\/index\.html$/)
        .optional(),
    })
    .optional(),
  curation: curationSchema.optional(),
  slug: id,
  title: short.min(1),
  category: short.transform(learningCategory),
  summary: text,
  keywords: text,
  sections: z
    .array(
      z.object({
        title: short,
        body: text,
        code: text.optional(),
        language: short.optional(),
      }),
    )
    .min(1)
    .max(100),
  sources: z
    .array(z.object({ title: short, url: link }))
    .max(100)
    .default([]),
  practice: practiceSchema.optional(),
  video: z
    .object({
      url: link,
      publisher: short.min(1),
      language: short,
      version: text,
      audience: text,
      checkedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    })
    .optional(),
});
export const resourceSchema = z.object({
  icon: z
    .string()
    .max(2000)
    .refine(
      (s) =>
        !s ||
        /^\/platform-icons\/[a-zA-Z0-9_.-]+$/.test(s) ||
        /^https:\/\//.test(s),
      "请使用站内图标或HTTPS图片",
    )
    .optional(),
  tags: z.array(short).max(10).optional(),
  id,
  name: short.min(1),
  category: short.transform((value) => resourceCategory(value)),
  summary: text,
  input: text,
  output: text,
  access: short,
  capabilities: lines,
  limits: text,
  url: link,
  source: link,
  checkedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  article: id,
});
export const scenarioSchema = z.object({
  id,
  name: short.min(1),
  summary: text,
  articles: z.array(id).min(1).max(100),
  tools: z.array(id).max(100),
  steps: lines,
});
export const schemas = {
  knowledge: knowledgeSchema,
  resource: resourceSchema,
  scenario: scenarioSchema,
  model: ModelSchema.extend({
    id,
    name: short.min(1),
    source: link,
    description: text,
  }),
};
export type Entity =
  | z.infer<typeof knowledgeSchema>
  | z.infer<typeof resourceSchema>
  | z.infer<typeof scenarioSchema>
  | z.infer<typeof ModelSchema>;
export type DocumentRecord = {
  kind: Kind;
  id: string;
  draft: Entity;
  published: Entity | null;
  revision: number;
  updatedAt: string;
};
export function parseEntity(kind: Kind, value: unknown) {
  const parsed = schemas[kind].parse(value) as Entity;
  function validateLinks(x: unknown) {
    if (Array.isArray(x)) {
      x.forEach(validateLinks);
      return;
    }
    if (x && typeof x === "object")
      for (const [k, v] of Object.entries(x)) {
        if ((k === "source" || k === "url") && typeof v === "string")
          link.parse(v);
        else validateLinks(v);
      }
  }
  validateLinks(parsed);
  return parsed;
}
export function entityId(entity: Entity) {
  return "slug" in entity ? entity.slug : entity.id;
}
export function entityName(entity: Entity) {
  return "title" in entity ? entity.title : entity.name;
}
