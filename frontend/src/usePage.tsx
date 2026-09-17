import { useEffect, useState } from "react";
import { appPath } from "./base";
import Link from "./Link";
export function usePage<T>(
  endpoint: string,
  params: Record<string, string | undefined>,
  pageSize = 18,
) {
  const raw = Number(params.page);
  const page = Number.isSafeInteger(raw) && raw > 0 && raw <= 100000 ? raw : 1;
  const query = new URLSearchParams();
  for (const [k, v] of Object.entries(params))
    if (v !== undefined) query.set(k, v);
  query.set("page", String(page));
  query.set("pageSize", String(pageSize));
  const url = appPath(endpoint) + "?" + query;
  const [response, setResponse] = useState<{
    url: string;
    items: T[];
    total: number;
    categories: string[];
  } | null>(null);
  const [error, setError] = useState(false);
  const [attempt, retry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setError(false);
    fetch(url, { signal: controller.signal })
      .then(async (r) => {
        if (!r.ok) throw Error();
        const data = await r.json();
        if (!controller.signal.aborted) setResponse({ ...data, url });
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(true);
      });
    return () => controller.abort();
  }, [url, attempt]);
  const data = response?.url === url ? response : null;
  return {
    data,
    page,
    status:
      !data &&
      (error ? (
        <p role="alert">
          加载失败。
          <button className="button" onClick={() => retry((x) => x + 1)}>
            重试
          </button>
        </p>
      ) : (
        <p role="status">正在加载…</p>
      )),
  };
}
export function Pagination({
  path,
  params,
  page,
  total,
  pageSize = 18,
}: {
  path: string;
  params: Record<string, string | undefined>;
  page: number;
  total: number;
  pageSize?: number;
}) {
  const link = (n: number) => {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params))
      if (value) query.set(key, value);
    query.set("page", String(n));
    return path + "?" + query;
  };
  return (
    <nav className="pagination" aria-label="分页">
      {page > 1 && (
        <Link className="button" href={link(page - 1)}>
          上一页
        </Link>
      )}
      <span>
        第 {page} 页 · 共 {Math.max(1, Math.ceil(total / pageSize))} 页
      </span>
      {page * pageSize < total && (
        <Link className="button" href={link(page + 1)}>
          下一页
        </Link>
      )}
    </nav>
  );
}
