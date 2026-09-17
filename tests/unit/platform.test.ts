import { describe, it, expect } from "vitest";
import { mediaBudget, type MediaInput } from "../../shared/media-budget";
import { parseLibrary, emptyLibrary } from "../../shared/library";
import {
  resources,
  scenarios,
  tutorialSlugs,
} from "../../backend/src/content/resources";
import { knowledge } from "../../backend/src/content/knowledge";
const data: MediaInput = {
  unit: "秒",
  currency: "CNY",
  mode: "usage",
  rate: "0.2",
  packSize: "",
  packPrice: "",
  balance: "",
  extra: "",
  rows: [{ name: "unit-test", count: 6, units: "5", attempts: 3 }],
};
describe("media billing", () => {
  it("counts generation retries with decimal pricing", () =>
    expect(mediaBudget(data)).toMatchObject({ units: "90", amount: "18.00" }));
  it("does not invent a missing price", () =>
    expect(mediaBudget({ ...data, rate: "" }).amount).toBeNull());
  it("accepts an explicit free quote", () =>
    expect(mediaBudget({ ...data, rate: "0" }).amount).toBe("0.00"));
  it("rounds package purchase up and uses balance once", () =>
    expect(
      mediaBudget({
        ...data,
        mode: "package",
        balance: "20",
        packSize: "50",
        packPrice: "12",
        extra: "3",
      }),
    ).toMatchObject({ amount: "27.00", packages: "2", remaining: "30" }));
  it("requires no purchase when prepaid balance covers the job", () =>
    expect(
      mediaBudget({ ...data, mode: "package", balance: "100" }),
    ).toMatchObject({ amount: "0.00", remaining: "10" }));
  it("rejects negative prices, zero package capacity and invalid counts", () => {
    expect(() => mediaBudget({ ...data, rate: "-1" })).toThrow();
    expect(() =>
      mediaBudget({ ...data, mode: "package", packSize: "0", packPrice: "3" }),
    ).toThrow();
    expect(() =>
      mediaBudget({ ...data, rows: [{ ...data.rows[0], count: 0 }] }),
    ).toThrow();
  });
  it("does not add fixed charges per row", () =>
    expect(
      mediaBudget({ ...data, extra: "5", rows: [...data.rows, ...data.rows] })
        .amount,
    ).toBe("41.00"));
});
describe("personal library import", () => {
  it("accepts valid local-only references", () =>
    expect(
      parseLibrary(
        JSON.stringify({
          ...emptyLibrary,
          items: [
            { id: "a", title: "Title", href: "/learn/tokens", kind: "知识" },
          ],
        }),
      ).items,
    ).toHaveLength(1));
  it("accepts actual model version slugs with dots", () =>
    expect(
      parseLibrary(
        JSON.stringify({
          ...emptyLibrary,
          items: [
            {
              id: "model:openai--gpt-5.6-luna",
              title: "GPT-5.6 Luna",
              href: "/models/openai--gpt-5.6-luna",
              kind: "模型",
            },
          ],
        }),
      ).items,
    ).toHaveLength(1));
  it("rejects external or executable links", () => {
    for (const href of [
      "javascript:alert(1)",
      "https://evil.test",
      "//evil.test",
    ])
      expect(() =>
        parseLibrary(
          JSON.stringify({
            ...emptyLibrary,
            items: [{ id: "a", title: "x", kind: "知识", href }],
          }),
        ),
      ).toThrow();
  });
  it("rejects arbitrary progress paths", () =>
    expect(() =>
      parseLibrary(
        JSON.stringify({ ...emptyLibrary, progress: { "../admin": [1] } }),
      ),
    ).toThrow());
});
describe("published content integrity", () => {
  it("has unique content identifiers and references to real pages", () => {
    expect(new Set(resources.map((t) => t.id)).size).toBe(resources.length);
    expect(new Set(knowledge.map((a) => a.slug)).size).toBe(knowledge.length);
    for (const t of resources) {
      expect(knowledge.some((a) => a.slug === t.article)).toBe(true);
      expect(t.source.startsWith("https://")).toBe(true);
    }
    for (const s of scenarios) {
      for (const id of s.tools)
        expect(resources.some((t) => t.id === id)).toBe(true);
      for (const id of s.articles)
        expect(knowledge.some((a) => a.slug === id)).toBe(true);
    }
    for (const id of tutorialSlugs)
      expect(knowledge.some((a) => a.slug === id)).toBe(true);
  });
  it("provides a source for every published article", () => {
    for (const a of knowledge) expect(a.sources?.length).toBeGreaterThan(0);
  });
});

it("practice routes have complete steps and valid tool and scenario links", () => {
  for (const slug of tutorialSlugs) {
    const article = knowledge.find((x) => x.slug === slug)!;
    const p = article.practice!;
    expect(p).toBeDefined();
    expect(p.steps).toHaveLength(article.sections.length);
    expect(p.preparation.length).toBeGreaterThan(1);
    expect(p.deliverables.length).toBeGreaterThan(1);
    expect(scenarios.some((x) => x.id === p.scenario)).toBe(true);
    for (const role of p.toolRoles)
      expect(resources.some((x) => x.id === role.id)).toBe(true);
    for (const step of p.steps) {
      expect(step.actions.length).toBeGreaterThan(1);
      expect(step.check.length).toBeGreaterThan(10);
    }
  }
});
