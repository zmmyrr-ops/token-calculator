import { parseEntity } from "../../shared/cms";
import { it, expect } from "vitest";
import { ContentDatabase } from "../../backend/src/database";
import {
  LearningCollector,
  learningEntry,
  learningSources,
} from "../../backend/src/learning-collector";
const source = learningSources[0];
const xml = (host: string, title = "AI training tutorial") =>
  `<rss version="2.0"><channel><title>Source</title><item><title>${title}</title><link>https://${host}/article?utm_source=test</link><description><![CDATA[<p>A short guide to model training.</p><script>alert(1)</script>]]></description><pubDate>Thu, 17 Sep 2026 08:00:00 GMT</pubDate><dc:creator xmlns:dc="http://purl.org/dc/elements/1.1/">Original author</dc:creator></item></channel></rss>`;
it("normalizes safe source URLs and creates bounded attributed indexes, not full articles", () => {
  const a = learningEntry(
    {
      title: "AI training",
      link: "https://" + source.host + "/article?utm_source=test",
      content: "<script>bad()</script><p>" + "abc ".repeat(500) + "</p>",
    },
    source,
  )!;
  expect(parseEntity("knowledge", a)).toEqual(a);
  expect(a.curation!.url).toBe("https://" + source.host + "/article");
  expect(a.summary.length).toBeLessThan(205);
  expect(JSON.stringify(a)).not.toContain("<script>");
  expect(a.sources[0].url).toBe(a.curation!.url);
  expect(
    learningEntry(
      { title: "AI tutorial", link: "https://evil.example/a" },
      source,
    ),
  ).toBeNull();
  expect(
    learningEntry(
      { title: "Cooking dinner", link: source.home + "food", content: "food" },
      source,
    ),
  ).toBeNull();
});
it("collects independently, deduplicates and never reimports deleted editorial content", async () => {
  const db = new ContentDatabase(":memory:");
  const service = new LearningCollector(db, async (url) => {
    const s = learningSources.find((s) => s.feed === url)!;
    if (s.id === "huggingface") throw Error("upstream unavailable");
    return xml(s.host);
  });
  try {
    await service.refresh();
    const state = service.status();
    expect(state.count).toBe(learningSources.length - 1);
    const last = state.last as {
      sources: { id: string; error: string | null }[];
    };
    expect(
      last.sources.find((s) => s.id === "huggingface")?.error,
    ).toBeTruthy();
    const doc = db.db.prepare("SELECT * FROM documents LIMIT 1").get()!;
    expect(JSON.parse(String(doc.published)).curation.author).toBe(
      "Original author",
    );
    db.db.prepare("DELETE FROM documents WHERE id=?").run(doc.id);
    await service.refresh();
    expect(service.status().count).toBe(state.count);
    expect(
      db.db.prepare("SELECT 1 FROM documents WHERE id=?").get(doc.id),
    ).toBeUndefined();
    service.setEnabled(false);
    expect(service.status().enabled).toBe(false);
    expect(db.meta("contentVersion")).toBe(state.count);
  } finally {
    await service.stop();
    db.close();
  }
});
it("locks overlapping workers and rejects XML entity declarations without losing existing imports", async () => {
  const db = new ContentDatabase(":memory:");
  let release: () => void = () => {};
  const blocked = new Promise<void>((r) => (release = r));
  const a = new LearningCollector(db, async () => {
    await blocked;
    return "<!DOCTYPE rss><rss/>";
  });
  const b = new LearningCollector(db, async () => xml(source.host));
  const task = a.refresh();
  await expect(b.refresh()).rejects.toThrow("正在运行");
  release();
  await task;
  expect(a.status().running).toBe(false);
  expect(a.status().count).toBe(0);
  db.close();
});
