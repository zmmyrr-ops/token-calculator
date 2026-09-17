import { appPath } from "@/base";
import { Tiktoken } from "js-tiktoken/lite";
import manifest from "../../../data/tokenizers.json";
import type { Encoding } from "@shared/types";
const encoders = new Map<string, Tiktoken>();
self.onmessage = async (
  e: MessageEvent<{ id: number; text: string; encoding: Encoding }>,
) => {
  const { id, text, encoding } = e.data;
  try {
    if (new TextEncoder().encode(text).length > 1048576)
      throw Error("文本超过 1 MiB");
    let enc = encoders.get(encoding);
    if (!enc) {
      const asset = manifest.find((x) => x.name === encoding);
      if (!asset) throw Error("编码不存在");
      const response = await fetch(appPath(`/tokenizers/${asset.file}`));
      if (!response.ok) throw Error("词表加载失败");
      const buffer = await response.arrayBuffer();
      const hash = Array.from(
        new Uint8Array(await crypto.subtle.digest("SHA-256", buffer)),
      )
        .map((x) => x.toString(16).padStart(2, "0"))
        .join("");
      if (hash !== asset.sha256) throw Error("词表校验失败");
      enc = new Tiktoken(JSON.parse(new TextDecoder().decode(buffer)));
      encoders.set(encoding, enc);
    }
    const count = enc.encode(text, [], []).length;
    self.postMessage({
      id,
      count,
      encoding,
      bytes: new TextEncoder().encode(text).length,
    });
  } catch (error) {
    self.postMessage({
      id,
      error: error instanceof Error ? error.message : "计数失败",
    });
  }
};
