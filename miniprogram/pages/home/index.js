const items = [
  { id: "news", text: "资讯" }, { id: "learn", text: "学习" },
  { id: "tools", text: "工具" }, { id: "me", text: "我的" },
];
Page({
  data: { active: "tools", tabs: [], ready: false },
  async onLoad(options) {
    this.requested = options.tab || "news";
    this._unwatch = getApp().watchSettings((modules) => {
      const tabs = items.filter((x) => x.id !== "news" || modules.news);
      const desired = this.requested || this.data.active;
      const active = tabs.some((x) => x.id === desired) ? desired : "tools";
      this.setData({ tabs, active });
      if (this.data.ready) this.requested = null;
    });
    await getApp().refreshSettings();
    this.requested = null;
    this.setData({ ready: true });
  },
  onUnload() { if (this._unwatch) this._unwatch(); },
  selectTab(e) {
    const active = e.currentTarget.dataset.id;
    if (this.data.tabs.some((x) => x.id === active)) {
      this.setData({ active });
      wx.pageScrollTo({ scrollTop: 0, duration: 0 });
    }
  },
  onReachBottom() {
    const panel = this.selectComponent("#active-panel");
    if (panel && panel.onReachBottom) panel.onReachBottom();
  },
  onPullDownRefresh() {
    getApp().refreshSettings().then(() => {
      const panel = this.selectComponent("#active-panel");
      if (panel && panel.onPullDownRefresh) panel.onPullDownRefresh();
      else wx.stopPullDownRefresh();
    });
  },
  onShareAppMessage() {
    return { title: "AI 门道 · 看懂 AI，用出门道。", path: "/pages/home/index?tab=" + this.data.active };
  },
});
