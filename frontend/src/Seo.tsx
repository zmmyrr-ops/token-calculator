import { isStaging } from "./base";
import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useContent } from "./content";
import { resolveSeo } from "@shared/seo";
export default function Seo() {
  const data = useContent(),
    location = useLocation();
  const seo = resolveSeo(location.pathname, location.search, data);
  useEffect(() => {
    document.title = seo.title;
    const meta = (key: string, value: string, property = false) => {
      const attr = property ? "property" : "name";
      let el = document.head.querySelector<HTMLMetaElement>(
        `meta[${attr}="${key}"]`,
      );
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, key);
        document.head.append(el);
      }
      el.content = value;
    };
    meta("description", seo.description);
    meta("robots", isStaging ? "noindex, nofollow" : seo.robots);
    meta("og:title", seo.title, true);
    meta("og:description", seo.description, true);
    meta("og:url", seo.canonical, true);
    meta("og:type", seo.article ? "article" : "website", true);
    meta("og:site_name", "AI 门道", true);
    meta("og:locale", "zh_CN", true);
    meta("twitter:card", "summary");
    meta("twitter:title", seo.title);
    meta("twitter:description", seo.description);
    let canonical = document.head.querySelector<HTMLLinkElement>(
      'link[rel="canonical"]',
    );
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.append(canonical);
    }
    canonical.href = seo.canonical;
  }, [seo.title, seo.description, seo.canonical, seo.robots, seo.article]);
  return null;
}
