import { Router } from "express";
import {
  eventSchema,
  type AnalyticsEvent,
  type AnalyticsSummary,
} from "../../shared/analytics";
import type { ContentDatabase } from "./database";
export function pruneEvents(store: ContentDatabase, now = Date.now()) {
  store.db
    .prepare("DELETE FROM analytics_events WHERE at < ?")
    .run(now - 90 * 86400000);
  store.db.exec(
    "DELETE FROM analytics_events WHERE seq IN (SELECT seq FROM analytics_events ORDER BY seq DESC LIMIT -1 OFFSET 100000)",
  );
}
export function recordEvent(
  store: ContentDatabase,
  event: AnalyticsEvent,
  now = Date.now(),
) {
  store.db
    .prepare(
      "INSERT OR IGNORE INTO analytics_events(event_id,name,page,target,at) VALUES(?,?,?,?,?)",
    )
    .run(event.id, event.name, event.page, event.target, now);
}
export function analyticsSummary(
  store: ContentDatabase,
  days: number,
  now = Date.now(),
): AnalyticsSummary {
  const day = 86400000,
    offset = 8 * 3600000;
  const start =
    Math.floor((now + offset) / day) * day - offset - (days - 1) * day;
  const rows = store.db
    .prepare(
      `SELECT date(at/1000,'unixepoch','+8 hours') day,
    SUM(name='page_view') pageViews, SUM(name!='page_view') interactions
    FROM analytics_events WHERE at>=? AND at<=? GROUP BY day ORDER BY day`,
    )
    .all(start, now) as AnalyticsSummary["daily"];
  const daily = Array.from({ length: days }, (_, i) => {
    const date = new Date(start + i * day + offset).toISOString().slice(0, 10);
    return (
      rows.find((r) => r.day === date) ?? {
        day: date,
        pageViews: 0,
        interactions: 0,
      }
    );
  });
  const events = store.db
    .prepare(
      "SELECT name,count(*) count FROM analytics_events WHERE at>=? AND at<=? GROUP BY name ORDER BY count DESC",
    )
    .all(start, now) as AnalyticsSummary["events"];
  return {
    days,
    since: new Date(start).toISOString(),
    totalEvents: events.reduce((sum, r) => sum + r.count, 0),
    pageViews: events.find((r) => r.name === "page_view")?.count ?? 0,
    clicks: events
      .filter((r) =>
        ["navigation_click", "content_click", "outbound_click"].includes(
          r.name,
        ),
      )
      .reduce((sum, r) => sum + r.count, 0),
    daily,
    events,
    pages: store.db
      .prepare(
        "SELECT page,count(*) count FROM analytics_events WHERE name='page_view' AND at>=? AND at<=? GROUP BY page ORDER BY count DESC LIMIT 20",
      )
      .all(start, now) as AnalyticsSummary["pages"],
    targets: store.db
      .prepare(
        "SELECT name,target,count(*) count FROM analytics_events WHERE name!='page_view' AND at>=? AND at<=? GROUP BY name,target ORDER BY count DESC LIMIT 20",
      )
      .all(start, now) as AnalyticsSummary["targets"],
  };
}
export function eventsRouter(store: ContentDatabase) {
  const router = Router();
  let windowStart = Date.now(),
    received = 0,
    accepted = 0;
  pruneEvents(store);
  router.post("/", (req, res) => {
    const allowed = [process.env.SITE_URL || "https://ruming.top"];
    if (process.env.NODE_ENV !== "production")
      allowed.push("http://127.0.0.1:3000", "http://localhost:3000");
    if (!req.headers.origin || !allowed.includes(req.headers.origin))
      return res.status(403).json({ error: "请求来源不被允许" });
    if (Date.now() - windowStart >= 60000) {
      windowStart = Date.now();
      received = 0;
    }
    if (++received > 1000) return res.status(429).json({ error: "请求过多" });
    const parsed = eventSchema.safeParse(req.body);
    if (!parsed.success)
      return res.status(400).json({ error: "INVALID_EVENT" });
    recordEvent(store, parsed.data);
    if (++accepted % 100 === 0) pruneEvents(store);
    return res.status(204).end();
  });
  return router;
}
