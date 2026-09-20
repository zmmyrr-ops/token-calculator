/** One taxonomy for the website, mini program and future collected material. */
export const learningCategories = [
  "入门与选型",
  "游戏开发",
  "图像与3D",
  "视频与音频",
  "智能体与自动化",
  "模型与工程",
];
const aliases: Record<string, string> = {
  基础知识: "入门与选型",
  入门指南: "入门与选型",
  使用方法: "入门与选型",
  本站工具教程: "入门与选型",
  游戏开发实战: "游戏开发",
  官方资料导读: "游戏开发",
  "3D 建模": "图像与3D",
  图像工作流: "图像与3D",
  创作方法: "图像与3D",
  图像与视频: "图像与3D",
  视频创作: "视频与音频",
  费用知识: "视频与音频",
  音频创作: "视频与音频",
  视频后期: "视频与音频",
  办公自动化: "智能体与自动化",
  自动化实践: "智能体与自动化",
  智能体与开发: "智能体与自动化",
  提示词与知识库: "智能体与自动化",
  模型实践: "模型与工程",
  模型原理与实践: "模型与工程",
};
export function learningCategory(category: string) {
  return learningCategories.includes(category)
    ? category
    : aliases[category] || "模型与工程";
}
export function learningCategoryFilter(category: string) {
  return learningCategories.includes(category) || aliases[category]
    ? learningCategory(category)
    : category;
}
export function learningFormat(a: {
  curation?: unknown;
  video?: unknown;
  practice?: unknown;
  workshop?: unknown;
}) {
  return a.curation
    ? "curated"
    : a.video
      ? "video"
      : a.practice || a.workshop
        ? "practice"
        : "article";
}
export function learningMatchesFormat(format: string, selected: string) {
  return (
    !selected ||
    selected === "scenarios" ||
    (selected === "internal"
      ? format === "article" || format === "practice"
      : selected === "external"
        ? format === "curated" || format === "video"
        : format === selected)
  );
}
