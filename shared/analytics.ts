import {
  trafficSources,
  trafficDevices,
  type TrafficSource,
  type TrafficDevice,
} from "./traffic";
import { z } from "zod";
export const eventNames = [
  "visit_start",
  "page_view",
  "navigation_click",
  "content_click",
  "outbound_click",
  "search_submit",
  "calculator_used",
  "report_export",
  "persona_copy",
  "persona_download",
] as const;
export const eventLabels: Record<(typeof eventNames)[number], string> = {
  visit_start: "网站进入",
  persona_copy: "复制人格指令或链接",
  persona_download: "下载人格配置",
  page_view: "页面访问",
  navigation_click: "导航点击",
  content_click: "内容入口点击",
  outbound_click: "外链点击",
  search_submit: "搜索与筛选",
  calculator_used: "完成词元计算",
  report_export: "导出计算报告",
};
export const pageNames = [
  "/ai-eyes",
  "/",
  "/news",
  "/personas",
  "/models",
  "/models/:id",
  "/tools",
  "/tools/:id",
  "/learn",
  "/learn/:id",
  "/scenarios",
  "/scenarios/:id",
  "/tutorials",
  "/calculators",
  "/calculators/tokens",
  "/calculators/media",
  "/compare",
  "/search",
  "/saved",
  "/updates",
  "/about",
  "/privacy",
  "/how-it-works",
  "/forum",
  "/forum/new",
  "/forum/:id",
  "/community-rules",
  "/404",
] as const;
export function analyticsPage(path: string): (typeof pageNames)[number] {
  if ((pageNames as readonly string[]).includes(path))
    return path as (typeof pageNames)[number];
  for (const prefix of [
    "models",
    "tools",
    "learn",
    "scenarios",
    "forum",
  ] as const)
    if (path.startsWith(`/${prefix}/`)) return `/${prefix}/:id`;
  return "/404";
}
export const eventSchema = z
  .object({
    id: z.string().uuid(),
    name: z.enum(eventNames),
    page: z.enum(pageNames),
    source: z.enum(trafficSources).optional(),
    device: z.enum(trafficDevices).optional(),
    target: z.union([
      z.enum(pageNames),
      z.literal("external"),
      z.literal("none"),
    ]),
  })
  .strict()
  .refine(
    (e) =>
      e.name === "visit_start"
        ? Boolean(e.source && e.device && e.target === "none")
        : e.source === undefined && e.device === undefined,
    "来源仅用于网站进入事件",
  );
export type AnalyticsEvent = z.infer<typeof eventSchema>;
export type AnalyticsSummary = {
  traffic: {
    device: "all" | TrafficDevice;
    entries: number;
    legacyPageViews: number;
    sources: { source: TrafficSource; count: number }[];
    landings: { source: TrafficSource; page: string; count: number }[];
    daily: { day: string; source: TrafficSource; count: number }[];
  };
  days: number;
  since: string;
  totalEvents: number;
  pageViews: number;
  clicks: number;
  daily: { day: string; pageViews: number; interactions: number }[];
  events: { name: string; count: number }[];
  pages: { page: string; count: number }[];
  targets: { name: string; target: string; count: number }[];
};
