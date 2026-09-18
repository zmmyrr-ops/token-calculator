import { z } from "zod";
import catalog from "../data/ai-eyes/catalog.json" with { type: "json" };
export { catalog as eyesCatalog };
export const eyesCoverVersion = "illustrated-4";
export type EyesPersona = (typeof catalog.items)[number];
export type EyesBlock = EyesPersona["blocks"][number];
export const visibleLength = (text: string) =>
  [...new Intl.Segmenter("zh", { granularity: "grapheme" }).segment(text)]
    .length;
export const typeId = z
  .string()
  .refine((id) => catalog.items.some((p) => p.id === id), "未知类型");
const note = z
  .string()
  .trim()
  .refine(
    (s) =>
      visibleLength(s) <= 48 &&
      !/[\r\n]|https?:|@|\b\d{7,}\b|[\\/]|sk-[a-z0-9]/i.test(s),
    "说明包含不允许的内容",
  );
export const matchSchema = z
  .object({
    schema_version: z.literal("4"),
    catalog_version: z.literal(catalog.version),
    persona_id: typeId,
    alternative_persona_id: typeId.nullable().default(null),
    match_notes: z.array(note).max(2),
    sample_scope: z.enum(["limited", "multiple_sessions"]),
  })
  .strict()
  .refine((x) => x.persona_id !== x.alternative_persona_id, "备选类型不可重复");
export type EyesMatch = z.infer<typeof matchSchema>;
export const selectionSchema = z
  .object({
    personaId: typeId,
    nickname: z
      .string()
      .trim()
      .min(1)
      .refine(
        (s) =>
          visibleLength(s) <= 12 &&
          !/[<>\r\n]|https?:|@|\d{7}/i.test(s) &&
          !Array.from(s).some((c) => c.charCodeAt(0) < 32),
        "昵称需为1–12个可见字符，不能包含网址或联系方式",
      ),
  })
  .strict();
export type EyesSelection = z.infer<typeof selectionSchema>;
export const eyesStatuses = [
  "waiting",
  "running",
  "completed",
  "insufficient_data",
  "failed",
  "cancelled",
  "expired",
] as const;
export type EyesStatus = (typeof eyesStatuses)[number];
export type EyesRun = {
  id: string;
  status: EyesStatus;
  phase: string;
  created: number;
  deadline: number;
  expires: number;
  scope: {
    start: string;
    end: string;
    days: number;
    timeZone: string;
    source?: "mobile_import";
    matcherVersion?: string;
    platform?: string;
    basis?: "conversation" | "questions";
  };
  result: EyesMatch | null;
  selection: EyesSelection | null;
  shareId: string | null;
  error: string | null;
};
export const eyesArt = (id: string) => `/ai-eyes-art/${id}-cutout-v2.png`;
