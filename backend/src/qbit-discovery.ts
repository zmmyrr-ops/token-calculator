import { isQbitArticle } from "./news-images";

async function html(url: string) {
  if (url !== "https://www.qbitai.com" && !isQbitArticle(url))
    throw Error("Invalid Qbit URL");
  const r = await fetch(url, {
    redirect: "error",
    signal: AbortSignal.timeout(10000),
    headers: {
      "User-Agent": "AIMendao/1.0 (+https://ruming.top)",
      Accept: "text/html",
      "Cache-Control": "no-cache",
    },
  });
  if (!r.ok || !r.headers.get("content-type")?.includes("text/html"))
    throw Error("官网返回 HTTP " + r.status);
  const reader = r.body?.getReader();
  if (!reader) throw Error("官网响应为空");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 2 * 1024 * 1024) {
      await reader.cancel();
      throw Error("官网页面过大");
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString("utf8");
}
export function qbitLatestLinks(input: string): string[] {
  const links: string[] = [];
  for (const match of input.matchAll(
    /<h4\b[^>]*>\s*<a\b[^>]*href=["']([^"']+)["'][^>]*>[\s\S]*?<\/a>\s*<\/h4>/gi,
  )) {
    if (isQbitArticle(match[1]) && !links.includes(match[1]))
      links.push(match[1]);
  }
  return links.slice(0, 20);
}
export function qbitArticleMetadata(input: string, url: string) {
  if (!isQbitArticle(url)) return null;
  const title = input
    .match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1]
    ?.replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
  const date = input.match(
    /<span\b[^>]*class=["']date["'][^>]*>\s*(\d{4}-\d{2}-\d{2})/i,
  )?.[1];
  const time = input.match(
    /<span\b[^>]*class=["']time["'][^>]*>\s*(\d{2}:\d{2}:\d{2})/i,
  )?.[1];
  if (!title) return null;
  return {
    title,
    link: url,
    isoDate: date && time ? `${date}T${time}+08:00` : undefined,
  };
}
export async function discoverQbitArticles(known: Set<string>) {
  const links = qbitLatestLinks(await html("https://www.qbitai.com"))
    .filter((url) => !known.has(url))
    .slice(0, 10);
  const items: NonNullable<ReturnType<typeof qbitArticleMetadata>>[] = [];
  const failures: string[] = [];
  const queue = [...links];
  await Promise.all(
    [0, 1].map(async () => {
      for (let url = queue.shift(); url; url = queue.shift()) {
        try {
          const item = qbitArticleMetadata(await html(url), url);
          if (item) items.push(item);
          else failures.push("文章缺少标题");
        } catch (e) {
          failures.push((e as Error).message);
        }
      }
    }),
  );
  return {
    items,
    error: failures.length
      ? `官网补充 ${failures.length} 条失败，下轮重试`
      : null,
  };
}
