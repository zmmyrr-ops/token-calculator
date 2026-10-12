import { readFileSync } from "node:fs";
import { assetRequest } from "./public-assets";
import manifest from "./content/public-assets.json";
const config = JSON.parse(readFileSync(process.env.OSS_PUBLIC_ASSETS_CONFIG || "/app/storage/oss-public-assets.json", "utf8"));
const assets = Object.values(manifest);
for (let i = 0; i < assets.length; i += 4) {
  await Promise.all(assets.slice(i, i + 4).map(async (asset) => {
    const signed = assetRequest(config, asset.key, "HEAD", new Date().toUTCString());
    const response = await fetch(signed.url, {method:"HEAD",headers:signed.headers,redirect:"error",signal:AbortSignal.timeout(15000)});
    if (!response.ok || Number(response.headers.get("content-length")) !== asset.size || response.headers.get("x-oss-meta-sha256") !== asset.sha256)
      throw new Error("Public asset verification failed: " + asset.key);
  }));
}
console.log(`Verified ${assets.length} OSS assets before deployment`);
