import { z } from "zod";
export const savedItemSchema = z.object({
  id: z.string().min(1).max(200),
  title: z.string().min(1).max(300),
  href: z
    .string()
    .regex(/^\/(learn|tools|models)\/[a-zA-Z0-9_][a-zA-Z0-9_.-]*$/),
  kind: z.enum(["知识", "教程", "工具", "模型"]),
});
export type SavedItem = z.infer<typeof savedItemSchema>;
export const librarySchema = z.object({
  version: z.literal(1),
  items: z.array(savedItemSchema).max(500),
  progress: z
    .record(
      z
        .string()
        .regex(/^[a-z0-9-]+:v1$/)
        .max(200),
      z.array(z.number().int().min(0).max(100)).max(100),
    )
    .refine((v) => Object.keys(v).length <= 500),
});
export type Library = z.infer<typeof librarySchema>;
export const emptyLibrary: Library = { version: 1, items: [], progress: {} };
export function parseLibrary(value: string): Library {
  return librarySchema.parse(JSON.parse(value));
}
