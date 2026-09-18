import { z } from "zod";
export const workspaceItemSchema = z
  .object({
    title: z.string().trim().min(1).max(160),
    href: z
      .string()
      .max(500)
      .regex(
        /^\/(?:learn|tools|models|personas|ai-eyes|calculators)(?:\/[a-zA-Z0-9_-]+)*(?:\?[a-zA-Z0-9_%=&.-]+)?$/,
      ),
    kind: z.enum(["知识", "教程", "工具", "模型", "人格", "画像", "预算"]),
    category: z.string().trim().max(40).default("未分类"),
    note: z.string().max(4000).default(""),
  })
  .strict();
export type WorkspaceItem = z.infer<typeof workspaceItemSchema> & {
  id: string;
  updated: number;
};
export const promptInput = z
  .object({
    title: z.string().trim().min(1).max(100),
    body: z.string().trim().min(1).max(20000),
    category: z.string().trim().max(40).default("通用"),
  })
  .strict();
export type WorkspacePrompt = z.infer<typeof promptInput> & {
  id: string;
  revision: number;
  updated: number;
};
export const projectInput = z
  .object({
    title: z.string().trim().min(1).max(100),
    completed: z.array(z.string().max(60)).max(30),
    notes: z.string().max(10000),
    outcome: z.string().max(6000),
    url: z.union([
      z.literal(""),
      z
        .string()
        .url()
        .max(1000)
        .regex(/^https?:\/\//),
    ]),
    image: z.string().max(360000),
  })
  .strict();
export type ProjectState = z.infer<typeof projectInput>;
export type TaskPack = {
  id: string;
  version: number;
  title: string;
  category: string;
  summary: string;
  effort: string;
  deliverable: string;
  preparation: string[];
  tools: { name: string; href: string; role: string }[];
  tutorial: string;
  steps: {
    id: string;
    title: string;
    actions: string[];
    check: string;
    prompt: string;
  }[];
};
export type WorkspaceProject = ProjectState & {
  id: string;
  revision: number;
  updated: number;
  pack: TaskPack;
};
