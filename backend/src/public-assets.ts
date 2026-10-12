import { createHmac } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { Readable } from "node:stream";
import type { ReadableStream } from "node:stream/web";
import { pipeline } from "node:stream/promises";
import { Router } from "express";
import { z } from "zod";
import manifest from "./content/public-assets.json";

const configSchema = z.object({
  bucket: z.string().regex(/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/),
  region: z.string().regex(/^oss-[a-z0-9-]+$/),
  internal: z.boolean().default(true),
  accessKeyId: z.string().min(1),
  accessKeySecret: z.string().min(1),
});
type Config = z.infer<typeof configSchema>;
export function assetRequest(config: Config, key: string, method: string, date: string) {
  if (!/^mendao\/public\/[a-f0-9]{64}\/[a-zA-Z0-9_./-]+$/.test(key) || key.includes(".."))
    throw new Error("Invalid asset key");
  const resource = `/${config.bucket}/${key}`;
  const signature = createHmac("sha1", config.accessKeySecret)
    .update(`${method}\n\n\n${date}\n${resource}`).digest("base64");
  return {
    url: `https://${config.bucket}.${config.region}${config.internal ? "-internal" : ""}.aliyuncs.com/${key}`,
    headers: { Date: date, Authorization: `OSS ${config.accessKeyId}:${signature}` },
  };
}
// Only the build-time manifest is public. Bucket listings, arbitrary keys and
// other applications' private objects can never be requested through this route.
export function publicAssetsRouter(
  configPath = process.env.OSS_PUBLIC_ASSETS_CONFIG || "/app/storage/oss-public-assets.json",
  request: typeof fetch = fetch,
) {
  const router = Router();
  const config = existsSync(configPath) ? configSchema.parse(JSON.parse(readFileSync(configPath, "utf8"))) : null;
  router.use(async (req, res, next) => {
    const pathname = req.path.replace(/^\/staging(?=\/)/, "");
    if (!/^\/(ai-eyes-art|persona-avatars|guide-images|platform-icons)\//.test(pathname)) return next();
    if (req.method !== "GET" && req.method !== "HEAD") return res.sendStatus(405);
    const asset = Object.hasOwn(manifest, pathname) ? manifest[pathname as keyof typeof manifest] : null;
    if (!asset) return res.sendStatus(404);
    if (!config) return res.status(503).set("Cache-Control", "no-store").end();
    const etag = `"${asset.sha256}"`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30000);
    const abort = () => controller.abort();
    res.on("close", abort);
    try {
      const signed = assetRequest(config, asset.key, req.method, new Date().toUTCString());
      const upstream = await request(signed.url, {
        method: req.method, headers: signed.headers, signal: controller.signal, redirect: "error",
      });
      if (!upstream.ok || Number(upstream.headers.get("content-length")) !== asset.size ||
        upstream.headers.get("x-oss-meta-sha256") !== asset.sha256) {
        await upstream.body?.cancel();
        return res.status(502).set("Cache-Control", "no-store").end();
      }
      res.set({ "Content-Type": asset.type, "ETag": etag, "Cache-Control": "public, max-age=3600", "X-Content-Type-Options": "nosniff" });
      if (req.headers["if-none-match"] === etag) {
        await upstream.body?.cancel();
        return res.status(304).end();
      }
      res.set("Content-Length", String(asset.size));
      if (req.method === "HEAD") return res.end();
      if (!upstream.body) throw new Error("Missing asset body");
      await pipeline(Readable.fromWeb(upstream.body as ReadableStream), res);
    } catch {
      if (!res.headersSent) res.status(502).set("Cache-Control", "no-store").end();
      else res.destroy();
    } finally {
      clearTimeout(timer);
      res.off("close", abort);
    }
  });
  return router;
}
