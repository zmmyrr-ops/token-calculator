import { Router } from "express";
import { z } from "zod";
import { ContentDatabase, CmsError } from "./database";
import { indexablePaths, resolveSeo } from "../../shared/seo";
import { seoFields, type SeoOverride } from "../../shared/seo-settings";
export function seoAdminRouter(store: ContentDatabase) {
  const r = Router();
  r.get("/", (_req, res) => {
    const data = store.publicContent();
    const rows = indexablePaths(data).map((path) => {
      const seo = resolveSeo(path, "", data);
      const a = data.knowledge.find((a) => path === "/learn/" + a.slug);
      return {
        path,
        title: seo.title,
        description: seo.description,
        image: seo.image,
        custom: data.seoOverrides?.[path] || {
          title: "",
          description: "",
          image: "",
          revision: 0,
        },
        warnings: [
          ...(!seo.description ? ["缺少摘要"] : []),
          ...(a && a.sections.reduce((n, s) => n + s.body.length, 0) < 300
            ? ["正文较短，建议补充实际步骤与示例"]
            : []),
        ],
      };
    });
    const counts = new Map<string, number>();
    for (const row of rows)
      counts.set(row.title, (counts.get(row.title) || 0) + 1);
    for (const row of rows)
      if (counts.get(row.title)! > 1) row.warnings.push("与其他页面标题重复");
    res.set("Cache-Control", "no-store").json({ items: rows });
  });
  r.put("/", (req, res) => {
    const input = seoFields
      .extend({ path: z.string().max(300), revision: z.number().int().min(0) })
      .strict()
      .parse(req.body);
    if (!indexablePaths(store.publicContent()).includes(input.path))
      throw new CmsError(400, "只能编辑已发布的公开页面");
    const all = store.meta<Record<string, SeoOverride>>("seoOverrides") || {};
    if ((all[input.path]?.revision || 0) !== input.revision)
      throw new CmsError(409, "配置已被修改，请重新加载");
    const value = { ...seoFields.parse(input), revision: input.revision + 1 };
    store.transaction(() => {
      store.setMeta("seoOverrides", { ...all, [input.path]: value });
      store.setMeta(
        "contentVersion",
        (store.meta<number>("contentVersion") || 0) + 1,
      );
      store.db
        .prepare(
          "INSERT INTO history(kind,entity_id,action,actor,payload,at) VALUES('seo',?,'publish',?,?,?)",
        )
        .run(
          input.path,
          String(res.locals.adminUsername || "admin"),
          JSON.stringify(value),
          new Date().toISOString(),
        );
    });
    res.json({ ok: true });
  });
  return r;
}
