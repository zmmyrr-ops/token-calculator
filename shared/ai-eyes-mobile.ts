import { z } from "zod";
import { eyesCatalog, matchSchema } from "./ai-eyes";
export const mobileResultSchema = z
  .object({
    format: z.literal("AI_EYES_MOBILE_1"),
    persona_id: matchSchema.shape.persona_id,
    basis: z.enum(["conversation", "questions"]),
    match_notes: matchSchema.shape.match_notes,
  })
  .strict();
export function parseMobileResult(raw: string) {
  if (raw.length > 8000)
    throw Error("结果过长，请只粘贴结果码，不要粘贴聊天记录");
  const text = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  try {
    return mobileResultSchema.parse(JSON.parse(text));
  } catch {
    throw Error(
      "结果码格式不正确，请复制完整 JSON 结果；类型必须来自指令中的16型，说明最多两条、每条48字且不含联系方式",
    );
  }
}
export function mobilePrompt(mode: "conversation" | "questions") {
  const types = eyesCatalog.items
    .map(
      (p) =>
        `${p.id}｜${p.name}｜${p.keyword}\n${p.blocks
          .slice(2, 16)
          .map((b) => b.runs.map((r) => r.text).join(""))
          .join(" ")}`,
    )
    .join("\n\n");
  return `请为我制作“AI眼里的你”趣味使用画像。这不是心理诊断，也不是专业人格测评。\n${mode === "conversation" ? "仅根据本对话里实际可见的我的提问与反馈判断，不要假装能读取整个账号历史或其他应用。忽略这条测评指令本身，不把AI自己的回答当作我的行为。若有效行为少于3个，请进入下面的问答流程。" : "请先进入下面的问答流程，不要直接凭本条指令给我贴标签。"}\n问答流程：依次问我5个简短问题，等我逐一回答：我最常用AI做什么；第一次描述需求有多详细；答案不满意时怎么反馈；我更看重速度还是检查过程；我如何决定任务完成。若类型仍难区分，再追问最多3个问题。没有足够回答就说明信息不足，不输出结果码。\n根据行为频率和具体例子，在下列16型里选择最符合的一型，遇到矛盾以我的实际行为为准。不要迎合我指定的类型。说明使用脱敏概括，不引用原句、不含姓名联系方式、网址、文件路径或密钥。\n${types}\n\n有足够依据后，给出最多两句简短说明，再单独输出一个JSON代码块，方便我复制回AI门道。严格格式：\n{"format":"AI_EYES_MOBILE_1","persona_id":"从上方选择准确ID","basis":"conversation","match_notes":["脱敏行为概括，每条不超过48字，最多两条"]}\n如果经过问答补充，basis必须为questions；只依据现有对话时为conversation。不要加入其他字段。无需打开网站、执行代码或调用接口。`;
}
