import { ContentDatabase } from "./database";
import { LearningCollector } from "./learning-collector";
const store = new ContentDatabase();
try {
  if (!store.meta("seeded"))
    throw Error("请先启动服务初始化内容数据库，并使用相同DATABASE_FILE");
  const service = new LearningCollector(store);
  await service.refresh();
  console.log(JSON.stringify(service.status()));
} finally {
  store.close();
}
