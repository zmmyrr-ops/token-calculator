const api = require("../../utils/api");
Page({
  data: {
    title: "",
    body: "",
    categories: [
      "综合讨论",
      "模型与提示词",
      "游戏开发",
      "3D 与美术",
      "视频创作",
      "建议反馈",
    ],
    category: 0,
    loading: false,
    error: "",
  },
  field(e) {
    this.setData({ [e.currentTarget.dataset.field]: e.detail.value });
  },
  category(e) {
    this.setData({ category: Number(e.detail.value) });
  },
  async submit() {
    if (this.data.loading) return;
    if (!api.token()) {
      wx.navigateTo({ url: "/pages/account/index" });
      return;
    }
    if (
      this.data.title.trim().length < 6 ||
      this.data.body.trim().length < 10
    ) {
      this.setData({ error: "标题至少 6 字，正文至少 10 字" });
      return;
    }
    this.setData({ loading: true, error: "" });
    try {
      const r = await api.request(
        "/api/mini/community/posts",
        {
          title: this.data.title,
          body: this.data.body,
          category: this.data.categories[this.data.category],
        },
        "POST",
      );
      wx.redirectTo({
        url: "/pages/post/index?id=" + encodeURIComponent(r.id),
      });
    } catch (e) {
      this.setData({ error: e.message });
    } finally {
      this.setData({ loading: false });
    }
  },
});
