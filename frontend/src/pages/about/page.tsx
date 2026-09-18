import { useContent } from "@/content";
import Link from "@/Link";
export default function About() {
  const { site } = useContent();
  return (
    <article className="prose">
      <div className="eyebrow">ABOUT RUMING</div>
      <h1>让知识、选择与实践连接起来。</h1>
      <p>
        本站整理 AI
        基础知识、模型与平台资料和操作方法，并提供本地计算工具。能力描述来自标注的公开来源；编辑建议与费用情景不当作实测效果或实际账单。
      </p>
      <h2>资料与数据</h2>
      <p>
        模型目录采用 OpenRouter
        渠道快照并补充官方资料。渠道报价和厂商直连、网页订阅并非相同口径。没有公开证据的字段显示未知，不编造价格、评分或使用量。
      </p>
      <h2>本地功能</h2>
      <p>
        词元计算正文、收藏、实践进度和手动预算在浏览器中处理。收藏不跨设备同步，可自行导入导出。了解详情请阅读
        <Link href="/privacy">隐私说明</Link>。
      </p>
      <h2>联系方式</h2>
      <p>
        <a href="tel:16628717656">16628717656</a>（微信同号）
      </p>
      <h2>网站信息</h2>
      <dl className="detail-spec">
        <dt>域名</dt>
        <dd>{site.domain}</dd>
        <dt>主办单位</dt>
        <dd>
          {site.organizer}（{site.organizerType}）
        </dd>
        <dt>网站备案号</dt>
        <dd>
          <a href="https://beian.miit.gov.cn/" target="_blank" rel="noreferrer">
            {site.icp}
          </a>
        </dd>
        <dt>备案审核日期</dt>
        <dd>{site.approvedAt}</dd>
      </dl>
    </article>
  );
}
