import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { appPath, basePath, storageKey, isStaging } from "./base";
import { analyticsPage, type AnalyticsEvent } from "@shared/analytics";
export function analyticsEnabled() {
  if (navigator.doNotTrack === "1") return false;
  try {
    return localStorage.getItem(storageKey("analytics-disabled")) !== "1";
  } catch {
    return false;
  }
}
function pathWithoutBase(path: string) {
  const base = basePath.replace(/\/$/, "");
  return base && path.startsWith(base + "/") ? path.slice(base.length) : path;
}
export function track(
  name: AnalyticsEvent["name"],
  target: AnalyticsEvent["target"] = "none",
) {
  const path = pathWithoutBase(location.pathname);
  if (path.startsWith("/admin") || !analyticsEnabled()) return;
  try {
    void fetch(appPath("/api/v1/events"), {
      method: "POST",
      keepalive: true,
      credentials: isStaging ? "same-origin" : "omit",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: crypto.randomUUID(),
        name,
        page: analyticsPage(path),
        target,
      }),
    }).catch(() => {});
  } catch {
    /* Analytics must never interrupt the site. */
  }
}
export default function Analytics() {
  const { pathname, search } = useLocation();
  useEffect(() => {
    track("page_view");
  }, [pathname, search]);
  useEffect(() => {
    const click = (e: MouseEvent) => {
      const element = e.target instanceof Element ? e.target : null;
      const link = element?.closest("a");
      if (!link || link.hasAttribute("download")) return;
      const url = new URL(link.href, location.href);
      if (!["https:", "http:"].includes(url.protocol)) return;
      if (url.origin !== location.origin) {
        track("outbound_click", "external");
        return;
      }
      const path = pathWithoutBase(url.pathname);
      if (path.startsWith("/admin") || path.startsWith("/api/")) return;
      track(
        link.closest("header") ? "navigation_click" : "content_click",
        analyticsPage(path),
      );
    };
    const submit = () => {
      if (
        ["/", "/search", "/models", "/tools", "/learn", "/news"].includes(
          pathWithoutBase(location.pathname),
        )
      )
        track("search_submit");
    };
    document.addEventListener("click", click, true);
    document.addEventListener("submit", submit, true);
    return () => {
      document.removeEventListener("click", click, true);
      document.removeEventListener("submit", submit, true);
    };
  }, []);
  return null;
}
export function AnalyticsPreference() {
  const [enabled, setEnabled] = useState(analyticsEnabled);
  return (
    <div className="panel" style={{ padding: 20 }}>
      <label>
        <input
          type="checkbox"
          checked={enabled}
          disabled={navigator.doNotTrack === "1"}
          onChange={(e) => {
            try {
              localStorage.setItem(
                storageKey("analytics-disabled"),
                e.target.checked ? "0" : "1",
              );
              setEnabled(e.target.checked);
            } catch {
              setEnabled(false);
            }
          }}
        />{" "}
        允许匿名访问与功能使用统计
      </label>
      <p>
        可以随时关闭，关闭后不再上报。浏览器开启“请勿跟踪”时自动停用。设置仅保存在当前浏览器。
      </p>
    </div>
  );
}
