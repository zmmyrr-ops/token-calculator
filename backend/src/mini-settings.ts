import { Router } from "express";
import { z } from "zod";
import type { ContentDatabase } from "./database";
import { CmsError } from "./database";
import { wechatConfiguration } from "./wechat";
export const miniSettingsSchema = z
  .object({ news: z.boolean(), forum: z.boolean() })
  .strict();
export function miniSettings(store: ContentDatabase) {
  return {
    news: true,
    forum: true,
    ...store.meta<{ news: boolean; forum: boolean; updatedAt?: string }>(
      "miniModules",
    ),
  };
}
export function requireMiniModule(
  store: ContentDatabase,
  key: "news" | "forum",
) {
  if (!miniSettings(store)[key])
    throw new CmsError(403, "该小程序模块暂未开放");
}
export function miniSettingsAdminRouter(store: ContentDatabase) {
  const router = Router();
  router.get("/", (_req, res) =>
    res.json({ ...miniSettings(store), wechat: wechatConfiguration(store) }),
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
