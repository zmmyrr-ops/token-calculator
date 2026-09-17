import { storageKey } from "@/base";
import { useMemo, useState, useSyncExternalStore } from "react";
import Link from "@/Link";
import { Bookmark, Check, Download, Upload, Trash2 } from "lucide-react";
import {
  emptyLibrary,
  parseLibrary,
  type Library,
  type SavedItem,
} from "@shared/library";
const key = storageKey("ruming-library-v1");
const fallback = JSON.stringify(emptyLibrary);
let memory = fallback;
let volatile = false;
function snapshot() {
  try {
    return volatile ? memory : localStorage.getItem(key) || fallback;
  } catch {
    return memory;
  }
}
function subscribe(fn: () => void) {
  window.addEventListener("storage", fn);
  window.addEventListener("library-change", fn);
  return () => {
    window.removeEventListener("storage", fn);
    window.removeEventListener("library-change", fn);
  };
}
function useLibrary() {
  const raw = useSyncExternalStore(subscribe, snapshot, () => fallback);
  const data = useMemo(() => {
    try {
      return parseLibrary(raw);
    } catch {
      return emptyLibrary;
    }
  }, [raw]);
  const [message, setMessage] = useState("");
  function save(next: Library) {
    const serialized = JSON.stringify(next);
    try {
      parseLibrary(serialized);
    } catch {
      setMessage("内容超出允许范围，请先导出并整理收藏或进度。");
      return;
    }
    memory = serialized;
    try {
      localStorage.setItem(key, serialized);
      volatile = false;
      setMessage("已保存在此浏览器");
    } catch {
      volatile = true;
      setMessage("浏览器存储不可用，本次修改仅在当前页面保留，请导出备份。");
    }
    window.dispatchEvent(new Event("library-change"));
  }
  return { data, save, message, setMessage };
}
export function SaveButton({ item }: { item: SavedItem }) {
  const { data, save, message, setMessage } = useLibrary();
  const exists = data.items.some((x) => x.id === item.id);
  return (
    <div className="save-control">
      <button
        className="button"
        aria-pressed={exists}
        onClick={() => {
          if (!exists && data.items.length >= 500) {
            setMessage("收藏已达500条，请先整理收藏。");
            return;
          }
          save({
            ...data,
            items: exists
              ? data.items.filter((x) => x.id !== item.id)
              : [...data.items, item],
          });
        }}
      >
        {exists ? <Check size={15} /> : <Bookmark size={15} />}{" "}
        {exists ? "已收藏" : "收藏"}
      </button>
      <span role="status">{message}</span>
    </div>
  );
}
export function Progress({ slug, titles }: { slug: string; titles: string[] }) {
  const { data, save, message } = useLibrary();
  const id = slug + ":v1";
  const done = data.progress[id] || [];
  return (
    <section className="reading-progress">
      <h2>
        我的实践进度{" "}
        <small>
          {done.filter((n) => n < titles.length).length}/{titles.length}
        </small>
      </h2>
      <p>勾选你已完成的步骤，记录保存在此浏览器，可从“我的收藏”导出备份。</p>
      {titles.map((title, i) => (
        <label key={title}>
          <input
            type="checkbox"
            checked={done.includes(i)}
            onChange={() =>
              save({
                ...data,
                progress: {
                  ...data.progress,
                  [id]: done.includes(i)
                    ? done.filter((x) => x !== i)
                    : [...done, i],
                },
              })
            }
          />
          {title}
        </label>
      ))}
      <span role="status">{message}</span>
    </section>
  );
}
export default function LibraryPage() {
  const { data, save, message, setMessage } = useLibrary();
  const [confirm, setConfirm] = useState(false);
  function exportData() {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ruming-library.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <>
      <div className="action-row">
        <button className="button" onClick={exportData}>
          <Download size={16} /> 导出备份
        </button>
        <label className="button">
          <Upload size={16} /> 导入备份
          <input
            type="file"
            accept=".json,application/json"
            hidden
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              try {
                if (file.size > 1024 * 1024) throw Error("文件需小于1 MiB");
                const incoming = parseLibrary(await file.text());
                const items = [
                  ...new Map(
                    [...data.items, ...incoming.items].map((x) => [x.id, x]),
                  ).values(),
                ];
                const progress = { ...data.progress };
                for (const [id, steps] of Object.entries(incoming.progress))
                  progress[id] = [
                    ...new Set([...(progress[id] || []), ...steps]),
                  ];
                save({ version: 1, items, progress });
              } catch {
                setMessage(
                  "无法导入：请选择有效的知识站备份文件，合并后最多500条收藏/进度。",
                );
              }
            }}
          />
        </label>
        <button className="button" onClick={() => setConfirm(true)}>
          <Trash2 size={16} /> 清除全部
        </button>
      </div>
      {confirm && (
        <div className="alert">
          <p>将清除此浏览器的收藏与实践进度。需要保留时请先导出。</p>
          <button
            className="button"
            onClick={() => {
              save(emptyLibrary);
              setConfirm(false);
            }}
          >
            确认清除
          </button>{" "}
          <button className="button" onClick={() => setConfirm(false)}>
            取消
          </button>
        </div>
      )}
      <p role="status">{message}</p>
      {data.items.length ? (
        <div className="resource-grid">
          {data.items.map((item) => (
            <article className="resource-card" key={item.id}>
              <small>{item.kind}</small>
              <h2>
                <Link href={item.href}>{item.title}</Link>
              </h2>
              <button
                className="text-button"
                onClick={() =>
                  save({
                    ...data,
                    items: data.items.filter((x) => x.id !== item.id),
                  })
                }
              >
                移除收藏
              </button>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-panel">
          <Bookmark size={26} />
          <h2>把有用的内容留在这里</h2>
          <p>
            在文章、工具或模型详情中点击收藏。无需账号，仅保存在你自己的浏览器。
          </p>
          <Link className="button primary" href="/learn">
            浏览知识库
          </Link>
        </div>
      )}
      {Object.keys(data.progress).length > 0 && (
        <section>
          <h2>实践进度</h2>
          <ul>
            {Object.entries(data.progress).map(([id, steps]) => (
              <li key={id}>
                <Link
                  href={"/learn/" + encodeURIComponent(id.replace(/:v1$/, ""))}
                >
                  查看路线 · {steps.length} 个步骤已勾选
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
