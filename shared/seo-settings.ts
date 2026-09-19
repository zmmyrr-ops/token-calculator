import { z } from "zod";
export const seoFields = z.object({
  title: z.string().trim().max(120),
  description: z.string().trim().max(400),
  image: z
    .string()
    .trim()
    .max(2000)
    .refine(
      (s) =>
        !s ||
        /^\/(?!\/)[a-zA-Z0-9_./-]+\.(png|jpg|jpeg|webp)$/i.test(s) ||
        (() => {
          try {
            const u = new URL(s);
            return u.protocol === "https:" && !u.username && !u.password;
          } catch {
            return false;
          }
        })(),
      "请使用站内图片路径或HTTPS图片链接",
    ),
});
export type SeoOverride = z.infer<typeof seoFields> & { revision: number };
