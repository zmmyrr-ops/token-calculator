import { NewsService } from "./news";
import { ContentDatabase } from "./database";
process.env.NEWS_DATA_FILE ||= "./backend/storage/news.json";
process.env.DATABASE_FILE ||= "./backend/storage/mendao.sqlite";
const database = new ContentDatabase();
const news = new NewsService(database);
try {
  await news.init();
  await news.refresh();
  console.log(JSON.stringify(news.status(), null, 2));
} finally {
  await news.stop();
  database.close();
}
