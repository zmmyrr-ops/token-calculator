export const trafficSources = [
  "baidu",
  "google",
  "bing",
  "sogou",
  "so",
  "duckduckgo",
  "referral",
  "campaign",
  "direct_unknown",
  "internal_unknown",
] as const;
export type TrafficSource = (typeof trafficSources)[number];
export const trafficLabels: Record<TrafficSource, string> = {
  baidu: "百度搜索",
  google: "Google 搜索",
  bing: "必应搜索",
  sogou: "搜狗搜索",
  so: "360 搜索",
  duckduckgo: "DuckDuckGo 搜索",
  referral: "其他网站引荐",
  campaign: "推广链接（UTM）",
  direct_unknown: "直接访问／来源未知",
  internal_unknown: "站内进入／原始来源未知",
};
export const trafficDevices = [
  "desktop",
  "mobile",
  "tablet",
  "unknown",
] as const;
export type TrafficDevice = (typeof trafficDevices)[number];
export function classifyTraffic(
  referrer: string,
  currentUrl: string,
): TrafficSource {
  try {
    const current = new URL(currentUrl);
    if (
      ["utm_source", "utm_medium", "utm_campaign"].some((key) =>
        current.searchParams.get(key)?.trim(),
      )
    )
      return "campaign";
    if (!referrer) return "direct_unknown";
    const previous = new URL(referrer);
    if (!["http:", "https:"].includes(previous.protocol))
      return "direct_unknown";
    if (
      previous.origin === current.origin ||
      (previous.protocol === current.protocol &&
        previous.port === current.port &&
        previous.hostname.replace(/^www\./, "") ===
          current.hostname.replace(/^www\./, ""))
    )
      return "internal_unknown";
    const host = previous.hostname.toLowerCase().replace(/\.$/, "");
    const belongs = (domain: string) =>
      host === domain || host.endsWith("." + domain);
    if (
      belongs("baidu.com") &&
      ["www.baidu.com", "m.baidu.com", "baidu.com"].includes(host)
    )
      return "baidu";
    if (
      [
        "google.com",
        "google.com.hk",
        "google.cn",
        "google.co.jp",
        "google.co.uk",
        "google.de",
        "google.fr",
        "google.ca",
        "google.com.au",
        "google.co.in",
        "google.com.tw",
        "google.com.sg",
        "google.co.kr",
      ].some((domain) => host === domain || host === "www." + domain)
    )
      return "google";
    if (belongs("bing.com")) return "bing";
    if (["sogou.com", "www.sogou.com", "m.sogou.com"].includes(host))
      return "sogou";
    if (belongs("so.com")) return "so";
    if (belongs("duckduckgo.com")) return "duckduckgo";
    return "referral";
  } catch {
    return "direct_unknown";
  }
}
export function trafficDevice(
  userAgent: string,
  touchPoints = 0,
): TrafficDevice {
  if (
    /iPad|Tablet/i.test(userAgent) ||
    (/Macintosh/.test(userAgent) && touchPoints > 1) ||
    (/Android/.test(userAgent) && !/Mobile/.test(userAgent))
  )
    return "tablet";
  if (/Mobi|iPhone|iPod/i.test(userAgent)) return "mobile";
  return /Windows|Macintosh|Linux|CrOS/.test(userAgent) ? "desktop" : "unknown";
}
export function shouldStartVisit(
  last: number | null,
  now: number,
  firstDocumentCheck: boolean,
  source: TrafficSource,
  navigationType: string,
) {
  return (
    last === null ||
    !Number.isFinite(last) ||
    last > now ||
    now - last >= 30 * 60 * 1000 ||
    (firstDocumentCheck &&
      navigationType === "navigate" &&
      !["direct_unknown", "internal_unknown"].includes(source))
  );
}
