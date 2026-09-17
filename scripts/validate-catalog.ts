import { catalog } from "../backend/src/content/catalog";
import fs from "node:fs";
import crypto from "node:crypto";
const ids = new Set<string>();
for (const m of catalog.models) {
  if (ids.has(m.id)) throw Error("Duplicate " + m.id);
  ids.add(m.id);
  if (
    m.price &&
    [m.price.input, m.price.output].some(
      (x) => x !== null && (!Number.isFinite(Number(x)) || Number(x) < 0),
    )
  )
    throw Error("Invalid price");
  if (!m.source.startsWith("https://")) throw Error("Invalid source");
}
const assets = JSON.parse(fs.readFileSync("data/tokenizers.json", "utf8"));
for (const a of assets) {
  const h = crypto
    .createHash("sha256")
    .update(fs.readFileSync("frontend/public/tokenizers/" + a.file))
    .digest("hex");
  if (h !== a.sha256) throw Error("Invalid tokenizer hash");
}
console.log(
  `PASS: ${ids.size} models / ${new Set(catalog.models.map((m) => m.provider)).size} providers, two tokenizer assets. Full manufacturer audit remains separately tracked in data/coverage.json.`,
);
