import { z } from "zod";
export const behaviorKeywords = [
  "简短指令",
  "完整需求",
  "反复迭代",
  "分步推进",
  "逐句校正",
  "审美表达",
  "话题跳转",
  "情绪倾诉",
  "抽象思辨",
  "追问依据",
  "事实查询",
  "委托决策",
  "直接否定",
  "积极反馈",
  "共同推演",
  "规则约束",
  "角色设定",
  "验收标准",
  "实践验证",
  "比较方案",
] as const;
export const mobileResultSchema = z
  .object({
    format: z.literal("AI_EYES_BEHAVIOR_2"),
    basis: z.enum(["conversation", "questions"]),
    sample_count: z.number().int().min(3).max(50),
    keywords: z
      .array(
        z
          .object({
            keyword: z.enum(behaviorKeywords),
            count: z.number().int().min(1).max(50),
          })
          .strict(),
      )
      .min(2)
      .max(20),
  })
  .strict()
  .superRefine((v, c) => {
    if (new Set(v.keywords.map((k) => k.keyword)).size !== v.keywords.length)
      c.addIssue({ code: "custom", message: "关键词不可重复" });
    if (v.keywords.some((k) => k.count > v.sample_count))
      c.addIssue({ code: "custom", message: "关键词次数不能超过样本数" });
    if (v.basis === "questions" && v.sample_count < 5)
      c.addIssue({ code: "custom", message: "问答至少需要5条有效回答" });
  });
export type MobileBehavior = z.infer<typeof mobileResultSchema>;
export function parseMobileResult(raw: string) {
  if (raw.length > 8000)
    throw Error("内容过长，请只粘贴行为统计JSON，不要粘贴聊天记录");
  const text = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  try {
    // WeChat may expose Function but prevent generated validators from executing.
    return mobileResultSchema.parse(JSON.parse(text), { jitless: true });
  } catch {
    throw Error(
      "行为统计格式不正确或样本不足。请使用新版指令，复制完整JSON；至少3条有效消息（问答至少5条）、2个不重复关键词，次数不得超过样本数。",
    );
  }
}
export function mobilePrompt(mode: "conversation" | "questions") {
  return `请帮助我统计与AI互动时的可观察行为，不做人格分类，不猜测性格，不输出人格名称。这不是心理诊断。\n${mode === "conversation" ? "仅使用本对话中你实际可见的最近最多50条用户消息。忽略本条指令、粘贴的资料、引用他人的内容和AI自己的回答。不能假装读取全账号历史、其他应用或不可见的记忆。有效消息不足3条时进入下面问答流程。" : "请先进入下面问答流程，不要直接从这条指令推断我的行为。"}\n问答流程：逐个提出5个简短问题并等我回答：最常用AI做什么；第一次描述需求有多详细；结果不满意如何反馈；更看重快速答案还是检查过程；如何判断任务完成。可再追问最多3题以澄清例子。只统计真实回答，不把题目或你的回答当作我的行为。没有足够回答，不要编造统计。\n统计规则：sample_count为实际纳入的有效用户消息数，最多50。对每条消息只按明确行为标记关键词；同一关键词在同一消息最多计1次，一条消息可命中多个不同关键词，故总次数可以超过sample_count。没有出现的关键词不要输出。至少有2个不同关键词才生成JSON，否则继续询问具体使用例子。\n可用关键词与含义：\n简短指令=只给简短目标；完整需求=事先描述背景约束与交付；反复迭代=持续要求修改已有结果；分步推进=要求分阶段做；逐句校正=定位具体字句或局部错误；审美表达=讨论风格与观感；话题跳转=引入新的方向或点子；情绪倾诉=表达情绪寻求理解；抽象思辨=讨论意义价值等抽象问题；追问依据=质疑理由要求证据；事实查询=查找具体知识事实；委托决策=要求AI替自己选；直接否定=否定结果但不给具体改法；积极反馈=赞许认可AI；共同推演=贡献想法并让AI补充推演；规则约束=明确限制AI的行为与输出；角色设定=指定AI扮演职责；验收标准=明确何时算完成；实践验证=要求实际测试运行；比较方案=对比多个方案的取舍。\n最终只输出一个JSON代码块，不含姓名、联系方式、原句、聊天记录、人格类型或额外字段。格式：\n{"format":"AI_EYES_BEHAVIOR_2","basis":"conversation","sample_count":实际消息数,"keywords":[{"keyword":"实际观察到的可用关键词","count":对应消息数}]}\n如果使用了问答补充，basis必须为questions，sample_count只计本次问答中的有效回答（5至8条）；否则为conversation。所有次数必须为整数，关键词不能重复，单项次数不大于sample_count。不足以统计时如实说明，不要为凑格式伪造数据。无需执行代码、联网或调用接口。`;
}
