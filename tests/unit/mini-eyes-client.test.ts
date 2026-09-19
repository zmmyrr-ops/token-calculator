import { readFileSync } from "node:fs";
import vm from "node:vm";
import { it, expect } from "vitest";
import * as protocol from "../../shared/ai-eyes-mobile";
type PageController = {
  data: {
    raw: string;
    agreed: boolean;
    busy: boolean;
    error: string;
    user: unknown;
    result: unknown;
    platform: number;
    platforms: string[];
    prompt: string;
    loading: boolean;
  };
  onShow: () => Promise<void>;
  submit: () => Promise<void>;
  setData: (d: Record<string, unknown>) => void;
  showResult: (r: unknown) => void;
};
it("mini page preserves pasted statistics across login refresh and sends only validated consented data", async () => {
  let definition: PageController;
  const calls: { path: string; method: string; data: unknown }[] = [];
  const portrait = {
    persona: { id: "one_line_ceo" },
    result: { persona_id: "one_line_ceo" },
    cover: "/cover.png",
    basis: "questions",
  };
  const api = {
    token: () => "session",
    absolute: (s: string) => "https://example.test" + s,
    request: async (path: string, data: unknown, method = "GET") => {
      calls.push({ path, data, method });
      return path.endsWith("/session")
        ? { user: { id: "u" } }
        : { result: method === "POST" ? portrait : null };
    },
  };
  vm.runInNewContext(
    readFileSync("miniprogram/pages/ai-eyes/index.js", "utf8"),
    {
      Page: (p: PageController) => (definition = p),
      require: (id: string) => (id.endsWith("/api") ? api : protocol),
      wx: { pageScrollTo: () => {} },
      Promise,
      Error,
      Number,
    },
  );
  const page = {
    ...definition!,
    data: { ...definition!.data },
    setData(d: Record<string, unknown>) {
      Object.assign(this.data, d);
    },
  };
  page.data.raw = JSON.stringify({
    format: "AI_EYES_BEHAVIOR_2",
    basis: "questions",
    sample_count: 5,
    keywords: [
      { keyword: "简短指令", count: 5 },
      { keyword: "委托决策", count: 1 },
    ],
  });
  await page.onShow();
  expect(page.data.raw).toContain("sample_count");
  await page.submit();
  expect(calls.some((c) => c.method === "POST")).toBe(false);
  page.data.agreed = true;
  await page.submit();
  expect(calls.filter((c) => c.method === "POST")).toHaveLength(1);
  expect(page.data.raw).toBe("");
  expect(page.data.busy).toBe(false);
  expect(page.data.result).toMatchObject({
    persona: { id: "one_line_ceo" },
    cover: "https://example.test/cover.png",
  });
  expect(page.data.prompt).not.toContain("one_line_ceo");
});
