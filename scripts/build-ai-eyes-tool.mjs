import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {zipSync} from 'fflate';
const base=new URL('../frontend/public/ai-eyes-tool/v4/',import.meta.url);
const names=['instructions.md','persona_catalog.json','schema/match.schema.json',...readdirSync(new URL('scripts/',base)).filter(s=>s.endsWith('.py')).map(s=>'scripts/'+s)];
const files=Object.fromEntries(names.map(name=>[name,readFileSync(new URL(name,base))]));
const manifest={version:'4',files:Object.fromEntries(Object.entries(files).map(([name,data])=>[name,createHash('sha256').update(data).digest('hex')]))};
const text=JSON.stringify(manifest,null,2)+'\n';writeFileSync(new URL('manifest.json',base),text);files['manifest.json']=Buffer.from(text);writeFileSync(new URL('bundle.zip',base),zipSync(files));
console.log('AI eyes execution bundle verified:',names.length,'files');
