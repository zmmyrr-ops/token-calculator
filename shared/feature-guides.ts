export const featureGuides: Record<
  string,
  {
    title: string;
    intro: string;
    steps: string[];
    faq: { title: string; body: string }[];
    tutorial: string;
  }
> = {
  "/ai-eyes": {
    title: "AI眼里的你怎么测？豆包、DeepSeek 与 Codex 使用指南",
    intro:
      "AI眼里的你根据你与AI互动的方式生成趣味画像和插画封面。可以选择电脑端Codex，或在豆包、DeepSeek中完成行为统计后回来领取。结果是趣味解读，不是心理诊断。",
    steps: [
      "选择Codex或豆包 / DeepSeek入口。手机用户可直接选择豆包 / DeepSeek。",
      "复制本站指令到AI对话。已有可见对话不足时，回答5至8个简短问题，不要求AI读取其他对话。",
      "豆包 / DeepSeek用户复制返回的完整JSON，粘贴回本站并确认提交；Codex按专属任务指令执行并领取。",
      "查看自己的画像、保存封面。只分享你愿意公开的内容，私人结果不会进入搜索列表。",
    ],
    faq: [
      {
        title: "豆包和DeepSeek会直接选择我的人格吗？",
        body: "不会。指令只要求统计行为关键词与次数，本站根据规则匹配画像，不把所有人格类型交给第三方AI挑选。",
      },
      {
        title: "为什么提示格式不正确？",
        body: "请使用页面里的新版指令，并复制完整JSON代码块。对话至少3条有效消息，问答至少5条；至少2个不同关键词，单个关键词次数不能超过样本数。",
      },
      {
        title: "会上传完整聊天吗？",
        body: "豆包 / DeepSeek流程只提交行为统计，不需要原始聊天。Codex流程会先明确本机历史的分析范围，请阅读该入口的确认说明。",
      },
    ],
    tutorial: "ai-portrait-mobile-guide",
  },
  "/personas": {
    title: "AI人格怎么使用：临时对话与长期默认",
    intro:
      "人格提示词调整AI的表达风格，不改变模型本身的知识、权限或事实判断。先选一种风格试用，再决定是否保存为长期偏好。",
    steps: [
      "选择人格并阅读示例，调整到你能接受的语气强度。",
      "仅本次使用：复制完整对话指令，粘贴到目标AI当前对话，再发送真实任务。",
      "Codex按需使用：下载Skill，依据安装教程放入可识别的技能目录，在对话中明确调用。",
      "长期默认：先备份已有配置，再把风格要求合并到适用的AGENTS.md；打开新会话检查，恢复时只移除自己添加的部分。",
    ],
    faq: [
      {
        title: "安装Skill后每次都会自动使用吗？",
        body: "不能把安装Skill等同于始终启用。需要按描述匹配或明确调用；希望持续应用的偏好应放在实际加载的长期指令里。",
      },
      {
        title: "能让所有AI都永久生效吗？",
        body: "不能。不同产品的自定义指令、记忆和技能机制不同。本次对话可先粘贴提示词，长期使用应按目标产品实际提供的设置操作。",
      },
    ],
    tutorial: "ai-persona-setup-guide",
  },
  "/calculators/tokens": {
    title: "Token费用怎么算：输入、输出与推理预算",
    intro:
      "先用参考编码统计输入词元，再设置预计输出和推理用量，最后选择有明确渠道报价的模型。估算用于比较预算，实际账单以服务商记录为准。",
    steps: [
      "输入一段不含敏感信息的文本，查看当前参考编码下的词元数量。",
      "选择模型和报价渠道，检查币种、每百万Token单价及来源日期。",
      "分别设置预计输出与推理预算；不要把未发生的输出当成已经测得的用量。",
      "比较结果并保存方案。缺失价格不等于免费，网页订阅费用也不能直接换算为API单价。",
    ],
    faq: [
      {
        title: "一个汉字等于一个Token吗？",
        body: "不一定。分词取决于编码、语言和文本内容；同一段文字在不同编码下可能得到不同数量。",
      },
      {
        title: "为什么估算与账单不同？",
        body: "实际请求可能含系统提示、历史对话、工具调用和多模态输入，还可能涉及缓存、重试、推理及渠道差异。本站本地计数不是服务商账单。",
      },
    ],
    tutorial: "token-cost-practical-guide",
  },
};
export const tutorialLinks = Object.entries(featureGuides).map(([url, g]) => ({
  url,
  slug: g.tutorial,
  title: g.title,
}));
