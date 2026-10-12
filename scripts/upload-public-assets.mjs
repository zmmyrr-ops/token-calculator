// One-time migration. Uses an installed ali-oss SDK; credentials stay server-side.
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const [configPath, manifestPath, publicRoot] = process.argv.slice(2);
if (!configPath || !manifestPath || !publicRoot) throw Error('Usage: upload-public-assets.mjs CONFIG MANIFEST PUBLIC_ROOT');
const require = createRequire(import.meta.url);
const OSS = require(process.env.OSS_SDK_PATH || 'ali-oss');
const config = JSON.parse(await readFile(configPath,'utf8'));
const client = new OSS({...config,secure:true,timeout:120000});
const manifest = JSON.parse(await readFile(manifestPath,'utf8'));
let bytes=0,count=0;
for (const [path, asset] of Object.entries(manifest)) {
  if (!/^\/(ai-eyes-art|persona-avatars|guide-images|platform-icons)\/[a-zA-Z0-9_.-]+$/.test(path) || path.includes('..')) throw Error('Invalid path');
  const body=await readFile(resolve(publicRoot,'.'+path));
  const sha=createHash('sha256').update(body).digest('hex');
  if (sha!==asset.sha256 || body.length!==asset.size || asset.key!==`mendao/public/${sha}${path}`) throw Error('Local integrity mismatch: '+path);
  await client.put(asset.key,body,{headers:{'Content-Type':asset.type,'Content-MD5':createHash('md5').update(body).digest('base64'),'x-oss-object-acl':'private','x-oss-meta-sha256':sha,'Cache-Control':'public, max-age=3600'}});
  const remote=await client.getStream(asset.key);
  const hash=createHash('sha256');let size=0;
  for await (const chunk of remote.stream) {hash.update(chunk);size+=chunk.length;}
  if(size!==asset.size || hash.digest('hex')!==sha) throw Error('OSS verification failed: '+path);
  count++;bytes+=size;
  if(count%20===0)console.log('Verified',count,'assets');
}
console.log(JSON.stringify({verifiedFiles:count,verifiedBytes:bytes,bucket:config.bucket,prefix:'mendao/public/'}));
