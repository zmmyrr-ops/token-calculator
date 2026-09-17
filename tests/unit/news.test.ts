import { describe, it, expect } from "vitest";
import {
  canonicalUrl,
  feedImage,
  classify,
  normalizeItem,
  sources,
} from "../../backend/src/news";
describe("feed safety and provenance", () => {
  it("rejects executable and credential-bearing links", () => {
    expect(canonicalUrl("javascript:alert(1)")).toBeNull();
    expect(canonicalUrl("https://name:pass@example.com")).toBeNull();
  });
  it("deduplicates tracking variants without dropping content query", () => {
    expect(
      canonicalUrl("https://example.com/story?id=1&utm_source=rss#top"),
    ).toBe("https://example.com/story?id=1");
  });
  it("keeps collection time separate from missing or future publication dates", () => {
    const now = "2026-09-17T00:00:00Z";
    for (const pubDate of ["bad", "2030-01-01"])
      expect(
        normalizeItem(
          { title: "AI chip", link: "https://example.com/post", pubDate },
          sources[0],
          now,
        ),
      ).toMatchObject({
        publishedAt: null,
        collectedAt: now,
        category: "硬件算力",
      });
  });
  it("does not fabricate news without title or original URL", () => {
    expect(
      normalizeItem({ title: "Title" }, sources[0], new Date().toISOString()),
    ).toBeNull();
  });
  it("uses source category when title has no matching keyword", () => {
    expect(classify("A new announcement", "产业动态")).toBe("产业动态");
    expect(classify("新款 GPU 芯片", "产业动态")).toBe("硬件算力");
  });
});

it("extracts feed images and rejects unsafe image URLs", () => {
  expect(
    feedImage({
      link: "https://example.com/story",
      content: '<img src="https://cdn.example.com/image.jpg?a=1&amp;b=2">',
    }),
  ).toBe("https://cdn.example.com/image.jpg?a=1&b=2");
  expect(feedImage({ content: '<img src="javascript:alert(1)">' })).toBeNull();
  expect(
    feedImage({ content: '<img src="https://127.0.0.1/private">' }),
  ).toBeNull();
  expect(feedImage({})).toBeNull();
});
