import { readFileSync } from "node:fs";
import vm from "node:vm";
import { expect, it } from "vitest";
function load(
  file: string,
  dependencies: Record<string, unknown>,
  wx: unknown = {},
) {
  const sandbox = {
    module: { exports: {} },
    require: (key: string) => dependencies[key],
    wx,
    Promise,
    Error,
    Number,
    encodeURIComponent,
  };
  vm.runInNewContext(readFileSync(file, "utf8"), sandbox);
  return sandbox.module.exports;
}
it("attaches tokens only to mini account API, scopes storage by environment, clears on 401", async () => {
  const storage = new Map();
  const calls: {
    url: string;
    header: Record<string, string>;
    success: (data: unknown) => void;
  }[] = [];
  const api = load(
    "miniprogram/utils/api.js",
    { "../config": { apiBase: "https://example.test" } },
    {
      getStorageSync: (key: string) => storage.get(key),
      setStorageSync: (key: string, v: string) => storage.set(key, v),
      removeStorageSync: (key: string) => storage.delete(key),
      request: (o: (typeof calls)[number]) => calls.push(o),
    },
  ) as {
    saveToken: (s: string) => void;
    request: (p: string) => Promise<unknown>;
    token: () => string;
  };
  api.saveToken("secret");
  expect(storage.has("mendao-session:https://example.test")).toBe(true);
  const publicRequest = api.request("/api/v1/news");
  expect(calls[0].header.Authorization).toBeUndefined();
  calls[0].success({ statusCode: 200, data: { items: [] } });
  await publicRequest;
  const privateRequest = api.request("/api/mini/community/session");
  expect(calls[1].header.Authorization).toBe("Bearer secret");
  calls[1].success({ statusCode: 401, data: null });
  await expect(privateRequest).rejects.toThrow("请求失败");
  expect(api.token()).toBe("");
});
it("discards stale list responses after a new search and allows retrying pagination", async () => {
  const pending: ((r: unknown) => void)[] = [];
  const factory = load("miniprogram/utils/list.js", {
    "./api": { request: () => new Promise((r) => pending.push(r)) },
    "./navigation": {},
  }) as (kind: string) => {
    data: Record<string, unknown>;
    load: (reset: boolean) => Promise<void>;
  };
  const definition = factory("learn");
  const page = {
    ...definition,
    data: { ...definition.data },
    setData(d: Record<string, unknown>) {
      Object.assign(this.data, d);
    },
  };
  const first = page.load(true);
  page.data.q = "new";
  const second = page.load(true);
  pending[1]({ items: [{ slug: "new", title: "新结果" }], total: 2 });
  await second;
  pending[0]({ items: [{ slug: "old", title: "旧结果" }], total: 1 });
  await first;
  expect((page.data.items as { slug: string }[]).map((x) => x.slug)).toEqual([
    "new",
  ]);
  expect(page.data.loading).toBe(false);
  const next = page.load(false);
  pending[2]({ items: [{ slug: "next", title: "下一页" }], total: 2 });
  await next;
  expect((page.data.items as { slug: string }[]).map((x) => x.slug)).toEqual([
    "new",
    "next",
  ]);
  expect(page.data.page).toBe(2);
});
