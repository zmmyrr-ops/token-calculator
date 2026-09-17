import fs from "node:fs";
import crypto from "node:crypto";
const manifest = [];
for (const name of ["cl100k_base", "o200k_base"]) {
  const from = `node_modules/js-tiktoken/dist/ranks/${name}.js`;
  const mod = await import(`../${from}`);
  const data = JSON.stringify(mod.default);
  const hash = crypto.createHash("sha256").update(data).digest("hex");
  const file = `${name}-${hash.slice(0, 12)}.json`;
  fs.writeFileSync(`frontend/public/tokenizers/${file}`, data);
  manifest.push({
    name,
    file,
    sha256: hash,
    library: "js-tiktoken@1.0.21",
    license: "MIT",
    source: "https://github.com/dqbd/tiktoken",
  });
}
fs.writeFileSync("data/tokenizers.json", JSON.stringify(manifest, null, 2));
console.log(
  "Saved local tokenizer assets",
  manifest.map((x) => x.name),
);
