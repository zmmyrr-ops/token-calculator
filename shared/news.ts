export const newsCategories = [
  "全部",
  "大模型",
  "软件应用",
  "硬件算力",
  "研究进展",
  "产业动态",
] as const;
export type NewsCategory = Exclude<(typeof newsCategories)[number], "全部">;
export type NewsArticle = {
  id: string;
  title: string;
  imageUrl?: string | null;
  url: string;
  sourceId: string;
  sourceName: string;
  category: NewsCategory;
  publishedAt: string | null;
  collectedAt: string;
};
export type NewsSource = {
  id: string;
  name: string;
  url: string;
  feed: string;
  category: NewsCategory;
  language: string;
};
export type NewsSourceStatus = NewsSource & {
  lastAttempt: string | null;
  lastSuccess: string | null;
  error: string | null;
  count: number;
};
export type NewsResponse = {
  items: NewsArticle[];
  total: number;
  page: number;
  pageSize: number;
  updatedAt: string | null;
  refreshing: boolean;
  pollMinutes: number;
  sources: NewsSourceStatus[];
};
