import MediaBudget from "@/components/MediaBudget";
export default function Page() {
  return (
    <div className="hub">
      <header className="page-intro">
        <div className="eyebrow">MEDIA BUDGET</div>
        <h1>用你的真实报价，规划素材成本。</h1>
        <p>
          适用于视频秒数、图片张数和3D资产数量。支持按用量或额度包计算，不内置虚构价格。
        </p>
      </header>
      <MediaBudget />
    </div>
  );
}
