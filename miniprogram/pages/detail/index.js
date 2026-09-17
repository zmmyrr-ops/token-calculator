const api = require("../../utils/api");
const nav = require("../../utils/navigation");
const saved = require("../../utils/saved");
Page({
  data: {
    kind: "",
    id: "",
    item: null,
    error: "",
    loading: true,
    saved: false,
    modelsEnabled: false,
    platformsEnabled: false,
    completed: false,
  },
  async onLoad(o) {
    this.setData({ kind: o.kind, id: o.id });
    this._unwatch = getApp().watchSettings((m) => this.setData({ modelsEnabled: m.models, platformsEnabled: m.platforms }));
    await getApp().refreshSettings();
    if (!nav.allowed(o.kind)) { getApp().enforceModules(); return; }
    this.load();
  },
  onUnload() { if (this._unwatch) this._unwatch(); },
  async load() {
    this.setData({ loading: true, error: "" });
    try {
      const k = this.data.kind;
      let path =
        k === "models"
          ? "/api/v1/mini/models/"
          : k === "news"
            ? "/api/v1/mini/news/"
            : "/api/v1/mini/" + k + "/";
      const item = await api.request(path + encodeURIComponent(this.data.id));
      this.setData({
        item,
        saved: saved.all().some((x) => x.key === k + ":" + this.data.id),
        completed: !!wx.getStorageSync("mendao-read:" + this.data.id),
      });
      wx.setNavigationBarTitle({ title: item.title || item.name });
    } catch (e) {
      this.setData({ error: e.message });
    } finally {
      this.setData({ loading: false });
    }
  },
  copy(e) {
    api.copy(e.currentTarget.dataset.url);
  },
  imageError() {
    this.setData({ "item.imageUrl": null });
  },
  save() {
    if (!this.data.item) return;
    this.setData({
      saved: saved.toggle({
        key: this.data.kind + ":" + this.data.id,
        kind: this.data.kind,
        id: this.data.id,
        title: this.data.item.title || this.data.item.name,
      }),
    });
  },
  complete() {
    const completed = !this.data.completed;
    wx.setStorageSync("mendao-read:" + this.data.id, completed);
    this.setData({ completed });
  },
  related(e) {
    nav.detail(e.currentTarget.dataset.kind, e.currentTarget.dataset.id);
  },
  budget() {
    wx.navigateTo({
      url: "/pages/calculator/index?id=" + encodeURIComponent(this.data.id),
    });
  },
  onShareAppMessage() {
    return {
      title: this.data.item
        ? this.data.item.title || this.data.item.name
        : "AI 门道",
      path:
        "/pages/detail/index?kind=" +
        encodeURIComponent(this.data.kind) +
        "&id=" +
        encodeURIComponent(this.data.id),
    };
  },
});
