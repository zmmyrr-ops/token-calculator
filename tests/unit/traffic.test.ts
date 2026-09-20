import { DatabaseSync } from "node:sqlite";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { it, expect } from "vitest";
import { randomUUID } from "node:crypto";
import {
  classifyTraffic,
  shouldStartVisit,
  trafficDevice,
} from "../../shared/traffic";
import { eventSchema } from "../../shared/analytics";
import { ContentDatabase } from "../../backend/src/database";
import { recordEvent, analyticsSummary } from "../../backend/src/analytics";
it("classifies only known search hosts, gives campaigns precedence and never returns raw identifiers", () => {
  const url = "https://ruming.top/learn";
  expect(classifyTraffic("https://www.baidu.com/s?wd=secret", url)).toBe(
    "baidu",
  );
  expect(classifyTraffic("https://www.google.com/search?q=secret", url)).toBe(
    "google",
  );
  expect(classifyTraffic("https://www.google.co.jp/", url)).toBe("google");
  expect(classifyTraffic("https://www.baidu.com.evil.example/", url)).toBe(
    "referral",
  );
  expect(classifyTraffic("https://mail.google.com/", url)).toBe("referral");
  expect(classifyTraffic("https://tieba.baidu.com/", url)).toBe("referral");
  expect(
    classifyTraffic(
      "https://google.com/",
      url + "?utm_source=private-campaign",
    ),
  ).toBe("campaign");
  expect(classifyTraffic("", url)).toBe("direct_unknown");
  expect(classifyTraffic("broken", url)).toBe("direct_unknown");
  expect(classifyTraffic(url, "https://ruming.top/tools")).toBe(
    "internal_unknown",
  );
  expect(trafficDevice("Mozilla Windows NT 10.0")).toBe("desktop");
  expect(trafficDevice("iPhone Mobile")).toBe("mobile");
  expect(trafficDevice("Macintosh", 5)).toBe("tablet");
});
it("does not recount refreshes or SPA navigation, but counts external reentry and idle visits", () => {
  const now = 10000000;
  expect(shouldStartVisit(null, now, true, "baidu", "navigate")).toBe(true);
  expect(shouldStartVisit(now - 1000, now, true, "baidu", "reload")).toBe(
    false,
  );
  expect(shouldStartVisit(now - 1000, now, false, "baidu", "navigate")).toBe(
    false,
  );
  expect(shouldStartVisit(now - 1000, now, true, "baidu", "navigate")).toBe(
    true,
  );
  expect(
    shouldStartVisit(
      now - 31 * 60000,
      now,
      false,
      "direct_unknown",
      "navigate",
    ),
  ).toBe(true);
  expect(
    shouldStartVisit(now - 1000, now, true, "internal_unknown", "navigate"),
  ).toBe(false);
});
it("requires attribution only for entry events and rejects arbitrary domains or device fingerprints", () => {
  const entry = {
    id: randomUUID(),
    name: "visit_start",
    page: "/learn",
    target: "none",
    source: "google",
    device: "desktop",
  };
  expect(eventSchema.safeParse(entry).success).toBe(true);
  for (const patch of [
    { source: undefined },
    { device: undefined },
    { source: "evil.example" },
    { device: "raw fingerprint" },
    { referrer: "https://google.com/?q=private" },
    { name: "page_view" },
  ])
    expect(eventSchema.safeParse({ ...entry, ...patch }).success).toBe(false);
});
it("separates entry counts from PV and interactions; filters source and landing aggregates by device", () => {
  const db = new ContentDatabase(":memory:");
  const now = Date.parse("2026-09-20T04:00:00Z");
  try {
    db.db
      .prepare(
        "INSERT INTO analytics_events(event_id,name,page,target,at) VALUES(?,'page_view','/','none',?)",
      )
      .run(randomUUID(), now);
    const visit = {
      id: randomUUID(),
      name: "visit_start" as const,
      page: "/learn" as const,
      target: "none" as const,
      source: "baidu" as const,
      device: "desktop" as const,
    };
    recordEvent(db, visit, now);
    recordEvent(db, visit, now);
    recordEvent(
      db,
      { ...visit, id: randomUUID(), source: "google", device: "mobile" },
      now,
    );
    recordEvent(
      db,
      { id: randomUUID(), name: "page_view", page: "/learn", target: "none" },
      now,
    );
    const all = analyticsSummary(db, 7, now);
    expect(all.pageViews).toBe(2);
    expect(all.traffic.entries).toBe(2);
    expect(all.traffic.legacyPageViews).toBe(1);
    expect(all.daily.at(-1)?.interactions).toBe(0);
    const pc = analyticsSummary(db, 7, now, "desktop");
    expect(pc.traffic.entries).toBe(1);
    expect(pc.traffic.sources).toEqual([{ source: "baidu", count: 1 }]);
    expect(pc.traffic.landings[0]).toEqual({
      source: "baidu",
      page: "/learn",
      count: 1,
    });
    expect(pc.traffic.daily[0]).toEqual({
      day: "2026-09-20",
      source: "baidu",
      count: 1,
    });
    expect(pc.pageViews).toBe(2);
  } finally {
    db.close();
  }
});

it("migrates an existing analytics table without inventing historical attribution and can reopen it", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "traffic-migration-")),
    file = path.join(dir, "old.sqlite");
  const old = new DatabaseSync(file);
  old.exec(
    "CREATE TABLE analytics_events(seq INTEGER PRIMARY KEY AUTOINCREMENT,event_id TEXT NOT NULL UNIQUE,name TEXT NOT NULL,page TEXT NOT NULL,target TEXT NOT NULL,at INTEGER NOT NULL)",
  );
  old
    .prepare(
      "INSERT INTO analytics_events(event_id,name,page,target,at) VALUES(?,'page_view','/','none',?)",
    )
    .run(randomUUID(), Date.now());
  old.close();
  try {
    const db = new ContentDatabase(file);
    expect(
      db.db
        .prepare("SELECT source,device,traffic_version FROM analytics_events")
        .get(),
    ).toMatchObject({ source: null, device: null, traffic_version: 0 });
    expect(analyticsSummary(db, 7).traffic.legacyPageViews).toBe(1);
    db.close();
    const again = new ContentDatabase(file);
    expect(
      again.db.prepare("SELECT count(*) n FROM analytics_events").get()?.n,
    ).toBe(1);
    again.close();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
