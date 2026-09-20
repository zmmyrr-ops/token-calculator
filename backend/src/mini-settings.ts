import { Router } from "express";
import { z } from "zod";
import type { ContentDatabase } from "./database";
import { CmsError } from "./database";
import { wechatConfiguration } from "./wechat";
export const miniSettingsSchema = z
  .object({ news: z.boolean(), forum: z.boolean(), models: z.boolean().default(true), platforms: z.boolean().default(true), eyes: z.boolean().default(true), minimalMode: z.boolean().default(false) })
  .strict();
export function miniConfiguration(store: ContentDatabase) {
  return {
    news: true, forum: true, models: true, platforms: true, eyes: true, minimalMode: false,
    ...store.meta<{ news: boolean; forum: boolean; models?: boolean; platforms?: boolean; eyes?: boolean; minimalMode?: boolean; updatedAt?: string }>("miniModules"),
  };
}
export function miniSettings(store: ContentDatabase) {
  const config = miniConfiguration(store);
  return config.minimalMode
    ? { ...config, news: false, forum: false, models: false, platforms: false, eyes: false }
    : config;
}
export function requireMiniModule(
  store: ContentDatabase,
  key: "news" | "forum" | "models" | "platforms" | "eyes",
) {
  if (!miniSettings(store)[key])
    throw new CmsError(403, "该小程序模块暂未开放");
}
export function miniSettingsAdminRouter(store: ContentDatabase) {
  const router = Router();
  router.get("/", (_req, res) =>
    res.json({ ...miniConfiguration(store), wechat: wechatConfiguration(store) }),
  );
  router.put("/", (req, res) => {
    const data = miniSettingsSchema.parse(req.body);
    const updatedAt = new Date().toISOString();
    store.transaction(() => {
      store.setMeta("miniModules", { ...data, updatedAt });
      store.db
        .prepare(
          "INSERT INTO history(kind,entity_id,action,actor,payload,at) VALUES(?,?,?,?,?,?)",
        )
        .run(
          "mini_settings",
          "modules",
          "update",
          String(res.locals.adminUsername),
          JSON.stringify(data),
          updatedAt,
        );
    });
    res.json({ ...data, updatedAt, wechat: wechatConfiguration(store) });
  });
  return router;
}
