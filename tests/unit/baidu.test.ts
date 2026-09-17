import { describe, it, expect } from "vitest";
import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { ContentDatabase } from "../../backend/src/database";
import {
  BaiduService,
  baiduCandidates,
  parseBaiduEndpoint,
} from "../../backend/src/baidu";
import { catalog } from "../../backend/src/content/catalog";
import { knowledge } from "../../backend/src/content/knowledge";
import {
  resources,
  scenarios,
  tutorialSlugs,
} from "../../backend/src/content/resources";
import { site } from "../../backend/src/content/site";
import coverage from "../../data/coverage.json";
const endpoint =
  "http://data.zz.baidu.com/urls?site=https://ruming.top&token=test_secret_123";
function setup(response: () => Promise<Response>, env = "production") {
  const dir = mkdtempSync(path.join(tmpdir(), "baidu-test-")),
    store = new ContentDatabase(":memory:");
  store.seed({
    catalog,
    knowledge,
    resources,
    scenarios,
    tutorialSlugs,
    site,
    coverage,
  });
  const requests: string[] = [];
  const service = new BaiduService(
    store,
    env,
    (async (_url, init) => {
      requests.push(String(init?.body));
      return response();
    }) as typeof fetch,
    path.join(dir, "config.json"),
  );
  service.save({ endpoint, automatic: false, batchSize: 2, dailyLimit: 4 });
  return {
    store,
    service,
    requests,
    close: () => {
      store.close();
      rmSync(dir, { recursive: true, force: true });
    },
  };
}
describe("Baidu ordinary submission", () => {
  it("restricts token destination and verified canonical host", () => {
    expect(parseBaiduEndpoint(endpoint, "https://ruming.top")).toBe(endpoint);
    for (const v of [
      endpoint.replace("data.zz.baidu.com", "evil.example"),
      endpoint.replace("https://ruming.top", "https://www.ruming.top"),
      endpoint + "&token=other",
      endpoint.replace("/urls?", "/redirect?"),
    ])
      expect(() => parseBaiduEndpoint(v, "https://ruming.top")).toThrow();
  });
  it("submits only canonical public pages and never returns the token", async () => {
    const t = setup(async () => Response.json({ success: 2, remain: 10 }));
    try {
      expect(
        baiduCandidates(t.store).every(
          (x) =>
            x.url.startsWith("https://ruming.top/") &&
            !/\/admin|\/account|\/api|\/tutorials$|\/scenarios$/.test(x.url),
        ),
      ).toBe(true);
      expect(JSON.stringify(t.service.status())).not.toContain("test_secret");
      await t.service.submit();
      expect(t.service.status().counts.sent).toBe(2);
      expect(t.requests[0].split("\n")).toHaveLength(2);
      await t.service.submit();
      await expect(t.service.submit()).rejects.toThrow("额度");
      expect(readFileSync(t.service.configFile, "utf8")).toContain(
        "test_secret",
      );
    } finally {
      t.close();
    }
  });
  it("does not guess which URLs succeeded in an ambiguous partial response", async () => {
    const t = setup(async () => Response.json({ success: 1, remain: 20 }));
    try {
      await t.service.submit();
      expect(t.service.status().counts.uncertain).toBe(2);
      expect(t.service.status().counts.sent).toBeUndefined();
    } finally {
      t.close();
    }
  });
  it("does not retry uncertain network results automatically or leak errors", async () => {
    const t = setup(async () => {
      throw Error(endpoint);
    });
    try {
      await t.service.submit();
      expect(t.service.status().counts.uncertain).toBe(2);
      expect(JSON.stringify(t.service.status())).not.toContain("test_secret");
      t.service.retry();
      expect(t.service.status().counts.uncertain).toBeUndefined();
    } finally {
      t.close();
    }
  });
  it("blocks staging from making external submissions", async () => {
    const t = setup(async () => Response.json({ success: 2 }), "staging");
    try {
      await expect(t.service.submit()).rejects.toThrow("生产环境");
      expect(t.requests).toHaveLength(0);
    } finally {
      t.close();
    }
  });
  it("honors Baidu quota and does not resend accepted unchanged pages", async () => {
    const t = setup(async () => Response.json({ success: 2, remain: 0 }));
    try {
      await t.service.submit();
      t.service.sync();
      expect(t.service.status().counts.sent).toBe(2);
      await expect(t.service.submit()).rejects.toThrow("额度");
    } finally {
      t.close();
    }
  });
});
