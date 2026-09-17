import { appPath } from "@/base";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useLocation } from "react-router-dom";
import type { Content } from "@shared/content";
type Bootstrap = Content & {
  modelCount?: number;
  vendors?: [string, string][];
};
const snapshotRoot = document.getElementById("root");
const initialSnapshot = snapshotRoot?.dataset.prerendered
  ? snapshotRoot.innerHTML
  : null;
const Context = createContext<Bootstrap | null>(null);
export function ContentProvider({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const [data, setData] = useState<Bootstrap | null>(null),
    [error, setError] = useState(false),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setError(false);
    fetch(
      appPath("/api/v1/bootstrap") + "?path=" + encodeURIComponent(pathname),
      { signal: controller.signal },
    )
      .then(async (r) => {
        if (!r.ok) throw Error();
        return r.json();
      })
      .then(setData)
      .catch(() => {
        if (!controller.signal.aborted) setError(true);
      });
    const refresh = () => setRetry((x) => x + 1);
    window.addEventListener("focus", refresh);
    return () => {
      controller.abort();
      window.removeEventListener("focus", refresh);
    };
  }, [retry, pathname]);
  if (!data && initialSnapshot && !error)
    return <div dangerouslySetInnerHTML={{ __html: initialSnapshot }} />;
  if (!data)
    return (
      <main className="container page-intro">
        <h1>AI 门道</h1>
        <p role="status">
          {error ? "暂时无法连接内容服务，请稍后重试。" : "正在加载知识库…"}
        </p>
        {error && (
          <button className="button" onClick={() => setRetry((x) => x + 1)}>
            重新连接
          </button>
        )}
      </main>
    );
  return <Context.Provider value={data}>{children}</Context.Provider>;
}
export function useContent() {
  const data = useContext(Context);
  if (!data) throw Error("ContentProvider missing");
  const models = data.catalog.models;
  return {
    ...data,
    models,
    modelCount: data.modelCount ?? models.length,
    vendors: data.vendors ?? [
      ...new Map(models.map((m) => [m.provider, m.providerName])).entries(),
    ],
    findModel: (id: string) => models.find((m) => m.id === id),
    filterModels: (p: Record<string, string | undefined>) =>
      models.filter(
        (m) =>
          (!p.q ||
            `${m.name} ${m.providerName} ${m.canonicalId}`
              .toLowerCase()
              .includes(p.q.toLowerCase())) &&
          (!p.provider || m.provider === p.provider) &&
          (!p.access || m.access === p.access) &&
          (!p.support ||
            (p.support === "price"
              ? !!m.price
              : p.support === "reasoning"
                ? m.reasoning
                : !m.price)),
      ),
  };
}
