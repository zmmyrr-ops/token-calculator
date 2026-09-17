import { useContent } from "@/content";
import Link from "@/Link";
import { sceneIcons } from "@/components/Practice";
export default function Scenarios() {
  const { scenarios, knowledge } = useContent();
  return (
    <div className="hub practice-hub">
      <header className="learning-hero">
        <div>
          <div className="eyebrow">START WITH AN OUTCOME</div>
          <h1>带着目标，找到一条路线。</h1>
          <p>先选想交付的成果，再看需要的知识、工具和检查步骤。</p>
        </div>
        <aside>
          <strong>工具跟着任务走。</strong>
          <span>明确目标 → 验证最小成果 → 扩大制作</span>
          <Link href="/tutorials">浏览全部实践教程 →</Link>
        </aside>
      </header>
      <div className="scene-grid">
        {scenarios.map((s, i) => {
          const a = knowledge.find((a) => a.practice?.scenario === s.id);
          const p = a?.practice;
          const Icon = sceneIcons[s.id as keyof typeof sceneIcons];
          return (
            <article className="scene-card" key={s.id}>
              <div className={"scene-card-top art-" + s.id}>
                <Icon size={40} strokeWidth={1.2} />
                <span>0{i + 1}</span>
              </div>
              <h2>
                <Link href={"/scenarios/" + s.id}>{s.name}</Link>
              </h2>
              <p>{p?.result || s.summary}</p>
              <ol>
                {s.steps.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ol>
              <p className="scene-fit">适合：{p?.audience}</p>
              <Link className="button" href={"/scenarios/" + s.id}>
                查看制作路线 →
              </Link>
            </article>
          );
        })}
      </div>
      <section className="learning-note">
        <h2>不确定该用哪个模型？</h2>
        <p>
          先写清输入、输出和验收条件。文字助手可以帮助拆解任务，图像、视频与 3D
          生成工具承担素材制作，引擎或编辑软件负责实际集成。它们通常需要配合使用。
        </p>
        <Link href="/learn/models-and-platforms">
          理解模型、平台和 API 的区别 →
        </Link>
      </section>
    </div>
  );
}
