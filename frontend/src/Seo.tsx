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
    const eyes = location.pathname.startsWith("/ai-eyes");
    let referrer = document.head.querySelector<HTMLMetaElement>(
      'meta[name="referrer"]',
    );
    if (!referrer) {
      referrer = document.createElement("meta");
      referrer.name = "referrer";
      document.head.append(referrer);
    }
    referrer.content = eyes ? "no-referrer" : "strict-origin-when-cross-origin";
    if (eyes) {
      document.head
        .querySelector('meta[name="robots"]')
        ?.setAttribute("content", "noindex,nofollow");
      document.head.querySelector('link[rel="canonical"]')?.remove();
      document.getElementById("prerender-schema")?.remove();
      if (!location.pathname.startsWith("/ai-eyes/s/"))
        document.title = "AI 眼里的你 · AI 门道";
      return;
    }
    document.title = eyes
      ? "AI 眼里的你 · 16 种 AI 使用人格 - AI 门道"
      : seo.title;
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
    meta("robots", isStaging || eyes ? "noindex, nofollow" : seo.robots);
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
    let schema = document.getElementById("prerender-schema");
    if (!schema) {
      schema = document.createElement("script");
      schema.id = "prerender-schema";
      schema.setAttribute("type", "application/ld+json");
      document.head.append(schema);
    }
    schema.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": seo.article ? "Article" : "WebPage",
      name: seo.title,
      url: seo.canonical,
      description: seo.description,
    });
  }, [
    location.pathname,
    seo.title,
    seo.description,
    seo.canonical,
    seo.robots,
    seo.article,
  ]);
  return null;
}
