import { it, expect } from "vitest";
import {
  qbitLatestLinks,
  qbitArticleMetadata,
} from "../../backend/src/qbit-discovery";
import { normalizeItem, sources } from "../../backend/src/news";
it("discovers only latest-list article links on the fixed official host", () => {
  const url = "https://www.qbitai.com/2026/09/491391.html";
  expect(
    qbitLatestLinks(
      `<a href="https://www.qbitai.com/2026/09/1.html">banner</a><h4><a href="${url}" target="_blank">新闻</a></h4><h4><a href="${url}">重复</a></h4><h4><a href="https://evil.test/2026/09/2.html">bad</a></h4>`,
    ),
  ).toEqual([url]);
});
it("uses the article title and China publication time rather than collection time", () => {
  const url = "https://www.qbitai.com/2026/09/491391.html";
  const item = qbitArticleMetadata(
    '<h1>新文章 &amp; AI</h1><span class="date">2026-09-17</span><span class="time">16:55:00</span>',
    url,
  )!;
  expect(normalizeItem(item, sources[0], "2026-09-17T10:00:00Z")).toMatchObject(
    { title: "新文章 & AI", publishedAt: "2026-09-17T08:55:00.000Z" },
  );
  expect(qbitArticleMetadata("<h1>no date</h1>", url)?.isoDate).toBeUndefined();
  expect(qbitArticleMetadata("<h1>x</h1>", "http://localhost")).toBeNull();
  expect(qbitArticleMetadata("bad", url)).toBeNull();
});
