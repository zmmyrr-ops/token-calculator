const items = [
  { id: "news", text: "资讯" },
  { id: "learn", text: "学习" },
  { id: "tools", text: "工具" },
  { id: "me", text: "我的" },
];
Component({
  data: { tabs: [], selected: "" },
  lifetimes: {
    attached() {
      this._unwatch = getApp().watchSettings((modules) => this.update(modules));
    },
    detached() {
      if (this._unwatch) this._unwatch();
    },
  },
  pageLifetimes: {
    show() {
      this.update(getApp().globalData.modules);
    },
  },
  methods: {
    update(modules) {
      const pages = getCurrentPages();
      const page = pages[pages.length - 1];
      this.setData({
        tabs: items
          .filter((x) => x.id !== "news" || modules.news)
          .map((x) => ({ ...x, path: "pages/" + x.id + "/index" })),
        selected: page ? page.route : "",
      });
    },
    switch(e) {
      const path = e.currentTarget.dataset.path;
      wx.switchTab({
        url: "/" + path,
        success: () => this.setData({ selected: path }),
      });
    },
  },
});
