import { featureGuides } from "@shared/feature-guides";
import Link from "@/Link";
export default function FeatureGuide({ path }: { path: string }) {
  const g = featureGuides[path];
  if (!g) return null;
  return (
    <section
      className="panel prose"
      style={{ padding: 24, marginTop: 32 }}
      aria-label="使用指南"
    >
      <h2>{g.title}</h2>
      <p>{g.intro}</p>
      <ol>
        {g.steps.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ol>
      {g.faq.map((f) => (
        <section key={f.title}>
          <h3>{f.title}</h3>
          <p>{f.body}</p>
        </section>
      ))}
      <Link href={"/learn/" + g.tutorial}>查看完整教程 →</Link>
    </section>
  );
}
