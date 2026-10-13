import {expect,it} from "vitest";
import {ContentDatabase} from "../../backend/src/database";
import {PublicSnapshots} from "../../backend/src/prerender";
import {sitemapXml} from "../../backend/src/sitemap";
import {seedOctoberArticles} from "../../backend/src/learning-october";
import {octoberArticles} from "../../backend/src/content/learning-october";
import {resolveSeo} from "../../shared/seo";
import {catalog} from "../../backend/src/content/catalog";
import {knowledge} from "../../backend/src/content/knowledge";
import {resources,scenarios,tutorialSlugs} from "../../backend/src/content/resources";
import {site} from "../../backend/src/content/site";
import coverage from "../../data/coverage.json";
it('serves distinct crawlable library pages, matches canonical metadata, and excludes invalid pages',()=>{
 const db=new ContentDatabase(':memory:');db.seed({catalog,knowledge:Array.from({length:40},(_,i)=>({...knowledge[0],slug:'crawl-'+String(i).padStart(2,'0')})),resources,scenarios,tutorialSlugs,site,coverage});
 db.db.prepare("UPDATE history SET at=? WHERE kind='knowledge'").run("2026-10-01T00:00:00.000Z");
 const snapshots=new PublicSnapshots(db,'<html><head><title>old</title></head><body><div id="root"></div></body></html>');
 try{
 const first=snapshots.get('/learn');const second=snapshots.get('/learn?page=2');
 expect(first.html).toContain('/learn/crawl-00');expect(first.html).not.toContain('/learn/crawl-18');expect(second.html).toContain('/learn/crawl-18');expect(second.html).not.toContain('/learn/crawl-00');
 expect(second.html).toContain('https://ruming.top/learn?page=2');expect(second.noindex).toBe(false);
 expect(resolveSeo('/learn','?page=2',db.publicContent()).robots).toBe('index, follow');
 expect(snapshots.get('/learn?page=99').status).toBe(404);expect(snapshots.get('/learn?page=2&q=test').noindex).toBe(true);
 expect(sitemapXml(db)).toContain('https://ruming.top/learn?page=3');
 }finally{snapshots.close();db.close();}
});
it('imports original lessons once and uses recorded publication dates without fabrication',()=>{
 const db=new ContentDatabase(':memory:');db.seed({catalog,knowledge,resources,scenarios,tutorialSlugs,site,coverage});
 try{seedOctoberArticles(db);const first=sitemapXml(db);seedOctoberArticles(db);expect(sitemapXml(db)).toBe(first);
 for(const article of octoberArticles){expect(db.publicContent().knowledge.find(x=>x.slug===article.slug)?.sections.length).toBeGreaterThanOrEqual(7);expect(first).toContain('/learn/'+article.slug+'</loc><lastmod>');}
 expect(first).not.toContain('/models</loc><lastmod>');
 }finally{db.close();}
});
