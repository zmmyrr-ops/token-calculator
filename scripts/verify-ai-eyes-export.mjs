import {chromium} from '@playwright/test';
import {writeFile,readFile} from 'node:fs/promises';
const root=process.cwd();
const catalog=JSON.parse(await readFile(root+'/data/ai-eyes/catalog.json','utf8'));
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1000}});await page.goto('http://127.0.0.1:3017/ai-eyes');await page.getByRole('heading',{level:1}).waitFor();await page.screenshot({path:'/tmp/eyes-desktop.png'});
for(const p of catalog.items){
 const data=await page.evaluate(async p=>{
  const {exportEyes,linesFor,paginate}=await import('/src/ai-eyes/export.ts');
  const as64=async b=>{const bytes=new Uint8Array(await b.arrayBuffer());let str='';for(const byte of bytes)str+=String.fromCharCode(byte);return btoa(str)};
  const cover=await exportEyes(p,'我','https://ruming.top/ai-eyes','cover',()=>{});
  const ctx=document.createElement('canvas').getContext('2d');const lines=linesFor(ctx,p.blocks);const pages=paginate(lines);
  for(const block of p.blocks){const ls=pages.flat().filter(l=>l.blockId===block.id);let end=0;for(const l of ls){if(l.start!==end)throw Error('gap '+block.id);end=l.end;}if(end!==block.runs.map(r=>r.text).join('').length)throw Error('missing '+block.id)}
  if(pages.some(ls=>ls.reduce((n,l)=>n+l.height,0)>1040))throw Error('overflow');
  const full=await exportEyes(p,'我','https://ruming.top/ai-eyes','pages',()=>{});
  return {cover:await as64(cover[0]),pages:await Promise.all(full.map(as64))};
 },p);
 await writeFile(root+'/frontend/public/ai-eyes-art/'+p.id+'-cover.png',Buffer.from(data.cover,'base64'));
 for(let i=0;i<data.pages.length;i++)await writeFile('/tmp/eyes-'+p.id+'-page-'+i+'.png',Buffer.from(data.pages[i],'base64'));
 console.log(p.id,data.pages.length,'pages, verified all original character ranges');
}
await browser.close();
