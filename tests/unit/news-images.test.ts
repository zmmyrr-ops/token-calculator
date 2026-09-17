import { describe, expect, it } from "vitest";
import {
  isQbitArticle,
  qbitArticleImage,
  fetchQbitImage,
} from "../../backend/src/news-images";
describe("Qbit article image enrichment", () => {
  it("takes the article image instead of the site logo and author avatar", () => {
    const html = `<meta property="og:image" content="https://www.qbitai.com/wp-content/uploads/imgs/logo.png"><img src="https://www.qbitai.com/wp-content/uploads/2019/01/qrcode.jpg"><div class="article"><div class="article_info"><img src="http://www.qbitai.com/wp-content/themes/liangziwei/imagesnew/head.jpg"></div><p><img decoding="async" src="https://i.qbitai.com/wp-content/uploads/2026/09/cover.png"></p></div>`;
    expect(qbitArticleImage(html)).toBe(
      "https://www.qbitai.com/wp-content/uploads/2026/09/cover.png",
    );
  });
  it("handles lazy images and ignores unsafe or unrelated candidates", () => {
    expect(
      qbitArticleImage(
        `<div class='article'><img src='data:image/png;base64,x' data-src='https://i.qbitai.com/wp-content/uploads/2026/09/cover.webp?a=1&amp;b=2'></div>`,
      ),
    ).toBe(
      "https://www.qbitai.com/wp-content/uploads/2026/09/cover.webp?a=1&b=2",
    );
    for (const src of [
      "https://evil.example/cover.png",
      "https://i.qbitai.com@127.0.0.1/wp-content/uploads/2026/09/x.png",
      "https://i.qbitai.com/wp-content/uploads/2026/09/x.svg",
    ])
      expect(
        qbitArticleImage(`<div class="article"><img src="${src}"></div>`),
      ).toBeNull();
    expect(qbitArticleImage("no images")).toBeNull();
  });
  it("only fetches exact HTTPS article URLs on the fixed source host", async () => {
    expect(isQbitArticle("https://www.qbitai.com/2026/09/491280.html")).toBe(
      true,
    );
    for (const url of [
      "http://www.qbitai.com/2026/09/491280.html",
      "https://www.qbitai.com.evil.test/2026/09/491280.html",
      "https://user:pass@www.qbitai.com/2026/09/491280.html",
      "https://www.qbitai.com:8443/2026/09/491280.html",
      "https://127.0.0.1/private",
      "https://www.qbitai.com/redirect?url=http://localhost",
    ]) {
      expect(isQbitArticle(url)).toBe(false);
      expect(await fetchQbitImage(url)).toBeNull();
    }
  });
});
