import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';
const staging=process.argv.includes('--staging');
const prefix=staging?'/staging':'';
let httpCredentials;
if(staging){
 const s=readFileSync('backend/storage/cicd/staging-access.txt','utf8');
 httpCredentials={username:'tester',password:s.split('\n').find(x=>x.startsWith('访问密码：')).split('：')[1]};
}
const browser=await chromium.launch({channel:process.env.CI?'chromium':'chrome'});
try {
 for(const width of [1280,390]){
  const context=await browser.newContext({viewport:{width,height:900},httpCredentials});
  const page=await context.newPage();
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  const bad=[];
  page.on('response',r=>{if(r.status()>=400 && new URL(r.url()).host==='ruming.top' && !r.url().endsWith('/api/admin/session')) bad.push(r.status()+' '+new URL(r.url()).pathname);});
  for(const route of ['/','/news','/learn/game-prototype','/calculators/tokens','/admin']){
   await page.goto('https://ruming.top'+prefix+route);
   await page.locator(route==='/admin'?'form':'header .brand').first().waitFor();
   if(route==='/calculators/tokens'){
    await page.locator('textarea').first().fill('你好，AI 门道！部署词元计算验证。');
    await page.waitForTimeout(1200);
   }
   if(staging && route!=='/admin'){
    await page.locator('meta[name="robots"][content*="noindex"]').waitFor({state:'attached'});
   }
   if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1))throw Error('Overflow: '+route);
  }
  await page.goto('https://ruming.top'+prefix+'/');
  await page.locator('header .brand').waitFor();
  await page.screenshot({path:`docs/screenshots/ecs-${staging?'staging':'production'}-${width}.png`});
  if(errors.length||bad.length)throw Error(JSON.stringify({errors,bad}));
  console.log(JSON.stringify({environment:staging?'staging':'production',width,routes:5,result:'passed'}));
  await context.close();
 }
} finally {await browser.close();}
