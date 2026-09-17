const api = require("../../utils/api");
Page({
  data: {
    post: null,
    replies: [],
    page: 0,
    total: 0,
    userId: "",
    body: "",
    error: "",
    loading: false,
    sending: false,
  },
  onLoad(o) {
    this.id = o.id;
    this.load(true);
  },
  async onShow() {
    try {
      if (api.token()) {
        const r = await api.request("/api/mini/community/session");
        this.setData({ userId: r.user ? r.user.id : "" });
      } else this.setData({ userId: "" });
    } catch (e) {
      api.toast(e);
    }
  },
  async load(reset) {
    if (this.data.loading) return;
    this.setData({ loading: true, error: "" });
    try {
      const r = await api.request(
        "/api/mini/community/posts/" + encodeURIComponent(this.id),
        { page: reset ? 1 : this.data.page + 1 },
      );
      this.setData({
        post: r.post,
        replies: reset ? r.replies : this.data.replies.concat(r.replies),
        page: r.page,
        total: r.total,
      });
    } catch (e) {
      this.setData({ error: e.message });
    } finally {
      this.setData({ loading: false });
    }
  },
  retry() {
    this.load(!this.data.post);
  },
  onReachBottom() {
    if (this.data.replies.length < this.data.total) this.load(false);
  },
  field(e) {
    this.setData({ body: e.detail.value });
  },
  login() {
    wx.navigateTo({ url: "/pages/account/index" });
  },
  async reply() {
    if (this.data.sending) return;
    this.setData({ sending: true, error: "" });
    try {
      if (this.data.body.trim().length < 2) throw Error("回复至少填写 2 个字");
      await api.request(
        "/api/mini/community/posts/" + encodeURIComponent(this.id) + "/replies",
        { body: this.data.body },
        "POST",
      );
      this.setData({ body: "" });
      await this.load(true);
    } catch (e) {
      this.setData({ error: e.message });
    } finally {
      this.setData({ sending: false });
    }
  },
  remove(e) {
    const replyId = e.currentTarget.dataset.reply;
    wx.showModal({
      title: replyId ? "删除这条回复？" : "删除这篇帖子？",
      content: "删除后将不再公开展示。",
      success: async (r) => {
        if (!r.confirm) return;
        try {
          await api.request(
            "/api/mini/community/" +
              (replyId ? "replies/" + replyId : "posts/" + this.id),
            {},
            "DELETE",
          );
          if (replyId) this.load(true);
          else wx.navigateBack();
        } catch (e) {
          api.toast(e);
        }
      },
    });
  },
  onShareAppMessage() {
    return {
      title: this.data.post ? this.data.post.title : "门道社区",
      path: "/pages/post/index?id=" + encodeURIComponent(this.id),
    };
  },
});
