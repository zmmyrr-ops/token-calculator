# AI眼里的你 · 第二版单张样稿

状态：全套16型已完成；发布版本914255a，CI 35332798498通过，测试环境验收通过。下文保留样稿迭代记录。

## 样稿

`one-line-ceo-v2.png`：1080 × 1440。奶油白、暖金、薄荷绿；原稿段落组成半透明弹幕背景，原人物位于文字前层。展示完整原稿金句但不写“分享金句”标签，不显示编号。品牌按用户指定为 Ai门道，slogan 为“看懂 AI，用出门道”。底部并排放微信小程序码与网站码，直接使用用户文件。

二维码原文件复制到 `frontend/public/ai-eyes-brand/wechat-mini.png` 与 `website.png`，未重新绘制二维码，仍需用户实机扫码确认。

## 同步完成的本地页面改动

- 首页移除16型目录及总览，旧 `/ai-eyes/types` 导向入口。
- 自己的结果只展示匹配人格，移除其他类型选择和备选；保留昵称修改、原文阅读、分享与删除。
- 结果页仅提供一张封面的生成/保存，去掉长图、多页和ZIP入口及页码。
- AI人格页横幅缩小，另设有间距的独立引导区。
- 原有内容目录和匹配白名单保留，供执行端分类使用；后台和历史数据不删除。

第三版交付使用16套透明插画及艺术字，更新网页导出与社交封面，详见下方批量制作记录。

## 图像模型记录

方式：内置 image_gen，背景提取编辑；没有调用备用CLI或用户API密钥。现有人物输入为 `frontend/public/ai-eyes-art/one_line_ceo-v1.webp`，透明输出保存为 `frontend/public/ai-eyes-art/one_line_ceo-cutout-v2.png`。二维码与所有文字由既有 Canvas 网页模板绘制，模型不生成二维码。

完整提示词：

> Use case: background-extraction. Edit this provided AI personality illustration into a production transparent PNG cutout. Preserve the exact adult executive identity, purple faceted suit and pose, smartphone, desk with plant and cup, small robot carrying the giant stack of papers, and the full framing. Remove only the white background and white ground; keep clean antialiased edges and optionally a very faint translucent contact shadow. The background must be genuinely transparent alpha, not a white fill and not a checkerboard drawn into the pixels. All objects and the adult person must remain fully opaque (do not make the pale clothes, paper sheets or robot translucent). Do not add text, captions, logos, QR codes, colored background or new props. Output one square transparent PNG illustration only.

验证：新页面及人格页桌面/手机尺寸4项浏览器测试通过，类型检查与Lint通过。单张封面已目视检查，二维码以原文件复制接入，未作图像编辑。其余类型未批量制作/验收。

## 第三版：减轻品牌与艺术字

最新样稿 `one-line-ceo-v3.png`，第二版保留便于对比。取消顶部品牌露出，只在底部留小号品牌与slogan；二维码由184px缩为108px，移除大面积白色品牌底板。人物由650px扩大至748px，弹幕区域随之增加。

两行标题改用内置 image_gen 生成的透明手绘字资产 `frontend/public/ai-eyes-art/one_line_ceo-lettering-v3.png`，文字为“AI眼中的你”“一句话CEO”；不再由系统字体绘制。该样稿已获用户确认，现作为全套16型的排版基准。

艺术字完整提示词：

> Use case: logo-brand. Create a custom HAND-LETTERED Chinese typographic title asset for a stylish illustrated personality card. Transparent PNG with real alpha, landscape composition approximately 3:1. EXACTLY TWO lines of legible text, no other words: top smaller line "AI眼中的你"; bottom much larger line "一句话CEO". This must look individually drawn by a lettering artist, NOT typed in a system sans-serif font. Top line: jaunty thin brush-marker lettering, gently rising baseline, airy spacing, muted jade green. Main line: expressive chunky angular hand-painted display lettering, slightly slanted, attractive varied strokes and compact rhythm, dark forest green with a subtle warm honey-yellow offset shadow and cream inner highlights. Keep every Chinese character and the Latin CEO perfectly readable and spelled correctly; no punctuation, numerals, badges, illustration, QR code, brand logo or extra text. Minimal tiny hand-drawn accent strokes are okay. Confident sophisticated playful editorial design, clean edges, no distressed grime or splatters. Align both lines toward the left; tight but comfortable composition and modest transparent margins. The main words must dominate; background fully transparent, not a white rectangle and not a rendered checkerboard.

## 第三版批量制作（2026-09-18）

使用内置 image_gen，每个人格分别生成透明人物图及艺术字；CEO沿用已批准样稿。原稿文本和二维码不经图像模型改写。素材放在 `frontend/public/ai-eyes-art/`：`*-cutout-v2.png`、`*-lettering-v3.png`；最终网页模板导出的社交封面为 `*-cover-v3.png`。生成源路径见同目录 JSON 记录。

人物批量提示词（每次附对应原始 `<id>-v1.webp`）：

> Use case: background-extraction. Edit the provided faceted AI personality illustration into a production transparent PNG cutout. Preserve exact adult character identity, clothes, pose, all props, robot, full square framing and original colors. Remove only white background and ground. Clean antialiased edges, optional very faint translucent contact shadow. Real transparent alpha, no white fill or painted checkerboard. All objects/person remain fully opaque including pale papers and robot. No new text, logos, QR codes or props. One square transparent PNG only.

艺术字批量提示词（NAME 为原型名称去掉排版空格；COLOR 为对应配色）：

> Use case: logo-brand. Custom HAND-LETTERED Chinese title asset for illustrated personality card. Genuine transparent PNG alpha. Landscape 3:1 composition with modest margins. EXACTLY TWO lines: top smaller "AI眼中的你"; bottom much larger "NAME". Individually artist-drawn NOT system font. Top jaunty thin brush-marker airy jade lettering. Main expressive chunky angular hand-painted display letters, slight slant, varied strokes, compact rhythm, COLOR, cream inner highlights. Perfectly readable exact Chinese and Latin. Main title all on ONE line even if long, entire title must fit, no cropped characters. Left aligned. Confident sophisticated playful editorial design, clean edges, no grime. No illustration, logo, QR, numerals, other text. Fully transparent background not white or checkerboard.

从第2型起 COLOR 循环为：dark navy blue with sky blue shadow；dark burgundy with coral shadow；dark forest green with mint shadow；deep plum with lavender shadow；dark raspberry with blush shadow；dark forest green with honey yellow shadow。

页面与导出使用共同模板。艺术字按固定区域等比缩放；昵称与关键词分行；金句根据实际行数缩小字号，底部预留品牌及双码区域。分享快照记录 `illustrated-3`，原稿目录版本保持不变，历史正文与数据保留。新的社交封面路径带 `v3` 以更新缓存。

## 第四版：单网页二维码与扫码引导

全部16张封面移除小程序码，只保留用户提供的网页码。新增36px加粗单行引导“快来测一测，AI眼中的你是怎样的？”，配曲线箭头指向网页二维码。品牌与slogan合并为18px单行“Ai门道 · 看懂 AI，用出门道”，弱化品牌区。人物、艺术字、原始人格文案保持不变。生成文件改为 `*-cover-v4.png`，分享布局标记为 `illustrated-4`。
