import type {
  MobileBehavior,
  behaviorKeywords,
} from "../../shared/ai-eyes-mobile";
import { matchSchema, eyesCatalog } from "../../shared/ai-eyes";
type Keyword = (typeof behaviorKeywords)[number];
// Versioned editorial matching rules. These are entertainment heuristics, not a validated personality instrument.
export const mobileMatcherVersion = "behavior-rules-1";
export const behaviorProfiles: Record<
  string,
  Partial<Record<Keyword, number>>
> = {
  one_line_ceo: { 简短指令: 5, 委托决策: 1, 完整需求: -3, 直接否定: 1 },
  prompt_academician: { 完整需求: 4, 验收标准: 3, 规则约束: 1 },
  cyber_client: { 反复迭代: 5, 直接否定: 1, 审美表达: 1 },
  intern_supervisor: { 分步推进: 5, 实践验证: 2, 验收标准: 1 },
  detail_controller: { 逐句校正: 6, 验收标准: 1 },
  vibe_art_director: { 审美表达: 6, 反复迭代: 1 },
  idea_dancer: { 话题跳转: 6, 共同推演: 1 },
  ai_confidant: { 情绪倾诉: 6, 积极反馈: 1 },
  night_philosopher: { 抽象思辨: 6, 追问依据: 1 },
  ai_debate_captain: { 追问依据: 6, 比较方案: 1 },
  living_search_box: { 事实查询: 6, 简短指令: 1 },
  decision_delegator: { 委托决策: 6, 比较方案: 1 },
  boss_of_ai_boss: { 直接否定: 6, 简短指令: 1 },
  praise_group_host: { 积极反馈: 6, 共同推演: 1 },
  human_ai_symbiont: { 共同推演: 5, 实践验证: 2, 比较方案: 2 },
  ai_tamer: { 规则约束: 4, 角色设定: 4, 实践验证: 1 },
};
export function matchMobileBehavior(input: MobileBehavior) {
  const counts = new Map(
    input.keywords.map((k) => [k.keyword, k.count / input.sample_count]),
  );
  const ranked = Object.entries(behaviorProfiles)
    .map(([id, weights]) => ({
      id,
      score: Object.entries(weights).reduce(
        (sum, [k, w]) => sum + (counts.get(k as Keyword) || 0) * w,
        0,
      ),
    }))
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  const strongest = [...input.keywords]
    .sort((a, b) => b.count - a.count || a.keyword.localeCompare(b.keyword))
    .slice(0, 2);
  return matchSchema.parse({
    schema_version: "4",
    catalog_version: eyesCatalog.version,
    persona_id: ranked[0].id,
    alternative_persona_id: null,
    sample_scope: "limited",
    match_notes: strongest.map(
      (k) =>
        `在${input.sample_count}条有效样本中，“${k.keyword}”出现${k.count}次。`,
    ),
  });
}
