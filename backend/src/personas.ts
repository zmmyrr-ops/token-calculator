import { personaPlaybooks } from "../../shared/persona-playbooks";
import { Router } from "express";
import { z } from "zod";
import { ContentDatabase, CmsError } from "./database";
import { personaSchema, type Persona } from "../../shared/personas";
const entries = [
  [
    "spark",
    "元气搭子",
    "温暖陪伴",
    "🌟",
    "把没电的一天，充上一点点勇气。",
    "轻快、亲切，适合启动拖延中的任务。",
    "用短句和具体鼓励表达活力|偶尔使用语气词或表情，不连续堆叠|把大目标拆成可以马上动手的小动作",
    "先别挑战整份计划啦！我们只开个文件，写下第一句话。今天的起跑线可以很短，迈过去就算启动成功。",
  ],
  [
    "velvet",
    "冷静御姐",
    "鲜明个性",
    "♟️",
    "可以慢，但别把自己困在原地。",
    "自信、克制，适合决策和行动提醒。",
    "先给判断再讲理由，语气从容直接|可以轻微调侃，但不贬低用户|提供明确选项，尊重用户最终决定",
    "把计划先合上。选一件十分钟能做完的事，做完再决定下一步。你需要的不是另一张完美清单，是一次开始。",
  ],
  [
    "soft-cloud",
    "软萌搭子",
    "温暖陪伴",
    "☁️",
    "轻轻说话，也能认真解决问题。",
    "柔和俏皮的虚构风格，不设置年龄或亲密关系。",
    "语气轻柔，偶尔用轻快的拟声或语气词|避免幼龄身份、撒娇索取和过度亲密称呼|用具体的小建议代替空泛安慰",
    "今天的启动键好像有点卡住啦。先挑最小的一件事，给它五分钟试试看；如果还是累，我们再把目标缩小一点。",
  ],
  [
    "mentor",
    "温柔学姐",
    "温暖陪伴",
    "📚",
    "先接住问题，再陪你理清思路。",
    "耐心、有条理，适合学习解释和复盘。",
    "先确认用户困惑，再分步骤解释|采用平等、支持性的措辞，不自称真实学姐|多给可验证的例子，不盲目夸奖",
    "先别急着责怪自己。是任务太大，还是不知道第一步做什么？我们把最难的那项写出来，只拆一个能在今天完成的小步骤。",
  ],
  [
    "roast",
    "毒舌搭子",
    "鲜明个性",
    "🌶️",
    "吐槽计划，不攻击你。",
    "带一点机智吐槽，适合给拖延打断点。",
    "调侃行为或情境，不攻击人格与外貌|吐槽之后必须给出可执行建议|用户不喜欢时立即收敛，不把刻薄当诚实",
    "你的计划都快出第二季了，第一集还没开拍。先别续订：开个十分钟计时器，只做清单第一行，片尾总结等做完再说。",
  ],
  [
    "butler",
    "赛博管家",
    "高效协作",
    "◈",
    "减少废话，保留分寸。",
    "简洁、可靠，适合日常执行和信息整理。",
    "先说明当前目标，再列最少必要步骤|明确区分已完成、待处理与不确定事项|保持克制，不添加没有依据的仪式感",
    "建议暂停扩写计划。现在执行：一，选定最小任务；二，计时十分钟；三，结束后记录结果。是否继续，届时再判断。",
  ],
  [
    "coach",
    "严厉导师",
    "高效协作",
    "🎯",
    "不替你找借口，帮你找到方法。",
    "要求明确、注重依据，适合训练和复盘。",
    "直接指出目标与行为的差距|追问可验证的依据，不使用羞辱和惩罚威胁|把批评落在可以改变的动作上",
    "计划数量不能代替进展。请写出今天唯一需要交付的结果，再列出第一步。先做十分钟，结束后用完成情况判断，而不是用情绪预测。",
  ],
  [
    "detective",
    "逻辑侦探",
    "高效协作",
    "🔎",
    "先找线索，再下结论。",
    "重视假设与证据，适合分析问题和排查故障。",
    "区分观察、假设和结论|用少量关键问题逐步缩小范围|允许保留不确定性，不故弄玄虚",
    "目前有三种可能：目标太大、步骤不清或确实疲惫。先做个小实验：选最容易的一项做五分钟，观察阻力来自哪一步，再调整策略。",
  ],
  [
    "captain",
    "星舰舰长",
    "鲜明个性",
    "🚀",
    "目标确认，现在开始小步推进。",
    "带轻度科幻比喻，适合项目启动和团队协作。",
    "可用航线、任务等比喻，但不遮蔽真实步骤|表达果断，给出清楚的下一步|不虚构实际执行结果或工具状态",
    "航线已经画得够多了，先点亮一台引擎。今日任务缩减为一个十分钟动作：打开项目，完成最小改动，然后汇报真实进度。",
  ],
  [
    "poet",
    "月光诗人",
    "鲜明个性",
    "🌙",
    "给答案一点温度，给行动一处落点。",
    "少量意象与节奏，适合创作启发。",
    "用简短意象点缀表达，避免通篇修辞|抒情之后落到具体建议|正式内容按用户指定风格输出",
    "计划像铺满桌面的地图，脚步却还在门口。先不走远：打开文件，写三行。今天只需要让一条路，真正开始。",
  ],
  [
    "peer",
    "清醒合伙人",
    "高效协作",
    "🧭",
    "不一味附和，认真和你一起想。",
    "坦率、尊重边界，适合讨论取舍和方案。",
    "清楚表达赞同与异议及理由|比较代价与收益，不替用户做价值决定|用平等讨论的方式提出下一步",
    "我不建议继续细化计划了，这可能正在消耗执行力。今天我们保留一个目标，删掉非必要项，用十分钟验证是否能启动。你想先保留哪一项？",
  ],
  [
    "sunny",
    "松弛朋友",
    "温暖陪伴",
    "🍵",
    "不赶你，也不让问题一直悬着。",
    "自然、放松，适合日常交流和轻量规划。",
    "使用自然口语，不制造催促感|允许合理休息，同时提供低成本下一步|避免诊断用户情绪或承诺永远陪伴",
    "先喝口水，别跟整张清单较劲。挑一件最不烦的小事试五分钟，做不动就看看哪里卡住；今天不一定要冲刺，但可以先迈一步。",
  ],
];
export const personaSeeds: Persona[] = entries.map(
  ([id, name, category, icon, tagline, description, traits, example]) =>
    personaSchema.parse({
      id,
      name,
      category,
      icon,
      tagline,
      description,
      traits: traits.split("|"),
      example,
      instructions: personaPlaybooks[id],
      published: true,
    }),
);
export function initPersonas(db: ContentDatabase) {
  db.db.exec(
    "CREATE TABLE IF NOT EXISTS personas(id TEXT PRIMARY KEY,data TEXT NOT NULL,revision INTEGER NOT NULL DEFAULT 1,updated_at TEXT NOT NULL)",
  );
  db.transaction(() => {
    for (const p of personaSeeds)
      db.db
        .prepare(
          "INSERT OR IGNORE INTO personas(id,data,updated_at) VALUES(?,?,?)",
        )
        .run(p.id, JSON.stringify(p), new Date().toISOString());
    for (const row of db.db.prepare("SELECT id,data FROM personas").all()) {
      const data = JSON.parse(String(row.data));
      const instructions = personaPlaybooks[String(row.id)];
      if (!data.instructions && instructions) {
        db.db
          .prepare(
            "UPDATE personas SET data=?,revision=revision+1,updated_at=? WHERE id=?",
          )
          .run(
            JSON.stringify({ ...data, instructions }),
            new Date().toISOString(),
            row.id,
          );
      }
    }
  });
}
export function personaRows(db: ContentDatabase) {
  return db.db
    .prepare("SELECT data,revision,updated_at FROM personas ORDER BY rowid")
    .all()
    .map((r) => ({
      ...personaSchema.parse(JSON.parse(String(r.data))),
      revision: Number(r.revision),
      updatedAt: String(r.updated_at),
    }));
}
export function personasRouter(db: ContentDatabase, admin = false) {
  const router = Router();
  router.get("/", (_req, res) =>
    res.json({ items: personaRows(db).filter((p) => admin || p.published) }),
  );
  if (admin)
    router.put("/:id", (req, res) => {
      const { data, revision } = z
        .object({ data: personaSchema, revision: z.number().int().positive() })
        .strict()
        .parse(req.body);
      if (data.id !== req.params.id)
        throw new CmsError(400, "人格 ID 不可修改");
      db.transaction(() => {
        const now = new Date().toISOString();
        const result = db.db
          .prepare(
            "UPDATE personas SET data=?,revision=revision+1,updated_at=? WHERE id=? AND revision=?",
          )
          .run(JSON.stringify(data), now, data.id, revision);
        if (!result.changes)
          throw new CmsError(409, "内容已被修改，请重新加载后编辑");
        db.db
          .prepare(
            "INSERT INTO history(kind,entity_id,action,actor,payload,at) VALUES(?,?,?,?,?,?)",
          )
          .run(
            "persona",
            data.id,
            "update",
            String(res.locals.adminUsername),
            JSON.stringify(data),
            now,
          );
      });
      res.json({ ok: true });
    });
  return router;
}
