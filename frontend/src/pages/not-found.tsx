import Link from "@/Link";
export default function NotFound() {
  return (
    <section className="prose">
      <h1>这个页面暂时找不到。</h1>
      <p>模型名称可能已更新，请返回目录搜索。</p>
      <Link href="/models">查看模型目录</Link>
    </section>
  );
}
