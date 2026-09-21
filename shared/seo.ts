import { taskPacks } from "./task-packs";
import type { Content } from "./content";
export const publicPages: Record<
  string,
  { title: string; description: string }
> = {
  "/": {
    title: "AI 门道｜AI 资讯、工具导航与创作教程",
    description:
      "看懂 AI，用出门道。面向独立创作者，了解大模型与工具，学习游戏、3D、视频创作方法，计算词元与素材预算。",
  },
  "/ai-eyes": {title:"AI眼里的你怎么测？豆包、DeepSeek、Codex 使用指南",description:"用豆包或DeepSeek统计AI使用习惯，或选择Codex本机分析，生成自己的趣味画像与插画封面。查看步骤、数据范围与常见问题。"},
  "/personas": { title: "AI 人格 Skill｜甜妹、毒舌、御姐、傲娇、戏精与霸总", description: "六种性格鲜明的 AI 人格与二次元头像：甜妹、毒舌、御姐、傲娇、戏精、霸总。比较对话示例、调节强度和称呼，复制提示词或下载 Skill，附安装与恢复教程。" },
  "/forum": {
    title: "社区论坛｜AI 创作与工具讨论",
    description: "交流游戏、3D、视频、模型与提示词，分享问题与方法。",
  },
  "/community-rules": {
    title: "社区规则",
    description: "AI 门道社区内容、账号及讨论规则。",
  },
  "/task-packs": {title:"场景任务包｜从创作目标到第一份成果",description:"游戏角色、3D资产、短视频与游戏宣传图任务包，保存进度、提示词、笔记和成果。"},
  ...Object.fromEntries(taskPacks.map(p=>["/task-packs/"+p.id,{title:p.title+"｜AI门道场景任务包",description:p.summary}])),
  "/news": {
    title: "AI 资讯｜大模型、应用与硬件动态",
    description:
      "浏览来自公开订阅源的 AI、大模型、软件应用与硬件资讯，按分类和来源筛选，查看发布时间并直达原文。",
  },
  "/learn": {
    title: "AI 学习中心｜知识、实操、视频与应用场景",
    description:
      "理解 Token、模型、平台、API 与推理预算，学习有来源的 AI 基础知识及创作方法。",
  },
  "/models": {
    title: "大模型目录｜能力、渠道与费用资料",
    description:
      "搜索和筛选大模型，查看上下文、推理能力、渠道报价和资料来源；未知价格与未核验能力明确标注。",
  },
  "/tools": {
    title: "AI 工具与平台｜游戏、3D、视频与自动化",
    description:
      "按创作需求了解 AI 工具与平台，查看能力、限制、官方入口与相关教程。",
  },
  "/scenarios": {
    title: "AI 应用场景｜游戏、3D 与视频创作",
    description:
      "从具体任务出发，了解游戏原型、3D 建模、视频、图像和办公自动化的工具与操作路线。",
  },
  "/tutorials": {
    title: "AI 实践教程｜从想法到第一版作品",
    description:
      "沿着游戏、3D、视频与自动化教程完成第一版，了解每一步的工具选择和人工检查事项。",
  },
  "/calculators": {
    title: "AI 实用工具｜词元计数与创作预算",
    description:
      "使用浏览器本地词元计算器和素材预算工具，按真实报价比较模型与创作成本。",
  },
  "/calculators/tokens": {
    title: "Token 计算器｜词元计数与模型费用估算",
    description:
      "在浏览器本地计算参考编码的 Token 数量，比较模型渠道费用，分别设置回答与推理预算；输入正文不上传。",
  },
  "/calculators/media": {
    title: "AI 素材预算计算器｜视频、图像与 3D 成本",
    description:
      "输入实际报价、数量、重试次数及套餐额度，计算 AI 视频、图像或 3D 素材预算，不预填虚构价格。",
  },
  "/how-it-works": {
    title: "词元与费用计算原理｜口径及限制",
    description:
      "了解本地分词编码、模型用量与预算之间的区别，以及渠道报价、缓存和推理费用的计算口径。",
  },
  "/updates": {
    title: "资料更新记录｜模型与工具来源",
    description:
      "查看本站模型目录、知识和工具资料的来源与维护记录，了解覆盖情况和待核验项。",
  },
  "/about": {
    title: "关于 AI 门道",
    description: "了解 ruming.top 的站点定位、主办者及备案信息。",
  },
  "/privacy": {
    title: "隐私说明｜本地处理与必要网络请求",
    description:
      "了解词元计算、私人报价、本机收藏、资讯配图及必要网络请求的数据处理方式。",
  },
};
const privatePages: Record<string, string> = {
  "/login": "用户登录",
  "/register": "注册账号",
  "/account": "个人账号",
  "/workspace": "我的 AI 工作台",
  "/forum/new": "发起讨论",
  "/search": "搜索 AI 门道",
  "/saved": "我的收藏",
  "/compare": "工具比较",
};
export function indexablePaths(data: Content) {
  return [
    ...Object.keys(publicPages),
    ...data.knowledge.map((x) => "/learn/" + x.slug),
    ...data.resources.map((x) => "/tools/" + x.id),
    ...data.scenarios.map((x) => "/scenarios/" + x.id),
    ...data.catalog.models.map((x) => "/models/" + x.id),
  ].filter(p => resolveSeo(p, "", data).robots.startsWith("index"));
}
export function resolveSeo(pathname: string, search: string, data: Content) {
  const path = pathname.replace(/\/+$/, "") || "/";
  const query = new URLSearchParams(search);
  let page = publicPages[path];
  let known = !!page;
  let article = false;
  let slug = "";
  try {
    slug = decodeURIComponent(path.split("/").pop() || "");
  } catch {
    /* Invalid URL stays unknown. */
  }
  if (path.startsWith("/learn/") && path.split("/").length === 3) {
    const a = data.knowledge.find((x) => x.slug === slug);
    if (a) {
      page = { title: a.title, description: a.summary };
      known = true;
      article = true;
    }
  }
  if (path.startsWith("/tools/") && path.split("/").length === 3) {
    const a = data.resources.find((x) => x.id === slug);
    if (a) {
      page = {
        title: a.name + " 工具介绍｜能力、限制与官方入口",
        description: a.summary,
      };
      known = true;
    }
  }
  if (path.startsWith("/models/") && path.split("/").length === 3) {
    const a = data.catalog.models.find((x) => x.id === slug);
    if (a) {
      page = {
        title: a.name + "｜模型能力与渠道费用",
        description: a.description || `${a.name} 的能力、渠道报价和资料来源。`,
      };
      known = true;
    }
  }
  if (path.startsWith("/scenarios/") && path.split("/").length === 3) {
    const a = data.scenarios.find((x) => x.id === slug);
    if (a) {
      page = { title: a.name + "｜AI 创作路线与工具", description: a.summary };
      known = true;
    }
  }
  if (path.startsWith("/forum/") && path !== "/forum/new") {
    page = { title: "社区讨论", description: "AI 门道用户讨论内容。" };
    known = true;
  }
  const excluded =
    !!privatePages[path] || path.startsWith("/workspace/") || path === "/forum" || path.startsWith("/forum/");
  if (excluded) {
    page = {
      title: privatePages[path] || (path.startsWith("/workspace/") ? "我的 AI 工作台" : "社区讨论"),
      description: "在 AI 门道查找、保存与比较相关内容。",
    };
    known = true;
  }
  const pageNumber = Number(query.get("page") || 1);
  const paginated = ["/models", "/news", "/forum"].includes(path);
  const invalidPage =
    query.has("page") &&
    (!paginated ||
      !Number.isSafeInteger(pageNumber) ||
      pageNumber < 1 ||
      query.getAll("page").length > 1);
  const filtered = [...query.keys()].some(
    (k) =>
      k !== "page" &&
      !k.startsWith("utm_") &&
      !["gclid", "fbclid"].includes(k) &&
      query.get(k),
  );
  let canonical = new URL(path, data.site.url).href;
  if (paginated && !invalidPage && pageNumber > 1)
    canonical += "?page=" + pageNumber;
  const noindex = !known || excluded || invalidPage || filtered;
  const custom = known && !excluded ? data.seoOverrides?.[path] : undefined;
  const title = custom?.title || page?.title || "页面未找到";
  return {
    title:
      (title.includes("AI 门道") ? title : title + " - AI 门道") +
      (paginated && pageNumber > 1 && !invalidPage
        ? " · 第 " + pageNumber + " 页"
        : ""),
    description:
      custom?.description || page?.description || "该页面不存在，请返回 AI 门道浏览其他内容。",
    image: new URL(custom?.image || "/brand/ai-door-v5.png", data.site.url).href,
    canonical,
    robots: noindex ? "noindex, follow" : "index, follow",
    article,
    known,
    path,
  };
}
