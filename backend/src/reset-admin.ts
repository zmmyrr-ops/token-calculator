import { randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";
import path from "node:path";
import { ContentDatabase } from "./database";
import { hashPassword } from "./admin";
process.env.DATABASE_FILE ||= "./backend/storage/mendao.sqlite";
const database = new ContentDatabase();
try {
  const username = process.env.ADMIN_USERNAME || "admin";
  if (
    !database.db.prepare("SELECT 1 FROM admins WHERE username=?").get(username)
  )
    throw Error("管理员不存在；请检查数据库路径和 ADMIN_USERNAME");
  const password = randomBytes(24).toString("base64url");
  const hash = await hashPassword(password);
  const file = path.join(
    path.dirname(database.file),
    "admin-initial-credentials.txt",
  );
  writeFileSync(
    file,
    `AI 门道管理后台\n用户名：${username}\n初始密码：${password}\n首次登录后必须修改密码。不要分享此文件。\n`,
    { mode: 0o600 },
  );
  database.transaction(() => {
    database.db
      .prepare("UPDATE admins SET password=?,must_change=1 WHERE username=?")
      .run(hash, username);
    database.db.prepare("DELETE FROM sessions WHERE username=?").run(username);
    database.db.prepare("DELETE FROM login_limits").run();
  });
  console.log("密码已重置，旧会话已撤销。新凭据文件：" + file);
} finally {
  database.close();
}
