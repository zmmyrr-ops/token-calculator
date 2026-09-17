import { useContent } from "@/content";
import { SaveButton } from "@/components/Library";
import NotFound from "@/pages/not-found";
import Link from "@/Link";
export default function ModelPage({ params }: { params: { slug: string } }) {
  const { findModel } = useContent();

  const { slug } = params;
  const m = findModel(slug);
  if (!m) return <NotFound />;
  return (
    <article className="prose">
      <Link href="/models">← 返回模型目录</Link>
      <p className="eyebrow" style={{ marginTop: 24 }}>
        {m.providerName}
      </p>
      <h1>{m.name}</h1>
      <SaveButton
        item={{
          id: "model:" + m.id,
          title: m.name,
          href: "/models/" + m.id,
          kind: "模型",
        }}
      />
      <p>{m.canonicalId}</p>
      <div className="detail-stats">
        <div>
          <span>上下文长度</span>
          <strong>{m.context?.toLocaleString() ?? "待核验"}</strong>
        </div>
        <div>
          <span>最大输出 token</span>
          <strong>{m.maxOutput?.toLocaleString() ?? "待核验"}</strong>
        </div>
        <div>
          <span>推理模式</span>
          <strong>{m.reasoning ? "支持" : "标准"}</strong>
        </div>
      </div>
      <h2>模型资料</h2>
      <p>{m.description}</p>
      <h2>费用与渠道</h2>
      {m.price ? (
        <>
          <p>
            渠道：{m.channel}。每百万输入 token ${m.price.input}，每百万输出
            token ${m.price.output}。
            {m.price.cache !== null
              ? `缓存命中输入 $${m.price.cache} / 百万 token。`
              : "缓存价格未公开。"}
          </p>
          <p>
            以上为渠道目录基础单价。长上下文阶梯、充值手续费、工具及多模态费用可能另计，不能当作厂商直连报价或网页订阅费用。
          </p>
        </>
      ) : (
        <p>
          暂无可核验的按 token
          单价。该型号仍收录供选型参考，不能将价格缺失解释为免费。
        </p>
      )}
      <h2>本工具的支持范围</h2>
      <ul>
        <li>目录资料：已有来源记录，能力和地区限制以提供方说明为准。</li>
        <li>
          词元计数：可用本地参考编码；尚未确认该型号与编码的精确对应关系。
        </li>
        <li>
          费用：
          {m.price
            ? "可按基础渠道报价计算预算情景。"
            : "可手动填写私人报价进行情景计算。"}
        </li>
        <li>
          推理：
          {m.reasoning
            ? "公开目录标明支持；具体强度枚举未核验，使用默认模式及独立预算。"
            : "按目录中的标准模式处理。"}
        </li>
        <li>推荐：规则候选，没有进行质量实测。</li>
      </ul>
      <p>
        资料获取日期：{m.checkedAt.slice(0, 10)} ·{" "}
        <a href={m.source} target="_blank" rel="noreferrer">
          查看来源
        </a>
      </p>
      <Link
        className="button primary"
        style={{ color: "white", textDecoration: "none" }}
        href="/calculators/tokens"
      >
        打开计算器
      </Link>
    </article>
  );
}
