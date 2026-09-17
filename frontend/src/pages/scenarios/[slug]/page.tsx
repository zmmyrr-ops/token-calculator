import { useContent } from "@/content";
import Link from "@/Link";
import { PracticeBrief } from "@/components/Practice";
import NotFound from "@/pages/not-found";
export default function Scenario({ params }: { params: { slug: string } }) {
  const { scenarios, resources, knowledge } = useContent();
  const { slug } = params;
  const s = scenarios.find((s) => s.id === slug);
  if (!s) return <NotFound />;
  const course = knowledge.find((a) => a.practice?.scenario === s.id);
  const practice = course?.practice;
  return (
    <div className="hub">
      <header className="page-intro">
        <Link href="/scenarios">全部场景</Link>
        <h1>{s.name}</h1>
        <p>{s.summary}</p>
      </header>
      {practice && course && (
        <>
          <div className="action-row">
            <Link className="button primary" href={"/learn/" + course.slug}>
              开始这条实践路线 →
            </Link>
            <Link className="button" href="/tutorials">
              换一条教程
            </Link>
          </div>
          <PracticeBrief practice={practice} />
        </>
      )}
      <h2>如何开始</h2>
      <ol className="scenario-steps">
        {s.steps.map((step, i) => (
          <li key={step}>
            <strong>{step}</strong>
            {practice?.steps[i] && <p>{practice.steps[i].check}</p>}
          </li>
        ))}
      </ol>
      <h2>知识与实践</h2>
      <div className="resource-grid">
        {s.articles
          .map((id) => knowledge.find((a) => a.slug === id)!)
          .map((a) => (
            <Link
              className="resource-card"
              key={a.slug}
              href={`/learn/${a.slug}`}
            >
              <small>{a.category}</small>
              <h2>{a.title}</h2>
              <p>{a.summary}</p>
            </Link>
          ))}
      </div>
      <h2 className="section-spacer">这条路线涉及的工具</h2>
      <p className="muted">按流程职责整理，不是效果排名。</p>
      <div className="resource-grid">
        {s.tools
          .map((id) => resources.find((t) => t.id === id)!)
          .map((t) => (
            <Link className="resource-card" key={t.id} href={`/tools/${t.id}`}>
              <small>{t.category}</small>
              <h2>{t.name}</h2>
              <p>{t.summary}</p>
              <p className="tool-role">
                这一步用来：
                {practice?.toolRoles.find((x) => x.id === t.id)?.role ||
                  "按项目需求选择的配套工具"}
              </p>
            </Link>
          ))}
      </div>
      {practice && (
        <section className="learning-note">
          <h2>交付前最后检查</h2>
          <ul>
            {practice.deliverables.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
          <p>
            先完成这一份最小交付，再增加资产数量或自动化范围。预算工具仅按你提供的实际报价计算。
          </p>
        </section>
      )}
      <div className="action-row section-spacer">
        <Link
          className="button"
          href={`/compare?ids=${s.tools.slice(0, 4).join(",")}`}
        >
          对照工具职责
        </Link>
        <Link
          className="button"
          href={
            s.id === "automation" ? "/calculators/tokens" : "/calculators/media"
          }
        >
          {s.id === "automation" ? "规划模型用量" : "规划素材预算"}
        </Link>
      </div>
    </div>
  );
}
