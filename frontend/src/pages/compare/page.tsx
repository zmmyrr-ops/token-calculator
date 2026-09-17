import { appPath } from "@/base";
import { useContent } from "@/content";
import Link from "@/Link";
export default function Compare({
  searchParams,
}: {
  searchParams: { ids?: string | string[]; category?: string };
}) {
  const { resources } = useContent();
  const p = searchParams;
  const ids = [
    ...new Set(
      (Array.isArray(p.ids) ? p.ids : (p.ids || "").split(",")).filter((id) =>
        resources.some((t) => t.id === id),
      ),
    ),
  ];
  const selected = resources.filter((t) => ids.slice(0, 4).includes(t.id));
  const different = new Set(selected.map((t) => t.category)).size > 1;
  return (
    <div className="hub">
      <header className="page-intro">
        <div className="eyebrow">COMPARE WITH CONTEXT</div>
        <h1>比较工具，先看同一件事。</h1>
        <p>最多对照 4 个工具。能力依据官方资料，未提供未经实测的质量排名。</p>
      </header>
      <form action={appPath("/compare")}>
        <fieldset className="compare-options">
          <legend>选择需要对照的工具</legend>
          {resources.map((t) => (
            <label key={t.id}>
              <input
                type="checkbox"
                name="ids"
                value={t.id}
                defaultChecked={selected.some((s) => s.id === t.id)}
              />
              {t.name}
              <small>{t.category}</small>
            </label>
          ))}
        </fieldset>
        <div className="action-row">
          <button className="button primary">开始比较</button>
          <Link className="button" href="/compare">
            清空选择
          </Link>
        </div>
      </form>
      {ids.length > 4 && (
        <p className="alert">
          最多比较4项，本次仅显示前4项。请减少选择后重新比较。
        </p>
      )}
      {selected.length > 0 ? (
        <>
          <p className="section-spacer">
            {different
              ? "所选工具跨越不同类别，以下展示它们在流程中的职责差异。"
              : "同类工具能力对照。实际效果、价格与账号权限需按你的任务确认。"}
          </p>
          <div
            className="comparison-scroll"
            tabIndex={0}
            role="region"
            aria-label="工具对照表"
          >
            <table className="comparison-table">
              <caption>工具能力与来源对照</caption>
              <thead>
                <tr>
                  <th scope="col">维度</th>
                  {selected.map((t) => (
                    <th scope="col" key={t.id}>
                      <Link href={`/tools/${t.id}`}>{t.name}</Link>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(
                  [
                    ["分类", "category"],
                    ["输入", "input"],
                    ["输出", "output"],
                    ["访问方式", "access"],
                    ["使用前确认", "limits"],
                  ] as const
                ).map(([label, key]) => (
                  <tr key={key}>
                    <th scope="row">{label}</th>
                    {selected.map((t) => (
                      <td key={t.id}>{t[key]}</td>
                    ))}
                  </tr>
                ))}
                <tr>
                  <th scope="row">资料来源</th>
                  {selected.map((t) => (
                    <td key={t.id}>
                      <a href={t.source} target="_blank" rel="noreferrer">
                        官方资料 ↗
                      </a>
                      <br />
                      {t.checkedAt}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <p className="empty-panel">
          选择工具后，查看输入输出、使用方式和限制的差异。
        </p>
      )}
    </div>
  );
}
