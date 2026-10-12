import { readdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, extname } from 'node:path';
const manifest = {};
const types = {'.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml'};
for (const directory of ['ai-eyes-art','persona-avatars','guide-images','platform-icons']) {
  for (const file of (await readdir(`frontend/public/${directory}`, {withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))) {
    if (!file.isFile() || !types[extname(file.name)]) continue;
    if (!/^[a-zA-Z0-9_.-]+$/.test(file.name)) throw Error('Invalid asset filename');
    const path = `${directory}/${file.name}`;
    const body = await readFile(resolve('frontend/public',path));
    const sha256 = createHash('sha256').update(body).digest('hex');
    manifest['/'+path] = {key:`mendao/public/${sha256}/${path}`,sha256,size:body.length,type:types[extname(file.name)]};
  }
}
await writeFile('backend/src/content/public-assets.json',JSON.stringify(manifest,null,2)+'\n');
console.log('Prepared',Object.keys(manifest).length,'public assets');
