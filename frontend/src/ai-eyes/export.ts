import { drawEyesCover } from "./cover";
import QRCode from "qrcode";
import { zipSync } from "fflate";
import {
  type EyesPersona,
  type EyesBlock,
  selectionSchema,
} from "@shared/ai-eyes";
import "@fontsource/noto-sans-sc/400.css";
import "@fontsource/noto-sans-sc/700.css";
export type Piece = { text: string; bold: boolean };
export type Line = {
  pieces: Piece[];
  blockId: string;
  start: number;
  end: number;
  size: number;
  height: number;
};
const WIDTH = 1080,
  PAD = 72,
  INNER = WIDTH - PAD * 2;
function font(size: number, bold = false) {
  return `${bold ? 700 : 400} ${size}px "Noto Sans SC"`;
}
export function linesFor(
  ctx: CanvasRenderingContext2D,
  blocks: EyesBlock[],
): Line[] {
  const all: Line[] = [];
  for (const block of blocks) {
    const size = block.kind === "h2" ? 64 : block.kind === "h3" ? 48 : 40;
    let pieces: Piece[] = [],
      width = 0,
      start = 0,
      offset = 0;
    const push = () => {
      all.push({
        pieces,
        blockId: block.id,
        start,
        end: offset,
        size,
        height: Math.ceil(size * 1.6),
      });
      pieces = [];
      width = 0;
      start = offset;
    };
    for (const run of block.runs)
      for (const char of Array.from(run.text)) {
        if (char === "\n") {
          offset += char.length;
          push();
          continue;
        }
        ctx.font = font(size, run.bold || block.kind !== "p");
        const w = ctx.measureText(char).width;
        if (width + w > INNER && pieces.length) push();
        const bold = run.bold || block.kind !== "p";
        if (pieces.at(-1)?.bold === bold)
          pieces[pieces.length - 1].text += char;
        else pieces.push({ text: char, bold });
        width += w;
        offset += char.length;
      }
    if (pieces.length) push();
    if (all.length) all[all.length - 1].height += 22;
  }
  return all;
}
export function paginate(lines: Line[], height = 1040) {
  const pages: Line[][] = [[]];
  let used = 0;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    const reserve = l.size === 48 && lines[i + 1] ? lines[i + 1].height : 0;
    if (used + l.height + reserve > height && pages.at(-1)!.length) {
      pages.push([]);
      used = 0;
    }
    pages.at(-1)!.push(l);
    used += l.height;
  }
  return pages;
}
function canvas(h = 1440) {
  const c = document.createElement("canvas");
  c.width = WIDTH;
  c.height = h;
  const ctx = c.getContext("2d");
  if (!ctx) throw Error("浏览器不支持图片导出");
  return { c, ctx };
}
function paintLines(ctx: CanvasRenderingContext2D, lines: Line[], y: number) {
  ctx.textBaseline = "top";
  for (const l of lines) {
    let x = PAD;
    for (const p of l.pieces) {
      ctx.font = font(l.size, p.bold);
      ctx.fillStyle = l.size === 48 ? "#803b72" : "#26212d";
      ctx.fillText(p.text, x, y);
      x += ctx.measureText(p.text).width;
    }
    y += l.height;
  }
  return y;
}
async function image(src: string) {
  const img = new Image();
  img.src = src;
  await img.decode();
  return img;
}
async function png(c: HTMLCanvasElement) {
  const blob = await new Promise<Blob>((resolve, reject) =>
    c.toBlob(
      (b) => (b ? resolve(b) : reject(Error("导出失败，请使用多页模式"))),
      "image/png",
    ),
  );
  c.width = c.height = 1;
  return blob;
}
const qr = async (url: string) =>
  image(
    await QRCode.toDataURL(url, {
      width: 170,
      margin: 4,
      errorCorrectionLevel: "M",
    }),
  );
export async function exportEyes(
  p: EyesPersona,
  nickname: string,
  url: string,
  format: "cover" | "pages" | "long",
  progress: (s: string) => void,
): Promise<Blob[]> {
  selectionSchema.parse({ personaId: p.id, nickname });
  progress("正在加载字体与插画");
  const text =
    p.blocks.flatMap((b) => b.runs.map((r) => r.text)).join("") +
    nickname +
    "Ai门道看懂 AI，用出门道微信小程序访问网页趣味画像文案演绎非心理测试AI眼里的你使用人格";
  await Promise.all([
    document.fonts.load(font(40), text),
    document.fonts.load(font(48, true), text),
  ]);
  await document.fonts.ready;
  if (format === "cover") {
    const blob = await drawEyesCover(p, nickname);
    progress("封面已生成");
    return [blob];
  }
  const code = await qr(url);
  const m = canvas();
  const lines = linesFor(m.ctx, p.blocks);
  m.c.width = 1;
  const footer = (ctx: CanvasRenderingContext2D, h: number, label: string) => {
    ctx.font = font(23);
    ctx.fillStyle = "#6b5670";
    ctx.fillText("AI 门道 · AI 眼里的你 · " + label, PAD, h - 170);
    ctx.fillText("趣味画像 · 文案演绎，非心理测试", PAD, h - 125);
    ctx.drawImage(code, WIDTH - PAD - 170, h - 242, 170, 170);
  };
  const groups = format === "pages" ? paginate(lines) : [lines];
  const longHeight = lines.reduce((s, l) => s + l.height, 0) + 340;
  if (format === "long" && longHeight > 8192)
    throw Error("全文超出当前长图安全尺寸，请选择完整多页卡；不会裁剪正文。");
  const result: Blob[] = [];
  for (let i = 0; i < groups.length; i++) {
    progress(`正在生成 ${i + 1}/${groups.length} 页`);
    const h = format === "long" ? longHeight : 1440;
    const { c, ctx } = canvas(h);
    ctx.fillStyle = "#fff9ee";
    ctx.fillRect(0, 0, WIDTH, h);
    ctx.textBaseline = "top";
    ctx.font = font(24);
    ctx.fillStyle = "#8e49a3";
    ctx.fillText(
      `${nickname} · ${p.name} · ${i + 1}/${groups.length}`,
      PAD,
      36,
    );
    paintLines(ctx, groups[i], 100);
    footer(
      ctx,
      h,
      format === "long" ? "完整长图" : `完整报告 ${i + 1}/${groups.length}`,
    );
    result.push(await png(c));
    await new Promise((r) => setTimeout(r, 0));
  }
  progress(`完整生成 ${result.length} 张`);
  return result;
}
export function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
export async function saveZip(blobs: Blob[], name: string) {
  const files: Record<string, Uint8Array> = {};
  for (let i = 0; i < blobs.length; i++)
    files[`${name}-${i + 1}.png`] = new Uint8Array(
      await blobs[i].arrayBuffer(),
    );
  saveBlob(
    new Blob([zipSync(files, { level: 0 }) as Uint8Array<ArrayBuffer>]),
    `${name}-完整报告.zip`,
  );
}
