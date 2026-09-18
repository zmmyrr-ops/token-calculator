import type { EyesPersona } from "@shared/ai-eyes";
import { appPath } from "../base";

// Card text comes from the locked original; supplied QR images remain unchanged.
const palettes = [
  ["#ffce65", "#fff6df", "#293d33", "#247665"],
  ["#90d4ef", "#edf8ff", "#173d55", "#286b9b"],
  ["#ffa995", "#fff0e9", "#632b35", "#b04e56"],
  ["#a5dfb7", "#f1fae8", "#244b34", "#45824d"],
  ["#cfb7ed", "#f5efff", "#443253", "#78589e"],
  ["#f3b6d7", "#fff1f8", "#58263f", "#a34b79"],
];
const font = (size: number, bold = false) =>
  `${bold ? 700 : 400} ${size}px "Noto Sans SC"`;
async function load(src: string) {
  const i = new Image();
  i.src = src;
  await i.decode();
  return i;
}
function rounded(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  color: string,
) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
}
function wrap(ctx: CanvasRenderingContext2D, text: string, width: number) {
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    let line = "";
    for (const c of Array.from(paragraph)) {
      if (line && ctx.measureText(line + c).width > width) {
        lines.push(line);
        line = "";
      }
      line += c;
    }
    if (line) lines.push(line);
  }
  return lines;
}
export async function drawEyesCover(
  p: EyesPersona,
  nickname: string,
): Promise<Blob> {
  const [art, mini, web, lettering] = await Promise.all([
    load(appPath(`/ai-eyes-art/${p.id}-cutout-v2.png`)),
    load(appPath("/ai-eyes-brand/wechat-mini.png")),
    load(appPath("/ai-eyes-brand/website.png")),
    load(appPath(`/ai-eyes-art/${p.id}-lettering-v3.png`)),
  ]);
  const [accent, paper, ink, secondary] =
    palettes[(Number(p.number) - 1) % palettes.length];
  const c = document.createElement("canvas");
  c.width = 1080;
  c.height = 1440;
  const ctx = c.getContext("2d")!;
  const gradient = ctx.createLinearGradient(0, 0, 1080, 1440);
  gradient.addColorStop(0, paper);
  gradient.addColorStop(0.62, "#fffaf0");
  gradient.addColorStop(1, accent);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1080, 1440);
  ctx.textBaseline = "top";
  const titleScale = Math.min(944 / lettering.width, 315 / lettering.height);
  ctx.drawImage(
    lettering,
    68,
    48,
    lettering.width * titleScale,
    lettering.height * titleScale,
  );
  ctx.font = font(20);
  ctx.fillStyle = secondary;
  ctx.textAlign = "right";
  ctx.fillText(`${nickname}的 AI 使用人格`, 1008, 350);
  ctx.textAlign = "left";
  ctx.font = font(27, true);
  const keyword = p.keyword.replace(/^人格关键词[：:]/, "").trim();
  rounded(
    ctx,
    72,
    371,
    Math.min(936, ctx.measureText(keyword).width + 48),
    46,
    23,
    accent,
  );
  ctx.fillStyle = ink;
  ctx.fillText(keyword, 96, 380);
  // Original paragraphs flow behind the character like a translucent comment stream.
  const paragraphs = p.blocks
    .filter((b) => b.kind === "p")
    .map((b) => b.runs.map((r) => r.text).join(""))
    .filter((t) => t !== p.keyword && t !== p.quote);
  ctx.save();
  ctx.beginPath();
  ctx.rect(40, 438, 1000, 650);
  ctx.clip();
  const lanes = 11;
  for (let lane = 0; lane < lanes; lane++) {
    ctx.save();
    ctx.translate(lane % 2 ? -115 : 55, 449 + lane * 58);
    ctx.rotate(-0.045);
    ctx.font = font(lane % 3 === 0 ? 29 : 25, lane % 3 === 0);
    let x = 0;
    for (let j = lane; j < paragraphs.length; j += lanes) {
      const t = paragraphs[j].replaceAll("\n", " ");
      const w = ctx.measureText(t).width;
      ctx.globalAlpha = 0.62;
      rounded(ctx, x, -8, w + 38, 48, 24, "#ffffff");
      ctx.globalAlpha = lane % 3 === 0 ? 0.32 : 0.2;
      ctx.fillStyle = secondary;
      ctx.fillText(t, x + 19, 2);
      x += w + 65;
    }
    ctx.restore();
  }
  ctx.restore();
  ctx.drawImage(art, 166, 416, 748, 748);
  let quoteSize = 40;
  ctx.font = font(quoteSize, true);
  let quoteLines = wrap(ctx, p.quote, 900);
  while (quoteLines.length * (quoteSize + 12) > 126 && quoteSize > 24) {
    quoteSize -= 2;
    ctx.font = font(quoteSize, true);
    quoteLines = wrap(ctx, p.quote, 900);
  }
  ctx.fillStyle = ink;
  quoteLines.forEach((line, i) =>
    ctx.fillText(line, 90, 1138 + i * (quoteSize + 12)),
  );
  ctx.save();
  ctx.globalAlpha = 0.22;
  rounded(ctx, 72, 1272, 936, 1, 0, secondary);
  ctx.restore();
  ctx.font = font(24, true);
  ctx.fillStyle = secondary;
  ctx.fillText("Ai门道", 78, 1310);
  ctx.font = font(20);
  ctx.fillText("看懂 AI，用出门道", 78, 1350);
  ctx.font = font(16);
  ctx.fillStyle = "#7e8070";
  ctx.fillText("趣味画像 · 文案演绎，非心理测试", 78, 1390);
  rounded(ctx, 736, 1288, 116, 116, 10, "#ffffff");
  rounded(ctx, 884, 1288, 116, 116, 10, "#ffffff");
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(mini, 740, 1292, 108, 108);
  ctx.drawImage(web, 888, 1292, 108, 108);
  ctx.font = font(16);
  ctx.fillStyle = "#637363";
  ctx.textAlign = "center";
  ctx.fillText("微信小程序", 794, 1410);
  ctx.fillText("访问网页", 942, 1410);
  const blob = await new Promise<Blob>((resolve, reject) =>
    c.toBlob(
      (b) => (b ? resolve(b) : reject(Error("封面生成失败，请重试"))),
      "image/png",
    ),
  );
  c.width = c.height = 1;
  return blob;
}
