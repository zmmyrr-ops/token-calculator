import { z } from "zod";
import { ContentDatabase } from "./database";
import { eyesCatalog } from "../../shared/ai-eyes";
const querySchema = z.object({
  page: z.coerce.number().int().min(1).max(100000).default(1),
  channel: z.enum(["all", "web", "miniprogram"]).default("all"),
  platform: z
    .enum(["all", "Codex", "Claude Code", "豆包", "DeepSeek", "其他 AI"])
    .default("all"),
});
export function eyesAdminResults(store: ContentDatabase, query: unknown) {
  const q = querySchema.parse(query),
    now = Date.now(),
    pageSize = 20;
  const hasMini = !!store.db
    .prepare(
      "SELECT 1 FROM sqlite_master WHERE type='table' AND name='mini_eyes_results'",
    )
    .get();
  const sql = `SELECT id,'web' channel,
    CASE WHEN json_extract(scope,'$.source')='mobile_import' THEN COALESCE(json_extract(scope,'$.platform'),'其他 AI') WHEN json_extract(scope,'$.source')='claude_code' THEN 'Claude Code' ELSE 'Codex' END platform,
    state,created,expires,json_extract(result,'$.persona_id') personaId,NULL userId,NULL nickname
    FROM ai_eyes_runs WHERE expires>?
    ${
      hasMini
        ? `UNION ALL SELECT m.user_id id,'miniprogram' channel,json_extract(m.payload,'$.platform') platform,
    'completed' state,CAST(json_extract(m.payload,'$.created') AS INTEGER) created,m.expires,
    json_extract(m.payload,'$.result.persona_id') personaId,m.user_id userId,u.nickname
    FROM mini_eyes_results m LEFT JOIN community_users u ON u.id=m.user_id WHERE m.expires>?`
        : ""
    }`;
  const times = hasMini ? [now, now] : [now];
  const filter = " WHERE (?='all' OR channel=?) AND (?='all' OR platform=?)";
  const params = [...times, q.channel, q.channel, q.platform, q.platform];
  const total = Number(
    store.db.prepare(`SELECT count(*) n FROM (${sql})${filter}`).get(...params)!
      .n,
  );
  const page = Math.min(q.page, Math.max(1, Math.ceil(total / pageSize)));
  const rows = store.db
    .prepare(
      `SELECT * FROM (${sql})${filter} ORDER BY created DESC,channel,id LIMIT ? OFFSET ?`,
    )
    .all(...params, pageSize, (page - 1) * pageSize);
  return {
    total,
    page,
    pageSize,
    items: rows.map((row) => ({
      ...row,
      personaName:
        eyesCatalog.items.find((p) => p.id === row.personaId)?.name || null,
    })),
  };
}
