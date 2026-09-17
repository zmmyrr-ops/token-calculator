const api = require("./utils/api");
App({
  globalData: {
    name: "AI 门道",
    modules: { news: false, forum: false },
    settingsReady: false,
  },
  onLaunch() {
    this._listeners = new Set();
  },
  onShow() {
    this.refreshSettings();
    if (!this._timer)
      this._timer = setInterval(() => this.refreshSettings(), 30000);
  },
  onHide() {
    clearInterval(this._timer);
    this._timer = null;
  },
  watchSettings(listener) {
    this._listeners.add(listener);
    listener(this.globalData.modules);
    return () => this._listeners.delete(listener);
  },
  enforceModules() {
    const pages = getCurrentPages();
    const page = pages[pages.length - 1];
    if (!page) return;
    const route = page.route;
    const modules = this.globalData.modules;
    if (
      (!modules.news &&
        (route === "pages/news/index" ||
          (route === "pages/detail/index" && page.data.kind === "news"))) ||
      (!modules.forum &&
        [
          "pages/forum/index",
          "pages/post/index",
          "pages/compose/index",
        ].includes(route))
    )
      wx.switchTab({ url: "/pages/tools/index" });
  },
  refreshSettings() {
    if (this._settingsPromise) return this._settingsPromise;
    this._settingsPromise = api
      .request("/api/v1/mini/settings")
      .then((data) => {
        this.globalData.modules = {
          news: data.news === true,
          forum: data.forum === true,
        };
        this.globalData.settingsReady = true;
        this._listeners.forEach((fn) => fn(this.globalData.modules));
        this.enforceModules();
        return this.globalData.modules;
      })
      .catch(() => {
        this.enforceModules();
        return this.globalData.modules;
      })
      .finally(() => {
        this._settingsPromise = null;
      });
    return this._settingsPromise;
  },
});
