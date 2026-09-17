import { useContent } from "@/content";
import Link from "@/Link";
import NotFound from "@/pages/not-found";
import { SaveButton } from "@/components/Library";
export default function Tool({ params }: { params: { slug: string } }) {
  const { resources } = useContent();
  const { slug } = params;
  const t = resources.find((x) => x.id === slug);
  if (!t) return <NotFound />;
  return (
    <article className="prose">
      <Link href="/tools">工具与平台</Link>
      <div className="eyebrow">{t.category}</div>
      <h1>{t.name}</h1>
      <p>{t.summary}</p>
      <SaveButton
        item={{
          id: "tool:" + t.id,
          title: t.name,
          href: "/tools/" + t.id,
          kind: "工具",
        }}
      />
      <h2>能用来做什么</h2>
      <ul>
        {t.capabilities.map((c) => (
          <li key={c}>{c}</li>
        ))}
      </ul>
      <dl className="detail-spec">
        <dt>输入</dt>
        <dd>{t.input}</dd>
        <dt>产出</dt>
        <dd>{t.output}</dd>
        <dt>使用方式</dt>
        <dd>{t.access}</dd>
      </dl>
      <h2>使用前确认</h2>
      <p>{t.limits}</p>
      <p>
        本文记录官方介绍的能力，不提供未经实测的质量分数或价格。地域、套餐及商业使用条件请按实际账号和当前条款确认。
      </p>
      <div className="action-row">
        <a
          className="button primary"
          href={t.url}
          target="_blank"
          rel="noreferrer"
        >
          访问官方网站 ↗
        </a>
        <Link className="button" href={`/compare?ids=${t.id}`}>
          加入比较
        </Link>
      </div>
      <h2>在实际任务中使用</h2>
      <Link href={`/learn/${t.article}`}>阅读相关操作路线 →</Link>
      <h2>资料来源</h2>
      <p>资料查阅：{t.checkedAt}</p>
      <a href={t.source} target="_blank" rel="noreferrer">
        官方资料 ↗
      </a>
    </article>
  );
}
