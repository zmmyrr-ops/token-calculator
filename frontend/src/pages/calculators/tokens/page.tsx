import { useContent } from "@/content";
import { ArrowUpRight, ShieldCheck, Zap, Scale } from "lucide-react";
import Calculator from "@/components/Calculator";
export default function TokenCalculatorPage() {
  const { catalog, models } = useContent();

  const defaults = [
    "openai/gpt-5.6-luna",
    "deepseek/deepseek-v4.1-flash",
    "google/gemini-3.8-flash",
  ];
  const initial = defaults
    .map((id) => models.find((m) => m.canonicalId === id))
    .filter((m): m is (typeof models)[number] => !!m);
  return (
    <>
      <section className="hero">
        <div>
          <div className="eyebrow">A LITTLE CLARITY, BEFORE YOU ASK</div>
          <h1>
            提问前，先算用量，<span>再选模型。</span>
          </h1>
          <p>把复杂的词元和价格，变成一目了然的选择。</p>
        </div>
        <div className="hero-aside">
          <span>
            <ShieldCheck size={14} /> 文本不上传
          </span>
          <span>
            <Zap size={14} /> 即时计算
          </span>
        </div>
      </section>
      <noscript>
        <p className="alert">
          启用 JavaScript 后可浏览知识库并使用浏览器本地计算。
        </p>
      </noscript>
      <Calculator
        initialModels={initial.length ? initial : models.slice(0, 3)}
        catalogVersion={catalog.version}
        modelCount={models.length}
      />
      <section className="info-strip">
        <div>
          <h3>
            <ShieldCheck size={15} /> 你的文字，只属于你
          </h3>
          <p>输入和文件都在浏览器中处理，不会发送至服务器，也不默认保存。</p>
        </div>
        <div>
          <h3>
            <Scale size={15} /> 清楚区分计算与估算
          </h3>
          <p>
            编码计数、输出预算与模型实际用量分别标注，不用一个数字掩盖不确定性。
          </p>
        </div>
        <div>
          <h3>
            <ArrowUpRight size={15} /> 有来源的模型资料
          </h3>
          <p>
            每个条目保留报价渠道、资料来源与核验日期。查看目录了解覆盖情况。
          </p>
        </div>
      </section>
    </>
  );
}
