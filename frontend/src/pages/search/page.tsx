import { appPath } from "@/base";
import { useContent } from "@/content";
import Link from "@/Link";
export default function Search({
  searchParams,
}: {
  searchParams: { q?: string; type?: string; page?: string };
}) {
  const { knowledge, models, resources, scenarios } = useContent();
  const p = searchParams;
  const q = typeof p.q === "string" ? p.q.slice(0, 200).trim() : "";
  const type = typeof p.type === "string" ? p.type : "";
  const all = [
    ...knowledge.map((a) => ({
      id: "article:" + a.slug,
      kind: "knowledge",
      label: a.category,
      title: a.title,
      description: a.summary,
      keywords: a.keywords,
      href: "/learn/" + a.slug,
    })),
    ...resources.map((t) => ({
      id: "tool:" + t.id,
      kind: "tools",
      label: t.category,
      title: t.name,
      description: t.summary,
      keywords: t.capabilities.join(" "),
      href: "/tools/" + t.id,
    })),
    ...scenarios.map((s) => ({
      id: "scenario:" + s.id,
      kind: "scenarios",
      label: "应用场景",
      title: s.name,
      description: s.summary,
      keywords: s.steps.join(" "),
      href: "/scenarios/" + s.id,
    })),
    ...models.map((m) => ({
      id: "model:" + m.id,
      kind: "models",
      label: m.providerName,
      title: m.name,
      description: m.canonicalId,
      keywords: m.providerName,
      href: "/models/" + m.id,
    })),
  ];
  const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
  const filtered = all.filter(
    (a) =>
      (!type || a.kind === type) &&
      terms.every((term) =>
        (a.title + " " + a.description + " " + a.keywords)
          .toLowerCase()
          .includes(term),
      ),
  );
  const pages = Math.max(1, Math.ceil(filtered.length / 18));
  const page = Math.max(
    1,
    Math.min(pages, Number.isSafeInteger(Number(p.page)) ? Number(p.page) : 1),
  );
  const list = filtered.slice((page - 1) * 18, page * 18);
  const link = (n: number) =>
    "/search?" + new URLSearchParams({ q, type, page: String(n) });
  return (
    <div className="hub">
      <header className="page-intro">
        <div className="eyebrow">SEARCH THE KNOWLEDGE BASE</div>
        <h1>{q ? `搜索：${q}` : "找到你需要的知识与工具。"}</h1>
        <form className="hub-filter" action={appPath("/search")}>
          <input
            name="q"
            defaultValue={q}
            aria-label="搜索 AI 门道"
            maxLength={200}
            placeholder="知识、模型、工具或目标"
          />
          <select name="type" defaultValue={type} aria-label="搜索内容类型">
            <option value="">全部内容</option>
            <option value="knowledge">知识与教程</option>
            <option value="tools">工具平台</option>
            <option value="scenarios">应用场景</option>
            <option value="models">模型资料</option>
          </select>
          <button className="button primary">搜索</button>
        </form>
      </header>
      <p className="muted">
        {filtered.length} 条结果 · 第 {page}/{pages} 页
      </p>
      <div className="resource-grid">
        {list.map((a) => (
          <Link className="resource-card" key={a.id} href={a.href}>
            <small>{a.label}</small>
            <h2>{a.title}</h2>
            <p>{a.description}</p>
          </Link>
        ))}
      </div>
      {!list.length && (
        <div className="empty-panel">
          <h2>暂未找到匹配内容</h2>
          <p>尝试缩短关键词，或从分类开始。</p>
          <Link className="button" href="/learn">
            知识库
          </Link>{" "}
          <Link className="button" href="/tools">
            工具目录
          </Link>
        </div>
      )}
      <nav className="action-row section-spacer" aria-label="搜索分页">
        {page > 1 && (
          <Link className="button" href={link(page - 1)}>
            上一页
          </Link>
        )}
        {page < pages && (
          <Link className="button" href={link(page + 1)}>
            下一页
          </Link>
        )}
      </nav>
    </div>
  );
}
