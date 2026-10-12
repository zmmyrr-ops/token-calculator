import { afterEach, expect, test, vi } from "vitest";
import express from "express";
import { mkdtempSync, writeFileSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Server } from "node:http";
import { assetRequest, publicAssetsRouter } from "../../backend/src/public-assets";
import manifest from "../../backend/src/content/public-assets.json";
const config={bucket:"test-private-bucket",region:"oss-cn-wulanchabu",internal:true,accessKeyId:"test",accessKeySecret:"test-secret"};
const servers:Server[]=[];const dirs:string[]=[];
afterEach(async()=>{for(const s of servers){s.closeAllConnections();await new Promise<void>(r=>s.close(()=>r()));}servers.length=0;for(const d of dirs)rmSync(d,{recursive:true,force:true});dirs.length=0;});
async function serve(request:typeof fetch,configured=true){
 const dir=mkdtempSync(join(tmpdir(),"asset-test-"));dirs.push(dir);const file=join(dir,"oss.json");
 if(configured)writeFileSync(file,JSON.stringify(config));
 const app=express();app.use(publicAssetsRouter(file,request));
 const server=app.listen(0,"127.0.0.1");servers.push(server);await new Promise<void>(r=>server.once("listening",r));
 const address=server.address();if(!address||typeof address==="string")throw Error("No port");return `http://127.0.0.1:${address.port}`;
}
const path="/ai-eyes-art/one_line_ceo-v1.webp", asset=manifest[path];
test("only explicit public assets can be served, without revealing private bucket credentials",async()=>{
 const body=readFileSync("frontend/public"+path);
 const request=vi.fn<typeof fetch>().mockImplementation(async(_url,options)=>new Response(options?.method==='HEAD'?null:body,{headers:{"content-length":String(asset.size),"x-oss-meta-sha256":asset.sha256}}));
 const base=await serve(request);
 const response=await fetch(base+path);expect(response.status).toBe(200);expect(Buffer.from(await response.arrayBuffer())).toEqual(body);
 expect(response.headers.get('etag')).toBe(`"${asset.sha256}"`);expect(response.headers.get('authorization')).toBeNull();
 expect((await fetch(base+'/staging'+path,{method:'HEAD'})).headers.get('content-length')).toBe(String(asset.size));
 expect((await fetch(base+path,{headers:{'If-None-Match':`"${asset.sha256}"`}})).status).toBe(304);
 const before=request.mock.calls.length;
 for(const invalid of ['/ai-eyes-art/not-listed.png','/ai-eyes-art/%2e%2e%2fsecrets','/tanhaodian/backups/file','/platform-icons/oss.json'])expect((await fetch(base+invalid)).status).toBe(404);
 expect((await fetch(base+path,{method:'POST'})).status).toBe(405);expect(request).toHaveBeenCalledTimes(before);
 const [url,options]=request.mock.calls[0];expect(String(url)).toContain('.oss-cn-wulanchabu-internal.aliyuncs.com/mendao/public/');expect(options?.redirect).toBe('error');
});
test("OSS failures or integrity mismatch fail closed without forwarding error payloads",async()=>{
 const request=vi.fn<typeof fetch>().mockResolvedValueOnce(new Response('secret upstream details',{status:403})).mockResolvedValueOnce(new Response('bad data',{headers:{'content-length':'8'}}));
 const base=await serve(request);
 for(let i=0;i<2;i++){const r=await fetch(base+path);expect(r.status).toBe(502);expect(await r.text()).toBe('');expect(r.headers.get('cache-control')).toBe('no-store');}
 const disabled=await serve(request,false);expect((await fetch(disabled+path)).status).toBe(503);
 expect(()=>assetRequest(config,'tanhaodian/private','GET',new Date().toUTCString())).toThrow();
});
