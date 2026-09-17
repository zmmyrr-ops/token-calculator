import { appPath } from "@/base";
import { usePage, Pagination } from "@/usePage";
import Link from "@/Link";
export default function Search({
  searchParams,
}: {
  searchParams: { q?: string; type?: string; page?: string };
}) {
  const p = searchParams;
  const q = typeof p.q === "string" ? p.q.slice(0, 200).trim() : "";
  const type = typeof p.type === "string" ? p.type : "";
  const { data, page, status } = usePage<{
    id: string;
    href: string;
    label: string;
    title: string;
    description: string;
  }>("/api/v1/search", p);
  const list = data?.items ?? [];
  const pages = Math.max(1, Math.ceil((data?.total ?? 0) / 18));
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
      {status}
      {data && (
        <p className="muted">
          {data?.total ?? 0} 条结果 · 第 {page}/{pages} 页
        </p>
      )}
      <div className="resource-grid">
        {list.map((a) => (
          <Link className="resource-card" key={a.id} href={a.href}>
            <small>{a.label}</small>
            <h2>{a.title}</h2>
            <p>{a.description}</p>
          </Link>
        ))}
      </div>
      {data && !list.length && (
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
      {data && (
        <Pagination path="/search" params={p} page={page} total={data.total} />
      )}
    </div>
  );
}
