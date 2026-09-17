import { it, expect } from "vitest";
import { Tiktoken } from "js-tiktoken/lite";
import fs from "node:fs";
import manifest from "../../data/tokenizers.json";
import fixtures from "../fixtures/tokenizers.json";
for (const asset of manifest) {
  const enc = new Tiktoken(
    JSON.parse(fs.readFileSync("frontend/public/tokenizers/" + asset.file, "utf8")),
  );
  for (const row of fixtures.cases.filter((x) => x.encoding === asset.name)) {
    it(`${asset.name}: ${JSON.stringify(row.text)} matches independent Python tiktoken`, () =>
      expect(enc.encode(row.text, [], []).length).toBe(row.count));
  }
}
