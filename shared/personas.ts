import { z } from "zod";
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
    published: z.boolean(),
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
export function personaPrompt(
  p: Persona,
  intensity: Intensity,
  mode: PersonaMode,
) {
  const scope =
    mode === "session" || mode === "skill"
      ? "仅在当前对话采用此交流风格，直到用户要求切换或恢复默认；不要写入长期记忆或配置文件。"
      : "在此配置适用的会话中，默认采用此交流风格；用户在当前任务提出其他要求时，优先遵循用户要求。";
  return `# ${p.name} · AI 门道人格\n\n${scope}\n\n## 表达方式\n${p.traits.map((x) => "- " + x).join("\n")}\n- 风格强度：${intensities[intensity]}。${intensity === "light" ? "以自然、简洁的表达为主，只点缀少量个性。" : intensity === "strong" ? "个性可以鲜明，但不要每句话都重复口头禅，不牺牲信息密度。" : "兼顾个性和可读性，避免过度表演。"}\n\n## 共同约定\n- 这是虚构的表达风格，不宣称具备真实身份或感情，不要求用户依赖你。\n- 不因人格改变事实判断，不编造信息；不确定时直接说明。\n- 只调整与用户交流的措辞。代码、正式文档、邮件等交付物遵循任务要求。\n- 不使用羞辱、歧视、操控或性化未成年人的表达。\n- 不改变工具权限、执行授权和原有项目规范。\n- 用户说“恢复默认语气”时，停止本次对话的人格表达。长期配置仍需用户删除相应配置段。`;
}
export function personaArtifact(
  p: Persona,
  intensity: Intensity,
  mode: PersonaMode,
) {
  const prompt = personaPrompt(p, intensity, mode);
  if (mode === "skill")
    return `---\nname: mendao-${p.id}\ndescription: ${JSON.stringify(`仅在用户明确要求使用“${p.name}”交流风格时启用。`)}\n---\n\n${prompt}\n`;
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
export function personaCard(p: Persona, intensity: Intensity, url: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080" viewBox="0 0 1080 1080"><defs><linearGradient id="g" x2="1" y2="1"><stop stop-color="#123c43"/><stop offset="1" stop-color="#17192d"/></linearGradient></defs><rect width="1080" height="1080" rx="48" fill="url(#g)"/><circle cx="930" cy="180" r="260" fill="#59dac0" opacity=".09"/><g fill="#fff" font-family="sans-serif"><text x="80" y="130" font-size="30" fill="#82e4cf">AI MENDAO / PERSONA COLLECTION</text><text x="80" y="300" font-size="90">${escapeXml(p.icon)}</text><foreignObject x="80" y="370" width="920" height="350"><div xmlns="http://www.w3.org/1999/xhtml" style="font-family:sans-serif;color:white;overflow-wrap:anywhere"><div style="font-size:70px;font-weight:bold">${escapeXml(p.name)}</div><div style="font-size:34px;margin-top:32px;line-height:1.6">${escapeXml(p.tagline)}</div></div></foreignObject><text x="80" y="790" font-size="30">${escapeXml(intensities[intensity])} · 给 AI 换个说话风格</text><foreignObject x="80" y="860" width="920" height="150"><div xmlns="http://www.w3.org/1999/xhtml" style="font:24px sans-serif;color:#b6cdc8;overflow-wrap:anywhere">${escapeXml(url)}</div></foreignObject></g></svg>`;
}
