import { cp, mkdir, readFile, writeFile, rm } from "node:fs/promises";
import path from "node:path";
const root = path.resolve("miniprogram-personal");
await rm(root, { recursive: true, force: true });
await mkdir(root, { recursive: true });
const removed = ["news", "forum", "post", "compose"];
await cp("miniprogram", root, {
  recursive: true,
  filter: (source) =>
    !source.endsWith("project.private.config.json") &&
    !removed.some((p) => source === path.join("miniprogram", "pages", p)),
});
const read = (p) => readFile(path.join(root, p), "utf8");
const write = (p, s) => writeFile(path.join(root, p), s);
const app = JSON.parse(await read("app.json"));
app.pages = app.pages.filter(
  (p) => !removed.some((x) => p === `pages/${x}/index`),
);
app.pages = [
  "pages/tools/index",
  ...app.pages.filter((p) => p !== "pages/tools/index"),
];
app.tabBar.list = app.tabBar.list
  .filter((p) => p.pagePath !== "pages/news/index")
  .sort(
    (a, b) => app.pages.indexOf(a.pagePath) - app.pages.indexOf(b.pagePath),
  );
await write("app.json", JSON.stringify(app, null, 2) + "\n");
const sitemap = JSON.parse(await read("sitemap.json"));
sitemap.rules = sitemap.rules.filter((r) => r.page !== "pages/compose/index");
await write("sitemap.json", JSON.stringify(sitemap, null, 2) + "\n");
const project = JSON.parse(await read("project.config.json"));
project.projectname = "AI门道-个人主体候选版";
await write("project.config.json", JSON.stringify(project, null, 2) + "\n");
function removeElement(source, tag, pattern) {
  const start = source.search(pattern);
  if (start < 0) throw Error("Missing element to remove");
  const rx = new RegExp("<(/?)" + tag + "\\b[^>]*>", "g");
  rx.lastIndex = start;
  let depth = 0;
  for (let m; (m = rx.exec(source)); ) {
    depth += m[1] ? -1 : 1;
    if (depth === 0) return source.slice(0, start) + source.slice(rx.lastIndex);
  }
  throw Error("Unbalanced markup");
}
// Strip entire UI entry and handler; no remote flag or reviewer-specific behavior.
let me = await read("pages/me/index.js");
me = me.replace(/  forum\(\) \{[\s\S]*?\n  \},\n/, "");
await write("pages/me/index.js", me);
let meView = await read("pages/me/index.wxml");
meView = removeElement(meView, "view", /<view class="card" bindtap="forum"\s*>/)
  .replaceAll("登录 / 注册，参与交流", "登录 / 注册，管理资料")
  .replaceAll("教程、资讯和工具", "教程和工具");
await write("pages/me/index.wxml", meView);
await write(
  "pages/about/index.js",
  `const api=require('../../utils/api');Page({copy(){api.copy(require('../../config').website);}});\n`,
);
await write(
  "pages/about/index.wxml",
  `<view class="page"><view class="hero"><image src="/assets/logo.png" class="logo"/><view class="title">AI 门道</view><view>看懂 AI，用出门道。</view></view><view class="card"><view class="heading">工具与知识查询</view><view>查询 AI 模型与平台资料，阅读知识和实践说明，估算 Token 费用。视频仅提供来源信息，不在小程序播放。</view><button open-type="feedback">意见反馈</button><button bindtap="copy">复制网站地址</button><view class="tiny">主办：张鸣鸣 · ruming.top · 浙ICP备2023017888号-4</view></view><view class="card"><view class="heading">隐私与服务说明</view><view>浏览无需登录。注册收集账号、密码和昵称，密码加盐哈希存储；头像仅在你主动选择并确认保存时上传。不读取其他照片。账号复用网站账号；昵称和头像属于公开个人资料。登录令牌存在本设备，退出移除，改密使各端会话失效。收藏与阅读记录仅存在本设备，可在“我的”中清除。本版无第三方统计或广告 SDK。账号资料更正或删除请求，可通过意见反馈联系管理员并核验身份。资料附来源供核验，预算不等于实际账单或效果承诺。</view></view></view>\n`,
);
for (const p of ["pages/account/index.wxml", "pages/account/index.js"]) {
  let s = await read(p);
  s = s
    .replaceAll("隐私说明与社区规则", "隐私与服务说明")
    .replaceAll("与社区记录", "与个人资料");
  await write(p, s);
}
let saved = await read("utils/saved.js");
saved = saved.replace(
  "Array.isArray(a) ? a : []",
  'Array.isArray(a) ? a.filter(x => ["learn","tools","models","scenarios"].includes(x.kind)) : []',
);
await write("utils/saved.js", saved);
// Native list factory for the personal build contains no news or public posting logic.
await write(
  "utils/list.js",
  `const api=require('./api');const nav=require('./navigation');module.exports=kind=>({data:{kind,items:[],page:0,total:0,loading:false,error:'',q:'',filter:'',filters:kind==='learn'?['全部','文章','实践','视频','场景']:[]},onLoad(o){if(o.kind)this.setData({kind:o.kind});this.load(true);},onPullDownRefresh(){this.load(true).finally(()=>wx.stopPullDownRefresh());},onReachBottom(){if(!this.data.loading&&this.data.items.length<this.data.total)this.load(false);},query(e){this.setData({q:e.detail.value});},search(){this.load(true);},filter(e){this.setData({filter:e.currentTarget.dataset.value});this.load(true);},retry(){this.load(this.data.page===0);},async load(reset){const seq=this.seq=(this.seq||0)+1;const page=reset?1:this.data.page+1;this.setData({loading:true,error:'',...(reset?{items:[],page:0,total:0}:{})});try{const kind=this.data.kind;if(!['learn','models','tools'].includes(kind))throw Error('不支持此内容类型');const scenario=kind==='learn'&&this.data.filter==='场景';const r=await api.request(scenario?'/api/v1/mini/scenarios':kind==='models'?'/api/v1/catalog':'/api/v1/library/'+kind,{page,pageSize:18,q:this.data.q,format:({'文章':'article','实践':'practice','视频':'video'})[this.data.filter]||''});if(seq!==this.seq)return;let items=r.items||r.models||[];if(scenario)items=items.filter(x=>(x.name+x.summary).includes(this.data.q));items=items.map(x=>({...x,key:x.id||x.slug,title:x.title||x.name,summary:x.summary||x.description||'',kind:scenario?'scenarios':kind}));this.setData({items:reset?items:this.data.items.concat(items),page,total:scenario?items.length:r.total});}catch(e){if(seq===this.seq)this.setData({error:e.message});}finally{if(seq===this.seq)this.setData({loading:false});}},open(e){const x=this.data.items[e.currentTarget.dataset.index];nav.detail(x.kind,x.id||x.slug);},onShareAppMessage(){return {title:'AI 门道 · 看懂 AI，用出门道。',path:'/pages/tools/index'};}});\n`,
);
let detail = await read("pages/detail/index.wxml");
detail = removeElement(
  detail,
  "block",
  /<block wx:if="\{\{kind === 'news'\}\}"\s*>/,
);
await write("pages/detail/index.wxml", detail);
let detailJs = await read("pages/detail/index.js");
detailJs = detailJs.replace(
  "const k = this.data.kind;",
  `const k = this.data.kind; if(!['learn','models','tools','scenarios'].includes(k))throw Error('不支持此内容类型');`,
);
detailJs = detailJs.replace(
  /: k === "news"\s*\? "\/api\/v1\/mini\/news\/"\s*/,
  "",
);
await write("pages/detail/index.js", detailJs);
await write(
  "README.md",
  "个人主体候选包，由 npm run mini:personal 生成。详细文档见 ../miniprogram/README.md。无资讯与社区页面，视频不在小程序播放；最终服务类目和发布资格以微信审核为准。\n",
);
for (const p of removed)
  if (app.pages.includes(`pages/${p}/index`))
    throw Error("Removed route remained");
if ((await read("pages/me/index.wxml")).includes('bindtap="forum"'))
  throw Error("Community entry was not removed");
console.log("个人主体候选包已生成：" + root + "（8 页，工具 / 学习 / 我的）");
