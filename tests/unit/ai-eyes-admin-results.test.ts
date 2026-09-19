import {it,expect} from "vitest";
import {ContentDatabase} from "../../backend/src/database";
import {initEyes} from "../../backend/src/ai-eyes";
import {initMiniEyes} from "../../backend/src/mini-eyes";
import {initCommunity} from "../../backend/src/community";
import {eyesAdminResults} from "../../backend/src/ai-eyes-admin-results";
it("combines and pages web imports and latest mini results without exposing private matching data",()=>{
 const db=new ContentDatabase(":memory:");initCommunity(db);initEyes(db);initMiniEyes(db);
 const now=Date.now();
 try{
 const insert=db.db.prepare("INSERT INTO ai_eyes_runs(id,owner,submit_hash,claim_hash,state,phase,created,deadline,expires,scope,result) VALUES(?,'secret-owner','secret-submit','secret-claim','completed','completed',?,?,?, ?,?)");
 for(let i=0;i<23;i++)insert.run("web-"+i,now-i,now+10000,now+10000,JSON.stringify(i===0?{}:{source:"mobile_import",platform:i===1?"豆包":"DeepSeek"}),JSON.stringify({persona_id:"one_line_ceo",match_notes:["private explanation"]}));
 db.db.prepare("INSERT INTO community_users(id,username,nickname,password,demo,disabled,created_at,updated_at,source) VALUES('mini-user','wx_test','小程序读者','secret-password',0,0,?,?,'miniprogram')").run(now,now);
 db.db.prepare("INSERT INTO mini_eyes_results VALUES(?,?,?)").run('mini-user',JSON.stringify({platform:'DeepSeek',created:now+1,result:{persona_id:'one_line_ceo',match_notes:['private explanation']}}),now+10000);
 const all=eyesAdminResults(db,{});expect(all.total).toBe(24);expect(all.items).toHaveLength(20);expect(all.items[0]).toMatchObject({channel:'miniprogram',platform:'DeepSeek',nickname:'小程序读者',personaName:'一句话 CEO'});
 expect(JSON.stringify(all)).not.toMatch(/private explanation|secret-/);
 expect(eyesAdminResults(db,{page:'2'}).items).toHaveLength(4);
 expect(eyesAdminResults(db,{platform:'豆包'}).total).toBe(1);
 expect(eyesAdminResults(db,{channel:'miniprogram',platform:'DeepSeek'}).total).toBe(1);
 expect(eyesAdminResults(db,{channel:'web',platform:'Codex'}).total).toBe(1);
 expect(()=>eyesAdminResults(db,{platform:"' OR 1=1"})).toThrow();
 db.db.prepare("UPDATE mini_eyes_results SET expires=?").run(now-1);
 expect(eyesAdminResults(db,{channel:'miniprogram'}).total).toBe(0);
 db.db.prepare("DELETE FROM ai_eyes_runs").run();
 expect(eyesAdminResults(db,{page:99})).toMatchObject({total:0,page:1,items:[]});
 }finally{db.close();}
});
it("supports an installation without mini result tables",()=>{
 const db=new ContentDatabase(":memory:");initEyes(db);
 try{expect(eyesAdminResults(db,{}).total).toBe(0);}finally{db.close();}
});
