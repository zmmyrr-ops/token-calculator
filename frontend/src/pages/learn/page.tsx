import { BookOpen, Play, Layers, Compass, ArrowUpRight } from "lucide-react";
import { usePage, Pagination } from "@/usePage";
import { useContent } from "@/content";
import type { Content } from "@shared/content";
import Link from "@/Link";
const tabs = [
  ["", "全部内容"],
  ["article", "知识文章"],
  ["practice", "实操教程"],
  ["video", "视频课程"],
  ["scenarios", "应用场景"],
];
type Entry = Content["knowledge"][number] & { format: string };
export default function Learn({
  searchParams: p,
}: {
  searchParams: Record<string, string | undefined>;
}) {
  const format = p.format || "",
    q = p.q || "",
    category = p.category || "";
  const { scenarios } = useContent();
  const { data, page, status } = usePage<Entry>("/api/v1/library/learn", p);
  const entries = data?.items ?? [];
  return (
    <div className="hub learning-center">
      <header className="learning-hero">
        <div>
          <div className="eyebrow">AI MENDAO / LEARNING LAB</div>
          <h1>从看懂 AI，到做出作品。</h1>
          <p>
            知识、实操、视频与应用路线，在一个地方串起来。先选目标，再学方法，最后交付自己的成果。
          </p>
        </div>
        <aside>
          <Compass size={32} />
          <strong>从一个小成果开始</strong>
          <span>游戏原型 · 3D 资产 · 短片制作</span>
          <Link href="/task-packs">选择场景任务包 →</Link>
        </aside>
      </header>
      <nav className="learning-tabs" aria-label="学习中心分类">
        {tabs.map(([id, label]) => (
          <Link
            className={format === id ? "button primary" : "button"}
            aria-current={format === id ? "page" : undefined}
            key={id}
            href={id ? `/learn?format=${id}` : "/learn"}
          >
            {label}
          </Link>
        ))}
      </nav>
      {format === "scenarios" ? (
        <section className="resource-grid">
          {scenarios.map((s, i) => (
            <article className="resource-card" key={s.id}>
              <div className="learning-art">
                <Compass size={36} />
                <span>路线 0{i + 1}</span>
              </div>
              <h2>{s.name}</h2>
              <p>{s.summary}</p>
              <ol>
                {s.steps.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ol>
              <Link className="button" href={`/scenarios/${s.id}`}>
                查看步骤与工具 →
              </Link>
            </article>
          ))}
        </section>
      ) : (
        <>
          <form className="hub-filter" key={format + category + q}>
            {format && <input type="hidden" name="format" value={format} />}
            <input
              name="q"
              defaultValue={q}
              maxLength={200}
              aria-label="搜索知识文章"
              placeholder="搜索目标、问题、课程或工具"
            />
            <select
              name="category"
              aria-label="文章分类"
              defaultValue={category}
            >
              <option value="">全部主题</option>
              {(data?.categories ?? []).map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <button className="button primary">筛选</button>
            <Link
              className="button"
              href={format ? `/learn?format=${format}` : "/learn"}
            >
              重置
            </Link>
          </form>
          {status}
          {data && (
            <p className="muted">
              共 {data.total} 项内容 · 视频前往原发布者页面观看
            </p>
          )}
          <div className="resource-grid">
            {entries.map((a) => {
              const Icon =
                a.format === "video"
                  ? Play
                  : a.format === "practice"
                    ? Layers
                    : BookOpen;
              return (
                <article className="resource-card learning-card" key={a.slug}>
                  <Link
                    className={`learning-art format-${a.format}`}
                    href={`/learn/${a.slug}`}
                    tabIndex={-1}
                    aria-hidden="true"
                  >
                    <Icon size={38} strokeWidth={1.3} />
                    <span>
                      {a.format === "video"
                        ? "VIDEO COURSE"
                        : a.format === "practice"
                          ? "BUILD & CHECK"
                          : "KNOWLEDGE"}
                    </span>
                  </Link>
                  <small>
                    {a.category} · {a.video?.publisher || "编辑整理"}
                  </small>
                  <h2>
                    <Link href={`/learn/${a.slug}`}>{a.title}</Link>
                  </h2>
                  <p>{a.summary}</p>
                  {a.video && (
                    <small>
                      {a.video.language} · 核验 {a.video.checkedAt}
                    </small>
                  )}
                  <Link
                    className="learning-card-link"
                    href={`/learn/${a.slug}`}
                  >
                    {a.video
                      ? "查看课程与跟做任务"
                      : a.format === "practice"
                        ? "开始实践"
                        : "阅读方法"}
                    <ArrowUpRight size={16} />
                  </Link>
                </article>
              );
            })}
          </div>
          {data && !entries.length && (
            <p className="empty-panel">
              没有匹配内容，试试更短的关键词或其他主题。
            </p>
          )}
          {data && (
            <Pagination
              path="/learn"
              params={p}
              page={page}
              total={data.total}
            />
          )}
        </>
      )}
      <section className="learning-note">
        <h2>把学习用在自己的项目里</h2>
        <p>
          阅读方法 → 跟做一个小任务 → 用自己的素材重做 →
          在社区分享结果与问题。遇到工具选择和用量预算，再查模型目录与计算器。
        </p>
        <div className="action-row">
          <Link href="/tools">查找模型与平台 →</Link>
          <Link href="/forum">交流制作问题 →</Link>
          <Link href="/saved">我的收藏与进度 →</Link>
        </div>
      </section>
    </div>
  );
}
