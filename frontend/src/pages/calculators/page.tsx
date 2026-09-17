import Link from "@/Link";
export default function Calculators() {
  return (
    <div className="hub">
      <header className="page-intro">
        <div className="eyebrow">PRACTICAL TOOLS</div>
        <h1>把不确定的选择，拆成清楚的数字。</h1>
        <p>词元计数、预算与工具比较，使用真实输入和明确的计算口径。</p>
      </header>
      <div className="resource-grid">
        <Link className="resource-card" href="/calculators/tokens">
          <small>文本 / 模型费用</small>
          <h2>词元计算器</h2>
          <p>浏览器本地分词，比较模型报价，分别设置回答与推理预算。</p>
          <span>开始计算 →</span>
        </Link>
        <Link className="resource-card" href="/calculators/media">
          <small>视频 / 图像 / 3D</small>
          <h2>素材预算</h2>
          <p>使用自己的服务报价，计算重试用量、额度包购买数和新增支出。</p>
          <span>规划预算 →</span>
        </Link>
        <Link className="resource-card" href="/compare">
          <small>平台 / 流程职责</small>
          <h2>工具比较</h2>
          <p>对照输入输出、使用方式与限制，从官方资料中理解区别。</p>
          <span>选择工具 →</span>
        </Link>
      </div>
    </div>
  );
}
