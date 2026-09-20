const nav = require("../../utils/navigation");
require("../../utils/panel")({
  data: { modelsEnabled: false, platformsEnabled: false, eyesEnabled: false },
  onLoad() {
    this._unwatch = getApp().watchSettings((m) => this.setData({ modelsEnabled: m.models, platformsEnabled: m.platforms, eyesEnabled: m.eyes }));
  },
  onUnload() { if (this._unwatch) this._unwatch(); },
  list(e) {
    nav.list(e.currentTarget.dataset.kind);
  },
  eyes() { if (!this.data.eyesEnabled) return; wx.navigateTo({ url: "/pages/ai-eyes/index" }); },
  budget() {
    wx.navigateTo({ url: "/pages/calculator/index" });
  },
  copy() {
    require("../../utils/api").copy(
      require("../../config").website + "/calculators/tokens",
    );
  },
  onShareAppMessage() {
    return { title: "AI 门道 · 模型、平台与成本预算" };
  },
});
