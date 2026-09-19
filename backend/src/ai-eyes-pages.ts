import { Router } from "express";
import { readFileSync } from "node:fs";
import path from "node:path";
import type { ContentDatabase } from "./database";
import { eyesCatalog } from "../../shared/ai-eyes";
const escape = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
export function eyesPages(store: ContentDatabase) {
  const r = Router();
  r.use((req, res, next) => {
    const route = req.path.replace(/^\/staging/, "");
    if (!/^\/ai-eyes(?:\/|$)/.test(route) || route.replace(/\/+$/, "") === "/ai-eyes") return next();
    const staging = process.env.APP_ENV === "staging";
    const shell = readFileSync(
      process.env.FRONTEND_SHELL ||
        path.resolve(
          import.meta.dirname,
          staging
            ? "../../frontend/dist-staging/index.html"
            : "../../frontend/dist/index.html",
        ),
      "utf8",
    );
    let title = "AI 眼里的你 · 16 种 AI 使用人格",
      body = "",
      image = "",
      status = 200;
    const id = route.match(/^\/ai-eyes\/s\/([A-Za-z0-9_-]+)$/)?.[1];
    if (id) {
      const row = store.db
        .prepare("SELECT snapshot FROM ai_eyes_shares WHERE id=? AND expires>?")
        .get(id, Date.now());
      if (!row) {
        title = "分享已撤销或到期";
        status = 404;
        body = "<h1>分享已撤销或到期</h1>";
      } else {
        const data = JSON.parse(String(row.snapshot));
        const p = eyesCatalog.items.find((p) => p.id === data.personaId)!;
        title = `${data.nickname}的 AI 使用人格：${p.name}`;
        image = `https://ruming.top/ai-eyes-art/${p.id}-cover-v4.png`;
        body =
          `<main><h1>${escape(title)}</h1><p>趣味画像 · 文案演绎，非心理测试</p>` +
          p.blocks
            .map((b) => {
              const tag = b.kind === "p" ? "p" : b.kind;
              return (
                `<${tag}>` +
                b.runs
                  .map((x) =>
                    x.bold
                      ? `<strong>${escape(x.text)}</strong>`
                      : escape(x.text),
                  )
                  .join("") +
                `</${tag}>`
              );
            })
            .join("") +
          "</main>";
      }
    }
    const html = shell
      .replace(
        /<meta\s+[^>]*(?:name="(?:robots|referrer|description)"|property="og:[^"]+")[^>]*>/g,
        "",
      )
      .replace(
        /<title>[\s\S]*?<\/title>/,
        `<title>${escape(title)} - AI 门道</title>`,
      )
      .replace(
        "</head>",
        `<meta name="robots" content="noindex,nofollow"><meta name="referrer" content="no-referrer"><meta property="og:title" content="${escape(title)}"><meta property="og:description" content="趣味画像 · 文案演绎，非心理测试">${image ? `<meta property="og:image" content="${escape(image)}">` : ""}</head>`,
      )
      .replace('<div id="root"></div>', `<div id="root">${body}</div>`);
    res
      .status(status)
      .set({
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Robots-Tag": "noindex,nofollow",
        "Referrer-Policy": "no-referrer",
      })
      .send(html);
  });
  return r;
}
