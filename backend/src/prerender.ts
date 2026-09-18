import { taskPacks } from "../../shared/task-packs";
import { Router } from "express";
import { readFileSync } from "node:fs";
import path from "node:path";
import { ContentDatabase } from "./database";
import type { Content } from "../../shared/content";
import type { NewsArticle } from "../../shared/news";
import { indexablePaths, resolveSeo } from "../../shared/seo";

export const escapeHtml = (v: unknown) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
const e = escapeHtml;
function link(url: string, title: string) {
  if (!url.startsWith("/") && !/^https?:\/\//i.test(url)) return e(title);
  return `<a href="${e(url)}">${e(title)}</a>`;
}
const paragraph = (s: unknown) => `<p>${e(s)}</p>`;
const list = (items: string[]) =>
  `<ul>${items.map((x) => `<li>${e(x)}</li>`).join("")}</ul>`;
const sections = (items: { title: string; body: string }[]) =>
  items
    .map((s) => `<section><h2>${e(s.title)}</h2>${paragraph(s.body)}</section>`)
    .join("");
const cards = (items: { url: string; title: string; summary?: string }[]) =>
  `<ul>${items.map((x) => `<li>${link(x.url, x.title)}${x.summary ? paragraph(x.summary) : ""}</li>`).join("")}</ul>`;
const knowledgeLinks = (d: Content) =>
  cards(
    d.knowledge.map((x) => ({
      url: "/learn/" + x.slug,
      title: x.title,
      summary: x.summary,
    })),
  );
const resourceLinks = (d: Content) =>
  cards(
    d.resources.map((x) => ({
      url: "/tools/" + x.id,
      title: x.name,
      summary: x.summary,
    })),
  );
function pageBody(route: string, d: Content, news: NewsArticle[], page = 1) {
  if (route === "/task-packs") return `<h1>场景任务包</h1>${paragraph("选择游戏、3D或视频创作目标，按步骤实践，登录后保存进度与成果。")}${cards(taskPacks.map(p=>({url:"/task-packs/"+p.id,title:p.title,summary:p.summary})))}`;
  if (route.startsWith("/task-packs/")) { const p=taskPacks.find(p=>p.id===route.split("/").pop());if(p)return `<h1>${e(p.title)}</h1>${paragraph(p.summary)}<h2>交付成果</h2>${paragraph(p.deliverable)}${list(p.preparation)}${p.steps.map(s=>`<h2>${e(s.title)}</h2>${list(s.actions)}${paragraph(s.check)}`).join("")}`; }
  if (route === "/personas") return `<h1>AI 人格合集</h1><p>给你的 AI，一点自己的性格。选择表达风格，复制本次对话指令，或下载 Codex Skill、项目与全局默认配置。</p><h2>如何使用</h2><ol><li>选择人格和风格强度。</li><li>临时使用：把完整指令粘贴到当前对话。</li><li>长期使用：备份并合并至实际加载的 AGENTS.md，重新开启会话。</li></ol><p>风格台词为人工编写的示例，不代表实时模型输出。人格只改变表达方式，不改变模型权限与事实判断。</p>`;
  const slug = decodeURIComponent(route.split("/").pop() || "");
  const a = route.startsWith("/learn/")
    ? d.knowledge.find((x) => x.slug === slug)
    : undefined;
  if (a)
    return `<h1>${e(a.title)}</h1>${paragraph(a.summary)}${sections(a.sections)}${a.practice ? `<h2>动手实践</h2>${paragraph(a.practice.result)}${list(a.practice.preparation)}${a.practice.steps.map((s, i) => `<h3>第 ${i + 1} 步</h3>${list(s.actions)}${paragraph(s.check)}`).join("")}<h2>常见问题</h2>${a.practice.pitfalls.map((x) => `<h3>${e(x.problem)}</h3>${paragraph(x.solution)}`).join("")}<h2>交付成果</h2>${list(a.practice.deliverables)}` : ""}${a.video ? `<h2>教程视频</h2>${paragraph(a.video.publisher + " · " + a.video.language)}${paragraph(a.video.audience)}${link(a.video.url, "前往原站观看视频")}` : ""}${a.sources?.length ? `<h2>资料来源</h2>${cards(a.sources.map((s) => ({ url: s.url, title: s.title })))}` : ""}`;
  const t = route.startsWith("/tools/")
    ? d.resources.find((x) => x.id === slug)
    : undefined;
  if (t)
    return `<h1>${e(t.name)}</h1>${paragraph(t.summary)}<h2>能力与使用方式</h2>${list(t.capabilities)}${paragraph("输入：" + t.input)}${paragraph("输出：" + t.output)}${paragraph("使用入口：" + t.access)}<h2>限制与注意事项</h2>${paragraph(t.limits)}${link(t.url, "官方平台")} · ${link(t.source, "资料来源")} · ${link("/learn/" + t.article, "相关教程")}${paragraph("核验日期：" + t.checkedAt)}`;
  const m = route.startsWith("/models/")
    ? d.catalog.models.find((x) => x.id === slug)
    : undefined;
  if (m)
    return `<h1>${e(m.name)}</h1>${paragraph(m.providerName + " · " + m.canonicalId)}${paragraph(m.description)}<h2>模型能力</h2>${list(["上下文长度：" + (m.context ?? "待核验"), "最大输出 token：" + (m.maxOutput ?? "待核验"), "推理模式：" + (m.reasoning ? "支持" : "标准")])}<h2>费用与渠道</h2>${m.price ? paragraph(`渠道：${m.channel}。每百万输入 token $${m.price.input}，每百万输出 token $${m.price.output}。渠道目录基础单价，不能当作厂商直连报价或网页订阅费用。`) : paragraph("暂无可核验的按 token 单价，不能将价格缺失解释为免费。")}${paragraph("词元计数使用本地参考编码，尚未确认该型号与编码的精确对应关系。规则推荐不代表质量实测。")}${paragraph("资料获取日期：" + m.checkedAt.slice(0, 10))}${link(m.source, "查看资料来源")} · ${link("/calculators/tokens", "计算词元与预算")}`;
  const s = route.startsWith("/scenarios/")
    ? d.scenarios.find((x) => x.id === slug)
    : undefined;
  if (s)
    return `<h1>${e(s.name)}</h1>${paragraph(s.summary)}<h2>如何开始</h2>${list(s.steps)}<h2>知识与实践</h2>${cards(d.knowledge.filter((a) => s.articles.includes(a.slug)).map((a) => ({ url: "/learn/" + a.slug, title: a.title, summary: a.summary })))}<h2>配套工具</h2>${cards(d.resources.filter((t) => s.tools.includes(t.id)).map((t) => ({ url: "/tools/" + t.id, title: t.name, summary: t.summary })))}`;
  if (route === "/")
    return `<h1>AI门道｜看懂 AI，用出门道。</h1>${paragraph("AI 门道面向独立创作者，提供 AI 资讯、工具导航、知识教程与词元预算工具。")}<h2>AI 实时资讯</h2>${newsLinks(news.slice(0, 6))}<h2>学习与实践</h2>${knowledgeLinks(d)}<h2>模型与工具</h2>${resourceLinks(d)}${link("/models", "浏览全部大模型")} · ${link("/calculators", "实用工具")}`;
  if (route === "/learn")
    return `<h1>AI 学习中心</h1>${paragraph("知识、实操、视频与应用场景。")} ${knowledgeLinks(d)}<h2>应用场景</h2>${cards(d.scenarios.map((s) => ({ url: "/scenarios/" + s.id, title: s.name, summary: s.summary })))}`;
  if (route === "/tools") return `<h1>AI 工具与平台</h1>${resourceLinks(d)}`;
  if (route === "/models")
    return `<h1>大模型目录${page > 1 ? " · 第 " + page + " 页" : ""}</h1>${cards(d.catalog.models.slice((page - 1) * 24, page * 24).map((m) => ({ url: "/models/" + m.id, title: m.name, summary: m.description })))}${pages("/models", page, Math.ceil(d.catalog.models.length / 24))}`;
  if (route === "/news")
    return `<h1>AI 实时资讯${page > 1 ? " · 第 " + page + " 页" : ""}</h1>${newsLinks(news.slice((page - 1) * 18, page * 18))}${pages("/news", page, Math.ceil(news.length / 18))}`;
  const seo = resolveSeo(route, "", d);
  return `<h1>${e(seo.title)}</h1>${paragraph(seo.description)}${route.startsWith("/calculators") ? `${link("/calculators/tokens", "Token 计算器")} · ${link("/calculators/media", "AI 素材预算计算器")}${paragraph("交互计算需要启用 JavaScript，输入正文在浏览器本地处理。")}` : ""}${route === "/about" ? paragraph("主办者：" + d.site.organizer + "。域名：" + d.site.domain) + '<h2>联系方式</h2><p><a href="tel:16628717656">16628717656</a>（微信同号）</p>' : ""}<h2>继续浏览</h2>${link("/learn", "学习中心")} · ${link("/models", "模型目录")} · ${link("/tools", "工具平台")}`;
}
function newsLinks(news: NewsArticle[]) {
  return `<ul>${news.map((n) => `<li>${link(n.url, n.title)}${paragraph(n.sourceName + (n.publishedAt ? " · " + n.publishedAt.slice(0, 10) : ""))}</li>`).join("")}</ul>`;
}
function pages(route: string, page: number, total: number) {
  return `<nav aria-label="分页">${page > 1 ? link(route + (page === 2 ? "" : "?page=" + (page - 1)), "上一页") : ""} ${page < total ? link(route + "?page=" + (page + 1), "下一页") : ""}</nav>`;
}
export function renderSnapshot(
  shell: string,
  route: string,
  d: Content,
  news: NewsArticle[] = [],
  search = "",
  staging = false,
) {
  const seo = resolveSeo(route, search, d);
  const robots = staging ? "noindex, nofollow" : seo.robots;
  const structured = {
    "@context": "https://schema.org",
    "@type": route === "/" ? "WebSite" : seo.article ? "Article" : "WebPage",
    name: seo.title,
    url: seo.canonical,
    description: seo.description,
    ...(route === "/" ? { alternateName: ["AI门道", "AI 门道"] } : {}),
  };
  const metadata = `<meta name="robots" content="${robots}"><link rel="canonical" href="${e(seo.canonical)}"><meta property="og:title" content="${e(seo.title)}"><meta property="og:description" content="${e(seo.description)}"><meta property="og:url" content="${e(seo.canonical)}"><script type="application/ld+json" id="prerender-schema">${JSON.stringify(structured).replaceAll("<", "\\u003c")}</script>`;
  let content = `<div class="container"><header style="padding:24px 0">${link("/", "AI 门道")} · ${link("/news", "AI 资讯")} · ${link("/learn", "学习中心")} · ${link("/models", "模型与平台")} · ${link("/tools", "工具导航")}</header><main class="prose" style="max-width:900px;margin:24px auto;line-height:1.9;overflow-wrap:anywhere">${pageBody(route, d, news, Number(new URLSearchParams(search).get("page") || 1))}</main><footer style="padding:24px 0">AI 门道 · 看懂 AI，用出门道。 ${link("https://beian.miit.gov.cn/", d.site.icp)}</footer></div>`;
  if (staging) content = content.replace(/href="\/(?!\/)/g, 'href="/staging/');
  return shell
    .replace(
      /<title>[\s\S]*?<\/title>/,
      () => "<title>" + e(seo.title) + "</title>",
    )
    .replace(
      /<meta\s+name="description"[\s\S]*?>/,
      () => '<meta name="description" content="' + e(seo.description) + '">',
    )
    .replace("</head>", () => metadata + "</head>")
    .replace(
      '<div id="root"></div>',
      () => '<div id="root" data-prerendered="true">' + content + "</div>",
    );
}
export class PublicSnapshots {
  private cache = new Map<string, string>();
  private empty = "";
  private missing = "";
  private unsubscribe: () => void;
  constructor(
    private store: ContentDatabase,
    private shell = readFileSync(
      process.env.FRONTEND_SHELL ||
        path.resolve(
          import.meta.dirname,
          process.env.APP_ENV === "staging"
            ? "../../frontend/dist-staging/index.html"
            : "../../frontend/dist/index.html",
        ),
      "utf8",
    ),
    private staging = process.env.APP_ENV === "staging",
  ) {
    this.refresh();
    this.unsubscribe = store.onPublicChange(() => this.refresh());
  }
  refresh() {
    const d = this.store.publicContent();
    const news = ((this.store.loadNews()?.items || []) as NewsArticle[])
      .slice()
      .sort((a, b) =>
        (b.publishedAt || b.collectedAt).localeCompare(
          a.publishedAt || a.collectedAt,
        ),
      );
    const next = new Map<string, string>();
    for (const p of indexablePaths(d)) {
      if (["/tutorials", "/scenarios", "/forum"].includes(p)) continue;
      next.set(p, renderSnapshot(this.shell, p, d, news, "", this.staging));
    }
    for (const [route, count] of [
      ["/models", Math.ceil(d.catalog.models.length / 24)],
      ["/news", Math.ceil(news.length / 18)],
    ] as const) {
      for (let page = 2; page <= count; page++)
        next.set(
          route + "?page=" + page,
          renderSnapshot(
            this.shell,
            route,
            d,
            news,
            "?page=" + page,
            this.staging,
          ),
        );
    }
    this.empty = this.shell.replace(
      "</head>",
      '<meta name="robots" content="noindex, nofollow"></head>',
    );
    this.missing = this.empty
      .replace(
        /<title>[\s\S]*?<\/title>/,
        "<title>页面未找到 - AI 门道</title>",
      )
      .replace(
        '<div id="root"></div>',
        '<div id="root"><main class="container"><h1>页面未找到</h1><a href="/">返回 AI 门道</a></main></div>',
      );
    this.cache = next;
  }
  close() {
    this.unsubscribe();
  }
  get(url: string) {
    const u = new URL(url, "https://snapshot.invalid");
    if (
      this.staging &&
      (u.pathname === "/staging" || u.pathname.startsWith("/staging/"))
    )
      u.pathname = u.pathname.slice(8) || "/";
    let p = u.pathname.replace(/\/+$/, "") || "/";
    try {
      p = decodeURIComponent(p);
    } catch {
      return { status: 404, html: this.missing };
    }
    if (p === "/tutorials" || p === "/scenarios")
      return {
        status: 308,
        location:
          (this.staging ? "/staging" : "") +
          "/learn?format=" +
          (p === "/tutorials" ? "practice" : "scenarios"),
      };
    if (
      [
        "/admin",
        "/login",
        "/register",
        "/account",
        "/search",
        "/saved",
        "/compare",
        "/forum",
      ].includes(p) ||
      p === "/workspace" || p.startsWith("/workspace/") ||
      p.startsWith("/ai-eyes") ||
      p.startsWith("/admin/") ||
      p.startsWith("/forum/")
    )
      return { status: 200, html: this.empty, noindex: true };
    const query = u.searchParams;
    const pn = Number(query.get("page") || 1);
    const paginated = ["/models", "/news"].includes(p);
    const invalid =
      query.has("page") &&
      (!paginated ||
        !Number.isSafeInteger(pn) ||
        pn < 1 ||
        query.getAll("page").length !== 1);
    const key = p + (paginated && pn > 1 && !invalid ? "?page=" + pn : "");
    const html = this.cache.get(key);
    if (!html) return { status: 404, html: this.missing, noindex: true };
    const filtered =
      invalid ||
      [...query.keys()].some(
        (k) =>
          k !== "page" &&
          !k.startsWith("utm_") &&
          !["gclid", "fbclid"].includes(k),
      );
    return {
      status: 200,
      html: filtered
        ? html.replace('content="index, follow"', 'content="noindex, follow"')
        : html,
      noindex: filtered || this.staging,
    };
  }
  router() {
    const router = Router();
    router.get("/{*path}", (req, res, next) => {
      if (req.path.startsWith("/api/")) return next();
      const r = this.get(req.originalUrl);
      if (r.location) return res.redirect(r.status, r.location);
      res.set("X-Prerender", "published-snapshot");
      if (r.noindex) res.set("X-Robots-Tag", "noindex");
      res.status(r.status).type("html").send(r.html);
    });
    return router;
  }
}
