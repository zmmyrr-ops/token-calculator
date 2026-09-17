import { useContent } from "@/content";
import Link from "@/Link";
import { PracticeBrief, PracticeActions } from "@/components/Practice";
import NotFound from "@/pages/not-found";
import { SaveButton, Progress } from "@/components/Library";
export default function Article({ params }: { params: { slug: string } }) {
  const { tutorialSlugs, resources, knowledge } = useContent();
  const { slug } = params;
  const entry = knowledge.find((a) => a.slug === slug);
  if (!entry) return <NotFound />;
  return (
    <article className="prose portal-article">
      <Link href="/learn">知识库</Link>
      <span> / {entry.category}</span>
      <div className="eyebrow" style={{ marginTop: 32 }}>
        {entry.category} · 编辑整理
      </div>
      <h1>{entry.title}</h1>
      <p className="portal-article-summary">{entry.summary}</p>
      <SaveButton
        item={{
          id: "article:" + entry.slug,
          title: entry.title,
          href: "/learn/" + entry.slug,
          kind: tutorialSlugs.includes(entry.slug) ? "教程" : "知识",
        }}
      />
      {entry.video && (
        <section className="learning-note video-detail">
          <div className="eyebrow">官方课程 · 原站观看</div>
          <h2>{entry.video.publisher}</h2>
          <p>适合：{entry.video.audience}</p>
          <p>语言：{entry.video.language}</p>
          <p>{entry.video.version}</p>
          <a
            className="button primary"
            href={entry.video.url}
            target="_blank"
            rel="noreferrer"
          >
            前往原站观看视频 ↗
          </a>
          <p className="muted">
            收录核验：{entry.video.checkedAt} ·
            本站不转载视频，原站可能要求登录；字幕、费用及可访问性以原站为准。
          </p>
        </section>
      )}
      {entry.practice && (
        <>
          <PracticeBrief practice={entry.practice} />
          <nav className="practice-toc" aria-label="教程步骤目录">
            {entry.sections.map((s, i) => (
              <a key={s.title} href={"#stage-" + (i + 1)}>
                {s.title}
              </a>
            ))}
          </nav>
        </>
      )}
      {entry.sections.map((s, i) => (
        <section
          key={s.title}
          id={"stage-" + (i + 1)}
          className="practice-stage"
        >
          <h2>{s.title}</h2>
          <p>{s.body}</p>
          {entry.practice?.steps[i] && (
            <>
              <h3>动手操作</h3>
              <ol>
                {entry.practice.steps[i].actions.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ol>
              <div className="practice-check">
                <strong>本阶段验收</strong>
                <p>{entry.practice.steps[i].check}</p>
              </div>
            </>
          )}
        </section>
      ))}
      {entry.practice && (
        <>
          <section>
            <h2>常见问题与排查</h2>
            <div className="practice-faq">
              {entry.practice.pitfalls.map((x) => (
                <details key={x.problem}>
                  <summary>{x.problem}</summary>
                  <p>{x.solution}</p>
                </details>
              ))}
            </div>
          </section>
          <section>
            <h2>最后交付什么</h2>
            <ul>
              {entry.practice.deliverables.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </section>
          <PracticeActions
            practice={entry.practice}
            title={entry.title}
            slug={entry.slug}
          />
          <p>
            <Link href={"/scenarios/" + entry.practice.scenario}>
              返回应用场景，查看工具分工 →
            </Link>
          </p>
        </>
      )}
      {entry.sources && (
        <section>
          <h2>参考来源</h2>
          <p>
            官方页面用于查证所述功能，不代表本站已对其质量、套餐或访问条件完成实测。
          </p>
          <ul>
            {entry.sources.map((s) => (
              <li key={s.url}>
                <a href={s.url} target="_blank" rel="noreferrer">
                  {s.title} ↗
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
      {tutorialSlugs.includes(entry.slug) && (
        <Progress
          slug={entry.slug}
          titles={entry.sections.map((s) => s.title)}
        />
      )}
      {resources.some((t) => t.article === entry.slug) && (
        <section>
          <h2>相关工具档案</h2>
          <ul>
            {resources
              .filter((t) => t.article === entry.slug)
              .map((t) => (
                <li key={t.id}>
                  <Link href={"/tools/" + t.id}>
                    {t.name} · {t.category}
                  </Link>
                </li>
              ))}
          </ul>
        </section>
      )}
      <section className="portal-related">
        <h2>继续探索</h2>
        <Link href="/calculators/tokens">计算词元与费用 →</Link>
        <Link href="/models">查询模型与来源 →</Link>
        <Link href="/how-it-works">了解本站计算方法 →</Link>
      </section>
    </article>
  );
}
