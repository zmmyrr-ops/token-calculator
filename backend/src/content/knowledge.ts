import { practices } from "./practices";
import type { Practice } from "../../../shared/practice";
export type KnowledgeEntry = {
  slug: string;
  title: string;
  category: string;
  summary: string;
  keywords: string;
  practice?: Practice;
  sections: { title: string; body: string }[];
  sources?: { title: string; url: string }[];
};
export const knowledge: KnowledgeEntry[] = [
  {
    slug: "tokens",
    title: "Token 是什么？为什么不等于字数？",
    category: "基础知识",
    summary: "从分词编码到输入、输出与推理用量，读懂数字背后的含义。",
    keywords: "token 词元 分词 费用 上下文",
    sections: [
      {
        title: "模型处理的是词元序列",
        body: "分词编码把文本转换为一组词元。一个词元可能对应一个字、词的一部分、空格或标点。不同编码对同一段文字的计数可能不同，因此字符数不能直接当作 token 数。",
      },
      {
        title: "编码计数与模型计费有区别",
        body: "本站可以在浏览器内对固定编码计算 token。只有确认具体模型的分词映射和请求封装，才能进一步接近 API 输入用量。系统提示、多轮历史和工具结果也可能消耗上下文。",
      },
      {
        title: "未来输出只能先做预算",
        body: "输入文本已知，但模型将生成多少回答和推理内容尚未发生。计算器分别设置可见回答与推理预算，并将它们标记为情景假设，不是实际账单预测。",
      },
    ],
  },
  {
    slug: "models-and-platforms",
    title: "模型、平台和 API，有什么区别？",
    category: "入门指南",
    summary: "把能力、使用入口和收费渠道分开，选择时就不容易混淆。",
    keywords: "模型 平台 API 订阅 渠道 入门",
    sections: [
      {
        title: "模型提供能力",
        body: "模型是处理输入并生成输出的技术能力载体。比较时要确认具体版本、输入输出类型和适用任务。名称相近不意味着参数、能力和价格相同。",
      },
      {
        title: "平台提供使用入口",
        body: "平台将一种或多种模型包装成网页、应用或工作流。平台还可能提供编辑、文件管理、导出等额外能力，所以选择平台也要考虑操作体验和后续处理。",
      },
      {
        title: "渠道和套餐决定费用口径",
        body: "同一模型可能通过不同 API 渠道访问。API 按量费用与网页订阅月费是不同口径，不能用每百万 token 报价直接换算订阅额度。购买前核对具体套餐、模式和可用条件。",
      },
    ],
  },
  {
    slug: "reasoning-budget",
    title: "推理强度越高，就一定越合适吗？",
    category: "使用方法",
    summary: "先判断任务需要什么，再理解推理模式、预算与不确定性。",
    keywords: "推理 强度 模式 token 预算 选型",
    sections: [
      {
        title: "先看任务的通过条件",
        body: "改写一句话、抽取字段和解决多步骤问题有不同需求。先定义答案需要满足的条件，再选择支持相关能力的候选，而不是默认给每个任务使用最高强度。",
      },
      {
        title: "强度不是固定倍数",
        body: "推理模式取决于具体模型。不能把 high 简化成固定几倍 token，也不能把未知推理消耗当作零。本站只展示已经核验的模式，并保留预算不足或资料未知的状态。",
      },
      {
        title: "用实际结果验证选择",
        body: "保留任务、模型版本、参数、结果和实际 usage，在相同条件下比较质量与消耗。没有测试样本时，规则建议只能缩小候选范围，无法保证最优。",
      },
    ],
  },
  {
    slug: "video-budget",
    title: "30 秒视频，为什么会生成 90 秒素材？",
    category: "费用知识",
    summary: "成片、生成量、重试和套餐购买额，需要分别计算。",
    keywords: "视频 费用 成本 重试 预算",
    sections: [
      {
        title: "先按镜头规划",
        body: "假设成片有 6 个镜头，每镜头约 5 秒，每个尝试 3 次，总生成量是 6 × 5 × 3 = 90 秒。成片只取部分素材，因此成片时长与消耗量不同。",
      },
      {
        title: "按实际单位算费用",
        body: "不同服务可能按秒、次数、积分或套餐收费。按秒价格不能套用到按次服务；平台时长取整、分辨率和模式也可能影响费用。单价未知时只能列出已知部分。",
      },
      {
        title: "区分额度与现金支出",
        body: "使用已经购买的额度与新增购买套餐不是同一件事。预算应同时展示用量、新增付款、既有订阅分摊，以及配音、放大和人工剪辑等项目。",
      },
    ],
  },
  {
    slug: "game-prototype",
    title: "从想法到一个可玩的 2D 游戏原型",
    category: "游戏开发",
    summary: "设计说明 → 灰盒玩法 → 美术与声音 → 引擎检查。",
    keywords: "游戏 2D Godot Unity 编程 精灵图 原型",
    sections: [
      {
        title: "01 定义最小玩法",
        body: "先限定一个房间、角色移动、碰撞、收集物和重开逻辑。写出能否运行、能否完成目标等验收项，避免第一版同时加入大量系统。",
      },
      {
        title: "02 先做灰盒",
        body: "在选定引擎中用占位几何实现玩法。代码助手可以辅助解释和编写代码，但需要实际运行、测试输入和边界条件。先确认玩法，再投入最终美术。",
      },
      {
        title: "03 整理美术与声音",
        body: "建立风格参考与资产清单。Ludo 和 Scenario 可作为策划或素材阶段的候选；本文没有对其效果做同口径实测。检查精灵图尺寸、透明边缘、动画帧和音效来源。",
      },
      {
        title: "04 导入和验收",
        body: "设置切片、过滤、碰撞与动画速度，检查接缝和错位。交付可运行工程、运行包、资产清单与已知问题。教程是操作路线建议，不能代替具体项目测试。",
      },
    ],
    sources: [
      { title: "Ludo 官方文档", url: "https://ludo.ai/docs" },
      {
        title: "Scenario 官方介绍",
        url: "https://help.scenario.com/articles/3401611429-introduction-to-scenario",
      },
    ],
  },
  {
    slug: "image-to-3d",
    title: "把一张图片做成游戏里的 3D 道具",
    category: "3D 建模",
    summary: "生成网格 → 人工修整 → 贴图与导出 → 实际导入。",
    keywords: "3D 建模 Meshy Tripo Blender 道具 网格 UV",
    sections: [
      {
        title: "01 明确目标规格",
        body: "确认真实尺寸、目标引擎、面数预算、纹理和坐标单位。单张参考图遮挡的部分需要人工判断；先定义项目要求，再评估结果。",
      },
      {
        title: "02 生成网格候选",
        body: "Meshy 和 Tripo 是图转 3D 的候选平台。对同一参考图记录尝试次数，优先检查轮廓、结构和可修整性。这里的候选来自官方能力介绍，不是质量排名。",
      },
      {
        title: "03 在配套软件中修整",
        body: "在 Blender 等工具中检查破洞、非流形、法线、比例和隐藏面；按需要处理拓扑、UV 与材质。看起来漂亮的预览不等于可直接用于游戏。",
      },
      {
        title: "04 实际导入验收",
        body: "选择生成工具和引擎都支持的格式，检查贴图、尺寸、坐标与碰撞，在目标平台运行。交付网格、贴图、源文件和导入说明；具体授权条件另按使用的版本与套餐核验。",
      },
    ],
    sources: [
      { title: "Meshy 产品说明", url: "https://www.meshy.ai/pricing" },
      { title: "Tripo 开发者文档", url: "https://developers.tripo3d.ai/" },
      {
        title: "Blender 建模功能",
        url: "https://www.blender.org/features/modeling/",
      },
    ],
  },
  {
    slug: "video-workflow",
    title: "用已有图片制作一支 30 秒短片",
    category: "视频创作",
    summary: "脚本分镜 → 参考素材 → 逐镜生成 → 配音剪辑。",
    keywords: "视频 即梦 Runway 短片 分镜 配音 剪辑",
    sections: [
      {
        title: "01 写脚本与分镜",
        body: "明确受众、卖点和结尾动作。示例按 6 个约 5 秒镜头规划；实际生成长度应按所选服务支持的选项调整，再通过剪辑组织成片。",
      },
      {
        title: "02 准备一致的参考素材",
        body: "使用有权限的素材，明确主体、颜色和光照。重要的产品文字可在后期叠加，生成后逐帧检查外形与文字，不直接假设它们准确。",
      },
      {
        title: "03 先验证一个镜头",
        body: "即梦和 Runway 可以作为视频生成候选。先试关键镜头，记录版本、提示、参数、次数和消耗，检查主体形变与运动后再扩展其他镜头。具体套餐和可用性需要进一步核验。",
      },
      {
        title: "04 剪辑与交付检查",
        body: "统一画幅、帧率和节奏，加入有使用权限的声音与字幕。检查音画同步、黑帧、字幕安全区和手机播放效果。交付成片、工程、镜头清单与素材来源。",
      },
    ],
    sources: [
      {
        title: "即梦视频介绍",
        url: "https://jimeng.jianying.com/tools/ai-video-generator",
      },
      {
        title: "Runway 视频入门",
        url: "https://help.runwayml.com/hc/en-us/articles/37425232841875-Getting-Started-with-Generative-Video",
      },
    ],
  },
];

knowledge.push(
  {
    slug: "node-workflows",
    title: "怎样理解节点式 AI 图像工作流？",
    category: "图像工作流",
    summary: "将输入、模型和输出拆成节点，保存可复用的制作过程。",
    keywords: "图像 ComfyUI 节点 绘画 设计 工作流",
    sections: [
      {
        title: "先明确输入与输出",
        body: "确定需要什么图片、分辨率和风格，以及可使用的参考素材。节点式工作流让每个处理步骤的连接可见，便于检查数据从哪里来、怎样改变。",
      },
      {
        title: "检查模型与节点依赖",
        body: "打开他人的流程前，核对模型、插件与版本。工作流文件并不一定包含模型本身；缺失依赖或不同版本可能造成报错。自定义节点是程序代码，应确认其来源。",
      },
      {
        title: "小范围验证后再扩展",
        body: "先使用较小的输出验证连接和参数，保存有效配置。每次只改变一个关键条件，检查结果，再决定是否增加控制、放大或批处理步骤。",
      },
      {
        title: "保存能复用的信息",
        body: "除流程文件外，记录模型版本、必要依赖、输入说明和已知限制。需要分发时分别核对素材、模型与节点的许可条件。",
      },
    ],
    sources: [
      {
        title: "ComfyUI 官方代码与说明",
        url: "https://github.com/Comfy-Org/ComfyUI",
      },
    ],
  },
  {
    slug: "automation-basics",
    title: "把重复工作变成可检查的自动化流程",
    category: "办公自动化",
    summary: "从输入、规则和结果入手，处理失败、重复执行与人工审核。",
    keywords: "办公 自动化 n8n 工作流 Agent 数据",
    sections: [
      {
        title: "描述一个明确的任务",
        body: "先写清数据从哪里来、需要怎样转换、输出到哪里，以及什么结果算正确。优先选择重复、规则明确的操作，不要从同时处理所有工作开始。",
      },
      {
        title: "连接数据与服务",
        body: "n8n 等工具可用节点连接服务和处理数据。必要的账号凭证应只提供所需权限；含私人信息的内容在发送到外部服务前确认使用范围。",
      },
      {
        title: "让错误可发现、可恢复",
        body: "校验关键字段、记录执行状态，并处理超时、重试和重复事件。发送通知或修改外部资料等动作，应确认重试不会重复产生副作用。",
      },
      {
        title: "保留人工检查位置",
        body: "AI 生成的内容可能不满足要求。对外发布、重要数据修改等步骤可以在流程中设置人工审核，记录输入版本和处理结果，逐步改进规则。",
      },
    ],
    sources: [{ title: "n8n 官方文档", url: "https://docs.n8n.io/" }],
  },
);
const additionalSources: Record<string, { title: string; url: string }[]> = {
  tokens: [
    {
      title: "Hugging Face Tokenizers",
      url: "https://huggingface.co/docs/tokenizers/index",
    },
  ],
  "models-and-platforms": [
    { title: "OpenRouter 模型目录与渠道", url: "https://openrouter.ai/models" },
  ],
  "reasoning-budget": [{ title: "本站计算与推荐方法", url: "/how-it-works" }],
  "video-budget": [
    {
      title: "Runway 视频生成入门",
      url: "https://help.runwayml.com/hc/en-us/articles/37425232841875-Getting-Started-with-Generative-Video",
    },
  ],
};
for (const entry of knowledge)
  if (!entry.sources) entry.sources = additionalSources[entry.slug] ?? [];

for (const entry of knowledge)
  if (practices[entry.slug]) entry.practice = practices[entry.slug];

const practiceSources: Record<string, { title: string; url: string }> = {
  "game-prototype": {
    title: "Godot 首个 2D 游戏官方教程",
    url: "https://docs.godotengine.org/en/stable/getting_started/first_2d_game/index.html",
  },
  "node-workflows": {
    title: "ComfyUI 官方首次生成教程",
    url: "https://docs.comfy.org/get_started/first_generation",
  },
  "automation-basics": {
    title: "n8n 错误处理文档",
    url: "https://docs.n8n.io/flow-logic/error-handling/",
  },
};
for (const entry of knowledge)
  if (practiceSources[entry.slug])
    entry.sources?.push(practiceSources[entry.slug]);
