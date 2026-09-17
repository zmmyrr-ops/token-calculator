import { useSearchParams } from "react-router-dom";
import { useContent } from "@/content";
import Link from "@/Link";
import { sceneIcons } from "@/components/Practice";
export default function Tutorials() {
  const { knowledge, tutorialSlugs, scenarios } = useContent();
  const [params, setParams] = useSearchParams();
  const q = params.get("q") || "",
    scene = params.get("scene") || "",
    level = params.get("level") || "";
  const courses = knowledge.filter(
    (a) => tutorialSlugs.includes(a.slug) && a.practice,
  );
  const filtered = courses.filter(
    (a) =>
      (!q ||
        `${a.title} ${a.summary} ${a.practice!.result}`
          .toLowerCase()
          .includes(q.toLowerCase())) &&
      (!scene || a.practice!.scenario === scene) &&
      (!level || a.practice!.level === level),
  );
  function update(k: string, v: string) {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v);
    else next.delete(k);
    setParams(next, { replace: true });
  }
  return (
    <div className="hub practice-hub">
      <header className="learning-hero">
        <div>
          <div className="eyebrow">LEARN / BUILD / CHECK</div>
          <h1>从一份方法，到自己的成果。</h1>
          <p>选一件想做的事，准备好材料，沿着步骤完成，再用清单检查。</p>
        </div>
        <aside>
          <strong>读完，也能动手。</strong>
          <span>准备清单 → 实操步骤 → 验收成果</span>
          <Link href="/saved">查看我的收藏与进度 →</Link>
        </aside>
      </header>
      <form className="learning-filters" onSubmit={(e) => e.preventDefault()}>
        <input
          aria-label="搜索实践教程"
          placeholder="搜索目标、教程或成果…"
          value={q}
          onChange={(e) => update("q", e.target.value)}
          maxLength={200}
        />
        <select
          aria-label="筛选教程场景"
          value={scene}
          onChange={(e) => update("scene", e.target.value)}
        >
          <option value="">全部场景</option>
          {scenarios.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <select
          aria-label="筛选教程基础"
          value={level}
          onChange={(e) => update("level", e.target.value)}
        >
          <option value="">所有基础</option>
          <option>入门</option>
          <option>有基础</option>
        </select>
      </form>
      <p className="muted" role="status">
        找到 {filtered.length} 条实践路线 ·
        编辑整理，平台能力与版本以官方文档为准
      </p>
      <div className="course-grid">
        {filtered.map((a) => {
          const p = a.practice!;
          const Icon = sceneIcons[p.scenario as keyof typeof sceneIcons];
          return (
            <article className="course-card" key={a.slug}>
              <div className={"course-art art-" + p.scenario}>
                <Icon size={50} strokeWidth={1.2} />
                <span>{a.category}</span>
                <small>{p.level}</small>
              </div>
              <div className="course-body">
                <h2>
                  <Link href={"/learn/" + a.slug}>{a.title}</Link>
                </h2>
                <p>{p.result}</p>
                <small>适合：{p.audience}</small>
                <div className="course-meta">
                  {p.steps.length} 个阶段 · {p.deliverables.length} 项交付检查
                </div>
                <Link className="button" href={"/learn/" + a.slug}>
                  开始实践 →
                </Link>
              </div>
            </article>
          );
        })}
      </div>
      {!filtered.length && (
        <div className="empty-panel">
          <h2>没有找到匹配教程</h2>
          <p>换一个关键词或放宽筛选条件。</p>
          <button className="button" onClick={() => setParams({})}>
            清除筛选
          </button>
        </div>
      )}
      <section className="learning-note">
        <h2>第一次开始，怎么选？</h2>
        <p>
          已有图片想做短片，先看视频路线；有编程基础想做作品，先走游戏灰盒；想生成
          3D
          资产，先确认能否完成目标环境导入。每次先完成一个小成果，再扩大规模。
        </p>
        <Link href="/scenarios">按应用场景选择路线 →</Link>
      </section>
    </div>
  );
}
