// Qbit's RSS omits images and its og:image is a site logo. Use a dated
// article image from its own upload CDN; never accept an arbitrary fetch URL.
export function isQbitArticle(input: string): boolean {
  try {
    const u = new URL(input);
    return (
      u.protocol === "https:" &&
      u.hostname === "www.qbitai.com" &&
      !u.port &&
      !u.username &&
      !u.password &&
      /^\/\d{4}\/\d{2}\/\d+\.html$/.test(u.pathname) &&
      !u.search
    );
  } catch {
    return false;
  }
}
export function qbitArticleImage(html: string): string | null {
  const start = html.search(/<div\b[^>]*class=["']article["'][^>]*>/i);
  if (start < 0) return null;
  const body = html.slice(start);
  for (const tag of body.match(/<img\b[^>]*>/gi) || []) {
    for (const attribute of ["data-src", "src"]) {
      const value = tag.match(
        new RegExp(`\\b${attribute}\\s*=\\s*["']([^"']+)["']`, "i"),
      )?.[1];
      if (!value) continue;
      try {
        const u = new URL(
          value.replace(/&amp;/g, "&"),
          "https://www.qbitai.com",
        );
        if (
          u.protocol === "https:" &&
          ["i.qbitai.com", "www.qbitai.com"].includes(u.hostname) &&
          !u.port &&
          !u.username &&
          !u.password &&
          /^\/wp-content\/uploads\/\d{4}\/\d{2}\/[^/]+\.(?:png|jpe?g|webp|gif)$/i.test(
            u.pathname,
          )
        ) {
          // The publisher also exposes uploads on its public website. The CDN
          // rejects third-party embeds; use the independently public URL.
          u.hostname = "www.qbitai.com";
          return u.href;
        }
      } catch {
        /* Ignore malformed image attributes. */
      }
    }
  }
  return null;
}
export async function fetchQbitImage(url: string): Promise<string | null> {
  if (!isQbitArticle(url)) return null;
  const response = await fetch(url, {
    redirect: "error",
    signal: AbortSignal.timeout(10000),
    headers: {
      "User-Agent": "AIMendao/1.0 (+https://ruming.top)",
      Accept: "text/html",
    },
  });
  if (
    !response.ok ||
    !response.headers.get("content-type")?.includes("text/html")
  )
    return null;
  const reader = response.body?.getReader();
  if (!reader) return null;
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 2 * 1024 * 1024) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const image = qbitArticleImage(Buffer.concat(chunks).toString("utf8"));
  if (!image) return null;
  const check = await fetch(image, {
    redirect: "error",
    signal: AbortSignal.timeout(5000),
  });
  const usable =
    check.ok &&
    /^image\/(png|jpeg|webp|gif)(?:;|$)/i.test(
      check.headers.get("content-type") || "",
    );
  await check.body?.cancel();
  return usable ? image : null;
}
