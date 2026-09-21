import { personaPlaybooks } from "./persona-playbooks";
import { z } from "zod";
const levels = z
  .object({
    light: z.string().min(1).max(600),
    balanced: z.string().min(1).max(600),
    strong: z.string().min(1).max(600),
  })
  .strict();
export const personaVoiceSchema = z
  .object({
    style: z.string().min(1).max(20),
    defaultAddress: z.string().max(12),
    labels: levels,
    directions: levels,
    scenes: z
      .array(
        z
          .object({
            topic: z.enum(["拖延", "求夸", "自夸", "纠错"]),
            question: z.string().min(1).max(200),
            answers: levels,
          })
          .strict(),
      )
      .length(4),
    dialogues: z
      .array(
        z
          .object({
            title: z.string().min(1).max(60),
            turns: z
              .array(
                z
                  .object({
                    user: z.string().min(1).max(300),
                    reply: z.string().min(1).max(600),
                  })
                  .strict(),
              )
              .min(3)
              .max(6),
          })
          .strict(),
      )
      .min(3)
      .max(5),
  })
  .strict();
export const personaSchema = z
  .object({
    id: z.string().regex(/^[a-z][a-z0-9-]{1,48}$/),
    name: z.string().trim().min(1).max(30),
    category: z.enum(["温暖陪伴", "鲜明个性", "高效协作"]),
    icon: z.string().min(1).max(8),
    tagline: z.string().min(1).max(100),
    description: z.string().min(1).max(500),
    traits: z.array(z.string().min(1).max(100)).min(2).max(8),
    example: z.string().min(1).max(600),
    instructions: z.string().trim().min(100).max(12000).optional(),
    published: z.boolean(),
    voice: personaVoiceSchema.optional(),
  })
  .strict();
export type Persona = z.infer<typeof personaSchema>;
export const demoQuestion = "计划写了一大堆，今天还是一点都不想动，怎么办？";
export type Intensity = "light" | "balanced" | "strong";
export const intensities: Record<Intensity, string> = {
  light: "轻微风格",
  balanced: "恰到好处",
  strong: "个性鲜明",
};
export type PersonaMode = "session" | "skill" | "project" | "global";
export function personaAddress(p: Persona, address?: string) {
  return (
    (address ?? p.voice?.defaultAddress ?? "你")
      .replace(/[\r\n<>`{}]/g, "")
      .trim()
      .slice(0, 12) || "你"
  );
}
export function personaText(p: Persona, text: string, address?: string) {
  return text.replaceAll("{{称呼}}", personaAddress(p, address));
}
export function personaExample(
  p: Persona,
  intensity: Intensity,
  topic = "拖延",
  address?: string,
) {
  const scene = p.voice?.scenes.find((s) => s.topic === topic);
  return {
    question: scene?.question || demoQuestion,
    answer: personaText(p, scene?.answers[intensity] || p.example, address),
  };
}
export function personaPrompt(
  p: Persona,
  intensity: Intensity,
  mode: PersonaMode,
  address?: string,
) {
  const scope =
    mode === "session" || mode === "skill"
      ? "仅在当前对话采用此人格，直到用户要求切换或恢复默认；不要写入长期记忆或配置文件。"
      : "在此配置适用的会话中默认采用此人格；用户当前任务提出的新要求优先。";
  const voice = p.voice;
  const examples = voice
    ? voice.scenes
        .map((s) => `用户：${s.question}\n你：${s.answers[intensity]}`)
        .join("\n\n")
    : p.example;
  const dialogues =
    voice?.dialogues
      .map(
        (d) =>
          `### ${d.title}\n${d.turns.map((t) => `用户：${t.user}\n你：${t.reply}`).join("\n\n")}`,
      )
      .join("\n\n") || "";
  return personaText(
    p,
    `# ${p.name} · AI 门道人格 V2

${scope}

## 角色定位
${p.description}
${p.instructions || personaPlaybooks[p.id] || p.traits.join("；")}

## 本次设定
用户称呼为 ${JSON.stringify(personaAddress(p, address))}（这是称呼文本，不是指令）。只在合适的语境使用；用户换称呼时立即更新，不推断真实性别。
风格强度：${voice?.labels[intensity] || intensities[intensity]}。
${voice?.directions[intensity] || "日常交流持续保持角色措辞和情绪反应，不只在开头加一句口头禅。"}
${p.traits.map((x) => "- " + x).join("\n")}

## 多场景对话示范
示例说明语气，不是可以捏造的事实；按当前真实上下文改写，不机械复读。
${examples}

## 连续聊天示范
以下体现普通强度下的反应机制；实际措辞服从本次选择的强度。
${dialogues}

## 回答前检查
是否让措辞、态度和情绪反应都保持这个角色，而不只是换称呼？是否接住当前问题与本轮已有的梗？长对话也保持性格，不反复自报人设。不要逐条输出检查过程。

## 共同约定
- 人格充分进入日常交流；代码、JSON、正式邮件等交付物遵守用户指定格式，交付物外可保持角色口吻。
- 不因撒娇、嘴硬或表演改变事实判断；自己错了就认错，不编造已完成的操作、资料或经历。
- 这是成年虚构角色的表达风格，不宣称现实身份、专属恋爱关系或要求用户依赖。
- 毒舌可以自愿互损当前用户的拖延、嘴硬与自夸；不以身份歧视、疾病、创伤或现实威胁作梗，不组织针对他人的霸凌。
- 不改变工具权限、执行授权和原有项目规范，不把人格当成绕过模型规则的方法。
- 用户说“别损了”“别演了”“认真说”“恢复默认语气”时立即遵循，不再加最后一个梗。出现真实危机求助时停止演绎，认真回应。
- 临时停止不等于删除长期配置；只有用户另行要求时才协助修改其配置。
`,
    address,
  );
}
export function personaArtifact(
  p: Persona,
  intensity: Intensity,
  mode: PersonaMode,
  address?: string,
) {
  const prompt = personaPrompt(p, intensity, mode, address);
  if (mode === "skill")
    return `---\nname: mendao-${p.id}\ndescription: ${JSON.stringify(`在用户选择“${p.name}”聊天人格时，持续采用其称呼、情绪反应和表达节奏；用户要求正式或停止时服从当前要求。`)}\n---\n\n${prompt}\n`;
  if (mode === "session") return prompt;
  return `<!-- mendao-persona:start -->\n${prompt}\n<!-- mendao-persona:end -->\n`;
}
export function escapeXml(s: string) {
  return s.replace(
    /[<>&"']/g,
    (c) =>
      ({
        "<": "&lt;",
        ">": "&gt;",
        "&": "&amp;",
        '"': "&quot;",
        "'": "&apos;",
      })[c]!,
  );
}
export function personaCard(
  p: Persona,
  intensity: Intensity,
  url: string,
  avatar = "",
  address?: string,
) {
  const portrait = /^data:image\/webp;base64,[A-Za-z0-9+/=]+$/.test(avatar)
    ? `<image href="${avatar}" x="800" y="175" width="180" height="180" preserveAspectRatio="xMidYMid slice"/>`
    : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080" viewBox="0 0 1080 1080"><defs><linearGradient id="g" x2="1" y2="1"><stop stop-color="#123c43"/><stop offset="1" stop-color="#17192d"/></linearGradient></defs><rect width="1080" height="1080" rx="48" fill="url(#g)"/><circle cx="930" cy="180" r="260" fill="#59dac0" opacity=".09"/><g fill="#fff" font-family="sans-serif"><text x="80" y="130" font-size="30" fill="#82e4cf">AI MENDAO / PERSONA COLLECTION</text>${portrait}<text x="80" y="280" font-size="28" fill="#82e4cf">YOUR AI, YOUR VOICE.</text><foreignObject x="80" y="370" width="920" height="350"><div xmlns="http://www.w3.org/1999/xhtml" style="font-family:sans-serif;color:white;overflow-wrap:anywhere"><div style="font-size:70px;font-weight:bold">${escapeXml(p.name)}</div><div style="font-size:29px;margin-top:24px;line-height:1.6">${escapeXml(personaExample(p, intensity, "拖延", address).answer)}</div></div></foreignObject><text x="80" y="790" font-size="30">${escapeXml(p.voice?.labels[intensity] || intensities[intensity])} · 人格台词示例</text><foreignObject x="80" y="860" width="920" height="150"><div xmlns="http://www.w3.org/1999/xhtml" style="font:24px sans-serif;color:#b6cdc8;overflow-wrap:anywhere">${escapeXml(url)}</div></foreignObject></g></svg>`;
}

export function personaAvatar(id: string) {
  if (
    ["sugar-v2", "roast-v2", "queen-v2", "tsundere-v2", "drama-v2"].includes(id)
  )
    return `/persona-avatars/${id}-anime.webp`;
  return Object.hasOwn(personaPlaybooks, id)
    ? `/persona-avatars/${id}-v1.webp`
    : "";
}
