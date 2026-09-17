const api = require("../../utils/api");
const saved = require("../../utils/saved");
const nav = require("../../utils/navigation");
Page({
  data: { user: null, items: [], error: "" },
  async onShow() {
    this.setData({ items: saved.all(), error: "", user: null });
    if (api.token())
      try {
        const r = await api.request("/api/mini/community/session");
        this.setData({
          user: r.user
            ? { ...r.user, avatar: api.absolute(r.user.avatar) }
            : null,
        });
        if (!r.user) api.saveToken("");
      } catch (e) {
        this.setData({ error: e.message });
      }
  },
  account() {
    wx.navigateTo({ url: "/pages/account/index" });
  },
  forum() {
    wx.navigateTo({ url: "/pages/forum/index" });
  },
  about() {
    wx.navigateTo({ url: "/pages/about/index" });
  },
  open(e) {
    const x = this.data.items[e.currentTarget.dataset.index];
    nav.detail(x.kind, x.id);
  },
  remove(e) {
    saved.toggle(this.data.items[e.currentTarget.dataset.index]);
    this.setData({ items: saved.all() });
  },
  async logout() {
    try {
      await api.request("/api/mini/community/logout", {}, "POST");
      api.saveToken("");
      this.setData({ user: null });
    } catch (e) {
      api.toast(e);
    }
  },
  clear() {
    wx.showModal({
      title: "清除本机收藏与阅读记录？",
      content: "不会影响网站账号和论坛帖子。",
      success: (r) => {
        if (r.confirm) {
          wx.getStorageInfoSync()
            .keys.filter(
              (k) =>
                k === "mendao-mini-saved-v1" || k.startsWith("mendao-read:"),
            )
            .forEach((k) => wx.removeStorageSync(k));
          this.setData({ items: [] });
        }
      },
    });
  },
});
