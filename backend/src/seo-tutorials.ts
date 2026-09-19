import { ContentDatabase } from "./database";
import { knowledgeSchema } from "../../shared/cms";
import { featureGuides } from "../../shared/feature-guides";
const extra: Record<string, { title: string; body: string }[]> = {
  "/ai-eyes": [
    {
      title: "开始前：选择你真正使用的入口",
      body: "打开AI眼里的你，电脑上的Codex与豆包 / DeepSeek是两个并列入口。豆包 / DeepSeek流程不需要运行Python，也不会自动打开第三方应用；你需要手动复制指令和统计结果。小程序用户在工具页进入AI眼里的你，生成时需微信登录，账号只保存最新一份结果30天。",
    },
    {
      title: "示例：什么算有效的行为统计",
      body: "如果你回答了5个问题，sample_count应为5，basis应为questions。某个关键词在这5条回答里出现3次，其count是3；同一条回答可以命中多个不同关键词，因此所有count之和不必等于5。关键词必须来自指令规定的列表，不能复制人格名称代替关键词。这里的数字仅用于解释格式，不是可代替真实回答的测试数据。",
    },
    {
      title: "完成与排错",
      body: "生成成功后页面会显示一个画像和封面。若格式错误，先检查是否复制了完整JSON、有无多余解释、关键词重复或次数超过样本数。若AI说无法读取历史，应切换问答模式，不要求它编造记忆。无法保存图片时可以预览再按设备能力保存；不要提交手机号、姓名或整段聊天。",
    },
  ],
  "/personas": [
    {
      title: "先试一次，再决定长期使用",
      body: "打开AI人格，选择风格并查看提示词。复制后先发到目标AI的当前对话，再用你实际需要解决的一道问题试用。检查内容是否清楚、语气是否过重。如果风格影响理解，降低强度或换一个风格；示例台词是展示文案，不代表你使用的模型必然逐字输出。",
    },
    {
      title: "Codex长期配置与按需调用",
      body: "按需使用Skill时，将下载包中的技能目录放入项目的.agents/skills或用户的~/.agents/skills，并按实际客户端入口明确选择或调用。长期项目偏好可合并到项目AGENTS.md；全局偏好使用实际CODEX_HOME下的AGENTS.md（默认~/.codex）。不要直接覆盖已有文件。官方指令还可能被更近目录的配置覆盖，安装Skill本身不等于始终启用。",
    },
    {
      title: "验证与恢复",
      body: "修改前保留原文件副本，在新增段落注明“表达风格”。开启新会话，要求AI概述已加载的风格要求，再用相同问题检查表达变化。若未生效，检查当前项目目录、文件位置与是否存在覆盖配置。恢复时只移除新增的风格段落或禁用对应技能，保留团队原有开发规范。第三方产品的长期设置需按各自实际功能操作，不能保证粘贴一次后跨会话永久有效。",
    },
  ],
  "/calculators/tokens": [
    {
      title: "把输入计数和未来输出分开",
      body: "打开Token计算器，将待估算文本粘贴到输入框，参考编码在浏览器本地进行分词。这里能计数的是你已提供的文本；未来回答长度与模型内部推理消耗只能按预算填写，不能从一个问题准确预测。不同模型未必使用相同编码，因此不要把参考计数当成厂商准确计费值。",
    },
    {
      title: "按报价口径计算",
      body: "只对有明确报价的渠道估算：输入费用为输入Token数除以一百万再乘输入单价；输出费用按同样方式使用输出单价计算。缓存、推理和多模态用量要按所选渠道的计费定义处理，避免将已经计入输出的推理Token再次相加。价格未知时应查来源或填写自己的报价，不能记为零费用。",
    },
    {
      title: "保留一次可核对的预算",
      body: "保存所选模型、渠道、币种、报价日期、参考编码、输入量和预计输出量。实际调用后用平台用量记录核对差异：是否包含系统提示和历史对话、是否调用工具、是否重试、是否命中缓存。不要直接把ChatGPT等网页订阅价格当成API Token价格，也不要把规则推荐视为模型质量实测。",
    },
  ],
};
export function seedSeoTutorials(store: ContentDatabase) {
  if (store.meta("seoTutorials20260919")) return;
  store.transaction(() => {
    let position = Number(
      store.db
        .prepare("SELECT COALESCE(MAX(position),0) n FROM documents")
        .get()!.n,
    );
    for (const [route, g] of Object.entries(featureGuides)) {
      const entry = knowledgeSchema.parse({
        slug: g.tutorial,
        title: g.title,
        category: "本站工具教程",
        summary: g.intro,
        keywords: g.title + " 使用步骤 常见问题",
        sections: [
          ...g.steps.map((body, i) => ({ title: "第" + (i + 1) + "步", body })),
          ...extra[route],
          ...g.faq,
        ],
        sources: [
          { title: "打开本站工具", url: route },
          ...(route === "/personas"
            ? [
                {
                  title: "Codex官方：AGENTS.md",
                  url: "https://learn.chatgpt.com/docs/agent-configuration/agents-md",
                },
                {
                  title: "Codex官方：Skills",
                  url: "https://learn.chatgpt.com/docs/build-skills",
                },
              ]
            : []),
        ],
      });
      const raw = JSON.stringify(entry),
        at = new Date().toISOString();
      const row = store.db
        .prepare("INSERT OR IGNORE INTO documents VALUES(?,?,?,?,?,?,?)")
        .run("knowledge", entry.slug, raw, raw, 1, ++position, at);
      if (row.changes)
        store.db
          .prepare(
            "INSERT INTO history(kind,entity_id,action,actor,payload,at) VALUES('knowledge',?,'import','seo-tutorials',?,?)",
          )
          .run(entry.slug, raw, at);
    }
    store.setMeta("seoTutorials20260919", true);
    store.setMeta(
      "contentVersion",
      (store.meta<number>("contentVersion") || 0) + 1,
    );
  });
}
