import type { ContentDatabase } from "./database";
import { baiduCandidates } from "./baidu";
const escape = (s: string) => s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
export function sitemapXml(store: ContentDatabase) {
  const data = store.publicContent();
  const origin = new URL(data.site.url).origin;
  const modified = new Map((store.db.prepare("SELECT entity_id,MAX(at) at FROM history WHERE kind='knowledge' AND action IN ('publish','import','import_publish') GROUP BY entity_id").all() as {entity_id:string;at:string}[]).filter(x=>Number.isFinite(Date.parse(x.at))).map(x=>[origin+'/learn/'+x.entity_id,new Date(x.at).toISOString()]));
  const urls = baiduCandidates(store).map(x=>x.url);
  for (const [route,count] of [['learn',data.knowledge.length],['tools',data.resources.length],['models',data.catalog.models.length]] as const) {
    const size=route==='models'?24:18;
    for(let page=2;page<=Math.ceil(count/size);page++)urls.push(`${origin}/${route}?page=${page}`);
  }
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${[...new Set(urls)].map(url=>`<url><loc>${escape(url)}</loc>${modified.has(url)?`<lastmod>${modified.get(url)}</lastmod>`:''}</url>`).join('')}</urlset>`;
}
