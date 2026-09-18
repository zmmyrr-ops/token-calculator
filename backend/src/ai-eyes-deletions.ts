import {
  appendFileSync,
  existsSync,
  readFileSync,
  writeFileSync,
  renameSync,
} from "node:fs";
import path from "node:path";
import type { ContentDatabase } from "./database";
type Deletion = { kind: "run" | "share"; id: string; at: number };
const file = (store: ContentDatabase) =>
  path.join(path.dirname(store.file), "ai-eyes-deletions.jsonl");
export function recordEyesDeletion(
  store: ContentDatabase,
  kind: Deletion["kind"],
  id: string,
) {
  if (store.file === ":memory:") return;
  appendFileSync(
    file(store),
    JSON.stringify({ kind, id, at: Date.now() }) + "\n",
    { mode: 0o600, flush: true },
  );
}
export function replayEyesDeletions(store: ContentDatabase) {
  if (store.file === ":memory:" || !existsSync(file(store))) return;
  const records: Deletion[] = readFileSync(file(store), "utf8")
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));
  const live = records.filter((x) => x.at > Date.now() - 45 * 86400000);
  for (const x of live) {
    if (!/^[A-Za-z0-9_-]{24}$/.test(x.id)) continue;
    if (x.kind === "run")
      store.db.prepare("DELETE FROM ai_eyes_runs WHERE id=?").run(x.id);
    else if (x.kind === "share") {
      store.db
        .prepare("UPDATE ai_eyes_runs SET share_id=NULL WHERE share_id=?")
        .run(x.id);
      store.db.prepare("DELETE FROM ai_eyes_shares WHERE id=?").run(x.id);
    }
  }
  const temp = file(store) + ".tmp";
  writeFileSync(
    temp,
    live.map((x) => JSON.stringify(x)).join("\n") + (live.length ? "\n" : ""),
    { mode: 0o600 },
  );
  renameSync(temp, file(store));
}
