export const forumCategories = [
  "综合讨论",
  "模型与提示词",
  "游戏开发",
  "3D 与美术",
  "视频创作",
  "建议反馈",
] as const;
export type CommunityUser = {
  id: string;
  username: string;
  nickname: string;
  avatar: string | null;
  demo: boolean;
  createdAt: number;
};
export type ForumPost = {
  id: string;
  title: string;
  body: string;
  category: string;
  createdAt: number;
  updatedAt: number;
  revision: number;
  demo: boolean;
  author: CommunityUser;
  replies: number;
  status?: string;
};
export type ForumReply = {
  id: string;
  body: string;
  createdAt: number;
  demo: boolean;
  author: CommunityUser;
  status?: string;
};
