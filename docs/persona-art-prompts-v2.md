# AI 人格 V2 二次元头像

2026-09-21，使用内置 Image 模型生成；未使用 CLI/API 回退。每个角色单独生成一张原创成年角色插画。只做尺寸和 WebP 编码优化，没有改变原图内容。

线上文件：`frontend/public/persona-avatars/{sugar,roast,queen,tsundere,drama}-v2-anime.webp`（640×640，五张共约 330 KiB）。

原始 PNG：`exports/personas-v2-originals/`，本机保留，未打入前端包。

## 每次调用的共同提示词

Use case: stylized-concept. Asset: square avatar for AI personality website, one original adult anime character, premium Japanese anime key visual, crisp expressive linework, polished cel shading with soft highlights, face and shoulders centered, complete hair silhouette with breathing room, close portrait readable at 64px, simple colored background with subtle graphic shape, no words, no watermark, not chibi, not photorealistic. 

## 角色追加提示词（与共同提示词拼接）

- sugar-v2: Character: 糖糖 sweet affectionate adult woman in her twenties, warm lively open smile and sparkling peach-pink eyes, chestnut shoulder-length wavy hair with small pink ribbon, cream cardigan and peach blouse, head slightly tilted, sweet and playful not childish. Peach pink and warm cream palette. No hands in frame.
- roast-v2: Character: 嘴替 sarcastic witty adult man in his late twenties, sharp amber eyes, one eyebrow raised, confident lopsided smirk as if about to roast a close friend, tousled ink-black short hair with subtle amber streak, dark charcoal jacket over burnt orange shirt, original anime design. Warm orange and charcoal palette. No hands in frame.
- queen-v2: Character: 绯姐 confident sophisticated adult woman around thirty, composed knowing smile, direct narrow ruby eyes, sleek long black hair tucked behind one ear, small gold earrings, burgundy tailored blazer and black high-neck top. Self-possessed commanding presence, not aggressive. Burgundy wine red and gold palette. No hands in frame.
- tsundere-v2: Character: 阿凛 aloof but caring adult woman in her mid-twenties, silver blue medium-length hair with side braid, icy blue eyes glancing sideways, subtly blushing cheeks, slightly pursed lips trying to hide a smile, navy high-neck sweater and slate jacket. Cool confident adult face, not childlike. Dusty blue and silver palette. No hands in frame.
- drama-v2: Character: 开演 theatrical charismatic adult man in his late twenties, swept teal hair, expressive golden eyes, delighted flamboyant grin, one eyebrow arched, teal tailored stage jacket with small gold lapel pin and cream shirt, spotlight glow as simple background motif. Peacock teal and gold palette. No hands in frame.
