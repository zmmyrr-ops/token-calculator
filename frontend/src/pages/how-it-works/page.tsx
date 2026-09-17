export default function Method() {
  return (
    <article className="prose">
      <div className="eyebrow">HOW IT WORKS</div>
      <h1>每个数字，都有清楚的来由。</h1>
      <h2>词元不等于字数</h2>
      <p>
        不同分词器会把同一段文字切成不同的 token。我们在浏览器内使用固定版本的
        o200k_base 或 cl100k_base
        编码；对该编码的计数是确定的，对尚未核验映射的模型则只是参考。不会用中文字符数乘一个系数来冒充精确结果。
      </p>
      <h2>输入、回答和推理分开计算</h2>
      <p>
        输入计数对应文本框中实际文字。回答和推理尚未发生，只能设置预算情景。简短、标准、详细是可修改的预算假设，不是历史预测区间。low/high
        等推理强度不对应固定 token 倍率。
      </p>
      <pre>
        单次情景费用 = 非缓存输入 × 输入单价\n + 缓存输入 × 缓存单价\n +
        可见回答 × 输出单价\n + 计费推理 × 对应单价
      </pre>
      <p>
        单价在计算时按每百万 token
        换算。报价基于标注渠道；实际请求可能还包含系统提示、多轮历史、工具结果、阶梯计价和平台费用。部分模型的
        API output_tokens 已包含推理量，不能重复相加。
      </p>
      <h2>费用不是精确预测</h2>
      <p>
        目录报价为渠道公布的基础价。预算较低/典型/较高只反映填写的假设，不能作为实际费用保证。计算会应用渠道目录公开的输入长度阶梯与当前
        UTC
        时段价格。月预算是当前时段情景的乘算，不是未来各时段的账单预测。价格超过
        7 天提醒复核，超过 30
        天退出自动预算。人民币汇率由用户手动填写，不是实时汇率。
      </p>
      <h2>推荐如何产生</h2>
      <p>
        本地规则先识别任务；用户选择优先于自动判断。排除超限、缺价和不完整预算后，结合任务与支持推理的标记排序。没有调用大模型，也没有实测回答质量；质量优先模式只能给出候选，不能证明哪个模型最优。
      </p>
      <h2>数据覆盖</h2>
      <p>
        目录来源是 OpenRouter
        的公开渠道清单与补充官方资料，按独立型号收录并去除批量等渠道变体。没有价格或
        tokenizer
        的型号仍可查阅，支持状态单独标明。资料会变化，目录页显示日期、来源与已知缺口。
      </p>
      <h2>与 ChatGPT、Codex 订阅的区别</h2>
      <p>
        API
        按量报价不能换算订阅额度或月费。本工具也无法看到网页产品内部系统提示与推理过程，因此不能预测它们的实际额度消耗。
      </p>
      <h2>参考来源</h2>
      <ul>
        <li>
          <a href="https://developers.openai.com/api/docs/guides/token-counting">
            OpenAI 输入计数说明
          </a>
        </li>
        <li>
          <a href="https://developers.openai.com/api/docs/guides/reasoning">
            OpenAI 推理 token 说明
          </a>
        </li>
        <li>
          <a href="https://openrouter.ai/api/v1/models">
            OpenRouter 公开模型与报价清单
          </a>
        </li>
        <li>
          <a href="https://github.com/dqbd/tiktoken">js-tiktoken 开源分词器</a>
        </li>
      </ul>
    </article>
  );
}
