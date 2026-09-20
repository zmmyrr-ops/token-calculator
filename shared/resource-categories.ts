export const resourceCategories = [
  "助手与模型",
  "图像与设计",
  "视频与后期",
  "音频与音乐",
  "3D与游戏资产",
  "游戏引擎与渲染",
  "自动化与智能体",
  "模型开发与部署",
];
const aliases: Record<string, string> = {
  通用助手: "助手与模型",
  图像工作流: "图像与设计",
  图像设计: "图像与设计",
  图像模型: "图像与设计",
  图像与视频: "图像与设计",
  视频生成: "视频与后期",
  视频后期: "视频与后期",
  声音制作: "音频与音乐",
  音乐创作: "音频与音乐",
  "3D 生成": "3D与游戏资产",
  游戏资产: "3D与游戏资产",
  配套软件: "3D与游戏资产",
  游戏引擎: "游戏引擎与渲染",
  流程自动化: "自动化与智能体",
  模型社区: "模型开发与部署",
  本地模型: "模型开发与部署",
};
export function resourceCategory(category: string, id?: string) {
  return id === "godot" ? "游戏引擎与渲染" : aliases[category] || category;
}
export function resourceCategoryMatches(category: string, filter: string) {
  // The old mixed software tab contained both Blender and Godot.
  return (
    !filter ||
    category === resourceCategory(filter) ||
    (filter === "配套软件" && category === "游戏引擎与渲染")
  );
}
