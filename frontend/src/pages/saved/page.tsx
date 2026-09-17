import LibraryPage from "@/components/Library";
export default function Saved() {
  return (
    <div className="hub">
      <header className="page-intro">
        <div className="eyebrow">YOUR LIBRARY</div>
        <h1>你的知识收藏与实践进度。</h1>
        <p>保存在此浏览器，不同步到服务器。清理浏览器数据前请导出备份。</p>
      </header>
      <LibraryPage />
    </div>
  );
}
