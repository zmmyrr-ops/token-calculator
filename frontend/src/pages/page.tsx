import { appPath } from "@/base";
import { News } from "@/News";
import { useContent } from "@/content";
import Link from "@/Link";
import {
  ArrowUpRight,
  ArrowRight,
  Search,
  BookOpen,
  Boxes,
  Clapperboard,
  Gamepad2,
  Calculator,
  Layers3,
} from "lucide-react";
const scenes = [
  {
    slug: "game-prototype",
    title: "游戏开发",
    subtitle: "让想法变成可以玩的第一版",
    steps: "玩法策划 / 编程原型 / 美术素材 / 音效",
    icon: Gamepad2,
    number: "01",
    className: "game",
  },
  {
    slug: "image-to-3d",
    title: "3D 建模",
    subtitle: "从参考图，到真正可用的资产",
    steps: "网格生成 / 拓扑与 UV / 材质 / 引擎导入",
    icon: Boxes,
    number: "02",
    className: "three",
  },
  {
    slug: "video-workflow",
    title: "视频创作",
    subtitle: "从一个镜头，到一支完整短片",
    steps: "脚本分镜 / 画面生成 / 配音 / 剪辑",
    icon: Clapperboard,
    number: "03",
    className: "video",
  },
];
export default function Home() {
  const { modelCount, knowledge, resources } = useContent();
  return (
    <div className="portal">
      <section className="portal-hero">
        <div>
          <div className="eyebrow">EXPLORE THE INTELLIGENCE</div>
          <h1>
            看懂 AI，
            <br />
            <span>用出门道。</span>
          </h1>
          <p>
            看 AI 资讯，找实用工具，学创作方法。
            <br />
            从第一次提问，到完成一个项目，都从这里开始。
          </p>
          <form action={appPath("/search")} className="portal-search">
            <Search size={20} />
            <input
              aria-label="搜索 AI 门道"
              name="q"
              maxLength={200}
              placeholder="搜索知识、模型，或你想完成的事…"
              required
            />
            <button type="submit">
              搜索 <ArrowRight size={16} />
            </button>
          </form>
          <div className="portal-hot">
            试着探索 <Link href="/learn/tokens">Token 是什么</Link>
            <Link href="/learn/image-to-3d">图片转 3D</Link>
            <Link href="/models">模型怎么选</Link>
          </div>
        </div>
        <aside className="portal-feature">
          <div className="portal-feature-top">
            <span>从入门到实践</span>
            <BookOpen size={20} />
          </div>
          <div className="orbital" aria-hidden="true">
            <div className="orbit orbit-one" />
            <div className="orbit orbit-two" />
            <div className="orb-core"><img src={appPath("/brand/ai-door-v4.png")} alt="" width="88" height="88" /></div>
            <span className="orbit-label label-one">KNOWLEDGE</span>
            <span className="orbit-label label-two">MODELS</span>
            <span className="orbit-label label-three">CREATE</span>
          </div>
          <h2>
            知识不是终点，
            <br />
            用起来才是。
          </h2>
          <p>
            概念、模型、教程和费用工具，
            <br />
            连接在同一张知识地图里。
          </p>
          <Link href="/learn/models-and-platforms">
            从模型与平台开始了解 <ArrowUpRight size={17} />
          </Link>
        </aside>
      </section>
      <div className="portal-strip">
        <span>
          <BookOpen size={17} /> 基础概念与实用方法
        </span>
        <Link href="/models">
          <Layers3 size={17} /> {modelCount} 个模型条目{" "}
          <ArrowUpRight size={14} />
        </Link>
        <Link href="/calculators/tokens">
          <Calculator size={17} /> 本地词元计算，正文不上传{" "}
          <ArrowUpRight size={14} />
        </Link>
      </div>
      <News compact />
      <section className="portal-section" id="knowledge">
        <div className="portal-section-head">
          <div>
            <div className="eyebrow">01 / KNOW THE BASICS</div>
            <h2>先把 AI 读懂</h2>
            <p>用具体的问题，理解概念与选择。</p>
          </div>
          <Link href="/learn">
            浏览知识 <ArrowRight size={16} />
          </Link>
        </div>
        <div className="portal-knowledge">
          {knowledge.slice(0, 4).map((a, i) => (
            <Link href={`/learn/${a.slug}`} key={a.slug}>
              <span className="portal-index">
                0{i + 1} <small>{a.category}</small>
              </span>
              <h3>{a.title}</h3>
              <p>{a.summary}</p>
              <span className="portal-read">
                开始阅读 <ArrowUpRight size={16} />
              </span>
            </Link>
          ))}
        </div>
      </section>
      <section className="portal-section" id="scenarios">
        <div className="portal-section-head">
          <div>
            <div className="eyebrow">02 / PUT AI TO WORK</div>
            <h2>从你想做的事情出发</h2>
            <p>先明确目标，再选择合适的模型、平台和方法。</p>
          </div>
          <span className="portal-tag">首批精选场景</span>
        </div>
        <div className="portal-scenes">
          {scenes.map((s) => (
            <Link
              key={s.slug}
              href={`/scenarios/${s.slug === "game-prototype" ? "games" : s.slug === "image-to-3d" ? "3d" : "video"}`}
              className={`portal-scene ${s.className}`}
            >
              <div className="portal-scene-art">
                <s.icon size={54} strokeWidth={1.2} />
                <span>{s.number}</span>
              </div>
              <div className="portal-scene-body">
                <h3>
                  {s.title}
                  <ArrowUpRight size={19} />
                </h3>
                <p>{s.subtitle}</p>
                <small>{s.steps}</small>
              </div>
            </Link>
          ))}
        </div>
        <p className="portal-section-note">
          从独立创作到图像工作流、办公自动化，按任务找到相关知识与工具。
        </p>
      </section>
      <section className="portal-bottom" id="guides">
        <div>
          <div className="eyebrow">03 / LEARN BY DOING</div>
          <h2>沿着清楚的步骤，完成第一版</h2>
          <div className="portal-guide-list">
            {knowledge
              .filter((a) =>
                ["game-prototype", "image-to-3d", "video-workflow"].includes(
                  a.slug,
                ),
              )
              .map((a) => (
                <Link key={a.slug} href={`/learn/${a.slug}`}>
                  <span>{a.category}</span>
                  <div>
                    <h3>{a.title}</h3>
                    <p>{a.summary}</p>
                  </div>
                  <ArrowUpRight size={18} />
                </Link>
              ))}
          </div>
          <p className="portal-section-note">
            路线为编辑整理的操作建议，包含人工检查；未标记为工具效果实测。
          </p>
        </div>
        <aside className="portal-tool">
          <div className="eyebrow">实用工具</div>
          <Calculator size={34} strokeWidth={1.3} />
          <h2>
            提问前，
            <br />
            先算用量与预算。
          </h2>
          <p>本地计算 token，比较模型费用，分别设置回答和推理预算。</p>
          <Link className="portal-primary" href="/calculators/tokens">
            打开词元计算器 <ArrowRight size={17} />
          </Link>
          <Link href="/how-it-works" className="portal-tool-help">
            这些数字是怎么算的？
          </Link>
        </aside>
      </section>
      <section className="portal-section portal-models">
        <div>
          <div className="eyebrow">MODEL DIRECTORY</div>
          <h2>模型很多，先看清它们的区别。</h2>
          <p>按厂商、访问方式和支持能力筛选，查看报价渠道、来源与核验日期。</p>
          <p className="portal-section-note">
            目录收录与能力实测分开。未知资料与参考计数会明确标注。
          </p>
        </div>
        <Link className="portal-primary" href="/models">
          探索 {modelCount} 个模型 <ArrowUpRight size={18} />
        </Link>
      </section>
      <section className="portal-section">
        <div className="portal-section-head">
          <div>
            <div className="eyebrow">TOOLS & PLATFORMS</div>
            <h2>不止认识模型，也了解工具。</h2>
            <p>每一份工具资料，都连接到官方来源与应用方法。</p>
          </div>
          <Link href="/tools">浏览全部工具 →</Link>
        </div>
        <div className="resource-grid">
          {resources
            .filter((t) => ["meshy", "runway", "n8n"].includes(t.id))
            .map((t) => (
              <Link
                className="resource-card"
                href={`/tools/${t.id}`}
                key={t.id}
              >
                <small>{t.category}</small>
                <h2>{t.name}</h2>
                <p>{t.summary}</p>
                <span>了解能力与限制 →</span>
              </Link>
            ))}
        </div>
      </section>
      <section className="portal-updates" id="updates">
        <div>
          <div className="eyebrow">SOURCES & METHODS</div>
          <h2>有来源，才能有判断。</h2>
        </div>
        <div>
          <h3>资料、计算口径与维护记录</h3>
          <p>
            模型报价保留渠道和时间，工具能力链接官方文档。没有依据的价格、热度和评分，不作为选择依据。
          </p>
          <Link href="/updates">查看资料记录 →</Link>
        </div>
      </section>
    </div>
  );
}
