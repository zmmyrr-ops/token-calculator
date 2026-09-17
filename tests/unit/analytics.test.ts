import { describe, it, expect } from "vitest";
import { randomUUID } from "node:crypto";
import { ContentDatabase } from "../../backend/src/database";
import {
  analyticsSummary,
  recordEvent,
  pruneEvents,
} from "../../backend/src/analytics";
import { analyticsPage, eventSchema } from "../../shared/analytics";
describe("anonymous analytics", () => {
  it("rejects free text, identifiers and raw URLs", () => {
    const event = {
      id: randomUUID(),
      name: "page_view",
      page: "/models",
      target: "none",
    };
    expect(eventSchema.safeParse(event).success).toBe(true);
    for (const extra of [
      { query: "private" },
      { ip: "127.0.0.1" },
      { visitor: "person" },
    ])
      expect(eventSchema.safeParse({ ...event, ...extra }).success).toBe(false);
    expect(
      eventSchema.safeParse({ ...event, page: "/search?q=private" }).success,
    ).toBe(false);
    expect(eventSchema.safeParse({ ...event, page: "/admin" }).success).toBe(
      false,
    );
    expect(analyticsPage("/models/private-slug")).toBe("/models/:id");
  });
  it("deduplicates events and aggregates China calendar days without visitor counts", () => {
    const store = new ContentDatabase(":memory:");
    try {
      const now = Date.parse("2026-09-17T16:30:00Z");
      const event = {
        id: randomUUID(),
        name: "page_view",
        page: "/" as const,
        target: "none" as const,
      };
      recordEvent(store, { ...event, name: "page_view" }, now);
      recordEvent(store, { ...event, name: "page_view" }, now);
      recordEvent(
        store,
        {
          ...event,
          id: randomUUID(),
          name: "content_click",
          target: "/models",
        },
        now - 3600000,
      );
      recordEvent(
        store,
        { ...event, id: randomUUID(), name: "page_view" },
        now - 8 * 86400000,
      );
      const summary = analyticsSummary(store, 7, now);
      expect(summary.totalEvents).toBe(2);
      expect(summary.pageViews).toBe(1);
      expect(summary.clicks).toBe(1);
      expect(summary.daily).toHaveLength(7);
      expect(summary.daily.at(-1)).toEqual({
        day: "2026-09-18",
        pageViews: 1,
        interactions: 0,
      });
      expect(summary.daily.at(-2)?.interactions).toBe(1);
      expect(summary).not.toHaveProperty("visitors");
    } finally {
      store.close();
    }
  });
  it("cleans expired rows and registers the additive migration", () => {
    const store = new ContentDatabase(":memory:");
    try {
      const now = Date.now();
      recordEvent(
        store,
        { id: randomUUID(), name: "page_view", page: "/", target: "none" },
        now - 91 * 86400000,
      );
      pruneEvents(store, now);
      expect(
        store.db.prepare("SELECT COUNT(*) n FROM analytics_events").get()?.n,
      ).toBe(0);
      expect(
        store.db.prepare("SELECT version FROM migrations WHERE version=2").get()
          ?.version,
      ).toBe(2);
    } finally {
      store.close();
    }
  });
});

it("event ingestion enforces origin, request size and strict event fields", async () => {
  const { default: express } = await import("express");
  const { eventsRouter } = await import("../../backend/src/analytics");
  const store = new ContentDatabase(":memory:");
  const app = express();
  app.use("/events", express.json({ limit: "2kb" }), eventsRouter(store));
  app.use(
    (
      error: { status?: number },
      _req: import("express").Request,
      res: import("express").Response,
      _next: import("express").NextFunction,
    ) => {
      res.status(error.status || 500).end();
    },
  );
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((r) => server.once("listening", r));
  const port = (server.address() as { port: number }).port;
  const event = {
    id: randomUUID(),
    name: "page_view",
    page: "/",
    target: "none",
  };
  const send = (body: unknown, origin = "http://127.0.0.1:3000") =>
    fetch(`http://127.0.0.1:${port}/events`, {
      method: "POST",
      headers: { origin, "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  try {
    expect((await send(event, "https://evil.example")).status).toBe(403);
    expect((await send({ ...event, text: "secret" })).status).toBe(400);
    expect((await send({ ...event, text: "x".repeat(3000) })).status).toBe(413);
    expect((await send(event)).status).toBe(204);
    expect((await send(event)).status).toBe(204);
    expect(
      store.db.prepare("SELECT COUNT(*) n FROM analytics_events").get()?.n,
    ).toBe(1);
  } finally {
    await new Promise<void>((r) => server.close(() => r()));
    store.close();
  }
});
